import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { differenceInCalendarDays, differenceInHours } from 'date-fns';
import { config } from '../config/index.js';

export const DEFAULT_HOTEL_TIMEZONE = config.hotelTimezone;

/**
 * Format a UTC Date into local hotel display date and time (e.g. "Sep 12, 2026" & "10:15 AM")
 */
export function toHotelLocalTime(
  utcDate: Date | string,
  tz: string = DEFAULT_HOTEL_TIMEZONE
): {
  dateFormatted: string; // "Sep 12, 2026"
  timeFormatted: string; // "10:15 AM"
  isoLocal: string;
  rawUtc: string;
} {
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  return {
    dateFormatted: formatInTimeZone(d, tz, 'MMM dd, yyyy'),
    timeFormatted: formatInTimeZone(d, tz, 'hh:mm a'),
    isoLocal: formatInTimeZone(d, tz, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    rawUtc: d.toISOString()
  };
}

/**
 * Calculate stay duration from check-in and check-out
 * Duration is always calculated, never authoritatively stored.
 */
export function calculateStayDuration(
  checkInAt: Date | string,
  checkOutAt: Date | string
): {
  nights: number;
  hours: number;
  label: string; // "3 nights", "1 night", "Same day"
} {
  const inDate = typeof checkInAt === 'string' ? new Date(checkInAt) : checkInAt;
  const outDate = typeof checkOutAt === 'string' ? new Date(checkOutAt) : checkOutAt;

  const nights = differenceInCalendarDays(outDate, inDate);
  const hours = differenceInHours(outDate, inDate);

  let label: string;
  if (nights <= 0) {
    label = 'Same day';
  } else if (nights === 1) {
    label = '1 night';
  } else {
    label = `${nights} nights`;
  }

  return { nights: Math.max(0, nights), hours: Math.max(0, hours), label };
}
