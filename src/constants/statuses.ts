import { StatusConfig, UniversalStatus } from '../types/index';

/**
 * EXACTLY 6 UNIVERSAL STATUSES
 * Strict requirement:
 * 1. RECEIVED -> 'Received'
 * 2. IN HOTEL -> 'In hotel'
 * 3. UPCOMING -> 'Upcoming'
 * 4. COMPLETE -> 'Complete'
 * 5. CANCEL -> 'Cancel'
 * 6. OUTGOING -> 'Outgoing'
 */
export const STATUSES: Record<UniversalStatus, StatusConfig> = {
  RECEIVED: {
    id: 'RECEIVED',
    label: 'Received',
    color: '#219763',
    bgColor: '#e0f7ec',
    badgeColor: '#219763',
    icon: '✓'
  },
  IN_HOTEL: {
    id: 'IN_HOTEL',
    label: 'In hotel',
    color: '#207c52',
    bgColor: '#e0f7ec',
    badgeColor: '#207c52',
    icon: '●'
  },
  UPCOMING: {
    id: 'UPCOMING',
    label: 'Upcoming',
    color: '#d98d00',
    bgColor: '#fff0dc',
    badgeColor: '#d98d00',
    icon: '◷'
  },
  COMPLETE: {
    id: 'COMPLETE',
    label: 'Complete',
    color: '#5336df',
    bgColor: '#f0edff',
    badgeColor: '#5336df',
    icon: '●'
  },
  CANCEL: {
    id: 'CANCEL',
    label: 'Cancel',
    color: '#d92e4c',
    bgColor: '#fdebee',
    badgeColor: '#d92e4c',
    icon: '×'
  },
  OUTGOING: {
    id: 'OUTGOING',
    label: 'Outgoing',
    color: '#1267df',
    bgColor: '#e7f1ff',
    badgeColor: '#1267df',
    icon: '↗'
  }
};

export const UNIVERSAL_STATUS_LIST: UniversalStatus[] = [
  'RECEIVED',
  'IN_HOTEL',
  'UPCOMING',
  'COMPLETE',
  'CANCEL',
  'OUTGOING'
];

/**
 * Status Action list for user action selectors:
 * Excludes RECEIVED (transitions from UPCOMING go straight to IN_HOTEL)
 * Excludes CANCEL (handled via dedicated "Cancel Booking" action with confirmation)
 */
export const STATUS_ACTION_LIST: UniversalStatus[] = [
  'UPCOMING',
  'IN_HOTEL',
  'OUTGOING',
  'COMPLETE'
];

export const NO_RESERVATION_CONFIG: StatusConfig = {
  id: 'NO_RESERVATION' as any,
  label: 'No reservation',
  color: '#6b7280',
  bgColor: '#f3f4f6',
  badgeColor: '#9ca3af',
  icon: '—'
};

export function getStatusConfig(status: string | null | undefined): StatusConfig {
  if (!status || status === 'NO_RESERVATION' || status === 'No active booking') {
    return NO_RESERVATION_CONFIG;
  }
  if (status in STATUSES) {
    return STATUSES[status as UniversalStatus];
  }
  // Normalization fallback if lower or spaced
  const upper = status.toUpperCase().replace(/\s+/g, '_');
  if (upper in STATUSES) {
    return STATUSES[upper as UniversalStatus];
  }
  return NO_RESERVATION_CONFIG;
}
