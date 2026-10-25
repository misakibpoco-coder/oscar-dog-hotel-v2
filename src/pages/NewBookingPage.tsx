import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DogAvatar } from '../components/common/DogAvatar';
import { StatusSelector } from '../components/common/StatusSelector';
import { UniversalStatus } from '../types';
import { Plus, Check, Scissors, Pill, UtensilsCrossed, Footprints, Award, ShowerHead, RotateCcw, Search, X, Phone, Truck } from 'lucide-react';
import { storageService } from '../services/storage';
import { getTodayDateString, addDaysToDateString } from '../utils/date';
import { matchDogSearch } from '../utils/search';

function to24h(timeStr: string): string {
  if (!timeStr) return '10:00';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3]?.toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function to12h(time24: string): string {
  if (!time24) return '10:00 AM';
  const [hStr, mStr] = time24.split(':');
  let hours = parseInt(hStr, 10);
  const minutes = mStr || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

interface BookingDraft {
  selectedDogId: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  bookingStatus: UniversalStatus;
  selectedServices: string[];
  notes: string;
  checkInMethod?: 'STANDARD' | 'OSCAR_PICKUP';
  checkInAddress?: string;
  checkOutMethod?: 'OWNER_PICKUP' | 'OSCAR_DROPOFF';
  checkOutAddress?: string;
}

export const NewBookingPage: React.FC = () => {
  const { dogs, addBooking, navigate, showToast, selectedDogId: preselectedDogId } = useApp();

  const todayStr = useMemo(() => getTodayDateString(), []);
  const defaultCheckOutStr = useMemo(() => addDaysToDateString(todayStr, 3), [todayStr]);

  const initialDraft = useMemo(() => {
    const saved = storageService.getBookingDraft<BookingDraft>();
    if (saved) {
      return saved;
    }
    return {
      selectedDogId: dogs[0]?.id || '',
      checkInDate: todayStr,
      checkInTime: '10:15 AM',
      checkOutDate: defaultCheckOutStr,
      checkOutTime: '10:00 AM',
      bookingStatus: 'UPCOMING' as UniversalStatus,
      selectedServices: [] as string[],
      notes: '',
      checkInMethod: 'STANDARD' as 'STANDARD' | 'OSCAR_PICKUP',
      checkInAddress: '',
      checkOutMethod: 'OWNER_PICKUP' as 'OWNER_PICKUP' | 'OSCAR_DROPOFF',
      checkOutAddress: ''
    };
  }, [dogs, todayStr, defaultCheckOutStr]);

  // Requirement 11: Auto-preselect dog if navigated from Dog Details
  const initialDogId = preselectedDogId || initialDraft.selectedDogId || dogs[0]?.id || '';
  const [selectedDogId, setSelectedDogId] = useState<string>(initialDogId);

  // Requirement 12: Check-in date MUST default to CURRENT date (today), never an old date from previous session
  const [checkInDate, setCheckInDate] = useState<string>(todayStr);
  const [checkInTime, setCheckInTime] = useState<string>(initialDraft.checkInTime || '10:15 AM');
  const [checkOutDate, setCheckOutDate] = useState<string>(
    initialDraft.checkOutDate && initialDraft.checkOutDate > todayStr
      ? initialDraft.checkOutDate
      : defaultCheckOutStr
  );
  const [checkOutTime, setCheckOutTime] = useState<string>(initialDraft.checkOutTime || '10:00 AM');
  const [bookingStatus, setBookingStatus] = useState<UniversalStatus>(initialDraft.bookingStatus || 'UPCOMING');
  const [selectedServices, setSelectedServices] = useState<string[]>(initialDraft.selectedServices || []);
  const [notes, setNotes] = useState(initialDraft.notes || '');

  // Delivery Method state
  const [checkInMethod, setCheckInMethod] = useState<'STANDARD' | 'OSCAR_PICKUP'>(
    initialDraft.checkInMethod || 'STANDARD'
  );
  const [checkInAddress, setCheckInAddress] = useState<string>(initialDraft.checkInAddress || '');
  const [checkOutMethod, setCheckOutMethod] = useState<'OWNER_PICKUP' | 'OSCAR_DROPOFF'>(
    initialDraft.checkOutMethod || 'OWNER_PICKUP'
  );
  const [checkOutAddress, setCheckOutAddress] = useState<string>(initialDraft.checkOutAddress || '');

  // Keep selected dog in sync if preselectedDogId is provided
  useEffect(() => {
    if (preselectedDogId && dogs.some((d) => d.id === preselectedDogId)) {
      setSelectedDogId(preselectedDogId);
    }
  }, [preselectedDogId, dogs]);

  // Dog Search states (Requirement 3: Search like Dashboard)
  const [dogSearchQuery, setDogSearchQuery] = useState('');
  const [isDogSearchFocused, setIsDogSearchFocused] = useState(false);
  const dogSearchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dogSearchContainerRef.current && !dogSearchContainerRef.current.contains(e.target as Node)) {
        setIsDogSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matchingDogs = useMemo(() => {
    if (!dogSearchQuery.trim()) return dogs;
    return dogs.filter((d) => matchDogSearch(d, dogSearchQuery));
  }, [dogs, dogSearchQuery]);

  // Persistent storage of form draft
  useEffect(() => {
    storageService.saveBookingDraft({
      selectedDogId,
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      bookingStatus,
      selectedServices,
      notes,
      checkInMethod,
      checkInAddress,
      checkOutMethod,
      checkOutAddress
    });
  }, [
    selectedDogId,
    checkInDate,
    checkInTime,
    checkOutDate,
    checkOutTime,
    bookingStatus,
    selectedServices,
    notes,
    checkInMethod,
    checkInAddress,
    checkOutMethod,
    checkOutAddress
  ]);

  // Staff can select any active status on new booking create (Upcoming, In Hotel, Outgoing, Complete)
  const allowedStatuses: UniversalStatus[] = useMemo(() => {
    return ['UPCOMING', 'IN_HOTEL', 'OUTGOING', 'COMPLETE'];
  }, []);

  // Ensure selected status remains within allowed statuses
  useEffect(() => {
    if (!allowedStatuses.includes(bookingStatus)) {
      setBookingStatus(allowedStatuses[0]);
    }
  }, [allowedStatuses, bookingStatus]);

  const handleResetForm = () => {
    storageService.clearBookingDraft();
    setSelectedDogId(dogs[0]?.id || '');
    setCheckInDate(todayStr);
    setCheckInTime('10:15 AM');
    setCheckOutDate(defaultCheckOutStr);
    setCheckOutTime('10:00 AM');
    setBookingStatus('UPCOMING');
    setSelectedServices([]);
    setNotes('');
    setCheckInMethod('STANDARD');
    setCheckInAddress('');
    setCheckOutMethod('OWNER_PICKUP');
    setCheckOutAddress('');
    showToast('Booking form cleared.', 'info');
  };

  const selectedDog = useMemo(() => {
    return dogs.find((d) => d.id === selectedDogId) || dogs[0];
  }, [dogs, selectedDogId]);

  // Duration calculation
  const durationNights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const d1 = new Date(checkInDate).getTime();
    const d2 = new Date(checkOutDate).getTime();
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  }, [checkInDate, checkOutDate]);

  const servicesList = [
    { id: 'bathing', label: 'Bathing', icon: ShowerHead },
    { id: 'grooming', label: 'Grooming', icon: Scissors },
    { id: 'medication', label: 'Medication', icon: Pill },
    { id: 'special_food', label: 'Special Food', icon: UtensilsCrossed },
    { id: 'extra_walks', label: 'Extra Walks', icon: Footprints },
    { id: 'training', label: 'Training', icon: Award }
  ];

  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter((s) => s !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!selectedDog) {
      showToast('Please select a dog for this booking.', 'error');
      return;
    }
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      showToast('Check-out date must be after check-in date.', 'error');
      return;
    }

    const deliveryMethod =
      checkInMethod === 'OSCAR_PICKUP' || checkOutMethod === 'OSCAR_DROPOFF'
        ? {
            checkInMethod,
            checkInAddress: checkInMethod === 'OSCAR_PICKUP' ? checkInAddress.trim() : undefined,
            checkOutMethod,
            checkOutAddress: checkOutMethod === 'OSCAR_DROPOFF' ? checkOutAddress.trim() : undefined
          }
        : undefined;

    setIsSubmitting(true);
    try {
      await addBooking({
        dogId: selectedDog.id,
        checkInDate,
        checkInTime,
        checkOutDate,
        checkOutTime,
        status: bookingStatus,
        services: selectedServices,
        notes: notes.trim() || undefined,
        deliveryMethod,
        durationNights
      });

      storageService.clearBookingDraft();
      navigate('/bookings');
    } catch (err: any) {
      if (err.code === 'BOOKING_OVERLAP') {
        setBookingError('Schedule Conflict: This dog already has an active booking that overlaps with these dates.');
      } else if (err.code === 'BOOKING_ARCHIVED_DOG_BLOCKED') {
        setBookingError('Archived Dog: Cannot create bookings for archived profiles. Please restore the profile first.');
      } else {
        setBookingError(err.message || 'Failed to create booking');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-booking-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>
            New Booking
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Create a new reservation
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetForm}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f1f5f9',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            padding: '7px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RotateCcw size={14} />
          <span>Clear Form</span>
        </button>
      </div>

      <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Select Dog Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Select Dog
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Choose from existing dog profiles
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dogs/new')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
            >
              <Plus size={14} />
              <span>Add New Dog</span>
            </button>
          </div>

          {/* Dog Search Bar (matching Dashboard search style - Requirement 3) */}
          <div ref={dogSearchContainerRef} style={{ position: 'relative', width: '100%', zIndex: 20 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search by dog name, breed, owner, or phone..."
                value={dogSearchQuery}
                onChange={(e) => {
                  setDogSearchQuery(e.target.value);
                  setIsDogSearchFocused(true);
                }}
                onFocus={() => setIsDogSearchFocused(true)}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 40px',
                  backgroundColor: '#ffffff',
                  border: isDogSearchFocused ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                  borderRadius: '10px',
                  fontSize: '0.92rem',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}
              >
                <Search size={18} />
              </div>

              {dogSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDogSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Live Search Matching Dropdown */}
            {isDogSearchFocused && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                  border: '1px solid var(--color-border)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 50
                }}
              >
                {matchingDogs.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    No dogs found matching "{dogSearchQuery}"
                  </div>
                ) : (
                  matchingDogs.map((dog) => (
                    <div
                      key={dog.id}
                      onClick={() => {
                        setSelectedDogId(dog.id);
                        setDogSearchQuery('');
                        setIsDogSearchFocused(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        backgroundColor: selectedDogId === dog.id ? '#f0f7ff' : '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DogAvatar avatarId={dog.avatarId} size="sm" />
                        <div>
                          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {dog.name}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {dog.breed} • {dog.ownerName}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                        <Phone size={12} />
                        <span>{dog.ownerPhone}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Dog Preview Card */}
          {selectedDog && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: '#f7fbff',
                borderRadius: '12px',
                border: '1.5px solid #cce3fe'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <DogAvatar avatarId={selectedDog.avatarId} size="md" />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {selectedDog.name}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {selectedDog.breed} • {selectedDog.ownerName} ({selectedDog.ownerPhone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDogSearchFocused(true);
                  setDogSearchQuery('');
                }}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  background: '#eaf2ff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer'
                }}
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Booking Dates Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Booking Dates
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Select check-in and check-out dates
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                Check-In Date *
              </label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                Check-Out Date *
              </label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          </div>

          {/* Time pickers / Clock system (Requirement 1: No manual time typing) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Check-In Time
              </label>
              <input
                type="time"
                value={to24h(checkInTime)}
                onChange={(e) => {
                  if (e.target.value) {
                    setCheckInTime(to12h(e.target.value));
                  }
                }}
                onKeyDown={(e) => e.preventDefault()}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.9rem',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Check-Out Time
              </label>
              <input
                type="time"
                value={to24h(checkOutTime)}
                onChange={(e) => {
                  if (e.target.value) {
                    setCheckOutTime(to12h(e.target.value));
                  }
                }}
                onKeyDown={(e) => e.preventDefault()}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.9rem',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* Duration Badge banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#eaf2ff',
              borderRadius: '10px',
              border: '1px solid #c7dcff'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#07133d' }}>
              Total Duration:
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1267df' }}>
              {durationNights} {durationNights === 1 ? 'night' : 'nights'} stay
            </span>
          </div>
        </div>

        {/* Initial Status Selection */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Booking Status
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Set the reservation status
            </p>
          </div>

          <StatusSelector
            currentStatus={bookingStatus}
            onSelect={(st) => setBookingStatus(st)}
            allowedStatuses={allowedStatuses}
          />
        </div>

        {/* Additional Services Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Additional Services
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Select any extra services (optional)
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px'
            }}
          >
            {servicesList.map((srv) => {
              const isSelected = selectedServices.includes(srv.id);
              const Icon = srv.icon;
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => toggleService(srv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: isSelected ? '#eaf2ff' : '#ffffff',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                    fontSize: '0.86rem',
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={18} color={isSelected ? 'var(--color-primary)' : '#71809d'} />
                  <span>{srv.label}</span>
                  {isSelected && <Check size={14} style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Delivery Method (Optional) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Delivery Method (optional)
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Pickup and drop-off transportation options
            </p>
          </div>

          {/* Check-In Method */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Check-In Method
            </label>
            <div
              onClick={() => setCheckInMethod(prev => prev === 'OSCAR_PICKUP' ? 'STANDARD' : 'OSCAR_PICKUP')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${checkInMethod === 'OSCAR_PICKUP' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: checkInMethod === 'OSCAR_PICKUP' ? '#eaf2ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                type="checkbox"
                checked={checkInMethod === 'OSCAR_PICKUP'}
                onChange={(e) => setCheckInMethod(e.target.checked ? 'OSCAR_PICKUP' : 'STANDARD')}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Oscar Pickup
              </span>
            </div>
            {checkInMethod === 'OSCAR_PICKUP' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Pickup Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter address for Oscar Pickup..."
                  value={checkInAddress}
                  onChange={(e) => setCheckInAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--color-border)',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>

          {/* Check-Out Method */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Check-out (dropdown option)
            </label>
            <select
              value={checkOutMethod}
              onChange={(e) => setCheckOutMethod(e.target.value as 'OWNER_PICKUP' | 'OSCAR_DROPOFF')}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                backgroundColor: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="OWNER_PICKUP">Owner Pickup</option>
              <option value="OSCAR_DROPOFF">Oscar Drop-off</option>
            </select>
            {checkOutMethod === 'OSCAR_DROPOFF' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Drop-off Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter address for Oscar Drop-off..."
                  value={checkOutAddress}
                  onChange={(e) => setCheckOutAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--color-border)',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Notes (Optional) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Notes (Optional)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {notes.length}/500
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              Add any special instructions
            </p>
          </div>

          <textarea
            placeholder="e.g. Dietary needs, behavior notes, medication details..."
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '0.9rem',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Error Banner */}
        {bookingError && (
          <div style={{
            backgroundColor: '#fdebee',
            border: '1px solid #f9cbd2',
            color: '#c2233f',
            padding: '12px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{bookingError}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          className="btn-primary"
          style={{ marginTop: '4px', height: '50px' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
        </button>
      </form>
    </div>
  );
};
