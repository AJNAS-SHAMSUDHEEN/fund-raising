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
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1680 / 701',
      }}>
        <Image
          src="/masjid-banner.jpg"
          alt="Salafi Masjid Architecture"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 820px"
          style={{ objectFit: 'contain' }}
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
      const cleanSessionPhone = (session.phone || '').replace(/\D/g, '').slice(-10);

      // Check stored offers for matching phone only
      let localOfferTotalPaise = 0;
      const storedOffers = localStorage.getItem('masjid_user_offers');
      if (storedOffers && cleanSessionPhone) {
        const parsed = JSON.parse(storedOffers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const matching = parsed.filter((o: any) => {
            const oPhone = (o.contributorPhone || o.phone || '').replace(/\D/g, '').slice(-10);
            return oPhone === cleanSessionPhone;
          });
          localOfferTotalPaise = matching.reduce((sum: number, o: any) => sum + (o.totalOfferedPaise || 0), 0);
        }
      }
      setOfferAmount(Math.round(localOfferTotalPaise / 100));

      // Check stored cash collections / payments for matching phone only
      const storedDonations = localStorage.getItem('masjid_user_donations');
      const storedCash = localStorage.getItem('masjid_cash_collections');
      let localPaidTotalPaise = 0;

      if (storedDonations && cleanSessionPhone) {
        const parsed = JSON.parse(storedDonations);
        if (Array.isArray(parsed)) {
          const matching = parsed.filter((d: any) => {
            const dPhone = (d.phone || d.contributorPhone || '').replace(/\D/g, '').slice(-10);
            return dPhone === cleanSessionPhone;
          });
          localPaidTotalPaise += matching.reduce((sum: number, d: any) => sum + (d.amountPaise || 0), 0);
        }
      }
      if (storedCash && cleanSessionPhone) {
        const parsed = JSON.parse(storedCash);
        if (Array.isArray(parsed)) {
          const matching = parsed.filter((c: any) => {
            const cPhone = (c.contributorPhone || c.phone || '').replace(/\D/g, '').slice(-10);
            return cPhone === cleanSessionPhone;
          });
          localPaidTotalPaise += matching.reduce((sum: number, c: any) => sum + (c.amountPaise || 0), 0);
        }
      }
      setPaidAmount(Math.round(localPaidTotalPaise / 100));

      // Fetch from remote Firebase Firestore if phone exists
      if (session.phone) {
        fetchUserContributionsFromFirebase(session.phone).then(({ offers, cashList }) => {
          if (offers && offers.length > 0) {
            const remoteOfferTotal = offers.reduce((sum: number, o: any) => sum + (o.totalOfferedPaise || 0), 0);
            setOfferAmount(Math.round(remoteOfferTotal / 100));
          } else {
            setOfferAmount(0);
          }
          if (cashList && cashList.length > 0) {
            const remotePaidTotal = cashList.reduce((sum: number, c: any) => sum + (c.amountPaise || 0), 0);
            setPaidAmount(Math.round(remotePaidTotal / 100));
          } else {
            setPaidAmount(0);
          }
        }).catch(() => { });
      } else {
        setOfferAmount(0);
        setPaidAmount(0);
      }
    } catch (e) { }
  }, [session]);

  const remainingAmount = Math.max(0, offerAmount - paidAmount);
  const userName = session.name || 'Donor Profile';

  const whatsappMessage = `അസ്സലാമു അലൈക്കും. സലഫി മസ്ജിദ് കുപ്പം ഫണ്ട് റെയ്സിംഗിലേക്ക് ഞാൻ നൽകാൻ ബാക്കിയുള്ള തുക (₹${remainingAmount.toLocaleString('en-IN')}) നൽകാൻ ആഗ്രഹിക്കുന്നു.\nപേര്: ${userName}\nഫോൺ: ${session.phone ? `+91 ${session.phone}` : 'ലഭ്യമല്ല'}`;
  const whatsappUrl = `https://wa.me/919947748552?text=${encodeURIComponent(whatsappMessage)}`;

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

        {/* Card 3: Remaining Amount (Spans across both columns with Pay Now button) */}
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
          flexWrap: 'wrap',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 3.5vw, 1.25rem)', color: remainingAmount > 0 ? '#DC2626' : '#16A34A', fontWeight: 800 }}>
              {formatINR(remainingAmount)}
            </strong>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: '8px',
                background: '#16A34A',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title="Pay now via WhatsApp support"
            >
              <span>Pay Now</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
            </a>
          </div>
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
