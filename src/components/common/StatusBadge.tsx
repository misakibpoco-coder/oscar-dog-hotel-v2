import React from 'react';
import { getStatusConfig } from '../../constants/statuses';
import { UniversalStatus } from '../../types';

interface StatusBadgeProps {
  status?: UniversalStatus | string | null;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const config = getStatusConfig(status);

  const fontSizes = {
    sm: '0.72rem',
    md: '0.8rem',
    lg: '0.9rem'
  }[size];

  const paddings = {
    sm: '3px 8px',
    md: '4px 11px',
    lg: '6px 14px'
  }[size];

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        fontSize: fontSizes,
        padding: paddings,
        borderRadius: '9999px',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        border: `1px solid ${config.color}22`
      }}
    >
      {showIcon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size === 'sm' ? '12px' : '15px',
            height: size === 'sm' ? '12px' : '15px',
            borderRadius: '50%',
            backgroundColor: config.badgeColor,
            color: '#ffffff',
            fontSize: size === 'sm' ? '9px' : '10px',
            lineHeight: 1,
            fontWeight: 800
          }}
        >
          {config.icon}
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
};
