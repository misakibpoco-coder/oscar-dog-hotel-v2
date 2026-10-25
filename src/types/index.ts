export type UniversalAvatarId =
  | 'avatar_1'
  | 'avatar_2'
  | 'avatar_3'
  | 'avatar_4'
  | 'avatar_5';

export interface DogAvatarConfig {
  id: UniversalAvatarId;
  label: string;
  breedTag: string;
  imageSrc: string;
}

export type UniversalStatus =
  | 'RECEIVED'
  | 'IN_HOTEL'
  | 'UPCOMING'
  | 'COMPLETE'
  | 'CANCEL'
  | 'OUTGOING';

export interface StatusConfig {
  id: UniversalStatus;
  label: string; // Exact user-facing label: 'Received', 'In hotel', 'Upcoming', 'Complete', 'Cancel', 'Outgoing'
  color: string; // text/border color
  bgColor: string; // light pill background
  badgeColor: string; // solid badge background
  icon: string; // visual symbol e.g. ✓, ●, ◷, ↗, ×
}

export interface Dog {
  id: string;
  name: string;
  avatarId: UniversalAvatarId;
  breed: string;
  dob?: string;
  age?: string;
  gender: 'Male' | 'Female' | 'Other';
  weightKg?: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  // Reservation fields — null when no reservation exists.
  // A dog profile NEVER gets fake default values for these fields.
  status?: UniversalStatus | null;
  notes?: string;
  checkInDate?: string | null;   // YYYY-MM-DD, null when no reservation
  checkInTime?: string | null;
  checkOutDate?: string | null;  // YYYY-MM-DD, null when no reservation
  checkOutTime?: string | null;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  currentBooking?: any;
}

export interface BookingService {
  id: string;
  label: string;
  icon: string;
}

export interface DeliveryMethod {
  checkInMethod?: 'STANDARD' | 'OSCAR_PICKUP';
  checkInAddress?: string;
  checkOutMethod?: 'OWNER_PICKUP' | 'OSCAR_DROPOFF';
  checkOutAddress?: string;
}

export interface Booking {
  id: string;
  dogId: string;
  dog?: Dog;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  status: UniversalStatus;
  services: string[]; // IDs of selected services: bathing, grooming, etc.
  notes?: string;
  deliveryMethod?: DeliveryMethod;
  durationNights: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSettings {
  adminName: string;
  adminAvatar: string;
  version: string;
  build: string;
  environment: string;
}

export interface RecentSearch {
  id: string;
  query: string;
  type: 'Dog name' | 'Owner name' | 'Phone number' | 'Date range' | 'General';
  timestamp: string;
}

export interface FilterState {
  searchQuery: string;
  statusFilter: UniversalStatus | 'ALL';
  dateRangeFilter: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';
  customFromDate?: string;
  customToDate?: string;
}

export interface OwnerConflictDetails {
  existingOwnerId: string;
  existingName: string;
  existingPhone: string;
  existingEmail?: string;
  inputName: string;
}

export interface OverdueAttentionDog {
  bookingId: string;
  dogId: string;
  dogName: string;
  dogBreed: string;
  dogAvatarId: UniversalAvatarId;
  ownerName: string;
  ownerPhone: string;
  alertTitle?: string;
  alertType?: 'MISSED_CHECKIN' | 'OVERDUE_CHECKOUT';
  scheduledEventDate?: string;
  scheduledEventDateFormatted?: string;
  scheduledCheckOut: string;
  scheduledCheckOutFormatted: string;
  currentStatus: UniversalStatus;
  attention: {
    requiresAttention: boolean;
    attentionType: 'NONE' | 'OUTGOING_CONFIRMATION_REQUIRED' | 'OVERDUE_UNRESOLVED' | 'MISSED_CHECKIN' | 'OVERDUE_CHECKOUT';
    isOverdue: boolean;
    overdueMinutes: number;
  };
}

export interface BackendSessionState {
  isConnected: boolean;
  isAuthenticating: boolean;
  staffEmail: string | null;
  hotelName: string | null;
  lastSyncAt: string | null;
  error: string | null;
}
