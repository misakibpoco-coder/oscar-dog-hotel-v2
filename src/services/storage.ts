import { Dog, Booking, AccountSettings, RecentSearch } from '../types/index';

const STORAGE_KEYS = {
  DOGS: 'oscar_dog_hotel_dogs',
  BOOKINGS: 'oscar_dog_hotel_bookings',
  SETTINGS: 'oscar_dog_hotel_settings',
  RECENT_SEARCHES: 'oscar_dog_hotel_recent_searches',
  BOOKING_DRAFT: 'oscar_dog_hotel_booking_draft'
};

export const INITIAL_SETTINGS: AccountSettings = {
  adminName: 'MD Sakib',
  adminAvatar: '/assets/user_avatar.png',
  version: '1.0.3',
  build: '20260923',
  environment: 'Production'
};

// NOTE: No INITIAL_DOGS, INITIAL_BOOKINGS, or INITIAL_SEARCHES.
// The app NEVER seeds demo data. All data comes from Supabase.
// If localStorage is empty, return [] — not demo data.

class StorageService {
  getDogs(): Dog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOGS);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  saveDogs(dogs: Dog[]): void {
    localStorage.setItem(STORAGE_KEYS.DOGS, JSON.stringify(dogs));
  }

  getBookings(): Booking[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  saveBookings(bookings: Booking[]): void {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }

  getSettings(): AccountSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        this.saveSettings(INITIAL_SETTINGS);
        return INITIAL_SETTINGS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  saveSettings(settings: AccountSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  getRecentSearches(): RecentSearch[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  saveRecentSearches(searches: RecentSearch[]): void {
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(searches));
  }

  exportData(): string {
    const data = {
      dogs: this.getDogs(),
      bookings: this.getBookings(),
      settings: this.getSettings(),
      recentSearches: this.getRecentSearches(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  getBookingDraft<T>(): T | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKING_DRAFT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  saveBookingDraft<T>(draft: T | null): void {
    if (draft === null) {
      localStorage.removeItem(STORAGE_KEYS.BOOKING_DRAFT);
    } else {
      localStorage.setItem(STORAGE_KEYS.BOOKING_DRAFT, JSON.stringify(draft));
    }
  }

  clearBookingDraft(): void {
    localStorage.removeItem(STORAGE_KEYS.BOOKING_DRAFT);
  }

  resetToDefault(): void {
    // Disabled in production to safeguard database integrity
    console.warn('[STORAGE] Demo reset is disabled in production.');
  }

  /**
   * Clear all cached local data (called on logout to ensure clean state)
   */
  clearAllCache(): void {
    localStorage.removeItem(STORAGE_KEYS.DOGS);
    localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
    localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
  }
}

export const storageService = new StorageService();
