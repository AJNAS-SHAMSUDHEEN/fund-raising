'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUserSession } from '@/lib/state/userSession';
import { formatINR } from '@/lib/calculations/currency';
import { Handshake, CheckCircle2, Hourglass } from 'lucide-react';
import { fetchUserContributionsFromFirebase } from '@/lib/firebase/db';

export function MasjidBanner() {
  return (
    <div style={{
      position: 'relative',
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
      marginBottom: '20px',
      border: '1px solid #E2E8F0',
      background: '#0F172A',
      width: '100%',
    }}>
      <div style={{ position: 'relative', width: '100%', height: 'clamp(190px, 22vw, 290px)' }}>
        <Image
          src="/masjid-banner.jpg"
          alt="Salafi Masjid Architecture"
          fill
          priority
          style={{ objectFit: 'cover' }}
        />
      </div>

      {/* Carousel Pagination Dots */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        padding: '4px 10px',
        borderRadius: '9999px',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.5)' }}></span>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.5)' }}></span>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF' }}></span>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.5)' }}></span>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.5)' }}></span>
      </div>
    </div>
  );
}

export function YourStatusCard() {
  const { session } = useUserSession();

  // Dynamic user data from localStorage or real Firebase
  const [offerAmount, setOfferAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  useEffect(() => {
    try {
      // Check stored offers
      const storedOffers = localStorage.getItem('masjid_user_offers');
      if (storedOffers) {
        const parsed = JSON.parse(storedOffers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const totalOfferedPaise = parsed.reduce((sum: number, o: any) => sum + (o.totalOfferedPaise || 0), 0);
          if (totalOfferedPaise > 0) {
            setOfferAmount(Math.round(totalOfferedPaise / 100));
          }
        }
      }

      // Check stored cash collections / payments
      const storedDonations = localStorage.getItem('masjid_user_donations');
      const storedCash = localStorage.getItem('masjid_cash_collections');
      let totalPaidPaise = 0;

      if (storedDonations) {
        const parsed = JSON.parse(storedDonations);
        if (Array.isArray(parsed)) {
          totalPaidPaise += parsed.reduce((sum: number, d: any) => sum + (d.amountPaise || 0), 0);
        }
      }
      if (storedCash) {
        const parsed = JSON.parse(storedCash);
        if (Array.isArray(parsed)) {
          totalPaidPaise += parsed.reduce((sum: number, c: any) => sum + (c.amountPaise || 0), 0);
        }
      }

      if (totalPaidPaise > 0) {
        setPaidAmount(Math.round(totalPaidPaise / 100));
      }

      // Fetch from remote Firebase Firestore if phone exists
      if (session.phone) {
        fetchUserContributionsFromFirebase(session.phone).then(({ offers, cashList }) => {
          if (offers && offers.length > 0) {
            const remoteOfferTotal = offers.reduce((sum: number, o: any) => sum + (o.totalOfferedPaise || 0), 0);
            if (remoteOfferTotal > 0) setOfferAmount(Math.round(remoteOfferTotal / 100));
          }
          if (cashList && cashList.length > 0) {
            const remotePaidTotal = cashList.reduce((sum: number, c: any) => sum + (c.amountPaise || 0), 0);
            if (remotePaidTotal > 0) setPaidAmount(Math.round(remotePaidTotal / 100));
          }
        }).catch(() => { });
      }
    } catch (e) { }
  }, [session]);

  const remainingAmount = Math.max(0, offerAmount - paidAmount);
  const userName = session.name || 'Donor Profile';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 50%, #7C3AED 100%)',
      borderRadius: '24px',
      padding: '24px 20px',
      color: '#FFFFFF',
      boxShadow: '0 12px 30px rgba(79, 70, 229, 0.25)',
      marginBottom: '24px',
    }}>
      {/* Card Header */}
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#FFFFFF',
          fontFamily: 'var(--font-display)',
          marginBottom: '2px',
        }}>
          Your Status
        </h2>
        <span style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
          {userName} {session.phone ? `(+91 ${session.phone})` : ''}
        </span>
      </div>

      {/* White Pill Cards Grid matching Screenshot */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '10px',
      }}>
        {/* Card 1: Offer Amount */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#10B981',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Handshake size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', lineHeight: 1.1 }}>
              Offer Amount
            </span>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.92rem, 3.2vw, 1.15rem)', color: '#0F172A', fontWeight: 800 }}>
              {formatINR(offerAmount)}
            </strong>
          </div>
        </div>

        {/* Card 2: Paid (Cash) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#EC4899',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', lineHeight: 1.1 }}>
              Paid (Cash)
            </span>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.92rem, 3.2vw, 1.15rem)', color: '#16A34A', fontWeight: 800 }}>
              {formatINR(paidAmount)}
            </strong>
          </div>
        </div>

        {/* Card 3: Remaining Amount (Spans across both columns) */}
        <div style={{
          gridColumn: 'span 2',
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#06B6D4',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Hourglass size={18} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', lineHeight: 1.1 }}>
                Remaining Balance
              </span>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                ഇനിയും നല്കാൻ ബാക്കിയുള്ള തുക
              </span>
            </div>
          </div>

          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 3.5vw, 1.25rem)', color: remainingAmount > 0 ? '#DC2626' : '#16A34A', fontWeight: 800 }}>
            {formatINR(remainingAmount)}
          </strong>
        </div>
      </div>
    </div>
  );
}

// Default export renders both for mobile backward compatibility
export default function UserStatusCard() {
  return (
    <div style={{ marginBottom: '20px' }}>
      <MasjidBanner />
      <YourStatusCard />
    </div>
  );
}
