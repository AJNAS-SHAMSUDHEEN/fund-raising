'use client';

import Link from 'next/link';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import { CampaignConfig, CampaignAggregates } from '@/lib/types';
import { HeartHandshake, Sparkles, TrendingUp, Users } from 'lucide-react';

interface HeroProps {
  campaign: CampaignConfig;
  aggregates: CampaignAggregates;
}

export default function Hero({ campaign, aggregates }: HeroProps) {
  const percentage = Math.min(
    100,
    parseFloat(((aggregates.totalVerifiedPaise / campaign.targetAmountPaise) * 100).toFixed(1))
  );

  const remainingPaise = Math.max(0, campaign.targetAmountPaise - aggregates.totalVerifiedPaise);

  return (
    <section style={{
      background: 'linear-gradient(180deg, #FFFFFF 0%, var(--bg-base) 100%)',
      paddingTop: 'var(--space-10)',
      paddingBottom: 'var(--space-12)',
      borderBottom: '1px solid var(--border-light)',
    }}>
      <div className="container">
        {/* Campaign Badge & Heading */}
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto var(--space-8)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span className="badge badge-gold">
              <Sparkles size={14} /> Official Campaign
            </span>
            <span className="badge badge-brand">
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#107C41',
                display: 'inline-block',
                marginRight: '4px',
              }}></span>
              Real-time Verified Collections
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 4vw, 3.2rem)',
            fontWeight: 900,
            lineHeight: 1.15,
            color: 'var(--brand-900)',
            marginBottom: '16px',
          }}>
            Central Masjid Land Acquisition &amp; Development Fund
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}>
            Join the community in establishing an enduring legacy of prayer and service. Secure <strong>{campaign.landAreaCent} Cents ({campaign.landAreaSqFt} Sq. Ft.)</strong> of land through Cent, Square Feet, or Musalla sponsorships.
          </p>
        </div>

        {/* Central Fundraising Progress Dashboard Card */}
        <div style={{
          background: 'linear-gradient(145deg, #092C1C 0%, #061F13 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(20px, 4vw, 40px)',
          color: '#FFFFFF',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(197, 160, 89, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 'var(--space-8)',
        }}>
          {/* Subtle Islamic geometric accent background overlay */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(197, 160, 89, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Metric Figures Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-6)',
            alignItems: 'flex-start',
            marginBottom: 'var(--space-8)',
          }}>
            {/* Raised So Far */}
            <div>
              <span style={{
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--gold-400)',
                fontWeight: 700,
                display: 'block',
                marginBottom: '6px',
              }}>
                TOTAL VERIFIED COLLECTIONS
              </span>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1,
              }}>
                {formatINRFromPaise(aggregates.totalVerifiedPaise)}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-on-dark-muted)', marginTop: '4px', display: 'block' }}>
                Online &amp; Treasury-Verified Cash
              </span>
            </div>

            {/* Target Goal */}
            <div>
              <span style={{
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-on-dark-muted)',
                fontWeight: 600,
                display: 'block',
                marginBottom: '6px',
              }}>
                CAMPAIGN TARGET
              </span>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                fontWeight: 800,
                color: 'var(--gold-300)',
                lineHeight: 1,
              }}>
                {formatINRFromPaise(campaign.targetAmountPaise)}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-on-dark-muted)', marginTop: '4px', display: 'block' }}>
                ₹1.10 Crore Initial Target
              </span>
            </div>

            {/* Remaining Amount */}
            <div>
              <span style={{
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-on-dark-muted)',
                fontWeight: 600,
                display: 'block',
                marginBottom: '6px',
              }}>
                REMAINING TO TARGET
              </span>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1,
              }}>
                {formatINRFromPaise(remainingPaise)}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-on-dark-muted)', marginTop: '4px', display: 'block' }}>
                Needed to complete purchase
              </span>
            </div>
          </div>

          {/* Progress Bar Section */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              fontSize: '0.95rem',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-300)', fontWeight: 600 }}>
                <TrendingUp size={18} />
                <span>Goal Achieved</span>
              </span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1.25rem',
                color: '#FFFFFF',
                background: 'rgba(197, 160, 89, 0.2)',
                padding: '2px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(197, 160, 89, 0.4)',
              }}>
                {percentage}%
              </span>
            </div>

            {/* Meter Bar Container */}
            <div style={{
              height: '20px',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              padding: '3px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}>
              <div style={{
                height: '100%',
                width: `${percentage}%`,
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(90deg, #107C41 0%, #C5A059 70%, #F5D38C 100%)',
                boxShadow: '0 0 16px rgba(197, 160, 89, 0.6)',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>

            {/* Donor Counter Strip */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              fontSize: '0.85rem',
              color: 'var(--text-on-dark-muted)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="var(--gold-400)" />
                <strong style={{ color: '#FFFFFF' }}>{aggregates.totalDonorsCount} Donors</strong> contributed across {aggregates.totalOffersCount} verified offers
              </span>
              <span>Updated real-time</span>
            </div>
          </div>
        </div>

        {/* Call to Action Row */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-4)',
        }}>
          <Link
            href="/offer"
            className="btn btn-gold"
            style={{
              padding: '16px 36px',
              fontSize: '1.1rem',
              fontWeight: 800,
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 24px rgba(197, 160, 89, 0.35)',
            }}
          >
            <HeartHandshake size={22} />
            <span>Sponsor Land / Musalla Now</span>
          </Link>

          <Link
            href="/offer?type=custom"
            className="btn btn-primary"
            style={{
              padding: '16px 32px',
              fontSize: '1.05rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span>Custom Donation</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
