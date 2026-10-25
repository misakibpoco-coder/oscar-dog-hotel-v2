import React from 'react';
import { useApp } from './context/AppContext';
import { AppShell } from './components/common/AppShell';
import { SplashScreen } from './components/common/SplashScreen';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DogsPage } from './pages/DogsPage';
import { DogDetailsPage } from './pages/DogDetailsPage';
import { NewProfilePage } from './pages/NewProfilePage';
import { BookingsPage } from './pages/BookingsPage';
import { NewBookingPage } from './pages/NewBookingPage';
import { SearchFilterPage } from './pages/SearchFilterPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const { currentRoute, isLoadingSession, isAuthenticated } = useApp();

  if (isLoadingSession) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderCurrentPage = () => {
    if (currentRoute === '/dashboard' || currentRoute === '' || currentRoute === '/') {
      return <DashboardPage />;
    }
    if (currentRoute === '/dogs') {
      return <DogsPage />;
    }
    if (currentRoute === '/dogs/new') {
      return <NewProfilePage />;
    }
    if (currentRoute.startsWith('/dogs/')) {
      return <DogDetailsPage />;
    }
    if (currentRoute === '/bookings') {
      return <BookingsPage />;
    }
    if (currentRoute === '/bookings/new') {
      return <NewBookingPage />;
    }
    if (currentRoute === '/search') {
      return <SearchFilterPage />;
    }
    if (currentRoute === '/settings') {
      return <SettingsPage />;
    }
    return <DashboardPage />;
  };

  return <AppShell>{renderCurrentPage()}</AppShell>;
};
