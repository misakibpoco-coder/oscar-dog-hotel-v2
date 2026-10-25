import React from 'react';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { Toast } from './Toast';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="app-viewport-wrapper">
      <div className="device-frame-container width-responsive">
        <Header />
        <main className="page-content">{children}</main>
        <BottomNavigation />
        <Toast />
      </div>
    </div>
  );
};
