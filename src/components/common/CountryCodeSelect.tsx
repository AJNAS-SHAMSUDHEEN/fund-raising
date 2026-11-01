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
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Select Country Code"
      style={{
        padding: '0 8px',
        height: '44px',
        borderRadius: '10px 0 0 10px',
        border: '1px solid #CBD5E1',
        borderRight: 'none',
        background: disabled ? '#F1F5F9' : '#F8FAFC',
        color: disabled ? '#94A3B8' : 'var(--brand-900)',
        fontSize: '0.92rem',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        paddingRight: '20px',
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23064E3B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 6px center',
        backgroundSize: '11px',
        ...style,
      }}
    >
      {COUNTRY_CODES.map((item) => (
        <option key={item.code} value={item.code}>
          {item.flag} {item.code} ({item.country})
        </option>
      ))}
    </select>
  );
}
