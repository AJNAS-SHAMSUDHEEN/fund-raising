'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUserSession } from '@/lib/state/userSession';
import {
  Menu,
  X,
  History,
  Home,
  Heart,
  User,
  Landmark,
  ChevronRight
} from 'lucide-react';

import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { session, setIsPromptOpen } = useUserSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #EEF0F2',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          maxWidth: '820px',
        }}>
          {/* Brand Logo & Title */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <BrandLogo size={38} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1.05rem',
                color: '#0F172A',
                letterSpacing: '-0.01em',
              }}>
                Wisdom Islamic Org
              </span>
              <span style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 700 }}>
                Kuppam Unit
              </span>
            </div>
          </Link>

          {/* Right: Hamburger Menu */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open Menu"
            style={{
              padding: '8px',
              color: '#1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Menu size={24} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* Slide-over Drawer Menu */}
      {isMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            width: '85%',
            maxWidth: '320px',
            background: '#FFFFFF',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px 20px',
            boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          }}>
            <div>
              {/* Drawer Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: '#0F172A' }}>
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ padding: '6px', color: '#64748B' }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* User Profile Card */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#E0E7FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <User size={20} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0F172A' }}>
                      {session.name || 'Donor Profile'}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      {session.phone ? `+91 ${session.phone}` : 'Tap edit to set name'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsPromptOpen(true);
                  }}
                  style={{
                    fontSize: '0.75rem',
                    color: '#4F46E5',
                    fontWeight: 700,
                    textDecoration: 'underline',
                  }}
                >
                  Edit
                </button>
              </div>

              {/* Public Navigation Items strictly as requested:
                  - Payments & History
                  - Offer Now
                  - Home
              */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 1. Payments & History */}
                <Link
                  href="/history"
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    color: '#1E293B',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    background: '#F8FAFC',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <History size={18} color="#4F46E5" />
                    <span>Payments &amp; History</span>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </Link>

                {/* 2. Offer Now */}
                <Link
                  href="/offer"
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    color: '#1E293B',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    background: '#F8FAFC',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Heart size={18} color="#16A34A" />
                    <span>Offer Now</span>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </Link>

                {/* 3. Home */}
                <Link
                  href="/"
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    color: '#1E293B',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    background: '#F8FAFC',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Home size={18} color="#0284C7" />
                    <span>Home</span>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
