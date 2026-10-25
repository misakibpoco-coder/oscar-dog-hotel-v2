import React from 'react';
import { DOG_AVATARS } from '../../constants/avatars';
import { UniversalAvatarId } from '../../types';

interface AvatarSelectorProps {
  selectedId: UniversalAvatarId;
  onSelect: (id: UniversalAvatarId) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedId,
  onSelect
}) => {
  return (
    <div className="avatar-selector-section">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 0'
        }}
      >
        {DOG_AVATARS.map((avatar) => {
          const isSelected = avatar.id === selectedId;
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onSelect(avatar.id)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '16px',
                border: isSelected
                  ? '3px solid #1267df'
                  : '2px solid transparent',
                backgroundColor: isSelected ? '#e7f1ff' : '#ffffff',
                boxShadow: isSelected
                  ? '0 4px 14px rgba(18, 103, 223, 0.25)'
                  : '0 2px 6px rgba(7, 19, 61, 0.05)',
                transition: 'all 0.18s ease',
                transform: isSelected ? 'scale(1.04)' : 'scale(1)'
              }}
              title={avatar.breedTag}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#eaf1fb'
                }}
              >
                <img
                  src={avatar.imageSrc}
                  alt={avatar.label}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>

              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#1267df',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
