/**
 * Phone Number Normalization Utility
 * Normalizes phone numbers to standard format (e.g. +357 99 123456 -> +35799123456)
 * Supports Cyprus (+357), international, and local formats.
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';

  // 1. Remove all whitespace, dashes, parentheses, dots
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]+/g, '').trim();

  // 2. Handle international prefix '00' -> '+'
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // 3. If local 8-digit Cyprus number starting with 9, 2, 7 -> prepend +357
  if (/^[279]\d{7}$/.test(cleaned)) {
    cleaned = '+357' + cleaned;
  }

  // 4. Ensure leading '+' if not present for international numbers
  if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

export function formatDisplayPhone(normalizedPhone: string): string {
  if (!normalizedPhone) return '';

  // Format Cyprus numbers: +357 99 123456
  const cyprusMatch = normalizedPhone.match(/^\+357(\d{2})(\d{6})$/);
  if (cyprusMatch) {
    return `+357 ${cyprusMatch[1]} ${cyprusMatch[2]}`;
  }

  return normalizedPhone;
}
