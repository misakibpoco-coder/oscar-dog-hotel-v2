import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DogAvatar } from '../components/common/DogAvatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { UniversalStatus } from '../types';
import { Search, X, ChevronRight, Clock, Trash2, Phone, ArrowRight } from 'lucide-react';
import { matchDogSearch } from '../utils/search';
import { getTodayDateString, addDaysToDateString } from '../utils/date';

export const SearchFilterPage: React.FC = () => {
  const {
    dogs,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    filterState,
    setFilterState,
    resetFilters,
    navigate
  } = useApp();

  const [query, setQuery] = useState(filterState.searchQuery || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [selectedStatus, setSelectedStatus] = useState<UniversalStatus | 'ALL'>(
    filterState.statusFilter || 'ALL'
  );

  // Automatically delete written search text when switching from SearchFilterPage to other pages
  useEffect(() => {
    return () => {
      setQuery('');
      setFilterState((prev) => ({ ...prev, searchQuery: '' }));
    };
  }, [setFilterState]);

  // Sync query when filterState changes
  useEffect(() => {
    setQuery(filterState.searchQuery || '');
  }, [filterState.searchQuery]);

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
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>(
    filterState.dateRangeFilter || 'ALL'
  );
  const [fromDate, setFromDate] = useState(() => getTodayDateString());
  const [toDate, setToDate] = useState(() => addDaysToDateString(getTodayDateString(), 7));
  const [hasSearched, setHasSearched] = useState(false);

  const statusOptions: { label: string; key: UniversalStatus | 'ALL' }[] = [
    { label: 'All', key: 'ALL' },
    { label: 'Upcoming', key: 'UPCOMING' },
    { label: 'In Hotel', key: 'IN_HOTEL' },
    { label: 'Outgoing', key: 'OUTGOING' },
    { label: 'Cancel', key: 'CANCEL' },
    { label: 'Received', key: 'RECEIVED' },
    { label: 'Complete', key: 'COMPLETE' }
  ];

  const datePresets: { label: string; key: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM' }[] = [
    { label: 'All Dates', key: 'ALL' },
    { label: 'Today', key: 'TODAY' },
    { label: 'This Week', key: 'THIS_WEEK' },
    { label: 'This Month', key: 'THIS_MONTH' },
    { label: 'Custom', key: 'CUSTOM' }
  ];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
    if (query.trim()) {
      addRecentSearch(query.trim(), 'General');
    }
    setFilterState({
      searchQuery: query.trim(),
      statusFilter: selectedStatus,
      dateRangeFilter: datePreset,
      customFromDate: fromDate,
      customToDate: toDate
    });
  };

  const handleClearAll = () => {
    setQuery('');
    setSelectedStatus('ALL');
    setDatePreset('ALL');
    resetFilters();
    setHasSearched(false);
  };

  const applyRecentSearch = (recentQuery: string) => {
    setQuery(recentQuery);
    setHasSearched(true);
    addRecentSearch(recentQuery, 'General');
  };

  // Search Results
  const searchResults = useMemo(() => {
    return dogs.filter((dog) => {
      // Status filter
      if (selectedStatus !== 'ALL' && dog.status !== selectedStatus) {
        return false;
      }

      // Text query with robust phone & name matching
      if (query.trim() && !matchDogSearch(dog, query)) {
        return false;
      }

      return true;
    });
  }, [dogs, query, selectedStatus]);

  // Simultaneous matching results for live dropdown preview
  const matchingDogs = useMemo(() => {
    if (!query.trim()) return [];
    return dogs.filter((dog) => {
      if (selectedStatus !== 'ALL' && dog.status !== selectedStatus) {
        return false;
      }
      return matchDogSearch(dog, query);
    });
  }, [dogs, query, selectedStatus]);

  return (
    <div className="search-filter-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>
          Search & Filter
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Find dogs, owners, or bookings
        </p>
      </div>

      {/* Search Input Bar with simultaneous live results preview */}
      <div ref={searchContainerRef} style={{ position: 'relative', width: '100%', zIndex: 30 }}>
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Search by dog name, owner, or phone..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            style={{
              width: '100%',
              padding: '13px 75px 13px 42px',
              backgroundColor: '#ffffff',
              border: isSearchFocused && query ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
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
            <Search size={19} />
          </div>

          {query && (
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
                  setQuery('');
                  setIsSearchFocused(false);
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
        {query.trim() && isSearchFocused && (
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
              maxHeight: '320px',
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
                Matching Dogs ({matchingDogs.length})
              </span>
              <span>Live Search</span>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '240px' }}>
              {matchingDogs.length > 0 ? (
                matchingDogs.map((dog) => (
                  <div
                    key={dog.id}
                    onClick={() => {
                      setQuery('');
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
                    No dogs found matching "{query}"
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Try searching by dog name, owner name, or phone number.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Date Range Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Date Range
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Filter by check-in or check-out date
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '0.88rem'
              }}
            />
          </div>
        </div>

        {/* Date presets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {datePresets.map((dp) => {
            const isSelected = datePreset === dp.key;
            return (
              <button
                key={dp.key}
                type="button"
                onClick={() => setDatePreset(dp.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 500,
                  backgroundColor: isSelected ? '#1267df' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#44516c',
                  border: `1px solid ${isSelected ? '#1267df' : 'var(--color-border)'}`
                }}
              >
                {dp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking Status Filter Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Booking Status
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Filter by booking status
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {statusOptions.map((st) => {
            const isSelected = selectedStatus === st.key;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() => setSelectedStatus(st.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 600,
                  backgroundColor: isSelected ? '#1267df' : '#ffffff',
                  color: isSelected ? '#ffffff' : 'var(--color-text-primary)',
                  border: `1px solid ${isSelected ? '#1267df' : 'var(--color-border)'}`,
                  transition: 'all 0.15s ease'
                }}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          type="button"
          onClick={handleClearAll}
          className="btn-secondary"
          style={{ height: '48px', fontSize: '0.92rem', fontWeight: 700 }}
        >
          Clear Filters
        </button>

        <button
          type="button"
          onClick={() => handleSearchSubmit()}
          className="btn-primary"
          style={{ height: '48px', fontSize: '0.92rem', fontWeight: 700 }}
        >
          Search
        </button>
      </div>

      {/* Search Results (if user searched or typed query) */}
      {(hasSearched || query) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Results ({searchResults.length})
            </h3>
            {query && (
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                Matching &quot;{query}&quot;
              </span>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                No results found
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Try adjusting your search terms or clearing status filters.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map((dog) => (
                <div
                  key={dog.id}
                  className="card"
                  onClick={() => navigate(`/dogs/${dog.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    cursor: 'pointer'
                  }}
                >
                  <DogAvatar avatarId={dog.avatarId} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {dog.name}
                      </h4>
                      <StatusBadge status={dog.status} size="sm" />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      {dog.breed} • {dog.ownerName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Searches Card */}
      {recentSearches.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Recent Searches
            </h3>
            <button
              type="button"
              onClick={clearRecentSearches}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--color-primary)'
              }}
            >
              <Trash2 size={13} />
              <span>Clear All</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {recentSearches.map((s) => (
              <div
                key={s.id}
                onClick={() => applyRecentSearch(s.query)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 8px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={16} color="var(--color-text-secondary)" />
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {s.query}
                    </p>
                    <p style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                      {s.type} • {s.timestamp}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--color-text-secondary)" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
