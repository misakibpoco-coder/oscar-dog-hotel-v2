/**
 * Dynamic Date Utilities for Oscar Dog Hotel
 * All date calculations derive from the actual live system/device date (never hardcoded).
 * Timezone-safe: avoids UTC day-shifting errors by parsing date-only strings in local time.
 */

export type BookingClassification =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'MISSED_CHECKIN'    // UPCOMING, check-in passed, dog never checked in
  | 'OVERDUE_CHECKOUT'  // IN_HOTEL / OUTGOING unconfirmed, check-out passed
  | 'TODAY_CHECKIN'     // Scheduled to arrive today
  | 'TODAY_CHECKOUT'    // Scheduled to depart today
  | 'ACTIVE_STAY'       // Currently staying in hotel
  | 'UPCOMING';         // Genuinely in the future

/**
 * Returns today's date in 'YYYY-MM-DD' format using device local time.
 * Avoids UTC timezone day-shifting errors.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add or subtract days from a YYYY-MM-DD date string.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    dateStr = getTodayDateString();
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  target.setDate(target.getDate() + days);

  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compare two 'YYYY-MM-DD' date strings.
 * Returns < 0 if d1 < d2 (d1 is in the past relative to d2)
 * Returns 0 if d1 == d2
 * Returns > 0 if d1 > d2 (d1 is in the future relative to d2)
 */
export function compareDateStrings(d1: string, d2: string): number {
  if (d1 === d2) return 0;
  return d1 < d2 ? -1 : 1;
}

/**
 * Format a YYYY-MM-DD date string into a friendly display title.
 * e.g. "Today, Sep 16, 2026" or "Tomorrow, Sep 17, 2026" or "Sep 18, 2026".
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const todayStr = getTodayDateString();
  const tomorrowStr = addDaysToDateString(todayStr, 1);
  const yesterdayStr = addDaysToDateString(todayStr, -1);

  // If already in YYYY-MM-DD
  let y = 0, m = 0, d = 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    [y, m, d] = dateStr.split('-').map(Number);
  } else {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    y = parsed.getFullYear();
    m = parsed.getMonth() + 1;
    d = parsed.getDate();
  }

  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateStr;

  const formattedMonthDayYear = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const normalizedStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  if (normalizedStr === todayStr) {
    return `Today, ${formattedMonthDayYear}`;
  }
  if (normalizedStr === tomorrowStr) {
    return `Tomorrow, ${formattedMonthDayYear}`;
  }
  if (normalizedStr === yesterdayStr) {
    return `Yesterday, ${formattedMonthDayYear}`;
  }

  return formattedMonthDayYear;
}

/**
 * Extracts standard YYYY-MM-DD string from an ISO string, Date object, or date string.
 * Completely timezone-safe: reads local year, month, date from Date objects.
 */
export function toDateString(input?: string | Date | null): string {
  if (!input) return getTodayDateString();
  if (input instanceof Date) {
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const day = String(input.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof input === 'string') {
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input;
    }
    // Parse into Date and read local components
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return getTodayDateString();
}

/**
 * Parses time string (e.g. "10:15 AM", "14:30", "9:00 PM") into [hours24, minutes].
 */
export function parseTimeString(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 10, minutes: 0 };
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hours: 10, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10) || 0;
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

/**
 * Combines a YYYY-MM-DD date string and time string ("10:15 AM") into a full Date object
 * in local timezone.
 */
export function parseDateAndTimeToDate(dateStr: string, timeStr?: string): Date {
  const normalizedDate = toDateString(dateStr);
  const [y, m, d] = normalizedDate.split('-').map(Number);
  const { hours, minutes } = parseTimeString(timeStr);
  return new Date(y, m - 1, d, hours, minutes, 0, 0);
}

/**
 * Combines a date string ('YYYY-MM-DD') and time string ('10:15 AM') into an ISO string.
 * Preserves the selected local date and time.
 */
export function combineDateAndTime(dateStr: string, timeStr?: string): string {
  const localDate = parseDateAndTimeToDate(dateStr, timeStr);
  return localDate.toISOString();
}

/**
 * Format a Date or ISO string into a local 12-hour time string ("10:15 AM").
 */
export function formatTimeFromDate(input?: string | Date | null): string {
  if (!input) return '10:00 AM';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '10:00 AM';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Canonical Booking Classification
 * Single source of truth for booking operational status across Dashboard, Bookings, and Dog Details.
 */
export function classifyBooking(
  booking: {
    status?: string | null;
    checkInDate?: string | null;
    checkInTime?: string | null;
    checkInAt?: string | null;
    checkOutDate?: string | null;
    checkOutTime?: string | null;
    checkOutAt?: string | null;
    isOutgoingConfirmed?: boolean;
  },
  referenceDateStr: string = getTodayDateString(),
  currentTime: Date = new Date()
): BookingClassification {
  const status = (booking.status || 'UPCOMING').toUpperCase();

  if (status === 'CANCEL') return 'CANCELLED';
  if (status === 'COMPLETE') return 'COMPLETED';

  const inDateStr = toDateString(booking.checkInDate || booking.checkInAt);
  const outDateStr = toDateString(booking.checkOutDate || booking.checkOutAt);

  const checkInObj = booking.checkInAt
    ? new Date(booking.checkInAt)
    : parseDateAndTimeToDate(inDateStr, booking.checkInTime || undefined);

  const checkOutObj = booking.checkOutAt
    ? new Date(booking.checkOutAt)
    : parseDateAndTimeToDate(outDateStr, booking.checkOutTime || undefined);

  const nowMs = currentTime.getTime();
  const inMs = checkInObj.getTime();
  const outMs = checkOutObj.getTime();

  // 1. Missed Check-in: UPCOMING status, but scheduled check-in time has passed
  if (status === 'UPCOMING' && inMs < nowMs) {
    return 'MISSED_CHECKIN';
  }

  // 2. Overdue Check-out: check-out date has passed (or passed scheduled checkout time today) and booking is not completed
  if (status !== 'CANCEL' && status !== 'COMPLETE' && (outDateStr < referenceDateStr || (!booking.isOutgoingConfirmed && outMs < nowMs))) {
    return 'OVERDUE_CHECKOUT';
  }

  // 3. Departing Today (Today's Outgoing)
  if (outDateStr === referenceDateStr && status !== 'CANCEL' && status !== 'COMPLETE') {
    return 'TODAY_CHECKOUT';
  }

  // 4. Arriving Today
  if (inDateStr === referenceDateStr && status === 'UPCOMING') {
    return 'TODAY_CHECKIN';
  }

  // 5. Currently Active in Hotel
  if ((status === 'IN_HOTEL' || status === 'RECEIVED' || status === 'OUTGOING') && inMs <= nowMs && outMs >= nowMs) {
    return 'ACTIVE_STAY';
  }

  // 6. Genuinely Upcoming (starts strictly after today)
  if (status === 'UPCOMING' && inDateStr > referenceDateStr) {
    return 'UPCOMING';
  }

  // Default fallbacks based on date position
  if (inDateStr > referenceDateStr) return 'UPCOMING';
  if (outDateStr < referenceDateStr) return 'COMPLETED';

  return 'ACTIVE_STAY';
}
