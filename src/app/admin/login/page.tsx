'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/state/adminAuth';
import { ShieldCheck, Lock, Smartphone, KeyRound, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginWithEmail, loginWithVolunteerPin, adminUser } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'super_admin' | 'volunteer'>('super_admin');

  // Super Admin form state
  const [email, setEmail] = useState('admin@kuppam.org');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Volunteer form state
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (adminUser) {
      if (adminUser.role === 'volunteer') {
        router.push('/admin/cash');
      } else {
        router.push('/admin');
      }
    }
  }, [adminUser, router]);

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const res = await loginWithEmail(email, password);
    setIsSubmitting(false);

    if (res.success) {
      router.push('/admin');
    } else {
      setErrorMsg(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleVolunteerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const res = await loginWithVolunteerPin(phone, pin);
    setIsSubmitting(false);

    if (res.success) {
      router.push('/admin/cash');
    } else {
      setErrorMsg(res.error || 'Invalid Mobile Number or PIN.');
    }
  };

  return (
    <div style={{
      minHeight: '90vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(circle at 50% 20%, #F0FDF4 0%, #F8FAFC 70%)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#FFFFFF',
        borderRadius: '24px',
        border: '1px solid var(--border-medium)',
        boxShadow: '0 20px 40px rgba(6, 78, 59, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        {/* Top Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand-900) 0%, var(--brand-800) 100%)',
          padding: '28px 24px',
          textAlign: 'center',
          color: '#FFFFFF',
          position: 'relative',
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            border: '2px solid var(--gold-400)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <ShieldCheck size={28} color="var(--gold-400)" />
          </div>

          <h1 style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '0 0 4px',
            fontFamily: 'var(--font-display)',
          }}>
            Admin &amp; Staff Portal
          </h1>
          <p style={{
            fontSize: '0.82rem',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: 0,
          }}>
            Wisdom Islamic Organisation Kuppam Unit
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '1px solid var(--border-light)',
          background: '#F8FAFC',
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('super_admin'); setErrorMsg(''); }}
            style={{
              padding: '14px 12px',
              fontSize: '0.9rem',
              fontWeight: 800,
              border: 'none',
              background: activeTab === 'super_admin' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'super_admin' ? 'var(--brand-900)' : '#64748B',
              borderBottom: activeTab === 'super_admin' ? '3px solid var(--brand-800)' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Lock size={16} color={activeTab === 'super_admin' ? 'var(--brand-800)' : 'currentColor'} />
            <span>Committee Master</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('volunteer'); setErrorMsg(''); }}
            style={{
              padding: '14px 12px',
              fontSize: '0.9rem',
              fontWeight: 800,
              border: 'none',
              background: activeTab === 'volunteer' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'volunteer' ? 'var(--brand-900)' : '#64748B',
              borderBottom: activeTab === 'volunteer' ? '3px solid var(--gold-600)' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Smartphone size={16} color={activeTab === 'volunteer' ? 'var(--gold-600)' : 'currentColor'} />
            <span>Volunteer Staff</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px 24px' }}>
          {/* Error Alert Box */}
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              padding: '12px 14px',
              borderRadius: '12px',
              color: '#DC2626',
              fontSize: '0.86rem',
              marginBottom: '20px',
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* TAB 1: SUPER ADMIN LOGIN (EMAIL & PASSWORD) */}
          {activeTab === 'super_admin' && (
            <form onSubmit={handleSuperAdminLogin}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Committee Admin Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@kuppam.org"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--border-medium)',
                      fontSize: '0.95rem',
                      color: 'var(--brand-900)',
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Master Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ fontSize: '0.78rem', color: 'var(--brand-800)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter committee password"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--border-medium)',
                      fontSize: '0.95rem',
                      letterSpacing: showPassword ? 'normal' : '2px',
                      color: 'var(--brand-900)',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Login as Super Admin</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div style={{
                marginTop: '16px',
                textAlign: 'center',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}>
                🔒 Authenticated securely via Firebase Auth
              </div>
            </form>
          )}

          {/* TAB 2: VOLUNTEER STAFF LOGIN (MOBILE & 4-DIGIT PIN) */}
          {activeTab === 'volunteer' && (
            <form onSubmit={handleVolunteerLogin}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Volunteer Mobile Number (10 Digits)
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    padding: '12px 14px',
                    background: '#F1F5F9',
                    border: '1.5px solid var(--border-medium)',
                    borderRight: 'none',
                    borderRadius: '12px 0 0 12px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#475569',
                  }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="99477 48552"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '0 12px 12px 0',
                      border: '1.5px solid var(--border-medium)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--brand-900)',
                      letterSpacing: '1px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  4-Digit Counter PIN (പിൻ നമ്പർ)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--border-medium)',
                      fontSize: '1.4rem',
                      letterSpacing: '8px',
                      textAlign: 'center',
                      fontWeight: 900,
                      color: 'var(--brand-900)',
                    }}
                  />
                </div>
                <small style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Authorized by the Wisdom Islamic Organisation Committee
                </small>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-gold"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isSubmitting ? (
                  <span>Verifying PIN...</span>
                ) : (
                  <>
                    <span>Enter Cash POS</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
