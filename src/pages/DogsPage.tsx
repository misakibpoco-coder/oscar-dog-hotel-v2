import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DogAvatar } from '../components/common/DogAvatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { UniversalStatus } from '../types';
import { Search, Plus, X, Phone, ArrowRight } from 'lucide-react';
import { matchDogSearch } from '../utils/search';

export const DogsPage: React.FC = () => {
  const { dogs, navigate, filterState, setFilterState } = useApp();
  const [searchQuery, setSearchQuery] = useState(filterState.searchQuery || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [activeStatus, setActiveStatus] = useState<UniversalStatus | 'ALL'>(
    filterState.statusFilter || 'ALL'
  );

  // Automatically delete written search text when switching from DogsPage to other pages
  useEffect(() => {
    return () => {
      setSearchQuery('');
      setFilterState((prev) => ({ ...prev, searchQuery: '' }));
    };
  }, [setFilterState]);

  // Sync searchQuery when filterState changes
  useEffect(() => {
    setSearchQuery(filterState.searchQuery || '');
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

  // Filter dogs based on search query and status filter with robust phone matching
  const filteredDogs = useMemo(() => {
    return dogs.filter((dog) => {
      const matchesStatus =
        activeStatus === 'ALL' ? true : dog.status === activeStatus;
      const matchesSearch = matchDogSearch(dog, searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [dogs, searchQuery, activeStatus]);

  // Simultaneous matching results for live dropdown preview
  const matchingDogs = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return dogs.filter((dog) => {
      const matchesStatus =
        activeStatus === 'ALL' ? true : dog.status === activeStatus;
      return matchesStatus && matchDogSearch(dog, searchQuery);
    });
  }, [dogs, searchQuery, activeStatus]);

  // Counts for each filter tab
  const counts = useMemo(() => {
    return {
      ALL: dogs.length,
      IN_HOTEL: dogs.filter((d) => d.status === 'IN_HOTEL').length,
      UPCOMING: dogs.filter((d) => d.status === 'UPCOMING').length,
      OUTGOING: dogs.filter((d) => d.status === 'OUTGOING').length,
      CANCEL: dogs.filter((d) => d.status === 'CANCEL').length,
      RECEIVED: dogs.filter((d) => d.status === 'RECEIVED').length,
      COMPLETE: dogs.filter((d) => d.status === 'COMPLETE').length
    };
  }, [dogs]);

  const filterTabs: { label: string; key: UniversalStatus | 'ALL'; count: number }[] = [
    { label: 'All', key: 'ALL', count: counts.ALL },
    { label: 'In Hotel', key: 'IN_HOTEL', count: counts.IN_HOTEL },
    { label: 'Upcoming', key: 'UPCOMING', count: counts.UPCOMING },
    { label: 'Outgoing', key: 'OUTGOING', count: counts.OUTGOING },
    { label: 'Cancel', key: 'CANCEL', count: counts.CANCEL },
    { label: 'Received', key: 'RECEIVED', count: counts.RECEIVED },
    { label: 'Complete', key: 'COMPLETE', count: counts.COMPLETE }
  ];

  return (
    <div className="dogs-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              lineHeight: 1.15
            }}
          >
            Dogs
          </h2>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)'
            }}
          >
            All dogs in the hotel
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/dogs/new')}
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
          <span>Add New Dog</span>
        </button>
      </div>

      {/* Search Input Bar with simultaneous live results preview */}
      <div ref={searchContainerRef} style={{ position: 'relative', width: '100%', zIndex: 30 }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Search by dog name, owner, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            style={{
              width: '100%',
              padding: '13px 44px 13px 42px',
              backgroundColor: '#ffffff',
              border: isSearchFocused && searchQuery ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
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
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchFocused(false);
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-secondary)',
                padding: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Live Matching Results Simultaneous Dropdown */}
        {searchQuery.trim() && isSearchFocused && (
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
                      setSearchQuery('');
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
                    No dogs found matching "{searchQuery}"
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

      {/* Status Filter Tabs */}
      <div className="filter-tabs-scroll">
        {filterTabs.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`filter-tab ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveStatus(tab.key);
                setFilterState((prev) => ({ ...prev, statusFilter: tab.key }));
              }}
            >
              <span>{tab.label}</span>
              <span className="badge-count">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Dogs List */}
      {filteredDogs.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            No dogs found
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            No dogs match your current search or status filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveStatus('ALL');
            }}
            className="btn-secondary"
            style={{ marginTop: '6px' }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDogs.map((dog) => (
            <div
              key={dog.id}
              className="card"
              onClick={() => navigate(`/dogs/${dog.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <DogAvatar avatarId={dog.avatarId} size="lg" />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {dog.name}
                  </h3>
                  <StatusBadge status={dog.status} size="sm" />
                </div>

                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '6px'
                  }}
                >
                  {dog.breed} • <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{dog.ownerName}</span>
                </p>

                {/* Sub info chips */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    fontSize: '0.74rem',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {dog.age && (
                    <span style={{ background: '#edf2fa', padding: '2px 7px', borderRadius: '4px' }}>
                      {dog.age}
                    </span>
                  )}
                  {dog.gender && (
                    <span style={{ background: '#edf2fa', padding: '2px 7px', borderRadius: '4px' }}>
                      {dog.gender === 'Female' ? '♀ Female' : dog.gender === 'Male' ? '♂ Male' : dog.gender}
                    </span>
                  )}
                  {dog.weightKg && (
                    <span style={{ background: '#edf2fa', padding: '2px 7px', borderRadius: '4px' }}>
                      {dog.weightKg} kg
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '0.74rem', color: '#8a96ad' }}>
                    {dog.status && dog.checkInDate ? (dog.checkInTime ? `Checked in ${dog.checkInTime}` : dog.checkInDate) : 'No reservation'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
