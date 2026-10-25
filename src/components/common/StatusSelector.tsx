import React from 'react';
import { STATUS_ACTION_LIST, getStatusConfig } from '../../constants/statuses';
import { UniversalStatus } from '../../types';

interface StatusSelectorProps {
  currentStatus: UniversalStatus | string;
  onSelect: (status: UniversalStatus) => void;
  disabled?: boolean;
  allowedStatuses?: UniversalStatus[];
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onSelect,
  disabled = false,
  allowedStatuses
}) => {
  const statusList = allowedStatuses || STATUS_ACTION_LIST;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
        gap: '8px',
        width: '100%'
      }}
    >
      {statusList.map((statusKey) => {
        const config = getStatusConfig(statusKey);
        const isSelected = currentStatus === statusKey;

        return (
          <button
            key={statusKey}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(statusKey)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 8px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? '#ffffff' : config.color,
              backgroundColor: isSelected ? config.badgeColor : config.bgColor,
              border: `1.5px solid ${isSelected ? config.badgeColor : config.color + '33'}`,
              boxShadow: isSelected
                ? `0 3px 10px ${config.color}40`
                : 'none',
              transition: 'all 0.18s ease',
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer'
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 800
              }}
            >
              {config.icon}
            </span>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};
