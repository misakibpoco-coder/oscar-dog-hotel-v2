export type UniversalAvatarId =
  | 'avatar_1'
  | 'avatar_2'
  | 'avatar_3'
  | 'avatar_4'
  | 'avatar_5';

export interface AvatarDefinition {
  id: UniversalAvatarId;
  label: string;
  breedTag: string;
  imageUrl: string;
}

export const UNIVERSAL_DOG_AVATARS: readonly AvatarDefinition[] = [
  {
    id: 'avatar_1',
    label: 'Golden / Bruno',
    breedTag: 'Golden Retriever',
    imageUrl: '/assets/dog_avatar_1.png'
  },
  {
    id: 'avatar_2',
    label: 'Beagle / Luna',
    breedTag: 'Beagle',
    imageUrl: '/assets/dog_avatar_2.png'
  },
  {
    id: 'avatar_3',
    label: 'Labrador / Max',
    breedTag: 'Labrador Retriever',
    imageUrl: '/assets/dog_avatar_3.png'
  },
  {
    id: 'avatar_4',
    label: 'Shih Tzu / Buddy',
    breedTag: 'Shih Tzu',
    imageUrl: '/assets/dog_avatar_4.png'
  },
  {
    id: 'avatar_5',
    label: 'Yorkshire / Bella',
    breedTag: 'Yorkshire Terrier',
    imageUrl: '/assets/dog_avatar_5.png'
  }
] as const;

export const VALID_AVATAR_IDS = new Set<string>(UNIVERSAL_DOG_AVATARS.map((a) => a.id));

export function isValidAvatarId(id: string): id is UniversalAvatarId {
  return VALID_AVATAR_IDS.has(id);
}

export type UniversalStatus =
  | 'RECEIVED'
  | 'IN_HOTEL'
  | 'UPCOMING'
  | 'COMPLETE'
  | 'CANCEL'
  | 'OUTGOING';

export interface StatusDefinition {
  id: UniversalStatus;
  label: string; // Exact user-facing label
  color: string;
  bgColor: string;
  badgeColor: string;
  icon: string;
  description: string;
}

export const UNIVERSAL_STATUSES: Record<UniversalStatus, StatusDefinition> = {
  RECEIVED: {
    id: 'RECEIVED',
    label: 'Received',
    color: '#219763',
    bgColor: '#e0f7ec',
    badgeColor: '#219763',
    icon: '✓',
    description: 'Dog/reservation has been received/registered for the operational process.'
  },
  IN_HOTEL: {
    id: 'IN_HOTEL',
    label: 'In hotel',
    color: '#207c52',
    bgColor: '#e0f7ec',
    badgeColor: '#207c52',
    icon: '●',
    description: 'Dog is currently staying at the hotel.'
  },
  UPCOMING: {
    id: 'UPCOMING',
    label: 'Upcoming',
    color: '#d98d00',
    bgColor: '#fff0dc',
    badgeColor: '#d98d00',
    icon: '◷',
    description: 'Relevant stay has not started yet.'
  },
  COMPLETE: {
    id: 'COMPLETE',
    label: 'Complete',
    color: '#5336df',
    bgColor: '#f0edff',
    badgeColor: '#5336df',
    icon: '●',
    description: 'Stay/departure has been completed.'
  },
  CANCEL: {
    id: 'CANCEL',
    label: 'Cancel',
    color: '#d92e4c',
    bgColor: '#fdebee',
    badgeColor: '#d92e4c',
    icon: '×',
    description: 'Booking was cancelled.'
  },
  OUTGOING: {
    id: 'OUTGOING',
    label: 'Outgoing',
    color: '#1267df',
    bgColor: '#e7f1ff',
    badgeColor: '#1267df',
    icon: '↗',
    description: 'Dog is due to leave / departure process has been initiated.'
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

export const VALID_STATUS_IDS = new Set<string>(UNIVERSAL_STATUS_LIST);

export function isValidStatus(status: string): status is UniversalStatus {
  return VALID_STATUS_IDS.has(status);
}

export function normalizeStatus(status: string): UniversalStatus | null {
  const upper = status.trim().toUpperCase().replace(/\s+/g, '_');
  if (upper === 'CANCELLED') return 'CANCEL';
  if (isValidStatus(upper)) return upper as UniversalStatus;
  return null;
}
