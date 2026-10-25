import { Dog } from '../types';

/**
 * Universal dog search matcher for Dog Name, Owner Name, Breed, and Owner Phone.
 * Handles all phone number variations:
 * - Digits only (e.g. 99123456, 123456, 99)
 * - Formatted phone with spaces (e.g. +357 99 123456)
 * - International format without spaces (e.g. +35799123456)
 * - Local numbers with leading 0 (e.g. 099123456)
 * - Punctuation/dashes (e.g. 99-123-456)
 * - Safe against undefined/null fields
 */
export function matchDogSearch(dog: Dog, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const q = rawQuery.trim().toLowerCase();

  // 1. Exact or partial text match on text fields
  const name = (dog.name || '').toLowerCase();
  if (name.includes(q)) return true;

  const ownerName = (dog.ownerName || '').toLowerCase();
  if (ownerName.includes(q)) return true;

  const breed = (dog.breed || '').toLowerCase();
  if (breed.includes(q)) return true;

  const rawPhone = (dog.ownerPhone || '').trim().toLowerCase();
  if (rawPhone && rawPhone.includes(q)) return true;

  // 2. Cleaned punctuation/whitespace match (e.g. +35799123456 vs +357 99 123456)
  const pClean = rawPhone.replace(/[\s\-\(\)\.]+/g, '');
  const qClean = q.replace(/[\s\-\(\)\.]+/g, '');
  if (qClean && pClean.includes(qClean)) return true;

  // 3. Pure digit sequence matching
  const pDigits = rawPhone.replace(/\D/g, '');
  const qDigits = q.replace(/\D/g, '');

  if (qDigits.length >= 2) {
    // Direct digit substring
    if (pDigits.includes(qDigits)) return true;

    // Stripping leading 0 from query (e.g., user entered 099123456 for a +357 99 123456 number)
    const qWithoutLeadingZero = qDigits.replace(/^0+/, '');
    if (qWithoutLeadingZero.length >= 2 && pDigits.includes(qWithoutLeadingZero)) {
      return true;
    }

    // Stripping country code 357 from phone digits (e.g., phone is 35799123456, user entered 99123456)
    const pWithoutCountryCode = pDigits.replace(/^357/, '');
    if (pWithoutCountryCode.includes(qDigits)) {
      return true;
    }
  }

  return false;
}
