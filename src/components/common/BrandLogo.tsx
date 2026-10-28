'use client';

import { useState } from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function BrandLogo({ size = 40, className, showText = false }: BrandLogoProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }} className={className}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #15803D 0%, #0B3B24 100%)',
          border: '2px solid #C5A059',
          boxShadow: '0 2px 8px rgba(11, 59, 36, 0.2)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {!imgError ? (
          <Image
            src="/logo.png"
            alt="Wisdom Islamic Organization Kuppam Unit Logo"
            width={size}
            height={size}
            priority
            unoptimized
            onError={() => setImgError(true)}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        ) : (
          <div
            style={{
              color: '#C5A059',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: `${Math.max(12, Math.floor(size * 0.45))}px`,
              fontFamily: 'var(--font-display)',
            }}
          >
            W
          </div>
        )}
      </div>

      {showText && (
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.05rem',
            color: 'var(--brand-900, #0F172A)',
            lineHeight: 1.2,
          }}
        >
          SALAFI MASJID KUPPAM
        </div>
      )}
    </div>
  );
}
