'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Handshake } from 'lucide-react';

export default function StickyBottomBar() {
  const pathname = usePathname();

  // Hide sticky bar on /live, /admin, or /offer (as requested: "when cliked and go to offering tab then avoid the button")
  if (
    pathname?.startsWith('/live') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/offer') ||
    pathname?.startsWith('/receipt')
  ) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '380px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: 'var(--radius-full)',
      padding: '5px',
      boxShadow: '0 8px 24px rgba(2, 132, 199, 0.25)',
      border: '1.5px solid #BAE6FD',
      display: 'flex',
      alignItems: 'center',
      zIndex: 900,
    }}>
      {/* Prominent Offer Now Button: Blue background with pure white inside objects */}
      <Link
        href="/offer"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '13px 24px',
          borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: '1.02rem',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
          transition: 'all 0.2s ease',
          textDecoration: 'none',
        }}
      >
        <Handshake size={22} color="#FFFFFF" strokeWidth={2.2} />
        <span style={{ color: '#FFFFFF', letterSpacing: '0.01em' }}>Offer Now</span>
      </Link>
    </div>
  );
}
