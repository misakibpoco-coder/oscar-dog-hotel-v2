import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, User, Shield, AlertCircle, Phone } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, createAccount } = useApp();

  const [activeTab, setActiveTab] = useState<'STAFF' | 'USER'>('STAFF');
  const [userSubTab, setUserSubTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Staff Form State
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // User Form State
  const [userIdentifier, setUserIdentifier] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!staffIdentifier.trim()) {
      setError('Please enter your mobile or account number.');
      return;
    }
    if (!staffPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(staffIdentifier.trim(), staffPassword);
    } catch (err: any) {
      setError(err.message || 'Invalid account number or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userIdentifier.trim()) {
      setError('Please enter your mobile number or email address.');
      return;
    }
    if (!userPassword) {
      setError('Please enter your password.');
      return;
    }

    if (userSubTab === 'REGISTER') {
      if (userPassword !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (userPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      setIsLoading(true);
      try {
        await createAccount(userIdentifier.trim(), userPassword);
      } catch (err: any) {
        setError(err.message || 'Failed to create account.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        await login(userIdentifier.trim(), userPassword);
      } catch (err: any) {
        setError(err.message || 'Invalid mobile/email or password.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '28px 24px 20px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)',
            borderBottom: '1px solid #edf2f7'
          }}
        >
          <img
            src="/assets/hotel_logo.png"
            alt="Oscar Dog Hotel"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              marginBottom: '10px',
              filter: 'drop-shadow(0 4px 12px rgba(18, 103, 223, 0.15))'
            }}
          />
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary, #07133d)', margin: 0 }}>
            Oscar Dog Hotel
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary, #64748b)', marginTop: '4px' }}>
            Boarding & Daycare Management
          </p>
        </div>

        {/* Tab Navigation: Staff vs Normal User */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('STAFF');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.86rem',
              fontWeight: 700,
              backgroundColor: activeTab === 'STAFF' ? '#ffffff' : 'transparent',
              color: activeTab === 'STAFF' ? 'var(--color-primary, #1267df)' : '#64748b',
              border: 'none',
              borderBottom: activeTab === 'STAFF' ? '2px solid var(--color-primary, #1267df)' : 'none',
              cursor: 'pointer'
            }}
          >
            <Shield size={16} />
            <span>Log In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('USER');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.86rem',
              fontWeight: 700,
              backgroundColor: activeTab === 'USER' ? '#ffffff' : 'transparent',
              color: activeTab === 'USER' ? 'var(--color-primary, #1267df)' : '#64748b',
              border: 'none',
              borderBottom: activeTab === 'USER' ? '2px solid var(--color-primary, #1267df)' : 'none',
              cursor: 'pointer'
            }}
          >
            <User size={16} />
            <span>Customer Portal</span>
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'STAFF' ? (
            <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary, #1e293b)',
                    marginBottom: '6px'
                  }}
                >
                  Type your number
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Type your number"
                    value={staffIdentifier}
                    onChange={(e) => setStaffIdentifier(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />
                  <Phone
                    size={18}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary, #1e293b)',
                    marginBottom: '6px'
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />
                  <Lock
                    size={18}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  marginTop: '8px',
                  backgroundColor: 'var(--color-primary, #1267df)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '13px',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(18, 103, 223, 0.25)'
                }}
              >
                {isLoading ? 'Signing In...' : 'Log In'}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Customer Portal Sub-tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '8px',
                  marginBottom: '6px'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setUserSubTab('LOGIN');
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: userSubTab === 'LOGIN' ? '#ffffff' : 'transparent',
                    color: userSubTab === 'LOGIN' ? '#0f172a' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserSubTab('REGISTER');
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: userSubTab === 'REGISTER' ? '#ffffff' : 'transparent',
                    color: userSubTab === 'REGISTER' ? '#0f172a' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--color-text-primary, #1e293b)',
                      marginBottom: '6px'
                    }}
                  >
                    Type your number
                  </label>
                  <input
                    type="text"
                    placeholder="Type your number"
                    value={userIdentifier}
                    onChange={(e) => setUserIdentifier(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--color-text-primary, #1e293b)',
                      marginBottom: '6px'
                    }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {userSubTab === 'REGISTER' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-text-primary, #1e293b)',
                        marginBottom: '6px'
                      }}
                    >
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.92rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    marginTop: '6px',
                    backgroundColor: 'var(--color-primary, #1267df)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '13px',
                    borderRadius: '8px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(18, 103, 223, 0.25)'
                  }}
                >
                  {isLoading
                    ? 'Processing...'
                    : userSubTab === 'REGISTER'
                    ? 'Create Account'
                    : 'Sign In'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
