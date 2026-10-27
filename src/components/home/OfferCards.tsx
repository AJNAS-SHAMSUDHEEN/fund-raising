import Link from 'next/link';
import { CampaignConfig } from '@/lib/types';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import { MapPin, Grid, Sparkles, HeartHandshake, ArrowRight } from 'lucide-react';

interface OfferCardsProps {
  campaign: CampaignConfig;
}

export default function OfferCards({ campaign }: OfferCardsProps) {
  return (
    <section style={{
      padding: 'var(--space-12) 0',
      background: '#FFFFFF',
      borderTop: '1px solid var(--border-light)',
      borderBottom: '1px solid var(--border-light)',
    }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto var(--space-10)' }}>
          <span className="badge badge-gold" style={{ marginBottom: '12px' }}>
            <HeartHandshake size={14} /> Sponsorship Packages
          </span>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: 'var(--brand-900)' }}>
            Choose Your Way to Contribute
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '1.05rem' }}>
            Select a land-area sponsorship, Musalla prayer space, or a custom amount. Every gift directly secures the land.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-6)',
        }}>
          {/* Card 1: Cent Sponsorship */}
          <div style={{
            border: '2px solid var(--brand-700)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            background: 'linear-gradient(180deg, var(--brand-50) 0%, #FFFFFF 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--brand-800)',
              color: 'var(--gold-400)',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Most Enduring
            </div>

            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--brand-800)',
                color: 'var(--gold-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <MapPin size={24} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '8px' }}>
                Cent Sponsorship
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px', minHeight: '44px' }}>
                Sponsor 1 or more Cent of land in your name or on behalf of parents/family.
              </p>

              <div style={{
                background: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: '1px solid var(--border-light)',
                marginBottom: '20px',
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Rate Per Cent</span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: 'var(--brand-800)',
                }}>
                  {formatINRFromPaise(campaign.centRatePaise)}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1 Cent = 435.6 Sq. Ft.</span>
              </div>
            </div>

            <Link
              href="/offer?type=cent"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontWeight: 700, gap: '8px' }}
            >
              <span>Sponsor Cent</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Card 2: Square Foot Sponsorship */}
          <div style={{
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s',
          }}>
            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--gold-100)',
                color: 'var(--gold-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <Grid size={24} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '8px' }}>
                Square Foot
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px', minHeight: '44px' }}>
                Accessible unit-based land sponsorship. Choose any number of square feet.
              </p>

              <div style={{
                background: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: '1px solid var(--border-light)',
                marginBottom: '20px',
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Rate Per Sq. Ft.</span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: 'var(--brand-800)',
                }}>
                  {formatINRFromPaise(campaign.sqFtRatePaise)}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct land calculation</span>
              </div>
            </div>

            <Link
              href="/offer?type=sqft"
              className="btn btn-outline"
              style={{ width: '100%', padding: '14px', fontWeight: 700, gap: '8px' }}
            >
              <span>Sponsor Sq. Ft.</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Card 3: Musalla Sponsorship */}
          <div style={{
            border: '2px solid var(--gold-500)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            background: 'linear-gradient(180deg, var(--gold-50) 0%, #FFFFFF 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--gold-600)',
              color: '#FFFFFF',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Community Favorite
            </div>

            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--gold-500)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <Sparkles size={24} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '8px' }}>
                Musalla Space
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px', minHeight: '44px' }}>
                Sponsor individual prayer spaces (8 Sq. Ft.) or a 5-Musalla family package.
              </p>

              <div style={{
                background: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: '1px solid var(--border-light)',
                marginBottom: '20px',
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Rate Per Musalla (8 Sq. Ft.)</span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: 'var(--gold-700)',
                }}>
                  {formatINRFromPaise(campaign.musallaRatePaise)}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  5 Musallas = {formatINRFromPaise(campaign.musallaPackage5Paise)}
                </span>
              </div>
            </div>

            <Link
              href="/offer?type=musalla"
              className="btn btn-gold"
              style={{ width: '100%', padding: '14px', fontWeight: 700, gap: '8px' }}
            >
              <span>Sponsor Musalla</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Card 4: Custom Donation */}
          <div style={{
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--brand-100)',
                color: 'var(--brand-800)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <HeartHandshake size={24} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '8px' }}>
                Custom Donation
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px', minHeight: '44px' }}>
                Support the project with any custom amount according to your convenience.
              </p>

              <div style={{
                background: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: '1px solid var(--border-light)',
                marginBottom: '20px',
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Any Permitted Amount</span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: 'var(--brand-900)',
                }}>
                  ₹ Any
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From ₹100 upwards</span>
              </div>
            </div>

            <Link
              href="/offer?type=custom"
              className="btn btn-outline"
              style={{ width: '100%', padding: '14px', fontWeight: 700, gap: '8px' }}
            >
              <span>Donate Custom</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
