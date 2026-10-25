import { query } from '../../database/index.js';
import { AppError } from '../../errors/appError.js';
import { ErrorCodes } from '../../errors/errorCodes.js';

export interface BookingOverlapCheckParams {
  dogId: string;
  checkInAt: Date;
  checkOutAt: Date;
  excludeBookingId?: string;
}

export class BookingValidator {
  /**
   * Validate that checkOutAt > checkInAt
   */
  static validateDates(checkInAt: Date, checkOutAt: Date): void {
    if (isNaN(checkInAt.getTime()) || isNaN(checkOutAt.getTime())) {
      throw AppError.badRequest('Invalid date/time format provided', ErrorCodes.VALIDATION_ERROR);
    }

    if (checkOutAt <= checkInAt) {
      throw AppError.badRequest(
        'Check-out date and time must be strictly after check-in date and time',
        ErrorCodes.BOOKING_INVALID_TIME_RANGE
      );
    }
  }

  /**
   * Validate that the dog is active (not archived)
   */
  static async validateDogNotArchived(dogId: string): Promise<void> {
    const res = await query('SELECT id, is_archived, name FROM dogs WHERE id = $1', [dogId]);

    if (res.rowCount === 0) {
      throw AppError.notFound(`Dog with ID '${dogId}' not found`, ErrorCodes.DOG_NOT_FOUND);
    }

    if (res.rows[0].is_archived) {
      throw AppError.badRequest(
        `Cannot create booking for archived dog '${res.rows[0].name}'. The profile must be restored first.`,
        ErrorCodes.BOOKING_ARCHIVED_DOG_BLOCKED
      );
    }
  }

  /**
   * Check for overlapping active bookings for the SAME dog
   * Rules:
   * - Overlap formula: (startA < endB) AND (endA > startB)
   * - Back-to-back bookings allowed (e.g. endA == startB)
   * - Cancelled bookings do NOT block availability
   * - When editing/extending, ignore the current booking
   */
  static async checkOverlap(params: BookingOverlapCheckParams): Promise<void> {
    const { dogId, checkInAt, checkOutAt, excludeBookingId } = params;

    let sql = `
      SELECT id, check_in_at, check_out_at, current_status
      FROM bookings
      WHERE dog_id = $1
        AND current_status != 'CANCEL'
        AND check_in_at < $3
        AND check_out_at > $2
    `;

    const sqlParams: any[] = [dogId, checkInAt.toISOString(), checkOutAt.toISOString()];

    if (excludeBookingId) {
      sql += ' AND id != $4';
      sqlParams.push(excludeBookingId);
    }

    const res = await query(sql, sqlParams);

    if (res.rowCount && res.rowCount > 0) {
      const conflict = res.rows[0];
      throw AppError.conflict(
        `Booking overlaps with an existing booking for this dog from ${new Date(conflict.check_in_at).toISOString()} to ${new Date(conflict.check_out_at).toISOString()} (Status: ${conflict.current_status})`,
        ErrorCodes.BOOKING_OVERLAP,
        {
          conflictingBookingId: conflict.id,
          checkInAt: conflict.check_in_at,
          checkOutAt: conflict.check_out_at,
          status: conflict.current_status
        }
      );
    }
  }
}
