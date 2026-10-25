import React from 'react';
import { getDogAvatar } from '../../constants/avatars';
import { UniversalAvatarId } from '../../types';

interface DogAvatarProps {
  avatarId?: UniversalAvatarId | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded';
  border?: boolean;
  className?: string;
  alt?: string;
}

export const DogAvatar: React.FC<DogAvatarProps> = ({
  avatarId,
  size = 'md',
  shape = 'rounded',
  border = true,
  className = '',
  alt
}) => {
  const avatar = getDogAvatar(avatarId);

  const sizeStyles = {
    sm: { width: '38px', height: '38px' },
    md: { width: '52px', height: '52px' },
    lg: { width: '74px', height: '74px' },
    xl: { width: '105px', height: '105px' }
  }[size];

  const borderRadius = shape === 'circle' ? '50%' : size === 'xl' ? '18px' : '14px';

  return (
    <div
      className={`dog-avatar-container ${className}`}
      style={{
        ...sizeStyles,
        borderRadius,
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: '#eaf1fb',
        border: border ? '2px solid #ffffff' : 'none',
        boxShadow: border ? '0 2px 8px rgba(7, 19, 61, 0.08)' : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <img
        src={avatar.imageSrc}
        alt={alt || avatar.label}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        onError={(e) => {
          // Fallback if image fails to load
          (e.target as HTMLImageElement).src = '/assets/dog_avatar_1.png';
        }}
      />
    </div>
  );
};
