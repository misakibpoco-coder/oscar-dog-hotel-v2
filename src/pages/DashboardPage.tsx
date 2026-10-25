import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DogAvatar } from '../components/common/DogAvatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { Search, ArrowRight, ShieldCheck, Heart, Sparkles, Clock, AlertTriangle, Phone, X } from 'lucide-react';
import { matchDogSearch } from '../utils/search';
import { getTodayDateString, formatDisplayDate } from '../utils/date';

export const DashboardPage: React.FC = () => {
  const { dogs, bookings, stats, navigate, setFilterState, overdueAttentionList } = useApp();
  const [localSearch, setLocalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Clear search on unmount or page change
  useEffect(() => {
    return () => {
      setLocalSearch('');
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      const q = localSearch.trim();
      setLocalSearch('');
      setIsSearchFocused(false);
      setFilterState((prev) => ({ ...prev, searchQuery: q }));
      navigate('/search');
    }
  };

  // Simultaneous matching results as user types with robust phone and name matching
  const matchingDogs = useMemo(() => {
    if (!localSearch.trim()) return [];
    return dogs.filter((d) => matchDogSearch(d, localSearch));
  }, [dogs, localSearch]);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Today's activities derived strictly from actual reservations relevant to today (Requirement 8)
  const todayActivities = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((b) => {
        if (b.status === 'CANCEL' || b.status === 'COMPLETE') return false;

        const isArrivalToday = b.checkInDate === todayStr;
        const isDepartureToday = b.checkOutDate === todayStr;

        // If status is UPCOMING and checkInDate !== todayStr, this is a missed check-in or future check-in
        // Requirement 3 & 5: Missed check-ins from previous days must NOT appear as today's activity
        if (b.status === 'UPCOMING' && b.checkInDate !== todayStr) {
          return false;
        }

        const cin = new Date(b.checkInDate).getTime();
        const cout = new Date(b.checkOutDate).getTime();
        const isActiveStay = !isNaN(cin) && !isNaN(cout) && cin <= now.getTime() && cout >= now.getTime() && b.status !== 'UPCOMING';

        return isArrivalToday || isDepartureToday || isActiveStay;
      })
      .map((b) => {
        const dog = dogs.find((d) => d.id === b.dogId) || b.dog;
        return {
          booking: b,
          dog
        };
      })
      .filter((item): item is { booking: typeof bookings[0]; dog: typeof dogs[0] } => Boolean(item.dog && !item.dog.isArchived));
  }, [bookings, dogs, todayStr]);

  // Upcoming reservations derived strictly from genuinely future reservations (Requirement 4)
  const upcomingReservations = useMemo(() => {
    return bookings
      .filter((b) => {
        if (b.status !== 'UPCOMING') return false;
        // Strictly future reservations starting after today (never missed check-ins or past dates)
        return b.checkInDate > todayStr;
      })
      .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime())
      .map((b) => {
        const dog = dogs.find((d) => d.id === b.dogId) || b.dog;
        return {
          booking: b,
          dog
        };
      })
      .filter((item): item is { booking: typeof bookings[0]; dog: typeof dogs[0] } => Boolean(item.dog && !item.dog.isArchived));
  }, [bookings, dogs, todayStr]);

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Search Input Bar with simultaneous live results */}
      <div ref={searchContainerRef} style={{ position: 'relative', width: '100%', zIndex: 30 }}>
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Search by dog name, owner, or phone..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            style={{
              width: '100%',
              padding: '14px 75px 14px 44px',
              backgroundColor: '#ffffff',
              border: isSearchFocused && localSearch ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.92rem',
              color: 'var(--color-text-primary)',
              boxShadow: 'var(--shadow-sm)',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}
          >
            <Search size={20} />
          </div>

          {localSearch && (
            <div
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%'
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Go
              </button>
            </div>
          )}
        </form>

        {/* Live Matching Results Simultaneous Dropdown */}
        {localSearch.trim() && isSearchFocused && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.14)',
              border: '1px solid #dce5f2',
              overflow: 'hidden',
              zIndex: 100,
              maxHeight: '340px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
                color: 'var(--color-text-secondary)',
                fontWeight: 600
              }}
            >
              <span>
                Matching Results ({matchingDogs.length})
              </span>
              <span>Live Search</span>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '240px' }}>
              {matchingDogs.length > 0 ? (
                matchingDogs.map((dog) => (
                  <div
                    key={dog.id}
                    onClick={() => {
                      setLocalSearch('');
                      setIsSearchFocused(false);
                      navigate('/dogs', dog.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f7ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <DogAvatar avatarId={dog.avatarId} alt={dog.name} size="sm" />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                            {dog.name}
                          </span>
                          <span style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>
                            • {dog.breed}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
                          <Phone size={11} color="var(--color-primary)" />
                          <span>{dog.ownerPhone || 'No phone'}</span>
                          <span style={{ color: '#94a3b8' }}>({dog.ownerName})</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={dog.status} size="sm" />
                      <ArrowRight size={14} color="#94a3b8" />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    No dogs found matching "{localSearch}"
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Try searching by dog name, owner name, or phone number.
                  </p>
                </div>
              )}
            </div>

            {matchingDogs.length > 0 && (
              <button
                type="button"
                onClick={handleSearchSubmit}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#f8fafc',
                  border: 'none',
                  borderTop: '1px solid #e2e8f0',
                  color: 'var(--color-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                View all in Search & Filter →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hero Total Dogs Card */}
      <div
        className="card hero-dogs-card"
        style={{
          background: 'linear-gradient(135deg, #eaf2ff 0%, #d8e8ff 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #c7dcff',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '65%' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#07133d',
              marginBottom: '4px'
            }}
          >
            Total Dogs
          </h2>
          <div
            style={{
              fontSize: '3.6rem',
              fontWeight: 900,
              color: '#1267df',
              lineHeight: 1,
              letterSpacing: '-1px',
              margin: '8px 0 6px 0'
            }}
          >
            {stats.totalDogs}
          </div>
          <p
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#1267df',
              marginBottom: '14px'
            }}
          >
            {stats.inHotelCount} In Hotel • {stats.outgoingCount} Outgoing
          </p>

          {/* 4 Feature Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#07133d',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              <ShieldCheck size={12} color="#219763" /> Safe
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#07133d',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              <Heart size={12} color="#df2145" /> Care
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#07133d',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              <Sparkles size={12} color="#1267df" /> Play
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#07133d',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              <Clock size={12} color="#d98d00" /> Always
            </span>
          </div>
        </div>

        {/* Hero dog image decoration - perfected fit grounded cleanly */}
        <div
          style={{
            position: 'absolute',
            right: '8px',
            bottom: '0px',
            width: '135px',
            height: '145px',
            zIndex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            pointerEvents: 'none'
          }}
        >
          <img
            src="/assets/hero_dog.png"
            alt="Oscar Dog Hotel"
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom right',
              filter: 'drop-shadow(0 4px 10px rgba(18, 103, 223, 0.2))'
            }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Summary Cards: In Hotel, Today Check-In, Today Check-Out, Upcoming */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px'
        }}
      >
        {/* In Hotel - Show all statuses for today (Requirement 2) */}
        <div
          className="card"
          onClick={() => {
            setFilterState((prev) => ({ ...prev, statusFilter: 'ALL' }));
            navigate('/dogs');
          }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e1f3eb',
            borderLeft: '4px solid #219763',
            cursor: 'pointer',
            padding: '14px'
          }}
        >
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            In Hotel
          </p>
          <div
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#219763',
              lineHeight: 1.1,
              margin: '4px 0'
            }}
          >
            {stats.inHotelTodayAllCount || stats.inHotelCount}
          </div>
          <p style={{ fontSize: '0.72rem', fontWeight: 500, color: '#279967' }}>
            All statuses for today
          </p>
        </div>

        {/* Today Check-In */}
        <div
          className="card"
          onClick={() => {
            setFilterState((prev) => ({ ...prev, statusFilter: 'RECEIVED' }));
            navigate('/dogs');
          }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e6f0fa',
            borderLeft: '4px solid #1267df',
            cursor: 'pointer',
            padding: '14px'
          }}
        >
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Today Check-In
          </p>
          <div
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#1267df',
              lineHeight: 1.1,
              margin: '4px 0'
            }}
          >
            {stats.todayCheckIn}
          </div>
          <p style={{ fontSize: '0.72rem', fontWeight: 500, color: '#3b82f6' }}>
            Dogs checking in today
          </p>
        </div>

        {/* Today Check-Out */}
        <div
          className="card"
          onClick={() => {
            setFilterState((prev) => ({ ...prev, statusFilter: 'OUTGOING' }));
            navigate('/dogs');
          }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #fce8eb',
            borderLeft: '4px solid #df2145',
            cursor: 'pointer',
            padding: '14px'
          }}
        >
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Today Check-Out
          </p>
          <div
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#df2145',
              lineHeight: 1.1,
              margin: '4px 0'
            }}
          >
            {stats.todayCheckOut}
          </div>
          <p style={{ fontSize: '0.72rem', fontWeight: 500, color: '#e33b59' }}>
            Departures today
          </p>
        </div>

        {/* Upcoming */}
        <div
          className="card"
          onClick={() => {
            setFilterState((prev) => ({ ...prev, statusFilter: 'UPCOMING' }));
            navigate('/dogs');
          }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #fef3c7',
            borderLeft: '4px solid #d97706',
            cursor: 'pointer',
            padding: '14px'
          }}
        >
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Upcoming
          </p>
          <div
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#d97706',
              lineHeight: 1.1,
              margin: '4px 0'
            }}
          >
            {stats.upcomingCount}
          </div>
          <p style={{ fontSize: '0.72rem', fontWeight: 500, color: '#b45309' }}>
            Future reservations
          </p>
        </div>
      </div>

      {/* Action Required: Overdue Checkout Attention Section */}
      {overdueAttentionList && overdueAttentionList.length > 0 && (
        <div
          className="card"
          style={{
            backgroundColor: '#fff5f5',
            border: '1.5px solid #f9cbd2',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#df2145" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#df2145' }}>
              Action Required ({overdueAttentionList.length})
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#851d2f' }}>
            The following dogs have missed check-ins or overdue departures requiring attention:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {overdueAttentionList.map((item) => {
              const title = item.alertTitle || (item.attention?.attentionType === 'MISSED_CHECKIN' ? 'Check-in overdue' : 'Checkout overdue');
              const eventDateStr = item.scheduledEventDateFormatted || item.scheduledCheckOutFormatted || 'Passed';
              return (
                <div
                  key={item.bookingId}
                  onClick={() => navigate(`/dogs/${item.dogId}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: '#ffffff',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #fed7dd',
                    cursor: 'pointer'
                  }}
                >
                  <DogAvatar avatarId={item.dogAvatarId} size="lg" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {item.dogName}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                        • {item.dogBreed}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          backgroundColor: '#df2145',
                          padding: '2px 7px',
                          borderRadius: '4px'
                        }}
                      >
                        {title}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: '#851d2f', fontWeight: 600 }}>
                        Scheduled: {eventDateStr} ({item.attention?.overdueMinutes || 0}m overdue)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '6px 10px', whiteSpace: 'nowrap' }}
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Activities List Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Today’s Activities
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
              Check-ins, departures, and active stays for today
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dogs')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-primary)'
            }}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Dog rows or empty state */}
        {todayActivities.length === 0 ? (
          <div className="card" style={{ padding: '24px 16px', textAlign: 'center', backgroundColor: '#ffffff' }}>
            <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              No check-ins, departures, or active stays today
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              All daily hotel activities are currently up to date.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todayActivities.map(({ dog, booking }) => (
              <div
                key={booking.id}
                className="card"
                onClick={() => navigate(`/dogs/${dog.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <DogAvatar avatarId={dog.avatarId} size="lg" />
                  <div>
                    <h4
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {dog.name}
                    </h4>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {dog.breed} • {dog.ownerName}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '4px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 500
                    }}
                  >
                    {booking.checkInTime || (booking.checkInDate === todayStr ? 'Today' : booking.checkInDate)}
                  </span>
                  <StatusBadge status={booking.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Reservations (Starting after today) */}
      {upcomingReservations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Upcoming Reservations
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                Bookings starting after today
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterState((prev) => ({ ...prev, statusFilter: 'UPCOMING' }));
                navigate('/bookings');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--color-primary)'
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcomingReservations.slice(0, 5).map(({ dog, booking }) => (
              <div
                key={booking.id}
                className="card"
                onClick={() => navigate(`/dogs/${dog.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <DogAvatar avatarId={dog.avatarId} size="lg" />
                  <div>
                    <h4
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {dog.name}
                    </h4>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {dog.breed} • {dog.ownerName}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '4px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-primary)',
                      fontWeight: 700
                    }}
                  >
                    Starts {formatDisplayDate(booking.checkInDate || '')}
                  </span>
                  <StatusBadge status={booking.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
