import { CampaignConfig, CampaignAggregates } from '@/lib/types';
import { formatIndianNumber } from '@/lib/calculations/currency';
import { Map, Grid, Layers, Sparkles } from 'lucide-react';

interface LandMetricsProps {
  campaign: CampaignConfig;
  aggregates: CampaignAggregates;
}

export default function LandMetrics({ campaign, aggregates }: LandMetricsProps) {
  // Conversions: 1 Cent = 435.6 sq ft
  const remainingCent = Math.max(0, parseFloat((campaign.landAreaCent - aggregates.totalCentUnits).toFixed(2)));
  const remainingSqFt = Math.max(0, parseFloat((campaign.landAreaSqFt - aggregates.totalSqFtUnits).toFixed(1)));
  
  // Total potential musallas = 8,494.2 sq ft / 8 sq ft = approx 1,061 Musallas
  const totalPotentialMusallas = Math.floor(campaign.landAreaSqFt / campaign.musallaSqFt);
  const remainingMusallas = Math.max(0, totalPotentialMusallas - aggregates.totalMusallaUnits);

  return (
    <section style={{ padding: 'var(--space-12) 0', background: 'var(--bg-base)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto var(--space-8)' }}>
          <span className="badge badge-gold" style={{ marginBottom: '12px' }}>
            <Layers size={14} /> Land &amp; Area Breakdown
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: 'var(--brand-900)' }}>
            Total Land Area: {campaign.landAreaCent} Cent ({formatIndianNumber(campaign.landAreaSqFt)} Sq. Ft.)
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Every Cent and square foot represents physical land dedicated for the house of Allah. Track our land coverage in real-time below:
          </p>
        </div>

        {/* 3 Metrics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-6)',
        }}>
          {/* Cent Meter */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--brand-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-800)',
              }}>
                <Map size={24} />
              </div>
              <span className="badge badge-brand">Cent Allocation</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Cent Sponsored</span>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--brand-900)',
              }}>
                {aggregates.totalCentUnits} <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {campaign.landAreaCent} Cent</span>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div style={{
              height: '8px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              marginBottom: '10px',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (aggregates.totalCentUnits / campaign.landAreaCent) * 100)}%`,
                background: 'var(--brand-700)',
                borderRadius: 'var(--radius-full)',
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>{remainingCent} Cent Remaining</span>
              <span style={{ fontWeight: 600, color: 'var(--brand-800)' }}>
                {((aggregates.totalCentUnits / campaign.landAreaCent) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Square Feet Meter */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--gold-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold-700)',
              }}>
                <Grid size={24} />
              </div>
              <span className="badge badge-gold">Sq. Ft. Allocation</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Sq. Ft. Sponsored</span>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--brand-900)',
              }}>
                {formatIndianNumber(aggregates.totalSqFtUnits)} <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {formatIndianNumber(campaign.landAreaSqFt)} Sq. Ft.</span>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div style={{
              height: '8px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              marginBottom: '10px',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (aggregates.totalSqFtUnits / campaign.landAreaSqFt) * 100)}%`,
                background: 'var(--gold-600)',
                borderRadius: 'var(--radius-full)',
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>{formatIndianNumber(remainingSqFt)} Sq. Ft. Remaining</span>
              <span style={{ fontWeight: 600, color: 'var(--gold-700)' }}>
                {((aggregates.totalSqFtUnits / campaign.landAreaSqFt) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Musalla Sponsorships */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#E0F2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0369A1',
              }}>
                <Sparkles size={24} />
              </div>
              <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1' }}>Prayer Space</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Musallas Sponsored</span>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--brand-900)',
              }}>
                {aggregates.totalMusallaUnits} <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {totalPotentialMusallas} Musallas</span>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div style={{
              height: '8px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              marginBottom: '10px',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (aggregates.totalMusallaUnits / totalPotentialMusallas) * 100)}%`,
                background: '#0284C7',
                borderRadius: 'var(--radius-full)',
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>{remainingMusallas} Musallas Open</span>
              <span style={{ fontWeight: 600, color: '#0369A1' }}>
                {((aggregates.totalMusallaUnits / totalPotentialMusallas) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
