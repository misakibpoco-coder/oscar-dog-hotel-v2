import { describe, it, expect } from 'vitest';
import { normalizePhone, formatDisplayPhone } from '../../src/utils/phone.js';
import {
  toHotelLocalTime,
  calculateStayDuration,
  DEFAULT_HOTEL_TIMEZONE,
} from '../../src/utils/timezone.js';
import {
  UNIVERSAL_DOG_AVATARS,
  isValidAvatarId,
  UNIVERSAL_STATUS_LIST,
  UNIVERSAL_STATUSES,
  isValidStatus,
  normalizeStatus,
} from '../../src/constants/registries.js';
import { BookingValidator } from '../../src/modules/bookings/bookingValidator.js';
import { StatusService } from '../../src/modules/status/statusService.js';

describe('Phone Normalization & Formatting Rules', () => {
  it('should normalize international and local phone numbers to E.164-style standard', () => {
    expect(normalizePhone('+357 99 123456')).toBe('+35799123456');
    expect(normalizePhone('00357 99 123456')).toBe('+35799123456');
    expect(normalizePhone('(357) 99-123-456')).toBe('+35799123456');
    expect(normalizePhone('99123456')).toBe('+35799123456'); // defaults to Cyprus (+357) for 8-digit numbers
    expect(normalizePhone('+1 (555) 234-5678')).toBe('+15552345678');
  });

  it('should format phone numbers for UI presentation', () => {
    expect(formatDisplayPhone('+35799123456')).toBe('+357 99 123456');
    expect(formatDisplayPhone('+15552345678')).toBe('+15552345678');
  });
});

describe('Timezone & Duration Calculation (Europe/Nicosia)', () => {
  it('should calculate stay duration accurately from UTC timestamps', () => {
    const checkIn = new Date('2026-06-01T10:00:00Z');
    const checkOut = new Date('2026-06-05T10:00:00Z');
    const duration = calculateStayDuration(checkIn, checkOut);
    expect(duration.nights).toBe(4);
    expect(duration.label).toBe('4 nights');
  });

  it('should handle same-day stays with 0 nights and "Same day" label', () => {
    const checkIn = new Date('2026-06-01T10:00:00Z');
    const checkOut = new Date('2026-06-01T18:00:00Z');
    const duration = calculateStayDuration(checkIn, checkOut);
    expect(duration.nights).toBe(0);
    expect(duration.hours).toBe(8);
    expect(duration.label).toBe('Same day');
  });

  it('should format UTC into Europe/Nicosia hotel local date and time', () => {
    // In June, Cyprus is EEST (UTC+3)
    const utcDate = new Date('2026-06-01T07:15:00Z');
    const local = toHotelLocalTime(utcDate);
    expect(local.dateFormatted).toBe('Jun 01, 2026');
    expect(local.timeFormatted).toBe('10:15 AM'); // 07:15 UTC + 3 hours = 10:15 AM
  });
});

describe('Canonical Registries Validation', () => {
  it('should enforce exactly 5 universal avatars with no custom photo uploads', () => {
    expect(UNIVERSAL_DOG_AVATARS).toHaveLength(5);
    const ids = UNIVERSAL_DOG_AVATARS.map((a) => a.id);
    expect(ids).toEqual(['avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5']);

    expect(isValidAvatarId('avatar_1')).toBe(true);
    expect(isValidAvatarId('avatar_5')).toBe(true);
    expect(isValidAvatarId('avatar_6')).toBe(false);
    expect(isValidAvatarId('custom_photo.jpg')).toBe(false);
  });

  it('should enforce exactly 6 universal statuses with distinct UI badges', () => {
    expect(UNIVERSAL_STATUS_LIST).toEqual([
      'RECEIVED',
      'IN_HOTEL',
      'UPCOMING',
      'COMPLETE',
      'CANCEL',
      'OUTGOING',
    ]);

    expect(isValidStatus('IN_HOTEL')).toBe(true);
    expect(isValidStatus('CANCEL')).toBe(true);
    expect(isValidStatus('NO_BOOKING')).toBe(false); // Informational state, not a status
    expect(isValidStatus('UNKNOWN')).toBe(false);

    // Normalization test
    expect(normalizeStatus('cancelled')).toBe('CANCEL');
    expect(normalizeStatus('in_hotel')).toBe('IN_HOTEL');
    expect(normalizeStatus('In Hotel')).toBe('IN_HOTEL');

    // UI properties definition test
    expect(UNIVERSAL_STATUSES.IN_HOTEL.label).toBe('In hotel');
    expect(UNIVERSAL_STATUSES.COMPLETE.label).toBe('Complete');
    expect(UNIVERSAL_STATUSES.OUTGOING.label).toBe('Outgoing');
  });
});

describe('Booking Overlap & Range Rules', () => {
  it('should enforce checkOutAt > checkInAt', () => {
    const validIn = new Date('2026-06-01T10:00:00Z');
    const validOut = new Date('2026-06-05T10:00:00Z');
    expect(() => BookingValidator.validateDates(validIn, validOut)).not.toThrow();

    // Check-out equal to check-in
    expect(() => BookingValidator.validateDates(validIn, validIn)).toThrow();

    // Check-out earlier than check-in
    expect(() => BookingValidator.validateDates(validOut, validIn)).toThrow();
  });

  it('should detect overlap with standard interval intersection: (startA < endB) && (endA > startB)', () => {
    const existingStart = new Date('2026-06-10T10:00:00Z').getTime();
    const existingEnd = new Date('2026-06-15T12:00:00Z').getTime();

    const isOverlap = (s: string, e: string) => {
      const start = new Date(s).getTime();
      const end = new Date(e).getTime();
      return start < existingEnd && end > existingStart;
    };

    // Sub-range inside
    expect(isOverlap('2026-06-11T10:00:00Z', '2026-06-14T10:00:00Z')).toBe(true);
    // Overlap front
    expect(isOverlap('2026-06-08T10:00:00Z', '2026-06-12T10:00:00Z')).toBe(true);
    // Overlap back
    expect(isOverlap('2026-06-14T10:00:00Z', '2026-06-18T10:00:00Z')).toBe(true);
    // Spanning over
    expect(isOverlap('2026-06-05T10:00:00Z', '2026-06-20T10:00:00Z')).toBe(true);

    // Back-to-back touching boundaries allowed
    expect(isOverlap('2026-06-05T10:00:00Z', '2026-06-10T10:00:00Z')).toBe(false);
    expect(isOverlap('2026-06-15T12:00:00Z', '2026-06-20T10:00:00Z')).toBe(false);

    // Disjoint
    expect(isOverlap('2026-06-01T10:00:00Z', '2026-06-05T10:00:00Z')).toBe(false);
    expect(isOverlap('2026-06-20T10:00:00Z', '2026-06-25T10:00:00Z')).toBe(false);
  });
});

describe('Checkout Attention & Overdue Logic', () => {
  const checkIn = new Date('2026-06-10T10:00:00Z');
  const checkOut = new Date('2026-06-15T12:00:00Z');

  it('should flag OUTGOING_CONFIRMATION_REQUIRED when checkout time passes without confirmation', () => {
    const afterCheckOut = new Date('2026-06-15T13:30:00Z'); // 90 minutes past checkout
    const attention = StatusService.getCheckoutAttentionState(
      {
        current_status: 'IN_HOTEL',
        check_out_at: checkOut,
        is_outgoing_confirmed: false,
      },
      afterCheckOut
    );

    expect(attention.isOverdue).toBe(true);
    expect(attention.requiresAttention).toBe(true);
    expect(attention.attentionType).toBe('OUTGOING_CONFIRMATION_REQUIRED');
    expect(attention.overdueMinutes).toBe(90);
  });

  it('should flag OVERDUE_UNRESOLVED if checkout time has passed and dog is OUTGOING but not yet COMPLETE', () => {
    const afterCheckOut = new Date('2026-06-15T14:00:00Z');
    const attention = StatusService.getCheckoutAttentionState(
      {
        current_status: 'OUTGOING',
        check_out_at: checkOut,
        is_outgoing_confirmed: true,
      },
      afterCheckOut
    );

    expect(attention.isOverdue).toBe(true);
    expect(attention.requiresAttention).toBe(true);
    expect(attention.attentionType).toBe('OVERDUE_UNRESOLVED');
  });

  it('should NOT mark overdue if checkout time has not passed yet', () => {
    const beforeCheckOut = new Date('2026-06-15T10:00:00Z'); // 2 hours before scheduled checkout
    const attention = StatusService.getCheckoutAttentionState(
      {
        current_status: 'IN_HOTEL',
        check_out_at: checkOut,
        is_outgoing_confirmed: false,
      },
      beforeCheckOut
    );

    expect(attention.isOverdue).toBe(false);
    expect(attention.requiresAttention).toBe(false);
    expect(attention.attentionType).toBe('NONE');
    expect(attention.overdueMinutes).toBe(0);
  });

  it('should NOT mark overdue if booking is COMPLETE or CANCEL', () => {
    const afterCheckOut = new Date('2026-06-15T13:00:00Z');
    const completedAttention = StatusService.getCheckoutAttentionState(
      {
        current_status: 'COMPLETE',
        check_out_at: checkOut,
        is_outgoing_confirmed: true,
      },
      afterCheckOut
    );
    expect(completedAttention.isOverdue).toBe(false);
    expect(completedAttention.requiresAttention).toBe(false);

    const cancelledAttention = StatusService.getCheckoutAttentionState(
      {
        current_status: 'CANCEL',
        check_out_at: checkOut,
        is_outgoing_confirmed: false,
      },
      afterCheckOut
    );
    expect(cancelledAttention.isOverdue).toBe(false);
    expect(cancelledAttention.requiresAttention).toBe(false);
  });
});
