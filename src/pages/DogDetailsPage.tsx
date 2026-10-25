import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DogAvatar } from '../components/common/DogAvatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatusSelector } from '../components/common/StatusSelector';
import { UniversalStatus } from '../types';
import {
  ChevronLeft,
  Phone,
  Mail,
  Calendar,
  User,
  Info,
  Edit3,
  Check,
  Trash2,
  Plus,
  ShowerHead,
  Scissors,
  Pill,
  UtensilsCrossed,
  Footprints,
  Award,
  FileText,
  Truck,
  AlertCircle,
  X
} from 'lucide-react';
import { getTodayDateString, combineDateAndTime, classifyBooking } from '../utils/date';

const SERVICE_META: Record<string, { label: string; icon: any }> = {
  bathing: { label: 'Bathing', icon: ShowerHead },
  grooming: { label: 'Grooming', icon: Scissors },
  medication: { label: 'Medication', icon: Pill },
  special_food: { label: 'Special Food', icon: UtensilsCrossed },
  extra_walks: { label: 'Extra Walks', icon: Footprints },
  training: { label: 'Training', icon: Award }
};

export const DogDetailsPage: React.FC = () => {
  const {
    selectedDogId,
    getDogById,
    updateDog,
    updateDogStatus,
    updateBookingStatus,
    deleteDog,
    goBack,
    navigate,
    bookings,
    rescheduleCheckIn,
    rescheduleCheckOut,
    showToast
  } = useApp();
  const dog = selectedDogId ? getDogById(selectedDogId) : undefined;

  // Deterministic booking selection (Requirement 20)
  const dogBookings = useMemo(() => {
    if (!dog) return [];
    return bookings.filter((b) => b.dogId === dog.id);
  }, [dog, bookings]);

  const activeBooking = useMemo(() => {
    if (dogBookings.length === 0) return undefined;
    const todayStr = getTodayDateString();
    const now = new Date();

    // 1. Action required: missed check-in or overdue checkout
    const actionReq = dogBookings.find((b) => {
      const cls = classifyBooking(b, todayStr, now);
      return cls === 'MISSED_CHECKIN' || cls === 'OVERDUE_CHECKOUT';
    });
    if (actionReq) return actionReq;

    // 2. Active in hotel or arriving/departing today
    const activeStay = dogBookings.find((b) => {
      const cls = classifyBooking(b, todayStr, now);
      return cls === 'ACTIVE_STAY' || cls === 'TODAY_CHECKIN' || cls === 'TODAY_CHECKOUT';
    });
    if (activeStay) return activeStay;

    // 3. Nearest future upcoming
    const upcoming = [...dogBookings]
      .filter((b) => classifyBooking(b, todayStr, now) === 'UPCOMING')
      .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime())[0];
    if (upcoming) return upcoming;

    // 4. Most recent completed
    const completed = [...dogBookings]
      .filter((b) => b.status === 'COMPLETE')
      .sort((a, b) => new Date(b.checkOutDate).getTime() - new Date(a.checkOutDate).getTime())[0];
    if (completed) return completed;

    // 5. Most recent cancelled
    const cancelled = [...dogBookings]
      .filter((b) => b.status === 'CANCEL')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())[0];
    if (cancelled) return cancelled;

    return dogBookings[0];
  }, [dogBookings]);

  // Reschedule Check-In modal state (Requirement 15)
  const [showRescheduleCheckInModal, setShowRescheduleCheckInModal] = useState(false);
  const [newCheckInDate, setNewCheckInDate] = useState('');
  const [newCheckInTime, setNewCheckInTime] = useState('10:00 AM');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [isReschedulingCheckIn, setIsReschedulingCheckIn] = useState(false);

  // Reschedule Check-Out modal state (Requirement 16)
  const [showRescheduleCheckOutModal, setShowRescheduleCheckOutModal] = useState(false);
  const [newCheckOutDate, setNewCheckOutDate] = useState('');
  const [newCheckOutTime, setNewCheckOutTime] = useState('10:00 AM');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [isReschedulingCheckOut, setIsReschedulingCheckOut] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(dog?.name || '');
  const [editBreed, setEditBreed] = useState(dog?.breed || '');
  const [editAge, setEditAge] = useState(dog?.age || '');
  const [editWeight, setEditWeight] = useState(dog?.weightKg?.toString() || '');
  const [editNotes, setEditNotes] = useState(dog?.notes || '');
  const [editOwnerName, setEditOwnerName] = useState(dog?.ownerName || '');
  const [editOwnerPhone, setEditOwnerPhone] = useState(dog?.ownerPhone || '');
  const [editOwnerEmail, setEditOwnerEmail] = useState(dog?.ownerEmail || '');
  const [currentStatus, setCurrentStatus] = useState<UniversalStatus | null>(dog?.status || null);

  // Sync state whenever dog data changes
  useEffect(() => {
    if (dog) {
      setEditName(dog.name || '');
      setEditBreed(dog.breed || '');
      setEditAge(dog.age || '');
      setEditWeight(dog.weightKg !== undefined && dog.weightKg !== null ? dog.weightKg.toString() : '');
      setEditNotes(dog.notes || '');
      setEditOwnerName(dog.ownerName || '');
      setEditOwnerPhone(dog.ownerPhone || '');
      setEditOwnerEmail(dog.ownerEmail || '');
      setCurrentStatus(activeBooking?.status || dog.status || null);
    }
  }, [dog, activeBooking?.status]);

  // Confirmation modal states
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);

  if (!dog) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>Dog Not Found</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          The requested dog profile does not exist or may have been removed.
        </p>
        <button type="button" onClick={goBack} className="btn-primary" style={{ maxWidth: '200px', margin: '0 auto' }}>
          Return to Dogs
        </button>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: UniversalStatus) => {
    if (newStatus === 'CANCEL') {
      setShowCancelBookingModal(true);
      return;
    }
    setCurrentStatus(newStatus);
    if (activeBooking) {
      await updateBookingStatus(activeBooking.id, newStatus);
    } else {
      await updateDogStatus(dog.id, newStatus);
    }
  };

  const handleConfirmCancelBooking = async () => {
    try {
      setCurrentStatus('CANCEL');
      if (activeBooking) {
        await updateBookingStatus(activeBooking.id, 'CANCEL');
      } else {
        await updateDogStatus(dog.id, 'CANCEL');
      }
      setShowCancelBookingModal(false);
      showToast('Booking cancelled successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel booking', 'error');
    }
  };

  const handleInitiateSave = () => {
    setShowSaveConfirmModal(true);
  };

  const handleConfirmSaveChanges = async () => {
    setIsSavingProfile(true);
    try {
      await updateDog(dog.id, {
        name: editName.trim() || dog.name,
        breed: editBreed.trim() || dog.breed,
        age: editAge.trim() || dog.age,
        weightKg: editWeight ? parseFloat(editWeight) : dog.weightKg,
        notes: editNotes.trim(),
        ownerName: editOwnerName.trim() || dog.ownerName,
        ownerPhone: editOwnerPhone.trim() || dog.ownerPhone,
        ownerEmail: editOwnerEmail.trim() || dog.ownerEmail,
        status: currentStatus
      });
      setIsEditing(false);
      setShowSaveConfirmModal(false);
    } catch (err) {
      // Error handled with toast in updateDog
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${dog.name}'s profile? This action cannot be undone.`)) {
      deleteDog(dog.id);
    }
  };

  const handleRescheduleCheckIn = async () => {
    if (!activeBooking) return;
    if (!newCheckInDate) {
      showToast('Please select a valid check-in date.', 'error');
      return;
    }
    const targetCheckInIso = combineDateAndTime(newCheckInDate, newCheckInTime);
    const targetCheckOutIso = combineDateAndTime(activeBooking.checkOutDate, activeBooking.checkOutTime || '10:00 AM');

    if (new Date(targetCheckInIso).getTime() >= new Date(targetCheckOutIso).getTime()) {
      showToast('Check-in must be scheduled before check-out date and time.', 'error');
      return;
    }

    setIsReschedulingCheckIn(true);
    try {
      await rescheduleCheckIn(activeBooking.id, targetCheckInIso, checkInNotes.trim() || undefined);
      setShowRescheduleCheckInModal(false);
      setCheckInNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule check-in', 'error');
    } finally {
      setIsReschedulingCheckIn(false);
    }
  };

  const handleRescheduleCheckOut = async () => {
    if (!activeBooking) return;
    if (!newCheckOutDate) {
      showToast('Please select a valid check-out date.', 'error');
      return;
    }
    const targetCheckInIso = combineDateAndTime(activeBooking.checkInDate, activeBooking.checkInTime || '10:00 AM');
    const targetCheckOutIso = combineDateAndTime(newCheckOutDate, newCheckOutTime);

    if (new Date(targetCheckOutIso).getTime() <= new Date(targetCheckInIso).getTime()) {
      showToast('Check-out must be scheduled after check-in date and time.', 'error');
      return;
    }

    setIsReschedulingCheckOut(true);
    try {
      await rescheduleCheckOut(activeBooking.id, targetCheckOutIso, checkOutNotes.trim() || undefined);
      setShowRescheduleCheckOutModal(false);
      setCheckOutNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule check-out', 'error');
    } finally {
      setIsReschedulingCheckOut(false);
    }
  };

  return (
    <div className="dog-details-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={goBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)'
          }}
          aria-label="Back"
        >
          <ChevronLeft size={22} color="var(--color-text-primary)" />
        </button>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>
            Dog Details
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            View and manage dog information
          </p>
        </div>
      </div>

      {/* Dog Summary Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}>
        <DogAvatar avatarId={dog.avatarId} size="xl" />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
              {dog.name}
            </h3>
            <StatusBadge status={dog.status} size="sm" />
          </div>

          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            {dog.breed}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
            <span style={{ background: '#edf2fa', padding: '3px 8px', borderRadius: '6px' }}>
              {dog.gender}
            </span>
            <span style={{ background: '#edf2fa', padding: '3px 8px', borderRadius: '6px' }}>
              {dog.age || '3 years old'}
            </span>
            {dog.weightKg && (
              <span style={{ background: '#edf2fa', padding: '3px 8px', borderRadius: '6px' }}>
                {dog.weightKg} kg
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Booking Information Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Booking Information
            </h3>
          </div>
          <StatusBadge status={activeBooking?.status || dog.status} size="sm" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f7fbff', padding: '14px', borderRadius: '12px', border: '1px solid #e1effe' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '6px' }}>
            <div>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', marginBottom: '2px', fontWeight: 600 }}>Check-In</p>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {activeBooking?.checkInDate || dog.checkInDate || '—'}
              </p>
              {(activeBooking?.checkInTime || dog.checkInTime) && (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                  {activeBooking?.checkInTime || dog.checkInTime}
                </p>
              )}
            </div>
            {activeBooking && activeBooking.status !== 'CANCEL' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setNewCheckInDate(activeBooking.checkInDate || '');
                  setNewCheckInTime(activeBooking.checkInTime || '10:00 AM');
                  setShowRescheduleCheckInModal(true);
                }}
                style={{
                  fontSize: '0.75rem',
                  padding: '5px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  alignSelf: 'flex-start',
                  marginTop: '4px'
                }}
              >
                <Calendar size={13} />
                <span>Reschedule</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '6px' }}>
            <div>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', marginBottom: '2px', fontWeight: 600 }}>Check-Out</p>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {activeBooking?.checkOutDate || dog.checkOutDate || '—'}
              </p>
              {(activeBooking?.checkOutTime || dog.checkOutTime) && (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                  {activeBooking?.checkOutTime || dog.checkOutTime}
                </p>
              )}
            </div>
            {activeBooking && activeBooking.status !== 'CANCEL' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setNewCheckOutDate(activeBooking.checkOutDate || '');
                  setNewCheckOutTime(activeBooking.checkOutTime || '10:00 AM');
                  setShowRescheduleCheckOutModal(true);
                }}
                style={{
                  fontSize: '0.75rem',
                  padding: '5px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  alignSelf: 'flex-start',
                  marginTop: '4px'
                }}
              >
                <Calendar size={13} />
                <span>Reschedule</span>
              </button>
            )}
          </div>
        </div>

        {/* Additional Services Display */}
        {activeBooking && activeBooking.services && activeBooking.services.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Additional Services ({activeBooking.services.length})
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {activeBooking.services.map((srvId) => {
                const srv = SERVICE_META[srvId] || { label: srvId, icon: Award };
                const Icon = srv.icon;
                return (
                  <span
                    key={srvId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      backgroundColor: '#eaf2ff',
                      color: 'var(--color-primary)',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: '1px solid #bfdbfe'
                    }}
                  >
                    <Icon size={14} />
                    <span>{srv.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivery Method Display */}
        {activeBooking && activeBooking.deliveryMethod && (activeBooking.deliveryMethod.checkInMethod === 'OSCAR_PICKUP' || activeBooking.deliveryMethod.checkOutMethod === 'OSCAR_DROPOFF' || activeBooking.deliveryMethod.checkOutMethod === 'OWNER_PICKUP') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={15} color="var(--color-primary)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Delivery Method
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block' }}>
                  Check-In:
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {activeBooking.deliveryMethod.checkInMethod === 'OSCAR_PICKUP' ? 'Oscar Pickup' : 'Standard'}
                </span>
                {activeBooking.deliveryMethod.checkInAddress && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px', wordBreak: 'break-word' }}>
                    📍 {activeBooking.deliveryMethod.checkInAddress}
                  </p>
                )}
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block' }}>
                  Check-Out:
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {activeBooking.deliveryMethod.checkOutMethod === 'OSCAR_DROPOFF' ? 'Oscar Drop-off' : 'Owner Pickup'}
                </span>
                {activeBooking.deliveryMethod.checkOutAddress && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px', wordBreak: 'break-word' }}>
                    📍 {activeBooking.deliveryMethod.checkOutAddress}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Booking Notes Display */}
        {activeBooking && activeBooking.notes && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} color="#d97706" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Booking Notes
              </span>
            </div>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                fontSize: '0.84rem',
                color: '#92400e',
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap'
              }}
            >
              {activeBooking.notes}
            </div>
          </div>
        )}

        {/* Cancel Booking Action */}
        {activeBooking && activeBooking.status !== 'CANCEL' && activeBooking.status !== 'COMPLETE' && (
          <div style={{ paddingTop: '6px' }}>
            <button
              type="button"
              onClick={() => setShowCancelBookingModal(true)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <X size={15} />
              <span>Cancel Booking</span>
            </button>
          </div>
        )}

        {activeBooking && activeBooking.status === 'CANCEL' && (
          <div
            style={{
              paddingTop: '6px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1.5px solid #fca5a5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#b91c1c' }}>✕ This reservation is cancelled</span>
          </div>
        )}

        {!activeBooking && !dog.checkInDate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              This dog profile has no active reservation.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/bookings/new', dog.id)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', padding: '9px 14px' }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create New Booking</span>
            </button>
          </div>
        )}
      </div>

      {/* Owner Information Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} color="var(--color-primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Owner Information
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Owner Name</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {dog.ownerName}
            </p>
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Phone Number</p>
            <a
              href={`tel:${dog.ownerPhone}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.92rem',
                fontWeight: 600,
                color: 'var(--color-primary)'
              }}
            >
              <Phone size={14} />
              <span>{dog.ownerPhone}</span>
            </a>
          </div>

          {dog.ownerEmail && (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Email Address</p>
              <a
                href={`mailto:${dog.ownerEmail}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)'
                }}
              >
                <Mail size={14} />
                <span>{dog.ownerEmail}</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Booking Status Management Panel — Only shown if an active reservation exists */}
      {activeBooking && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Booking Status
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
              Update the current status for this booking across all screens
            </p>
          </div>

          <StatusSelector
            currentStatus={activeBooking?.status || dog.status || 'UPCOMING'}
            onSelect={handleStatusChange}
          />
        </div>
      )}

      {/* Operational Stay Actions */}
      {activeBooking && (activeBooking.status === 'IN_HOTEL' || activeBooking.status === 'OUTGOING') && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Stay Management
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  await updateBookingStatus(activeBooking.id, 'COMPLETE');
                  showToast('Stay marked as Complete!', 'success');
                } catch (err: any) {
                  showToast(err.message || 'Failed to complete stay', 'error');
                }
              }}
              style={{ width: '100%', padding: '11px', fontSize: '0.88rem', backgroundColor: '#5336df' }}
            >
              Complete Stay
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setNewCheckOutDate(activeBooking.checkOutDate || '');
                setNewCheckOutTime(activeBooking.checkOutTime || '10:00 AM');
                setShowRescheduleCheckOutModal(true);
              }}
              style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
            >
              Reschedule Check-Out
            </button>
          </div>
        </div>
      )}

      {/* Additional Information Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="var(--color-primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Additional Information
          </h3>
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Dog Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Breed
              </label>
              <input
                type="text"
                value={editBreed}
                onChange={(e) => setEditBreed(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Age
              </label>
              <input
                type="text"
                value={editAge}
                onChange={(e) => setEditAge(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Weight (kg)
              </label>
              <input
                type="number"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Owner Name
              </label>
              <input
                type="text"
                value={editOwnerName}
                onChange={(e) => setEditOwnerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Owner Phone
              </label>
              <input
                type="tel"
                value={editOwnerPhone}
                onChange={(e) => setEditOwnerPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Owner Email
              </label>
              <input
                type="email"
                value={editOwnerEmail}
                onChange={(e) => setEditOwnerEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Special Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Breed</span>
              <span style={{ fontWeight: 600 }}>{dog.breed}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Weight</span>
              <span style={{ fontWeight: 600 }}>{dog.weightKg ? `${dog.weightKg} kg` : 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Age</span>
              <span style={{ fontWeight: 600 }}>{dog.age || '3 years old'}</span>
            </div>
            {dog.notes && (
              <div style={{ marginTop: '6px', padding: '10px', background: '#f7fbff', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                  Special Notes
                </p>
                <p style={{ fontSize: '0.84rem', color: 'var(--color-text-primary)' }}>{dog.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
        {isEditing ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleInitiateSave}
            disabled={isSavingProfile}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Check size={18} />
            <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsEditing(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Edit3 size={16} />
            <span>Edit Details</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            color: '#df2145',
            fontSize: '0.88rem',
            fontWeight: 600,
            background: 'transparent'
          }}
        >
          <Trash2 size={16} />
          <span>Delete Profile</span>
        </button>
      </div>

      {/* Reschedule Check-In Modal (Requirement 15) */}
      {showRescheduleCheckInModal && activeBooking && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Reschedule Check-In
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              Current scheduled check-in: <strong>{activeBooking.checkInDate} {activeBooking.checkInTime || ''}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  New Check-In Date *
                </label>
                <input
                  type="date"
                  value={newCheckInDate}
                  onChange={(e) => setNewCheckInDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--color-border)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  New Check-In Time
                </label>
                <input
                  type="time"
                  defaultValue="10:00"
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':');
                    let hour = parseInt(h, 10);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    hour = hour % 12 || 12;
                    setNewCheckInTime(`${String(hour).padStart(2, '0')}:${m} ${ampm}`);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--color-border)', fontSize: '0.9rem' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Selected time: <strong>{newCheckInTime}</strong>
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Reschedule Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Owner delayed arrival"
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--color-border)', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowRescheduleCheckInModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleRescheduleCheckIn}
                disabled={isReschedulingCheckIn}
                style={{ flex: 1.5 }}
              >
                {isReschedulingCheckIn ? 'Saving...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Check-Out Modal (Requirement 16) */}
      {showRescheduleCheckOutModal && activeBooking && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Reschedule Check-Out
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              Current scheduled check-out: <strong>{activeBooking.checkOutDate} {activeBooking.checkOutTime || ''}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  New Check-Out Date *
                </label>
                <input
                  type="date"
                  value={newCheckOutDate}
                  onChange={(e) => setNewCheckOutDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--color-border)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  New Check-Out Time
                </label>
                <input
                  type="time"
                  defaultValue="10:00"
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':');
                    let hour = parseInt(h, 10);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    hour = hour % 12 || 12;
                    setNewCheckOutTime(`${String(hour).padStart(2, '0')}:${m} ${ampm}`);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--color-border)', fontSize: '0.9rem' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Selected time: <strong>{newCheckOutTime}</strong>
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Reschedule Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra day requested / Flight delay"
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--color-border)', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowRescheduleCheckOutModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleRescheduleCheckOut}
                disabled={isReschedulingCheckOut}
                style={{ flex: 1.5 }}
              >
                {isReschedulingCheckOut ? 'Saving...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Profile Confirmation Modal */}
      {showSaveConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999
          }}
          onClick={() => setShowSaveConfirmModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#eaf2ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AlertCircle size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Confirm Profile Changes
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Save and update everywhere
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)', lineHeight: 1.45 }}>
              Are you sure you want to change these details? If confirmed, updates will apply immediately everywhere across the app.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowSaveConfirmModal(false)}
                disabled={isSavingProfile}
                style={{ padding: '10px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmSaveChanges}
                disabled={isSavingProfile}
                style={{ padding: '10px', fontSize: '0.85rem' }}
              >
                {isSavingProfile ? 'Saving...' : 'Yes, Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Modal */}
      {showCancelBookingModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999
          }}
          onClick={() => setShowCancelBookingModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <X size={22} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Cancel Booking
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Confirm cancellation
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)', lineHeight: 1.45 }}>
              Are you sure you want to cancel this booking? This will cancel the reservation and update the dog status to Cancel.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCancelBookingModal(false)}
                style={{ padding: '10px', fontSize: '0.85rem' }}
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelBooking}
                style={{
                  padding: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
