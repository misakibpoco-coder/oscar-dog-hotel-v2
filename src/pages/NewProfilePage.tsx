import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AvatarSelector } from '../components/common/AvatarSelector';
import { UniversalAvatarId } from '../types';

export const NewProfilePage: React.FC = () => {
  const { addDog, navigate, showToast } = useApp();

  // Form State
  const [selectedAvatarId, setSelectedAvatarId] = useState<UniversalAvatarId>('avatar_1');
  const [dogName, setDogName] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [weight, setWeight] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [phoneConflict, setPhoneConflict] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!dogName.trim()) errs.dogName = 'Dog name is required';
    if (!breed.trim()) errs.breed = 'Breed is required';
    if (!ownerName.trim()) errs.ownerName = 'Owner name is required';
    if (!ownerPhone.trim()) errs.ownerPhone = 'Phone number is required';
    if (ownerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      errs.ownerEmail = 'Invalid email address format';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast('Please fill in all required fields.', 'error');
      return false;
    }
    return true;
  };

  const handleSaveProfile = async (e?: React.FormEvent, confirmExistingOwnerId?: string) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const newDog = await addDog({
        name: dogName.trim(),
        avatarId: selectedAvatarId,
        breed: breed.trim(),
        dob: dob || undefined,
        age: dob ? '1 yr' : undefined,
        gender,
        weightKg: weight ? parseFloat(weight) : undefined,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerEmail: ownerEmail.trim() || undefined,
        status: null,
        notes: notes.trim() || undefined,
        checkInDate: null,
        checkInTime: null,
        checkOutDate: null,
        checkOutTime: null
      }, confirmExistingOwnerId);

      setPhoneConflict(null);
      navigate(`/dogs/${newDog.id}`);
    } catch (err: any) {
      if (err.code === 'OWNER_PHONE_CONFLICT' && err.details) {
        setPhoneConflict(err.details);
      } else {
        showToast(err.message || 'Failed to save dog profile', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-profile-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>
          New Profile
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Add a new dog to the system
        </p>
      </div>

      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Universal Dog Avatar Selection Card */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
            Choose Dog Avatar
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
            Select a dog avatar for this profile
          </p>

          <AvatarSelector
            selectedId={selectedAvatarId}
            onSelect={(id) => setSelectedAvatarId(id)}
          />
        </div>

        {/* Basic Information Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Basic Information
          </h3>

          {/* Dog Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Dog Name *
            </label>
            <input
              type="text"
              placeholder="Enter dog name"
              value={dogName}
              onChange={(e) => {
                setDogName(e.target.value);
                if (errors.dogName) setErrors((prev) => ({ ...prev, dogName: '' }));
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.dogName ? '#df2145' : 'var(--color-border)'}`,
                backgroundColor: '#ffffff',
                fontSize: '0.92rem'
              }}
            />
            {errors.dogName && (
              <span style={{ fontSize: '0.74rem', color: '#df2145', marginTop: '4px', display: 'block' }}>
                {errors.dogName}
              </span>
            )}
          </div>

          {/* Breed */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Breed *
            </label>
            <input
              type="text"
              placeholder="Type breed"
              value={breed}
              onChange={(e) => {
                setBreed(e.target.value);
                if (errors.breed) setErrors((prev) => ({ ...prev, breed: '' }));
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.breed ? '#df2145' : 'var(--color-border)'}`,
                backgroundColor: '#ffffff',
                fontSize: '0.92rem'
              }}
            />
            {errors.breed && (
              <span style={{ fontSize: '0.74rem', color: '#df2145', marginTop: '4px', display: 'block' }}>
                {errors.breed}
              </span>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                backgroundColor: '#ffffff',
                fontSize: '0.92rem',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Gender */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Gender *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {(['Male', 'Female', 'Other'] as const).map((g) => {
                const isSelected = gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: isSelected ? '#e7f1ff' : '#ffffff',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weight */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Weight (kg)
            </label>
            <input
              type="number"
              placeholder="Enter weight"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                backgroundColor: '#ffffff',
                fontSize: '0.92rem'
              }}
            />
          </div>
        </div>

        {/* Owner Information Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Owner Information
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Owner Name *
            </label>
            <input
              type="text"
              placeholder="Enter owner name"
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value);
                if (errors.ownerName) setErrors((prev) => ({ ...prev, ownerName: '' }));
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.ownerName ? '#df2145' : 'var(--color-border)'}`,
                backgroundColor: '#ffffff',
                fontSize: '0.92rem'
              }}
            />
            {errors.ownerName && (
              <span style={{ fontSize: '0.74rem', color: '#df2145', marginTop: '4px', display: 'block' }}>
                {errors.ownerName}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Phone Number *
            </label>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={ownerPhone}
              onChange={(e) => {
                setOwnerPhone(e.target.value);
                if (errors.ownerPhone) setErrors((prev) => ({ ...prev, ownerPhone: '' }));
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.ownerPhone ? '#df2145' : 'var(--color-border)'}`,
                backgroundColor: '#ffffff',
                fontSize: '0.92rem'
              }}
            />
            {errors.ownerPhone && (
              <span style={{ fontSize: '0.74rem', color: '#df2145', marginTop: '4px', display: 'block' }}>
                {errors.ownerPhone}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="Enter email (optional)"
              value={ownerEmail}
              onChange={(e) => {
                setOwnerEmail(e.target.value);
                if (errors.ownerEmail) setErrors((prev) => ({ ...prev, ownerEmail: '' }));
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${errors.ownerEmail ? '#df2145' : 'var(--color-border)'}`,
                backgroundColor: '#ffffff',
                fontSize: '0.92rem'
              }}
            />
            {errors.ownerEmail && (
              <span style={{ fontSize: '0.74rem', color: '#df2145', marginTop: '4px', display: 'block' }}>
                {errors.ownerEmail}
              </span>
            )}
          </div>
        </div>

        {/* Additional Information Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Additional Information
          </h3>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Special Notes
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {notes.length}/500
              </span>
            </div>
            <textarea
              placeholder="Diet, medical conditions, behavior, etc..."
              maxLength={500}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                backgroundColor: '#ffffff',
                fontSize: '0.92rem',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="btn-primary"
          style={{ marginTop: '4px', height: '50px' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving Profile...' : 'Save Profile'}
        </button>
      </form>

      {/* Owner Phone Conflict Confirmation Dialog */}
      {phoneConflict && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Owner Profile Exists
              </h3>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              The phone number <strong style={{ color: 'var(--color-text-primary)' }}>{phoneConflict.existingPhone}</strong> is already registered to owner <strong style={{ color: 'var(--color-text-primary)' }}>{phoneConflict.existingName}</strong>.
            </p>
            <div style={{ backgroundColor: '#fff8ea', border: '1px solid #ffd88a', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.82rem', color: '#825a00' }}>
              Would you like to link <strong>{dogName}</strong> to the existing profile of <strong>{phoneConflict.existingName}</strong>?
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPhoneConflict(null)}
                style={{ flex: 1 }}
              >
                Edit Phone
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSaveProfile(undefined, phoneConflict.existingOwnerId)}
                style={{ flex: 1.6 }}
              >
                Yes, Link Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
