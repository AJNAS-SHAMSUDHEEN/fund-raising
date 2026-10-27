import { PublicAnnouncement } from '@/lib/types';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import { Radio, Heart, Sparkles } from 'lucide-react';

interface LiveTickerProps {
  announcements: PublicAnnouncement[];
}

export default function LiveTicker({ announcements = [] }: LiveTickerProps) {
  const items = Array.isArray(announcements) ? announcements : [];
  return (
    <section style={{
      padding: 'var(--space-8) 0',
      background: 'var(--brand-900)',
      color: '#FFFFFF',
      borderTop: '1px solid var(--border-dark)',
      borderBottom: '1px solid var(--border-dark)',
    }}>
      <div className="container">
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#F87171',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <Radio size={14} className="animate-pulse" /> LIVE STREAM
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-on-dark-muted)' }}>
              Recent Verified Contributions
            </span>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--gold-400)' }}>
            ✦ Instant Real-Time Updates
          </span>
        </div>

        {/* Horizontal Ticker Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}>
          {items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              style={{
                background: item.isHighlighted
                  ? 'linear-gradient(135deg, rgba(197, 160, 89, 0.2) 0%, rgba(11, 59, 36, 0.4) 100%)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: item.isHighlighted
                  ? '1px solid var(--gold-500)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: item.isHighlighted ? 'var(--gold-300)' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  {item.isHighlighted && <Sparkles size={14} color="var(--gold-400)" />}
                  {item.displayName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-on-dark-muted)', marginTop: '2px' }}>
                  {item.offerType === 'cent' && `${item.quantity} Cent Land`}
                  {item.offerType === 'sqft' && `${item.quantity} Sq. Ft. Land`}
                  {item.offerType === 'musalla' && `${item.quantity} Musalla`}
                  {item.offerType === 'percentage' && `${item.quantity}% Land Share`}
                  {(item.offerType === 'custom' || item.offerType === 'cash') && 'Direct Donation'}
                  {' • '}{item.timestamp}
                </div>
              </div>

              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1rem',
                color: item.isHighlighted ? '#FFFFFF' : 'var(--gold-400)',
              }}>
                {formatINRFromPaise(item.amountPaise)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
