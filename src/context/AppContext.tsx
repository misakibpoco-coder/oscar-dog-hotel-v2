import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Dog,
  Booking,
  AccountSettings,
  RecentSearch,
  UniversalStatus,
  UniversalAvatarId,
  FilterState,
  BackendSessionState,
  OverdueAttentionDog
} from '../types';
import { storageService } from '../services/storage';
import { api, ApiError, UserSessionAccount } from '../services/api';
import { supabase } from '../services/supabase';
import { getTodayDateString, toDateString, combineDateAndTime, formatTimeFromDate } from '../utils/date';
import { App as CapApp } from '@capacitor/app';

export type DeviceWidthMode = 'responsive' | 320 | 360 | 375 | 390 | 412 | 430 | 709;

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  dogs: Dog[];
  bookings: Booking[];
  settings: AccountSettings;
  recentSearches: RecentSearch[];
  currentRoute: string;
  selectedDogId: string | null;
  navigate: (route: string, dogId?: string) => void;
  goBack: () => void;

  // Backend Integration State
  backendSession: BackendSessionState;
  sessionAccount: UserSessionAccount | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  createAccount: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  overdueAttentionList: OverdueAttentionDog[];
  refreshData: () => Promise<void>;

  // CRUD Operations (Connected to REST API)
  addDog: (dogData: Omit<Dog, 'id' | 'createdAt' | 'updatedAt'>, confirmExistingOwnerId?: string) => Promise<Dog>;
  updateDog: (id: string, updates: Partial<Dog>) => Promise<void>;
  updateDogStatus: (id: string, newStatus: UniversalStatus, effectiveAt?: string, notes?: string) => Promise<void>;
  deleteDog: (id: string) => Promise<void>;
  archiveDog: (id: string, reason?: string) => Promise<void>;
  restoreDog: (id: string) => Promise<void>;

  addBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Booking>;
  updateBookingStatus: (id: string, newStatus: UniversalStatus, effectiveAt?: string, notes?: string) => Promise<void>;
  rescheduleCheckIn: (id: string, newCheckInAt: string, notes?: string) => Promise<void>;
  rescheduleCheckOut: (id: string, newCheckOutAt: string, notes?: string) => Promise<void>;
  extendBooking: (id: string, newCheckOutAt: string, notes?: string) => Promise<void>;
  confirmOutgoing: (id: string) => Promise<void>;

  updateSettings: (updates: Partial<AccountSettings>) => void;
  addRecentSearch: (query: string, type?: RecentSearch['type']) => void;
  clearRecentSearches: () => void;
  resetAllData: () => void;

  // Toast
  toast: ToastState;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Filtering
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;

  // Real-time Statistics
  stats: {
    totalDogs: number;
    inHotelCount: number;
    inHotelTodayAllCount: number;
    todayCheckIn: number;
    todayCheckOut: number;
    upcomingCount: number;
    completeCount: number;
    cancelCount: number;
    outgoingCount: number;
    receivedCount: number;
    overdueAttentionCount: number;
  };

  // Responsive Device Frame
  deviceWidth: DeviceWidthMode;
  setDeviceWidth: (w: DeviceWidthMode) => void;
  getDogById: (id: string) => Dog | undefined;
  getBookingById: (id: string) => Booking | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_FILTER_STATE: FilterState = {
  searchQuery: '',
  statusFilter: 'ALL',
  dateRangeFilter: 'ALL'
};

// Data mapper helpers
function mapBackendDogToFrontend(d: any): Dog {
  const avatarId = (d.avatarId || d.avatar_id || 'avatar_1') as UniversalAvatarId;
  const ownerName = d.owner?.name || d.owner_name || d.ownerName || 'Unknown Owner';
  const ownerPhone = d.owner?.phone || d.owner_phone || d.ownerPhone || '';
  const ownerEmail = d.owner?.email || d.owner_email || d.ownerEmail || '';

  // status is null when the dog has no reservation — NEVER default to 'RECEIVED'
  const rawStatus = d.currentStatus || d.status;
  let status = (rawStatus && rawStatus !== 'No active booking') ? rawStatus as UniversalStatus : null;

  const booking = d.currentBooking;
  // dates/times are null when there is no booking — NEVER use hardcoded fallback dates
  const checkInDate = booking ? (booking.checkInLocal?.dateFormatted || booking.checkInAt?.split('T')[0] || d.checkInDate || null) : (d.checkInDate || null);
  const checkInTime = booking ? (booking.checkInLocal?.timeFormatted || d.checkInTime || null) : (d.checkInTime || null);
  const checkOutDate = booking ? (booking.checkOutLocal?.dateFormatted || booking.checkOutAt?.split('T')[0] || d.checkOutDate || null) : (d.checkOutDate || null);
  const checkOutTime = booking ? (booking.checkOutLocal?.timeFormatted || d.checkOutTime || null) : (d.checkOutTime || null);

  const todayStr = getTodayDateString();
  if (status && status !== 'CANCEL' && status !== 'COMPLETE') {
    if (checkOutDate && toDateString(checkOutDate) === todayStr) {
      status = 'OUTGOING';
    }
  }

  const dob = d.dateOfBirth || d.date_of_birth || d.dob;
  const age = dob
    ? `${Math.max(1, new Date().getFullYear() - new Date(dob).getFullYear())} yrs`
    : (d.age || undefined);

  return {
    id: d.id,
    name: d.name,
    avatarId,
    breed: d.breed,
    dob,
    age,
    gender: d.gender || undefined,
    weightKg: d.weightKg !== undefined ? d.weightKg : (d.weight_kg ? parseFloat(d.weight_kg) : undefined),
    ownerName,
    ownerPhone,
    ownerEmail,
    status,       // null = no reservation
    notes: d.specialNotes || d.special_notes || d.notes,
    checkInDate,  // null = no reservation
    checkInTime,  // null = no reservation
    checkOutDate, // null = no reservation
    checkOutTime, // null = no reservation
    createdAt: d.createdAt || d.created_at || new Date().toISOString(),
    updatedAt: d.updatedAt || d.updated_at || new Date().toISOString()
  };
}

function mapBackendBookingToFrontend(b: any): Booking {
  const checkInDate = toDateString(b.check_in_at || b.checkInAt);
  const checkOutDate = toDateString(b.check_out_at || b.checkOutAt);
  const todayStr = getTodayDateString();
  let status = (b.currentStatus || b.current_status || b.status || 'UPCOMING') as UniversalStatus;

  // Auto Outgoing rule: On check-out date (from 00:00 start of date),
  // any non-cancelled and non-completed booking automatically becomes OUTGOING
  if (status !== 'CANCEL' && status !== 'COMPLETE') {
    if (checkOutDate === todayStr) {
      status = 'OUTGOING';
    }
  }

  return {
    id: b.id,
    dogId: b.dogId || b.dog_id,
    dog: b.dog ? mapBackendDogToFrontend(b.dog) : undefined,
    checkInDate,
    checkInTime: b.checkInLocal?.timeFormatted || (b.check_in_at ? formatTimeFromDate(b.check_in_at) : '') || '10:00 AM',
    checkOutDate,
    checkOutTime: b.checkOutLocal?.timeFormatted || (b.check_out_at ? formatTimeFromDate(b.check_out_at) : '') || '10:00 AM',
    status,
    services: Array.isArray(b.services) ? b.services : (typeof b.services === 'string' ? JSON.parse(b.services) : []),
    notes: b.notes,
    deliveryMethod: b.deliveryMethod || b.delivery_method || undefined,
    durationNights: b.duration?.nights || b.durationNights || 1,
    createdAt: b.createdAt || b.created_at || new Date().toISOString(),
    updatedAt: b.updatedAt || b.updated_at || new Date().toISOString()
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start clean — all live data comes from Supabase after login.
  // Storage is only used as a read-through cache, never to seed demo data.
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<AccountSettings>(() => storageService.getSettings());
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [overdueAttentionList, setOverdueAttentionList] = useState<OverdueAttentionDog[]>([]);

  const [sessionAccount, setSessionAccount] = useState<UserSessionAccount | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  // Backend session state
  const [backendSession, setBackendSession] = useState<BackendSessionState>({
    isConnected: false,
    isAuthenticating: true,
    staffEmail: null,
    hotelName: 'Oscar Dog Hotel',
    lastSyncAt: null,
    error: null
  });

  // Routing with history stack
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.hash ? window.location.hash.slice(1) : '/dashboard';
  });
  const [selectedDogId, setSelectedDogId] = useState<string | null>(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('/dogs/') && hash !== '/dogs/new') {
      return hash.replace('/dogs/', '');
    }
    return null;
  });
  const [historyStack, setHistoryStack] = useState<string[]>(['/dashboard']);

  // Toast
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success'
  });

  const [filterState, setFilterState] = useState<FilterState>(INITIAL_FILTER_STATE);
  const [deviceWidth, setDeviceWidth] = useState<DeviceWidthMode>('responsive');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  }, []);

  // Fetch / synchronize all data from the REST API
  const refreshData = useCallback(async () => {
    try {
      const [backendDogs, backendBookings, dashboardData] = await Promise.all([
        api.dogs.listDogs(),
        api.bookings.listBookings(),
        api.dashboard.getDashboardMetrics()
      ]);

      if (Array.isArray(backendDogs)) {
        const mappedDogs = backendDogs.map(mapBackendDogToFrontend);
        setDogs(mappedDogs);
        storageService.saveDogs(mappedDogs);
      }

      if (Array.isArray(backendBookings)) {
        const mappedBookings = backendBookings.map(mapBackendBookingToFrontend);
        setBookings(mappedBookings);
        storageService.saveBookings(mappedBookings);
      }

      if (dashboardData?.overdueAttentionList) {
        setOverdueAttentionList(dashboardData.overdueAttentionList as any);
      }

      setBackendSession((prev) => ({
        ...prev,
        isConnected: true,
        lastSyncAt: new Date().toLocaleTimeString(),
        error: null
      }));
    } catch (err: any) {
      console.warn('[API SYNC] Could not refresh from backend, utilizing cached storage:', err);
      setBackendSession((prev) => ({
        ...prev,
        isConnected: false,
        error: err.message || 'API unreachable'
      }));
    }
  }, []);

  // Initialize backend session on startup (Persistent Login / Auto Login)
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      const startTime = Date.now();
      try {
        setIsLoadingSession(true);
        const account = await api.auth.validateSession();
        if (isMounted) {
          if (account) {
            setSessionAccount(account);
            setIsAuthenticated(true);
            setBackendSession({
              isConnected: true,
              isAuthenticating: false,
              staffEmail: account.identifier,
              hotelName: account.hotelName || 'Oscar Dog Hotel',
              lastSyncAt: new Date().toLocaleTimeString(),
              error: null
            });
            await refreshData();
          } else {
            setSessionAccount(null);
            setIsAuthenticated(false);
            setBackendSession({
              isConnected: false,
              isAuthenticating: false,
              staffEmail: null,
              hotelName: 'Oscar Dog Hotel',
              lastSyncAt: null,
              error: null
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[BACKEND AUTH] Session check failed:', err);
          setSessionAccount(null);
          setIsAuthenticated(false);
        }
      } finally {
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, 2000 - elapsed);
        setTimeout(() => {
          if (isMounted) {
            setIsLoadingSession(false);
          }
        }, remainingDelay);
      }
    }

    initSession();
    return () => {
      isMounted = false;
    };
  }, [refreshData]);

  // Midnight / Periodic refresh to keep TODAY dynamic
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const login = async (identifier: string, password: string) => {
    const res = await api.auth.login(identifier, password);
    setSessionAccount(res.account);
    setIsAuthenticated(true);
    setBackendSession({
      isConnected: true,
      isAuthenticating: false,
      staffEmail: res.account.identifier,
      hotelName: res.account.hotelName || 'Oscar Dog Hotel',
      lastSyncAt: new Date().toLocaleTimeString(),
      error: null
    });
    showToast(`Welcome back, ${res.account.displayName}!`, 'success');
    await refreshData();
    navigate('/dashboard');
  };

  const createAccount = async (identifier: string, password: string) => {
    const res = await api.auth.createAccount(identifier, password);
    setSessionAccount(res.account);
    setIsAuthenticated(true);
    setBackendSession({
      isConnected: true,
      isAuthenticating: false,
      staffEmail: res.account.identifier,
      hotelName: 'Personal Account',
      lastSyncAt: new Date().toLocaleTimeString(),
      error: null
    });
    showToast('Account registered successfully!', 'success');
    await refreshData();
    navigate('/dashboard');
  };

  const logout = async () => {
    await api.auth.logout();
    setSessionAccount(null);
    setIsAuthenticated(false);
    setDogs([]);
    setBookings([]);
    showToast('Logged out successfully.', 'info');
  };

  // Realtime multi-device database subscription
  useEffect(() => {
    const channel = supabase
      .channel('oscar-db-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dogs' }, () => {
        refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'owners' }, () => {
        refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_history' }, () => {
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  // Sync route with URL hash
  const navigate = useCallback((route: string, dogId?: string) => {
    let finalRoute = route;
    if (dogId) {
      if (route === '/bookings/new') {
        finalRoute = '/bookings/new';
        setSelectedDogId(dogId);
      } else {
        finalRoute = `/dogs/${dogId}`;
        setSelectedDogId(dogId);
      }
    } else if (route.startsWith('/dogs/') && route !== '/dogs/new') {
      setSelectedDogId(route.replace('/dogs/', ''));
    } else if (route !== '/bookings/new') {
      setSelectedDogId(null);
    }

    // Automatically clear search query when switching routes
    setFilterState((prev) => ({ ...prev, searchQuery: '' }));

    setHistoryStack((prev) => [...prev, finalRoute]);
    setCurrentRoute(finalRoute);
    window.location.hash = finalRoute;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    // Automatically clear search query when navigating back
    setFilterState((prev) => ({ ...prev, searchQuery: '' }));

    if (historyStack.length > 1) {
      const newStack = [...historyStack];
      newStack.pop();
      const prev = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      setCurrentRoute(prev);
      window.location.hash = prev;
      if (prev.startsWith('/dogs/') && prev !== '/dogs/new') {
        setSelectedDogId(prev.replace('/dogs/', ''));
      } else if (prev !== '/bookings/new') {
        setSelectedDogId(null);
      }
    } else {
      navigate('/dashboard');
    }
  }, [historyStack, navigate]);

  // Keep refs for Capacitor hardware back button handler
  const historyStackRef = useRef(historyStack);
  historyStackRef.current = historyStack;
  const currentRouteRef = useRef(currentRoute);
  currentRouteRef.current = currentRoute;

  // Requirement 22: Native Android hardware back button handler
  useEffect(() => {
    let listenerHandle: any = null;
    CapApp.addListener('backButton', () => {
      const stack = historyStackRef.current;
      const route = currentRouteRef.current;
      if (stack.length <= 1 || route === '/dashboard') {
        CapApp.exitApp();
      } else {
        goBack();
      }
    }).then((handle) => {
      listenerHandle = handle;
    }).catch(() => {
      // In web browser where Capacitor App plugin is inactive
    });

    return () => {
      if (listenerHandle && listenerHandle.remove) {
        listenerHandle.remove();
      }
    };
  }, [goBack]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash ? window.location.hash.slice(1) : '/dashboard';
      setCurrentRoute(hash);
      setFilterState((prev) => ({ ...prev, searchQuery: '' }));
      if (hash.startsWith('/dogs/') && hash !== '/dogs/new') {
        setSelectedDogId(hash.replace('/dogs/', ''));
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // CRUD Operations connected to REST API
  const addDog = async (
    dogData: Omit<Dog, 'id' | 'createdAt' | 'updatedAt'>,
    confirmExistingOwnerId?: string
  ): Promise<Dog> => {
    try {
      const createdBackendDog = await api.dogs.createDog({
        name: dogData.name,
        breed: dogData.breed,
        dateOfBirth: dogData.dob,
        gender: dogData.gender,
        weightKg: dogData.weightKg,
        avatarId: dogData.avatarId,
        specialNotes: dogData.notes,
        ownerName: dogData.ownerName,
        ownerPhone: dogData.ownerPhone,
        ownerEmail: dogData.ownerEmail,
        confirmExistingOwnerId
      });

      const newDog = mapBackendDogToFrontend(createdBackendDog);
      setDogs((prev) => [newDog, ...prev]);
      showToast(`Dog profile for "${newDog.name}" saved to database!`, 'success');
      await refreshData();
      return newDog;
    } catch (err: any) {
      // Re-throw ApiError so callers (e.g. NewProfilePage) can inspect error code (e.g. OWNER_PHONE_CONFLICT)
      if (err instanceof ApiError) {
        throw err;
      }
      showToast(err.message || 'Failed to create dog', 'error');
      throw err;
    }
  };

  const updateDog = async (id: string, updates: Partial<Dog>) => {
    try {
      await api.dogs.updateDog(id, {
        name: updates.name,
        breed: updates.breed,
        dateOfBirth: updates.dob,
        gender: updates.gender,
        weightKg: updates.weightKg,
        avatarId: updates.avatarId,
        specialNotes: updates.notes,
        ownerName: updates.ownerName,
        ownerPhone: updates.ownerPhone,
        ownerEmail: updates.ownerEmail
      });
      showToast('Dog information updated in database!', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update dog', 'error');
      throw err;
    }
  };

  const updateDogStatus = async (
    id: string,
    newStatus: UniversalStatus,
    effectiveAt: string = new Date().toISOString(),
    notes?: string
  ) => {
    try {
      // Find active booking for this dog prioritizing active stay or upcoming
      const activeBooking =
        bookings.find((b) => b.dogId === id && b.status !== 'CANCEL' && b.status !== 'COMPLETE') ||
        bookings.find((b) => b.dogId === id);

      if (activeBooking) {
        await updateBookingStatus(activeBooking.id, newStatus, effectiveAt, notes);
      } else {
        setDogs((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)));
        showToast(`Status updated to "${newStatus.replace('_', ' ')}"`, 'success');
        await refreshData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
      throw err;
    }
  };

  const deleteDog = async (id: string) => {
    try {
      const dogToDelete = dogs.find((d) => d.id === id);
      await api.dogs.deleteDog(id);
      // Immediately cascade remove from all app state, alerts, recent searches, and cached storage (Requirements 5 & 22)
      setDogs((prev) => prev.filter((d) => d.id !== id));
      setBookings((prev) => prev.filter((b) => b.dogId !== id));
      setOverdueAttentionList((prev) => prev.filter((o) => o.dogId !== id));
      if (dogToDelete) {
        setRecentSearches((prev) => prev.filter((s) => s.query.toLowerCase() !== dogToDelete.name.toLowerCase()));
      }
      storageService.saveDogs(storageService.getDogs().filter((d) => d.id !== id));
      storageService.saveBookings(storageService.getBookings().filter((b) => b.dogId !== id));

      showToast('Dog profile and all related data deleted completely.', 'info');
      await refreshData();
      navigate('/dogs');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove dog', 'error');
    }
  };

  const archiveDog = async (id: string, reason?: string) => {
    try {
      await api.dogs.archiveDog(id, reason);
      showToast('Dog profile archived.', 'info');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive dog', 'error');
      throw err;
    }
  };

  const restoreDog = async (id: string) => {
    try {
      await api.dogs.restoreDog(id);
      showToast('Dog profile restored successfully!', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore dog', 'error');
      throw err;
    }
  };

  const addBooking = async (
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Booking> => {
    try {
      const checkInIso = combineDateAndTime(bookingData.checkInDate, bookingData.checkInTime);
      const checkOutIso = combineDateAndTime(bookingData.checkOutDate, bookingData.checkOutTime);

      const createdBackendBooking = await api.bookings.createBooking({
        dogId: bookingData.dogId,
        checkInAt: checkInIso,
        checkOutAt: checkOutIso,
        status: bookingData.status,
        services: bookingData.services,
        notes: bookingData.notes,
        deliveryMethod: bookingData.deliveryMethod
      });

      const newBooking = mapBackendBookingToFrontend(createdBackendBooking);
      setBookings((prev) => [newBooking, ...prev]);
      showToast('Booking reservation confirmed!', 'success');
      await refreshData();
      return newBooking;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      showToast(err.message || 'Failed to create booking', 'error');
      throw err;
    }
  };

  const updateBookingStatus = async (
    id: string,
    newStatus: UniversalStatus,
    effectiveAt: string = new Date().toISOString(),
    notes?: string
  ) => {
    try {
      // 1. Immediate optimistic UI update across bookings and dogs
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
      const targetBooking = bookings.find((b) => b.id === id);
      if (targetBooking?.dogId) {
        setDogs((prev) =>
          prev.map((d) => (d.id === targetBooking.dogId ? { ...d, status: newStatus } : d))
        );
      }

      // 2. Persist to backend Supabase
      await api.bookings.updateBookingStatus(id, newStatus, effectiveAt, notes);
      showToast(`Status updated to "${newStatus.replace('_', ' ')}"`, 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update booking status', 'error');
      await refreshData();
      throw err;
    }
  };

  const rescheduleCheckIn = async (id: string, newCheckInAt: string, notes?: string) => {
    try {
      await api.bookings.rescheduleCheckIn(id, newCheckInAt, notes);
      showToast('Check-in rescheduled successfully!', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule check-in', 'error');
      throw err;
    }
  };

  const rescheduleCheckOut = async (id: string, newCheckOutAt: string, notes?: string) => {
    try {
      await api.bookings.rescheduleCheckOut(id, newCheckOutAt, notes);
      showToast('Check-out rescheduled successfully!', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule check-out', 'error');
      throw err;
    }
  };

  const extendBooking = async (id: string, newCheckOutAt: string, notes?: string) => {
    try {
      await api.bookings.extendBooking(id, newCheckOutAt, notes);
      showToast('Stay extended successfully!', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to extend stay', 'error');
      throw err;
    }
  };

  const confirmOutgoing = async (id: string) => {
    try {
      await api.bookings.confirmOutgoing(id);
      showToast('Departure confirmed for dog!', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm outgoing', 'error');
      throw err;
    }
  };

  const updateSettings = (updates: Partial<AccountSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    storageService.saveSettings(updated);
    showToast('Account settings updated.', 'success');
  };

  const addRecentSearch = (query: string, type: RecentSearch['type'] = 'General') => {
    if (!query.trim()) return;
    const existing = recentSearches.filter(
      (s) => s.query.toLowerCase() !== query.toLowerCase()
    );
    const newSearch: RecentSearch = {
      id: `search_${Date.now()}`,
      query: query.trim(),
      type,
      timestamp: 'Just now'
    };
    const updated = [newSearch, ...existing].slice(0, 10);
    setRecentSearches(updated);
    storageService.saveRecentSearches(updated);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    storageService.saveRecentSearches([]);
    showToast('Recent searches cleared.', 'info');
  };

  const resetFilters = () => {
    setFilterState(INITIAL_FILTER_STATE);
  };

  const resetAllData = () => {
    showToast('Reset Demo Data is disabled in production mode.', 'info');
  };

  const getDogById = (id: string) => dogs.find((d) => d.id === id);
  const getBookingById = (id: string) => bookings.find((b) => b.id === id);

  // Dynamic real-time statistics — ALL calculated from actual booking records and dates
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = getTodayDateString();

    // totalDogs = ALL active (non-archived) dog profiles — independent of reservation status
    const totalDogsCount = dogs.length;

    // All reservation calculations use the bookings array
    let inHotelCount = 0;         // active stays: checkIn <= now < checkOut AND not CANCEL/COMPLETE
    let inHotelTodayAllCount = 0; // relevant to today: arriving, leaving, or currently active
    let upcomingCount = 0;        // future UPCOMING: checkIn > now
    let outgoingCount = 0;        // OUTGOING status bookings
    let completeCount = 0;
    let cancelCount = 0;
    let receivedCount = 0;
    let todayCheckIn = 0;         // bookings arriving today (checkInDate === today, not cancelled)
    let todayCheckOut = 0;        // bookings leaving today (checkOutDate === today, not cancelled)

    for (const b of bookings) {
      const isCancelled = b.status === 'CANCEL';
      const isComplete = b.status === 'COMPLETE';
      const isFinal = isCancelled || isComplete;

      if (b.status === 'OUTGOING') outgoingCount++;
      if (b.status === 'COMPLETE') completeCount++;
      if (b.status === 'CANCEL') cancelCount++;
      if (b.status === 'RECEIVED') receivedCount++;

      const checkInDate = b.checkInDate;  // YYYY-MM-DD or formatted string
      const checkOutDate = b.checkOutDate;

      // Parse the dates. checkInDate/checkOutDate may be formatted (e.g. "Sep 12, 2026") or ISO.
      const cinMs = checkInDate ? new Date(checkInDate).getTime() : NaN;
      const coutMs = checkOutDate ? new Date(checkOutDate).getTime() : NaN;

      if (!isCancelled && checkInDate === todayStr) todayCheckIn++;
      if (!isCancelled && checkOutDate === todayStr) todayCheckOut++;

      if (!isFinal && !isNaN(cinMs) && !isNaN(coutMs)) {
        const cinTime = new Date(cinMs);
        const coutTime = new Date(coutMs);
        if (cinTime <= now && coutTime > now) inHotelCount++;
        if (b.status === 'UPCOMING' && cinTime > now) upcomingCount++;

        const isTodayArrival = checkInDate === todayStr;
        const isTodayDeparture = checkOutDate === todayStr;
        const isActiveNow = cinTime <= now && coutTime >= now;
        if (isTodayArrival || isTodayDeparture || isActiveNow) inHotelTodayAllCount++;
      }
    }

    return {
      totalDogs: totalDogsCount,
      inHotelCount,
      inHotelTodayAllCount,
      todayCheckIn,
      todayCheckOut,
      upcomingCount,
      completeCount,
      cancelCount,
      outgoingCount,
      receivedCount,
      overdueAttentionCount: overdueAttentionList.length
    };
  }, [dogs, bookings, overdueAttentionList]);

  return (
    <AppContext.Provider
      value={{
        dogs,
        bookings,
        settings,
        recentSearches,
        currentRoute,
        selectedDogId,
        navigate,
        goBack,
        backendSession,
        sessionAccount,
        isAuthenticated,
        isLoadingSession,
        login,
        createAccount,
        logout,
        overdueAttentionList,
        refreshData,
        addDog,
        updateDog,
        updateDogStatus,
        deleteDog,
        archiveDog,
        restoreDog,
        addBooking,
        updateBookingStatus,
        rescheduleCheckIn,
        rescheduleCheckOut,
        extendBooking,
        confirmOutgoing,
        updateSettings,
        addRecentSearch,
        clearRecentSearches,
        resetAllData,
        toast,
        showToast,
        filterState,
        setFilterState,
        resetFilters,
        stats,
        deviceWidth,
        setDeviceWidth,
        getDogById,
        getBookingById
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
