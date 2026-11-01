'use client';

import React from 'react';
import { COUNTRY_CODES } from '@/lib/utils/phone';

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function CountryCodeSelect({ value, onChange, disabled, style }: CountryCodeSelectProps) {
  const current = COUNTRY_CODES.find((c) => c.code === value) || COUNTRY_CODES[0];

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '84px',
        minWidth: '84px',
        maxWidth: '84px',
        flexShrink: 0,
        height: '44px',
        borderRadius: '10px 0 0 10px',
        border: '1.5px solid var(--border-medium, #CBD5E1)',
        borderRight: '1px solid var(--border-medium, #CBD5E1)',
        background: disabled ? '#F1F5F9' : '#F8FAFC',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Visual Display: Compact Flag + Code + Tiny Down Arrow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          width: '100%',
          padding: '0 4px',
          color: disabled ? '#94A3B8' : 'var(--brand-900, #064E3B)',
          fontSize: '0.9rem',
          fontWeight: 700,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{current.flag}</span>
        <span style={{ letterSpacing: '-0.3px' }}>{current.code}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.6, flexShrink: 0, marginLeft: '1px' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Invisible Native Select layered directly on top for 100% accessible native menu */}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select Country Code"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          fontSize: '16px', // Prevents iOS auto-zoom on focus
        }}
      >
        {COUNTRY_CODES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.flag} {item.country} ({item.code})
          </option>
        ))}
      </select>
    </div>
  );
}
