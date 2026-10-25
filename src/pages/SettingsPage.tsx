import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { LogOut, Code, Camera, Check, Cloud, Database, Mail, Image as ImageIcon, Upload, Archive, FolderDown, CheckCircle2, X, Share2, Loader2 } from 'lucide-react';
import { buildFullBackup, saveBackupToDevice, canShareBackupFile, shareBackupFile, BackupProgress, BackupResult } from '../services/backupExport';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, showToast, backendSession, refreshData, sessionAccount, logout } = useApp();

  const [fullName, setFullName] = useState(settings.adminName || 'MD Sakib');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup & Recovery Export state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);

  const handleStartFullBackup = async () => {
    setIsExportModalOpen(true);
    setIsGeneratingBackup(true);
    setBackupResult(null);
    setBackupProgress({
      step: 1,
      totalSteps: 8,
      message: 'Connecting to Supabase Cloud...',
      statusText: 'Starting export'
    });

    try {
      const result = await buildFullBackup((progress) => {
        setBackupProgress(progress);
      });
      setBackupResult(result);
      showToast(`Recovery backup ready! ${result.totalRecords} records verified.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate backup', 'error');
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleSaveToDevice = async () => {
    if (!backupResult) return;
    try {
      const res = await saveBackupToDevice(backupResult);
      if (res.success) {
        showToast(res.message || 'Backup ZIP saved to your phone storage!', 'success');
      }
    } catch (err: any) {
      showToast('Failed to save file: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const handleShareBackup = async () => {
    if (!backupResult) return;
    try {
      await shareBackupFile(backupResult);
    } catch (err: any) {
      showToast('Sharing not available or cancelled', 'info');
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Display name cannot be empty.', 'error');
      return;
    }
    updateSettings({ adminName: fullName.trim() });
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Selected image must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (base64) {
        updateSettings({ adminAvatar: base64 });
        showToast('Profile picture updated from gallery!', 'success');
        setIsPhotoModalOpen(false);
      }
    };
    reader.onerror = () => {
      showToast('Failed to load image from gallery', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };


  const handleTriggerCloudBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await api.backups.triggerBackup();
      showToast(`Encrypted database backup created! (${res.backup.identifier})`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger backup', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExit = async () => {
    if (window.confirm('Are you sure you want to log out of your session?')) {
      await logout();
    }
  };

  const avatarOptions = [
    '/assets/user_avatar.png',
    '/assets/dog_avatar_1.png',
    '/assets/dog_avatar_2.png',
    '/assets/dog_avatar_3.png',
    '/assets/dog_avatar_4.png',
    '/assets/dog_avatar_5.png'
  ];

  return (
    <div className="settings-page" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>
          Account Settings
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Manage your account details
        </p>
      </div>

      {/* Profile Picture Section */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Profile Picture
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Update your profile picture from gallery or preset avatars
          </p>
        </div>

        {/* Hidden gallery file input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleGalleryUpload}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2.5px solid #ffffff',
              boxShadow: 'var(--shadow-md)',
              backgroundColor: '#eaf1fb',
              flexShrink: 0
            }}
          >
            <img
              src={settings.adminAvatar || '/assets/user_avatar.png'}
              alt={settings.adminName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/user_avatar.png';
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Choose from Gallery Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(18, 103, 223, 0.25)'
              }}
            >
              <ImageIcon size={16} />
              <span>Choose from Gallery</span>
            </button>

            {/* Toggle Preset Avatars Button */}
            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(!isPhotoModalOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-primary)',
                fontSize: '0.88rem',
                fontWeight: 700,
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: '#e7f1ff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Camera size={16} />
              <span>{isPhotoModalOpen ? 'Hide Avatars' : 'Preset Avatars'}</span>
            </button>
          </div>
        </div>

        {/* Photo Selection Tray */}
        {isPhotoModalOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '12px', background: '#f7fbff', borderRadius: '10px', border: '1px solid #dce7f5', flexWrap: 'wrap' }}>
            {/* Upload Tile */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '1.5px dashed var(--color-primary)',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-primary)'
              }}
              title="Upload custom image from gallery"
            >
              <Upload size={16} />
            </div>

            {avatarOptions.map((opt, i) => (
              <div
                key={i}
                onClick={() => {
                  updateSettings({ adminAvatar: opt });
                  setIsPhotoModalOpen(false);
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: settings.adminAvatar === opt ? '2.5px solid #1267df' : '1px solid #cbd4e1',
                  boxShadow: settings.adminAvatar === opt ? '0 0 0 2px rgba(18, 103, 223, 0.2)' : 'none'
                }}
              >
                <img src={opt} alt="Option" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Name Section */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Name
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Update your display name
          </p>
        </div>

        <form onSubmit={handleSaveName} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '0.92rem'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              height: '42px'
            }}
          >
            <Check size={16} />
            <span>Save</span>
          </button>
        </form>
      </div>

      {/* Data Export / Backup */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Data Export / Backup
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Download a copy of your data
          </p>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
          Export your dogs, bookings and other important data as a backup file.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleTriggerCloudBackup}
            disabled={isBackingUp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f0edff',
              color: '#5336df',
              border: '1px solid #5336df44',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700
            }}
          >
            <Cloud size={16} />
            <span>{isBackingUp ? 'Encrypting...' : 'Cloud Backup (AES-256)'}</span>
          </button>

          <button
            type="button"
            onClick={handleStartFullBackup}
            disabled={isGeneratingBackup}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1267df',
              color: '#ffffff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(18, 103, 223, 0.25)',
              cursor: 'pointer'
            }}
          >
            <Archive size={16} />
            <span>Export Full Backup</span>
          </button>
        </div>
      </div>

      {/* Backend & Database Server Status */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Cloud Database & Session
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Supabase Cloud PostgreSQL & live synchronization
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--color-surface)', padding: '12px', borderRadius: '8px', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Connection Status</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              color: backendSession.isConnected ? '#219763' : '#df2145'
            }}>
              ● {backendSession.isConnected ? 'Connected (Supabase Cloud)' : 'Offline / Standalone'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Logged-in Account</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {sessionAccount?.identifier || backendSession.staffEmail || 'Staff Member'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Organization / Hotel</span>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {sessionAccount?.hotelName || 'Oscar Dog Hotel'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Account Type</span>
            <span style={{ fontWeight: 600, color: '#1267df' }}>
              {sessionAccount?.role === 'STAFF' ? 'Staff (Shared Hotel Access)' : 'Personal Customer Account'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Hotel Timezone</span>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Europe/Nicosia (UTC+3)
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Last Synchronized</span>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {backendSession.lastSyncAt || 'Just now'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => refreshData()}
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
        >
          Sync Data Now
        </button>
      </div>

      {/* Developer Information */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code size={18} color="#5336df" />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Developer Information
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              App version and system details
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem', marginTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Developer Contact</span>
            <a
              href="mailto:Info.developer.connect@gmail.com"
              style={{
                fontWeight: 700,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Mail size={14} />
              <span>Info.developer.connect@gmail.com</span>
            </a>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Version</span>
            <span style={{ fontWeight: 600 }}>{settings.version || '1.0.0'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Build</span>
            <span style={{ fontWeight: 600 }}>{settings.build || '20260913'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Environment</span>
            <span style={{ fontWeight: 600, color: '#16a36a' }}>{settings.environment || 'Production'}</span>
          </div>

          <a
            href="mailto:Info.developer.connect@gmail.com?subject=Oscar%20Dog%20Hotel%20-%20Support%20Inquiry"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              marginTop: '6px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#1267df',
              border: '1px solid #bfdbfe',
              textDecoration: 'none',
              fontSize: '0.86rem',
              fontWeight: 700
            }}
          >
            <Mail size={16} />
            <span>Contact Developer (Info.developer.connect@gmail.com)</span>
          </a>
        </div>
      </div>

      {/* Log Out Action */}
      <button
        type="button"
        onClick={handleExit}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '14px',
          color: '#df2145',
          border: '1.5px solid #df214533',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.95rem',
          fontWeight: 700,
          marginTop: '6px',
          cursor: 'pointer'
        }}
      >
        <LogOut size={18} />
        <span>Log Out</span>
      </button>

      {/* Full Recovery Backup Modal */}
      {isExportModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999
          }}
          onClick={() => {
            if (!isGeneratingBackup) setIsExportModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '430px',
              width: '100%',
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#eaf2ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)'
                  }}
                >
                  <Archive size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    Export Full Backup
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                    Complete Supabase recovery package
                  </p>
                </div>
              </div>

              {!isGeneratingBackup && (
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* In Progress View */}
            {isGeneratingBackup && backupProgress && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {backupProgress.statusText || 'Processing...'}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Step {backupProgress.step} of {backupProgress.totalSteps}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.round((backupProgress.step / backupProgress.totalSteps) * 100)}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.84rem',
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{backupProgress.message}</span>
                </div>
              </div>
            )}

            {/* Finished / Ready View */}
            {!isGeneratingBackup && backupResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <CheckCircle2 size={22} color="#16a34a" style={{ flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.88rem', fontWeight: 800, color: '#15803d' }}>
                      Database Verified & Backup Ready
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#166534', marginTop: '2px' }}>
                      All {backupResult.totalRecords} records match the live Supabase database exactly.
                    </p>
                  </div>
                </div>

                {/* Breakdown List */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    backgroundColor: '#f8fafc',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.82rem'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Dogs:</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{backupResult.counts.dogs} profiles</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Owners:</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{backupResult.counts.owners} contacts</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Bookings:</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{backupResult.counts.bookings} reservations</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>History Logs:</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{backupResult.counts.statusHistory} events</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '2px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Archive Size:</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>
                      {backupResult.sizeFormatted} ({backupResult.filename})
                    </strong>
                  </div>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Includes self-contained <code>restore.sql</code>, database DDL, RLS policies, JSON tables, and a README for restoring into any new Supabase project. No credentials included.
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveToDevice}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <FolderDown size={18} />
                    <span>Save Recovery ZIP to Phone</span>
                  </button>

                  {canShareBackupFile(backupResult) && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleShareBackup}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <Share2 size={16} />
                      <span>Share / Send ZIP</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(false)}
                    style={{
                      padding: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
