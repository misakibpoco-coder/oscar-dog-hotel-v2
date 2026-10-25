import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Home,
  PawPrint,
  CalendarDays,
  UserPlus,
  SlidersHorizontal
} from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const { currentRoute, navigate } = useApp();

  const isTabActive = (route: string) => {
    if (route === '/dashboard') {
      return currentRoute === '/dashboard' || currentRoute === '' || currentRoute === '/';
    }
    if (route === '/dogs') {
      return currentRoute === '/dogs' || (currentRoute.startsWith('/dogs/') && currentRoute !== '/dogs/new');
    }
    if (route === '/bookings') {
      return currentRoute === '/bookings' || currentRoute.startsWith('/bookings/');
    }
    if (route === '/dogs/new') {
      return currentRoute === '/dogs/new';
    }
    if (route === '/settings') {
      return currentRoute === '/settings';
    }
    return currentRoute === route;
  };

  const navItems = [
    {
      label: 'Home',
      route: '/dashboard',
      icon: Home
    },
    {
      label: 'Dogs',
      route: '/dogs',
      icon: PawPrint
    },
    {
      label: 'Bookings',
      route: '/bookings',
      icon: CalendarDays
    },
    {
      label: 'New Profile',
      route: '/dogs/new',
      icon: UserPlus
    },
    {
      label: 'More',
      route: '/settings',
      icon: SlidersHorizontal
    }
  ];

  return (
    <nav className="bottom-nav" aria-label="Bottom Navigation">
      {navItems.map((item) => {
        const active = isTabActive(item.route);
        const Icon = item.icon;

        return (
          <button
            key={item.route}
            type="button"
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.route)}
            aria-label={item.label}
          >
            <div className="nav-icon-wrapper">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
