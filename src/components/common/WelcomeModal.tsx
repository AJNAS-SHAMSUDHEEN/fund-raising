'use client';

import { useState } from 'react';
import { useUserSession } from '@/lib/state/userSession';
import { normalizePhoneNumber } from '@/lib/calculations/currency';
import CountryCodeSelect from '@/components/common/CountryCodeSelect';
import { buildStoredPhoneNumber, validatePhoneNumber } from '@/lib/utils/phone';
import { Landmark, X, UserCheck } from 'lucide-react';

export default function WelcomeModal() {
  const { isPromptOpen, setIsPromptOpen, saveSession, session } = useUserSession();
  const [name, setName] = useState(session.name || '');
  const [phone, setPhone] = useState(session.phone || '');
  const [countryCode, setCountryCode] = useState('+91');
  const [error, setError] = useState('');

  if (!isPromptOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    const valResult = validatePhoneNumber(phone, countryCode);
    if (!valResult.isValid) {
      setError(valResult.error || 'Please enter a valid phone number');
      return;
    }

    const cleanPhone = buildStoredPhoneNumber(phone, countryCode);
    setError('');
    saveSession(name, cleanPhone);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(11, 35, 23, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 9990,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        maxWidth: '460px',
        width: '100%',
        padding: '32px 28px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-light)',
        position: 'relative',
      }}>
        {session.isRegistered && (
          <button
            type="button"
            onClick={() => setIsPromptOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: 'var(--text-muted)',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--brand-800) 0%, var(--brand-900) 100%)',
            color: 'var(--gold-400)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 16px rgba(11, 59, 36, 0.2)',
          }}>
            <Landmark size={28} />
          </div>
          <h2 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--brand-900)',
            marginBottom: '8px',
          }}>
            Welcome to Masjid Fund
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Please provide your information to continue. This will help us personalize your experience and track your offers &amp; receipts.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--status-danger-bg)',
            color: 'var(--status-danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--brand-900)', marginBottom: '6px' }}>
              Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid var(--border-medium)',
                fontSize: '0.95rem',
              }}
            />
          </div>

          {/* Mobile Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--brand-900)', marginBottom: '6px' }}>
              Mobile Number <span style={{ color: 'red' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0', width: '100%', maxWidth: '100%' }}>
              <CountryCodeSelect
                value={countryCode}
                onChange={setCountryCode}
                style={{ borderRadius: '12px 0 0 12px', height: '48px' }}
              />
              <input
                type="tel"
                required
                maxLength={15}
                placeholder={countryCode === '+91' ? 'Enter 10-digit mobile number' : 'Mobile number'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '0 12px 12px 0',
                  border: '1.5px solid var(--border-medium)',
                  borderLeft: 'none',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: '12px',
            }}
          >
            Save Information
          </button>
        </form>
      </div>
    </div>
  );
}
