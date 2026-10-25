import React from 'react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const { settings, navigate } = useApp();

  return (
    <header className="app-header">
      <div
        className="header-left"
        onClick={() => navigate('/dashboard')}
        style={{ cursor: 'pointer' }}
      >
        <img
          src="/assets/hotel_logo.png"
          alt="Oscar Dog Hotel"
          className="header-logo-img"
        />
        <div className="header-title-group">
          <h1>Oscar Dog Hotel</h1>
          <p>Management & Reservation</p>
        </div>
      </div>

      <button
        type="button"
        className="header-avatar-btn"
        onClick={() => navigate('/settings')}
        title="Account Settings"
        aria-label="Account Settings"
      >
        <img
          src={settings.adminAvatar || '/assets/user_avatar.png'}
          alt={settings.adminName || 'Admin'}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/user_avatar.png';
          }}
        />
      </button>
    </header>
  );
};
