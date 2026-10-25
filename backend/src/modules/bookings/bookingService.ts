import { query, withTransaction } from '../../database/index.js';
import { BookingValidator } from './bookingValidator.js';
import { StatusService } from '../status/statusService.js';
import { UniversalStatus } from '../../constants/registries.js';
import { AppError } from '../../errors/appError.js';
import { ErrorCodes } from '../../errors/errorCodes.js';
import { AuditService } from '../audit/auditService.js';
import { toHotelLocalTime, calculateStayDuration } from '../../utils/timezone.js';

export class BookingService {
  /**
   * Create Booking with overlap and archive validation
   */
  static async createBooking(data: {
    dogId: string;
    checkInAt: string;
    checkOutAt: string;
    status: UniversalStatus;
    services?: string[];
    notes?: string | null;
    sharedAccountId?: string;
  }) {
    const checkInDate = new Date(data.checkInAt);
    const checkOutDate = new Date(data.checkOutAt);

    // 1. Date ordering validation
    BookingValidator.validateDates(checkInDate, checkOutDate);

    // 2. Archive validation (Requirement 19: Archived dogs cannot receive bookings)
    await BookingValidator.validateDogNotArchived(data.dogId);

    // 3. Overlap validation (Requirement 16 Rule 2: Same dog cannot have overlapping active stays)
    await BookingValidator.checkOverlap({
      dogId: data.dogId,
      checkInAt: checkInDate,
      checkOutAt: checkOutDate
    });

    return await withTransaction(async (client) => {
      // 4. Insert booking
      const res = await client.query(
        `
        INSERT INTO bookings (dog_id, check_in_at, check_out_at, current_status, services, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
        `,
        [
          data.dogId,
          checkInDate.toISOString(),
          checkOutDate.toISOString(),
          data.status,
          JSON.stringify(data.services || []),
          data.notes?.trim() || null
        ]
      );

      const booking = res.rows[0];

      // 5. Create initial status history entry
      await client.query(
        `
        INSERT INTO status_history (booking_id, previous_status, new_status, effective_at, changed_at, shared_account_id, notes)
        VALUES ($1, NULL, $2, $3, NOW(), $4, 'Initial reservation status');
        `,
        [booking.id, data.status, checkInDate.toISOString(), data.sharedAccountId || null]
      );

      // 6. Audit log
      await AuditService.log(
        {
          sharedAccountId: data.sharedAccountId,
          action: 'BOOKING_CREATED',
          entityType: 'BOOKING',
          entityId: booking.id,
          metadata: {
            dogId: data.dogId,
            checkInAt: data.checkInAt,
            checkOutAt: data.checkOutAt,
            status: data.status
          }
        },
        client
      );

      return BookingService.formatBookingResponse(booking);
    });
  }

  /**
   * Extend Booking (Requirement 34: In-place edit of existing booking with overlap re-validation)
   */
  static async extendBooking(id: string, newCheckOutAtStr: string, notes?: string, sharedAccountId?: string) {
    const newCheckOutAt = new Date(newCheckOutAtStr);

    return await withTransaction(async (client) => {
      // 1. Fetch current booking
      const currentRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
      if (currentRes.rowCount === 0) {
        throw AppError.notFound('Booking not found', ErrorCodes.BOOKING_NOT_FOUND);
      }

      const booking = currentRes.rows[0];
      const checkInAt = new Date(booking.check_in_at);

      // 2. Validate new checkout is after check-in
      BookingValidator.validateDates(checkInAt, newCheckOutAt);

      // 3. Re-run overlap check against other bookings for the same dog
      await BookingValidator.checkOverlap({
        dogId: booking.dog_id,
        checkInAt,
        checkOutAt: newCheckOutAt,
        excludeBookingId: booking.id
      });

      // 4. Update booking
      const updateRes = await client.query(
        `
        UPDATE bookings
        SET check_out_at = $1,
            is_outgoing_confirmed = FALSE,
            notes = CASE WHEN $2::text IS NOT NULL THEN COALESCE(notes, '') || ' | ' || $2::text ELSE notes END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *;
        `,
        [newCheckOutAt.toISOString(), notes ? `Extended: ${notes}` : null, id]
      );

      const updatedBooking = updateRes.rows[0];

      // 5. Record extension in audit log
      await AuditService.log(
        {
          sharedAccountId,
          action: 'BOOKING_EXTENDED',
          entityType: 'BOOKING',
          entityId: id,
          metadata: {
            previousCheckOutAt: booking.check_out_at,
            newCheckOutAt: newCheckOutAt.toISOString(),
            notes
          }
        },
        client
      );

      return BookingService.formatBookingResponse(updatedBooking);
    });
  }

  /**
   * Confirm Outgoing Departure (Requirement 31)
   */
  static async confirmOutgoing(id: string, sharedAccountId?: string) {
    const res = await query(
      `
      UPDATE bookings
      SET is_outgoing_confirmed = TRUE,
          current_status = 'OUTGOING',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
      `,
      [id]
    );

    if (res.rowCount === 0) {
      throw AppError.notFound('Booking not found', ErrorCodes.BOOKING_NOT_FOUND);
    }

    await AuditService.log({
      sharedAccountId,
      action: 'BOOKING_OUTGOING_CONFIRMED',
      entityType: 'BOOKING',
      entityId: id
    });

    return BookingService.formatBookingResponse(res.rows[0]);
  }

  /**
   * Get Single Booking with Relational Dog, Owner, and Status History
   */
  static async getBookingById(id: string) {
    const res = await query(
      `
      SELECT b.*,
             d.name as dog_name,
             d.breed as dog_breed,
             d.avatar_id as dog_avatar_id,
             d.is_archived as dog_is_archived,
             o.id as owner_id,
             o.name as owner_name,
             o.display_phone as owner_phone,
             o.email as owner_email
      FROM bookings b
      JOIN dogs d ON b.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE b.id = $1;
      `,
      [id]
    );

    if (res.rowCount === 0) {
      throw AppError.notFound(`Booking with ID '${id}' not found`, ErrorCodes.BOOKING_NOT_FOUND);
    }

    const row = res.rows[0];
    const inLocal = toHotelLocalTime(row.check_in_at);
    const outLocal = toHotelLocalTime(row.check_out_at);
    const duration = calculateStayDuration(row.check_in_at, row.check_out_at);
    const attention = StatusService.getCheckoutAttentionState(row);

    // Fetch status history
    const historyRes = await query(
      `
      SELECT sh.*, sa.display_name as changed_by_name
      FROM status_history sh
      LEFT JOIN shared_accounts sa ON sh.shared_account_id = sa.id
      WHERE sh.booking_id = $1
      ORDER BY sh.effective_at DESC, sh.changed_at DESC;
      `,
      [id]
    );

    return {
      id: row.id,
      dogId: row.dog_id,
      dogName: row.dog_name,
      dogBreed: row.dog_breed,
      dogAvatarId: row.dog_avatar_id,
      dogIsArchived: row.dog_is_archived,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      ownerPhone: row.owner_phone,
      ownerEmail: row.owner_email,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      checkInFormatted: inLocal.dateFormatted,
      checkInTimeFormatted: inLocal.timeFormatted,
      checkOutFormatted: outLocal.dateFormatted,
      checkOutTimeFormatted: outLocal.timeFormatted,
      currentStatus: row.current_status,
      services: row.services || [],
      notes: row.notes,
      isOutgoingConfirmed: row.is_outgoing_confirmed,
      durationNights: duration.nights,
      durationLabel: duration.label,
      attention,
      history: historyRes.rows.map((h) => ({
        id: h.id,
        previousStatus: h.previous_status,
        newStatus: h.new_status,
        effectiveAt: h.effective_at,
        effectiveFormatted: toHotelLocalTime(h.effective_at).dateFormatted,
        changedAt: h.changed_at,
        changedByName: h.changed_by_name,
        notes: h.notes
      }))
    };
  }

  /**
   * List Bookings with Filters
   */
  static async listBookings(params: {
    page: number;
    pageSize: number;
    status?: string;
    dogId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const { page, pageSize, status, dogId, fromDate, toDate } = params;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const sqlParams: any[] = [];

    if (status && status.toUpperCase() !== 'ALL') {
      sqlParams.push(status.toUpperCase().replace(/\s+/g, '_'));
      conditions.push(`b.current_status = $${sqlParams.length}`);
    }

    if (dogId) {
      sqlParams.push(dogId);
      conditions.push(`b.dog_id = $${sqlParams.length}`);
    }

    if (fromDate) {
      sqlParams.push(new Date(fromDate).toISOString());
      conditions.push(`b.check_out_at >= $${sqlParams.length}`);
    }

    if (toDate) {
      sqlParams.push(new Date(toDate).toISOString());
      conditions.push(`b.check_in_at <= $${sqlParams.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) as total FROM bookings b ${whereClause}`, sqlParams);
    const total = parseInt(countRes.rows[0].total, 10);

    const queryParams = [...sqlParams, pageSize, offset];
    const bookingsRes = await query(
      `
      SELECT b.*,
             d.name as dog_name,
             d.breed as dog_breed,
             d.avatar_id as dog_avatar_id,
             o.name as owner_name,
             o.display_phone as owner_phone
      FROM bookings b
      JOIN dogs d ON b.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      ${whereClause}
      ORDER BY b.check_in_at DESC
      LIMIT $${sqlParams.length + 1} OFFSET $${sqlParams.length + 2};
      `,
      queryParams
    );

    const now = new Date();
    const items = bookingsRes.rows.map((row) => {
      const inLocal = toHotelLocalTime(row.check_in_at);
      const outLocal = toHotelLocalTime(row.check_out_at);
      const duration = calculateStayDuration(row.check_in_at, row.check_out_at);
      const attention = StatusService.getCheckoutAttentionState(row, now);

      return {
        id: row.id,
        dogId: row.dog_id,
        dogName: row.dog_name,
        dogBreed: row.dog_breed,
        dogAvatarId: row.dog_avatar_id,
        ownerName: row.owner_name,
        ownerPhone: row.owner_phone,
        checkInAt: row.check_in_at,
        checkOutAt: row.check_out_at,
        checkInFormatted: inLocal.dateFormatted,
        checkInTimeFormatted: inLocal.timeFormatted,
        checkOutFormatted: outLocal.dateFormatted,
        checkOutTimeFormatted: outLocal.timeFormatted,
        currentStatus: row.current_status,
        services: row.services || [],
        notes: row.notes,
        isOutgoingConfirmed: row.is_outgoing_confirmed,
        durationNights: duration.nights,
        durationLabel: duration.label,
        attention
      };
    });

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Update booking dates or notes (with self-conflict exclusion)
   */
  static async updateBooking(id: string, updates: { checkInAt?: string; checkOutAt?: string; services?: string[]; notes?: string | null }, sharedAccountId?: string) {
    return await withTransaction(async (client) => {
      const currentRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
      if (currentRes.rowCount === 0) {
        throw AppError.notFound('Booking not found', ErrorCodes.BOOKING_NOT_FOUND);
      }

      const booking = currentRes.rows[0];
      const checkInAt = updates.checkInAt ? new Date(updates.checkInAt) : new Date(booking.check_in_at);
      const checkOutAt = updates.checkOutAt ? new Date(updates.checkOutAt) : new Date(booking.check_out_at);

      if (updates.checkInAt || updates.checkOutAt) {
        BookingValidator.validateDates(checkInAt, checkOutAt);
        await BookingValidator.checkOverlap({
          dogId: booking.dog_id,
          checkInAt,
          checkOutAt,
          excludeBookingId: booking.id
        });
      }

      const services = updates.services !== undefined ? JSON.stringify(updates.services) : JSON.stringify(booking.services || []);
      const notes = updates.notes !== undefined ? (updates.notes?.trim() || null) : booking.notes;

      const updateRes = await client.query(
        `
        UPDATE bookings
        SET check_in_at = $1, check_out_at = $2, services = $3, notes = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *;
        `,
        [checkInAt.toISOString(), checkOutAt.toISOString(), services, notes, id]
      );

      await AuditService.log(
        {
          sharedAccountId,
          action: 'BOOKING_UPDATED',
          entityType: 'BOOKING',
          entityId: id,
          metadata: updates
        },
        client
      );

      return BookingService.formatBookingResponse(updateRes.rows[0]);
    });
  }

  static formatBookingResponse(row: any) {
    const duration = calculateStayDuration(row.check_in_at, row.check_out_at);
    const localIn = toHotelLocalTime(row.check_in_at);
    const localOut = toHotelLocalTime(row.check_out_at);
    return {
      id: row.id,
      dogId: row.dog_id,
      dog_id: row.dog_id,
      checkInAt: row.check_in_at,
      check_in_at: row.check_in_at,
      checkOutAt: row.check_out_at,
      check_out_at: row.check_out_at,
      currentStatus: row.current_status,
      current_status: row.current_status,
      services: typeof row.services === 'string' ? JSON.parse(row.services) : (row.services || []),
      notes: row.notes,
      isOutgoingConfirmed: row.is_outgoing_confirmed,
      is_outgoing_confirmed: row.is_outgoing_confirmed,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
      duration,
      checkInLocal: localIn,
      checkOutLocal: localOut
    };
  }
}
