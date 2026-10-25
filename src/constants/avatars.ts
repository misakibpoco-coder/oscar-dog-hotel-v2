import { DogAvatarConfig, UniversalAvatarId } from '../types/index';

/**
 * EXACTLY 5 UNIVERSAL DOG AVATARS
 * Extracted directly from Oscar_Dog_Hotel_New_Profile_Editable.svg.
 * These 5 avatars are used across every dog-related view in the application.
 */
export const DOG_AVATARS: readonly DogAvatarConfig[] = [
  {
    id: 'avatar_1',
    label: 'Golden / Bruno',
    breedTag: 'Golden Retriever',
    imageSrc: '/assets/dog_avatar_1.png'
  },
  {
    id: 'avatar_2',
    label: 'Beagle / Luna',
    breedTag: 'Beagle',
    imageSrc: '/assets/dog_avatar_2.png'
  },
  {
    id: 'avatar_3',
    label: 'Labrador / Max',
    breedTag: 'Labrador Retriever',
    imageSrc: '/assets/dog_avatar_3.png'
  },
  {
    id: 'avatar_4',
    label: 'Shih Tzu / Buddy',
    breedTag: 'Shih Tzu',
    imageSrc: '/assets/dog_avatar_4.png'
  },
  {
    id: 'avatar_5',
    label: 'Yorkshire / Bella',
    breedTag: 'Yorkshire Terrier',
    imageSrc: '/assets/dog_avatar_5.png'
  }
] as const;

export const DEFAULT_AVATAR_ID: UniversalAvatarId = 'avatar_1';

export function getDogAvatar(avatarId: string | undefined): DogAvatarConfig {
  const found = DOG_AVATARS.find((a) => a.id === avatarId);
  return found || DOG_AVATARS[0];
}
