import React from 'react';

export const SplashScreen: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulseLogo 2s ease-in-out infinite'
        }}
      >
        <img
          src="/assets/new_logo.png"
          alt="Oscar Dog Hotel"
          style={{
            width: '215px',
            height: '215px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 8px 24px rgba(18, 103, 223, 0.2))'
          }}
        />
      </div>
      <style>{`
        @keyframes pulseLogo {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.04); opacity: 0.92; }
        }
      `}</style>
    </div>
  );
};
