import { query, withTransaction } from '../../database/index.js';
import { UniversalStatus, isValidStatus, UNIVERSAL_STATUSES } from '../../constants/registries.js';
import { AppError } from '../../errors/appError.js';
import { ErrorCodes } from '../../errors/errorCodes.js';
import { AuditService } from '../audit/auditService.js';

export interface StatusTransitionRequest {
  bookingId: string;
  newStatus: UniversalStatus;
  effectiveAt: Date;
  sharedAccountId?: string;
  notes?: string;
}

export interface CheckoutAttentionInfo {
  requiresAttention: boolean;
  attentionType: 'NONE' | 'OUTGOING_CONFIRMATION_REQUIRED' | 'OVERDUE_UNRESOLVED';
  isOverdue: boolean;
  overdueMinutes: number;
}

export class StatusService {
  /**
   * Evaluate overdue checkout attention state for a booking based on server time
   */
  static getCheckoutAttentionState(
    booking: { check_out_at: Date | string; current_status: string; is_outgoing_confirmed?: boolean },
    currentTime: Date = new Date()
  ): CheckoutAttentionInfo {
    const checkOutDate = typeof booking.check_out_at === 'string' ? new Date(booking.check_out_at) : booking.check_out_at;
    const isPastCheckout = currentTime.getTime() >= checkOutDate.getTime();
    const status = booking.current_status;

    // Attention condition applies to active stays past checkout that haven't been completed/cancelled
    if ((status === 'IN_HOTEL' || status === 'OUTGOING') && isPastCheckout) {
      const overdueMinutes = Math.max(0, Math.floor((currentTime.getTime() - checkOutDate.getTime()) / (1000 * 60)));

      if (!booking.is_outgoing_confirmed) {
        return {
          requiresAttention: true,
          attentionType: 'OUTGOING_CONFIRMATION_REQUIRED',
          isOverdue: true,
          overdueMinutes
        };
      } else {
        return {
          requiresAttention: true,
          attentionType: 'OVERDUE_UNRESOLVED',
          isOverdue: true,
          overdueMinutes
        };
      }
    }

    return {
      requiresAttention: false,
      attentionType: 'NONE',
      isOverdue: false,
      overdueMinutes: 0
    };
  }

  /**
   * Determine the current relevant operational booking for a dog
   */
  static async getCurrentRelevantBooking(dogId: string, currentTime: Date = new Date()): Promise<any | null> {
    // 1. First priority: Active in-hotel, received, or outgoing booking
    const activeRes = await query(
      `
      SELECT *
      FROM bookings
      WHERE dog_id = $1
        AND current_status IN ('IN_HOTEL', 'RECEIVED', 'OUTGOING')
      ORDER BY check_in_at ASC
      LIMIT 1;
      `,
      [dogId]
    );

    if (activeRes.rowCount && activeRes.rowCount > 0) {
      const b = activeRes.rows[0];
      const attention = this.getCheckoutAttentionState(b, currentTime);
      return { ...b, attention };
    }

    // 2. Second priority: Nearest upcoming booking
    const upcomingRes = await query(
      `
      SELECT *
      FROM bookings
      WHERE dog_id = $1
        AND current_status = 'UPCOMING'
        AND check_out_at > $2
      ORDER BY check_in_at ASC
      LIMIT 1;
      `,
      [dogId, currentTime.toISOString()]
    );

    if (upcomingRes.rowCount && upcomingRes.rowCount > 0) {
      const b = upcomingRes.rows[0];
      const attention = this.getCheckoutAttentionState(b, currentTime);
      return { ...b, attention };
    }

    // 3. Third priority: Most recent historical/completed/cancelled stay
    const historyRes = await query(
      `
      SELECT *
      FROM bookings
      WHERE dog_id = $1
      ORDER BY check_out_at DESC
      LIMIT 1;
      `,
      [dogId]
    );

    if (historyRes.rowCount && historyRes.rowCount > 0) {
      const b = historyRes.rows[0];
      const attention = this.getCheckoutAttentionState(b, currentTime);
      return { ...b, attention };
    }

    // No stays ever booked
    return null;
  }

  /**
   * Transition booking status atomically with mandatory effectiveAt
   */
  static async updateStatus(req: StatusTransitionRequest): Promise<any> {
    const { bookingId, newStatus, effectiveAt, sharedAccountId, notes } = req;

    if (!isValidStatus(newStatus)) {
      throw AppError.badRequest(`Invalid status '${newStatus}'`, ErrorCodes.INVALID_STATUS);
    }

    if (!effectiveAt || isNaN(effectiveAt.getTime())) {
      throw AppError.badRequest(
        'A valid effective date/time is required for manual status transitions',
        ErrorCodes.STATUS_CHANGE_REQUIRES_DATE
      );
    }

    return await withTransaction(async (client) => {
      // 1. Fetch current booking
      const bookingRes = await client.query(
        'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
        [bookingId]
      );

      if (bookingRes.rowCount === 0) {
        throw AppError.notFound(`Booking with ID '${bookingId}' not found`, ErrorCodes.BOOKING_NOT_FOUND);
      }

      const booking = bookingRes.rows[0];
      const previousStatus = booking.current_status;

      // 2. Update booking current_status
      const updateRes = await client.query(
        `
        UPDATE bookings
        SET current_status = $1::varchar,
            is_outgoing_confirmed = CASE WHEN $1::varchar = 'OUTGOING' THEN true ELSE is_outgoing_confirmed END,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *;
        `,
        [newStatus, bookingId]
      );

      // 3. Record in status_history
      await client.query(
        `
        INSERT INTO status_history (booking_id, previous_status, new_status, effective_at, changed_at, shared_account_id, notes)
        VALUES ($1, $2, $3, $4, NOW(), $5, $6);
        `,
        [bookingId, previousStatus, newStatus, effectiveAt.toISOString(), sharedAccountId || null, notes || null]
      );

      // 4. Record in audit_logs
      await AuditService.log(
        {
          sharedAccountId,
          action: 'BOOKING_STATUS_CHANGED',
          entityType: 'STATUS',
          entityId: bookingId,
          metadata: {
            dogId: booking.dog_id,
            previousStatus,
            newStatus,
            effectiveAt: effectiveAt.toISOString()
          }
        },
        client
      );

      const row = updateRes.rows[0];
      return {
        ...row,
        currentStatus: row.current_status,
        checkInAt: row.check_in_at,
        checkOutAt: row.check_out_at,
        isOutgoingConfirmed: row.is_outgoing_confirmed
      };
    });
  }
}
