import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DogAvatar } from '../components/common/DogAvatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { UniversalStatus } from '../types';
import { Plus, ChevronLeft, ChevronRight, Phone, FileText, Truck, ShowerHead, Scissors, Pill, UtensilsCrossed, Footprints, Award, Share2 } from 'lucide-react';
import { getTodayDateString, addDaysToDateString, compareDateStrings, formatDisplayDate } from '../utils/date';
import { getStatusConfig } from '../constants/statuses';

const SERVICE_META: Record<string, { label: string; icon: any }> = {
  bathing: { label: 'Bathing', icon: ShowerHead },
  grooming: { label: 'Grooming', icon: Scissors },
  medication: { label: 'Medication', icon: Pill },
  special_food: { label: 'Special Food', icon: UtensilsCrossed },
  extra_walks: { label: 'Extra Walks', icon: Footprints },
  training: { label: 'Training', icon: Award }
};

export const BookingsPage: React.FC = () => {
  const { bookings, dogs, navigate, showToast } = useApp();

  const todayStr = useMemo(() => getTodayDateString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeStatus, setActiveStatus] = useState<UniversalStatus | 'ALL'>('ALL');

  // Link bookings to dogs
  const enrichedBookings = useMemo(() => {
    return bookings.map((b) => {
      const dog = dogs.find((d) => d.id === b.dogId) || b.dog;
      return {
        ...b,
        dog
      };
    });
  }, [bookings, dogs]);

  // Date relevance helper (Requirements 6 & 7: No duplicate upcoming bookings)
  const isBookingRelevantToDate = (b: typeof enrichedBookings[0], targetDate: string): boolean => {
    if (!b || !b.checkInDate || !b.checkOutDate) return false;

    const isCheckInDay = b.checkInDate === targetDate;
    const isCheckOutDay = b.checkOutDate === targetDate;
    const isSpanningStay = b.checkInDate < targetDate && b.checkOutDate > targetDate;

    // Check-in day: relevant
    if (isCheckInDay) return true;

    // Check-out day: relevant
    if (isCheckOutDay) return true;

    // Intermediate days: ONLY relevant if dog is actively in the hotel
    if (isSpanningStay && (b.status === 'IN_HOTEL' || b.status === 'RECEIVED' || b.status === 'OUTGOING')) {
      return true;
    }

    return false;
  };

  // Only bookings relevant to the selected date
  const dateRelevantBookings = useMemo(() => {
    return enrichedBookings.filter((b) => isBookingRelevantToDate(b, selectedDate));
  }, [enrichedBookings, selectedDate]);

  // Date-Aware Status Rules
  const allowedStatuses: UniversalStatus[] = useMemo(() => {
    const cmp = compareDateStrings(selectedDate, todayStr);
    if (cmp < 0) {
      // Past dates: Complete, Cancel
      return ['COMPLETE', 'CANCEL'];
    } else if (cmp > 0) {
      // Future dates: Upcoming, Outgoing, In Hotel
      return ['UPCOMING', 'OUTGOING', 'IN_HOTEL'];
    } else {
      // Today: Outgoing (first for Today's Outgoing), In Hotel, Complete, Upcoming, Cancel
      return ['OUTGOING', 'IN_HOTEL', 'COMPLETE', 'UPCOMING', 'CANCEL'];
    }
  }, [selectedDate, todayStr]);

  // Reset active status to 'ALL' if it becomes disallowed on date change
  useEffect(() => {
    if (activeStatus !== 'ALL' && !allowedStatuses.includes(activeStatus)) {
      setActiveStatus('ALL');
    }
  }, [allowedStatuses, activeStatus]);

  // Filter based on activeStatus and date-allowed statuses
  const filteredBookings = useMemo(() => {
    return dateRelevantBookings.filter((b) => {
      if (activeStatus === 'ALL') {
        return allowedStatuses.includes(b.status);
      }
      return b.status === activeStatus;
    });
  }, [dateRelevantBookings, activeStatus, allowedStatuses]);

  // Dynamic filter tabs respecting allowedStatuses sequence and date relevance
  const filterTabs = useMemo(() => {
    const tabs: { label: string; key: UniversalStatus | 'ALL'; count: number }[] = [
      { label: 'All', key: 'ALL', count: dateRelevantBookings.filter((b) => allowedStatuses.includes(b.status)).length }
    ];

    allowedStatuses.forEach((st) => {
      const count = dateRelevantBookings.filter((b) => b.status === st).length;
      const config = getStatusConfig(st);
      tabs.push({
        label: config.label,
        key: st,
        count
      });
    });

    return tabs;
  }, [allowedStatuses, dateRelevantBookings]);

  const shiftDate = (days: number) => {
    setSelectedDate((prev) => addDaysToDateString(prev, days));
  };

  const generateBookingShareText = (b: typeof enrichedBookings[0]): string => {
    const dogName = b.dog?.name || 'Unknown Dog';
    const ownerName = b.dog?.ownerName || 'Unknown Owner';
    const nights = b.durationNights === 0 ? 'Same day' : `${b.durationNights} ${b.durationNights === 1 ? 'night' : 'nights'}`;
    const statusLabel = getStatusConfig(b.status)?.label || b.status;

    const lines: string[] = [
      `Dog Name: ${dogName}`,
      `Owner Name: ${ownerName}`,
      `*Total Nights: ${nights}*`,
      `Check in: ${b.checkInDate}${b.checkInTime ? ` at ${b.checkInTime}` : ''}`,
      `Check out date: ${b.checkOutDate}${b.checkOutTime ? ` at ${b.checkOutTime}` : ''}`,
      `Status: ${statusLabel}`
    ];

    if (b.services && b.services.length > 0) {
      const serviceLabels = b.services
        .map((s) => SERVICE_META[s]?.label || s)
        .filter(Boolean);
      if (serviceLabels.length > 0) {
        lines.push(`Additional Services: ${serviceLabels.join(', ')}`);
      }
    }

    if (b.deliveryMethod) {
      const dm = b.deliveryMethod;
      if (dm.checkInMethod === 'OSCAR_PICKUP') {
        lines.push(`Delivery / Pickup Option: Oscar Pickup${dm.checkInAddress ? ` (Address: ${dm.checkInAddress})` : ''}`);
      }
      if (dm.checkOutMethod === 'OSCAR_DROPOFF') {
        lines.push(`Check-out Option: Oscar Drop-off${dm.checkOutAddress ? ` (Address: ${dm.checkOutAddress})` : ''}`);
      } else if (dm.checkOutMethod === 'OWNER_PICKUP') {
        lines.push(`Check-out Option: Owner Pickup`);
      }
    }

    return lines.join('\n');
  };

  const handleShareBooking = async (b: typeof enrichedBookings[0]) => {
    const shareText = generateBookingShareText(b);
    const title = `Booking Summary: ${b.dog?.name || 'Dog'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Navigator share error, falling back to clipboard:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      showToast('Booking summary copied to clipboard!', 'success');
    } catch (err) {
      showToast('Could not share. Please copy details manually.', 'error');
    }
  };

  return (
    <div className="bookings-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>
            Bookings
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Manage all reservations, check-ins and check-outs
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/bookings/new')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            padding: '9px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 700,
            boxShadow: '0 3px 10px rgba(18, 103, 223, 0.25)'
          }}
        >
          <Plus size={16} strokeWidth={3} />
          <span>New Booking</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="filter-tabs-scroll">
        {filterTabs.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`filter-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveStatus(tab.key)}
            >
              <span>{tab.label}</span>
              <span className="badge-count">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Date Navigator */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          backgroundColor: '#ffffff'
        }}
      >
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#edf2fa'
          }}
          aria-label="Previous day"
        >
          <ChevronLeft size={20} color="var(--color-text-primary)" />
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            {selectedDate === todayStr ? `Today, ${formatDisplayDate(selectedDate)}` : formatDisplayDate(selectedDate)}
          </p>
          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              Jump to Today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => shiftDate(1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#edf2fa'
          }}
          aria-label="Next day"
        >
          <ChevronRight size={20} color="var(--color-text-primary)" />
        </button>
      </div>

      {/* Booking Cards List */}
      {filteredBookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            No bookings found
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            There are no bookings matching the selected status filter.
          </p>
          <button
            type="button"
            onClick={() => setActiveStatus('ALL')}
            className="btn-secondary"
            style={{ marginTop: '12px' }}
          >
            Show All Bookings
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredBookings.map((booking) => {
            const dog = booking.dog;
            return (
              <div
                key={booking.id}
                className="card"
                onClick={() => {
                  if (dog) navigate(`/dogs/${dog.id}`);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  cursor: 'pointer'
                }}
              >
                {/* Dog & Owner Info Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <DogAvatar avatarId={dog?.avatarId} size="lg" />
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {dog?.name || 'Unknown Dog'}
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        {dog?.ownerName || 'Unknown Owner'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareBooking(booking);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        background: 'none',
                        border: 'none',
                        padding: '2px 4px',
                        cursor: 'pointer',
                        lineHeight: 1
                      }}
                      title="Share booking summary"
                    >
                      <Share2 size={13} />
                      <span>Share</span>
                    </button>

                    {dog?.ownerPhone && (
                      <a
                        href={`tel:${dog.ownerPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                          padding: '6px 10px',
                          background: '#edf2fa',
                          borderRadius: '8px'
                        }}
                      >
                        <Phone size={12} />
                        <span>{dog.ownerPhone}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Dates Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    padding: '10px 12px',
                    backgroundColor: '#f7fbff',
                    borderRadius: '10px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                      Check-In
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {booking.checkInDate || '—'}
                    </span>
                    {booking.checkInTime && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                        {booking.checkInTime}
                      </span>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                      Check-Out
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {booking.checkOutDate || '—'}
                    </span>
                    {booking.checkOutTime && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                        {booking.checkOutTime}
                      </span>
                    )}
                  </div>
                </div>

                {/* Services & Delivery Row */}
                {((booking.services && booking.services.length > 0) || (booking.deliveryMethod && (booking.deliveryMethod.checkInMethod === 'OSCAR_PICKUP' || booking.deliveryMethod.checkOutMethod === 'OSCAR_DROPOFF'))) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {booking.services && booking.services.map((srvId) => {
                      const srv = SERVICE_META[srvId] || { label: srvId, icon: Award };
                      const Icon = srv.icon;
                      return (
                        <span
                          key={srvId}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 7px',
                            backgroundColor: '#eaf2ff',
                            color: 'var(--color-primary)',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}
                        >
                          <Icon size={11} />
                          <span>{srv.label}</span>
                        </span>
                      );
                    })}

                    {booking.deliveryMethod?.checkInMethod === 'OSCAR_PICKUP' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 7px',
                          backgroundColor: '#f0fdf4',
                          color: '#15803d',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        <Truck size={11} />
                        <span>Pickup</span>
                      </span>
                    )}

                    {booking.deliveryMethod?.checkOutMethod === 'OSCAR_DROPOFF' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 7px',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        <Truck size={11} />
                        <span>Drop-off</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Notes Snippet */}
                {booking.notes && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                      padding: '8px 10px',
                      backgroundColor: '#fffbeb',
                      borderRadius: '8px',
                      border: '1px solid #fde68a',
                      fontSize: '0.76rem',
                      color: '#92400e',
                      lineHeight: 1.35
                    }}
                  >
                    <FileText size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {booking.notes}
                    </span>
                  </div>
                )}

                {/* Footer status & duration */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <StatusBadge status={booking.status} size="sm" />
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    {booking.durationNights === 0
                      ? 'Same day'
                      : `${booking.durationNights} ${booking.durationNights === 1 ? 'night' : 'nights'}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
