'use client';

import { QRCodeSVG } from 'qrcode.react';

interface EventQRCodeProps {
  url: string;
  size?: number;
  title?: string;
  subtitle?: string;
  darkColor?: string;
  lightColor?: string;
}

export default function EventQRCode({
  url,
  size = 140,
  title,
  subtitle,
  darkColor = '#0F172A',
  lightColor = '#FFFFFF',
}: EventQRCodeProps) {
  return (
    <div style={{
      background: lightColor,
      borderRadius: '16px',
      padding: '14px',
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      border: '1.5px solid #BBF7D0',
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
      textAlign: 'center',
    }}>
      <div style={{
        padding: '8px',
        background: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <QRCodeSVG
          value={url}
          size={size}
          fgColor={darkColor}
          bgColor={lightColor}
          level="M"
          includeMargin={false}
        />
      </div>

      {title && (
        <div style={{
          marginTop: '8px',
          fontWeight: 800,
          fontSize: '0.82rem',
          color: '#15803D',
          letterSpacing: '0.02em',
        }}>
          {title}
        </div>
      )}

      {subtitle && (
        <div style={{
          fontSize: '0.7rem',
          color: '#64748B',
          marginTop: '2px',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
