'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserSession } from '@/lib/state/userSession';
import { formatINR } from '@/lib/calculations/currency';
import { Heart, Handshake, X, ArrowRight, Sparkles } from 'lucide-react';

export default function StickyBottomBar() {
  const pathname = usePathname();
  const { session } = useUserSession();

  // Pay Now Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('1000');
  const [payName, setPayName] = useState<string>(session.name || '');
  const [payPhone, setPayPhone] = useState<string>(session.phone || '');

  // Hide sticky bar on /live, /admin, or /receipt
  if (
    pathname?.startsWith('/live') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/offer') ||
    pathname?.startsWith('/receipt')
  ) {
    return null;
  }

  const handleOpenPayModal = () => {
    if (session.name && !payName) setPayName(session.name);
    if (session.phone && !payPhone) setPayPhone(session.phone);
    setIsPayModalOpen(true);
  };

  const handleProceedToWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseInt(payAmount.replace(/\D/g, ''), 10) || 0;
    const donorName = payName.trim() || session.name || 'Well Wisher';
    const donorPhone = payPhone.replace(/\D/g, '').slice(-10) || session.phone || 'ലഭ്യമല്ല';

    const message = `അസ്സലാമു അലൈക്കും. സലഫി മസ്ജിദ് കുപ്പം ഫണ്ട് റെയ്‌സിംഗിലേക്ക് ഞാൻ ഇപ്പോൾ ₹${cleanAmount.toLocaleString('en-IN')} നൽകാൻ ആഗ്രഹിക്കുന്നു. ദയവായി പേയ്‌മെന്റ് വിവരങ്ങൾ നൽകുക.\nപേര്: ${donorName}\nഫോൺ: ${donorPhone !== 'ലഭ്യമല്ല' ? `+91 ${donorPhone}` : donorPhone}`;
    const url = `https://wa.me/919947748552?text=${encodeURIComponent(message)}`;

    setIsPayModalOpen(false);
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Sticky Bottom Dual-Action Bar (Matching Uploaded Design) */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '430px',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        borderRadius: '28px',
        padding: '6px 8px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1.5px solid #E2E8F0',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        zIndex: 900,
      }}>
        {/* 1. Pay Now Button (Red / Coral Pill) */}
        <button
          type="button"
          onClick={handleOpenPayModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '22px',
            background: '#FFFFFF',
            border: '1.5px solid #FECDD3',
            color: '#0F172A',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(225, 29, 72, 0.08)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '8px',
            background: '#E11D48',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Heart size={15} fill="#FFFFFF" />
          </div>
          <span>Pay Now</span>
        </button>

        {/* 2. Offer Now Button (Green Pill) */}
        <Link
          href="/offer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '22px',
            background: '#FFFFFF',
            border: '1.5px solid #A7F3D0',
            color: '#0F172A',
            fontWeight: 800,
            fontSize: '0.94rem',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '8px',
            background: '#10B981',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Handshake size={15} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <span>Offer Now</span>
        </Link>
      </div>

      {/* Pay Now Amount Prompt Modal */}
      {isPayModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '22px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid #E2E8F0',
              paddingBottom: '14px',
              marginBottom: '18px',
            }}>
              <div>
                <span className="badge badge-brand" style={{ fontSize: '0.72rem', marginBottom: '4px' }}>
                  <Sparkles size={12} /> Salafi Masjid Kuppam
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: '4px 0 2px 0' }}>
                  എത്രയാണ് നൽകാൻ ഉദ്ദേശിക്കുന്നത്?
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  How much would you like to pay now?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                style={{
                  padding: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Pay Amount Form */}
            <form onSubmit={handleProceedToWhatsApp}>
              {/* Amount Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  തുക നൽകുക (Amount in ₹) *
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '2px solid #16A34A',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.12)',
                }}>
                  <div style={{
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #15803D 0%, #0B3B24 100%)',
                    color: '#FFFFFF',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    ₹
                  </div>
                  <input
                    type="number"
                    required
                    min={10}
                    placeholder="തുക നൽകുക"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      fontFamily: 'var(--font-display)',
                      border: 'none',
                      outline: 'none',
                      color: '#0F172A',
                    }}
                  />
                </div>

                {/* Quick Selection Chips (Descending) */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {[25000, 10000, 5000, 2000, 1000, 500].map((amt) => {
                    const isSelected = payAmount === amt.toString();
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPayAmount(amt.toString())}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          border: isSelected ? '2px solid #16A34A' : '1px solid #CBD5E1',
                          background: isSelected ? '#16A34A' : '#F8FAFC',
                          color: isSelected ? '#FFFFFF' : '#334155',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {formatINR(amt)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contributor Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  പേര് (Your Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Muhammed Ali"
                  value={payName}
                  onChange={(e) => setPayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              {/* Contributor Phone */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  ഫോൺ നമ്പർ (Mobile Number)
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    padding: '10px 12px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRight: 'none',
                    borderRadius: '10px 0 0 10px',
                    fontSize: '0.9rem',
                    color: '#64748B',
                    fontWeight: 700,
                  }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={payPhone}
                    onChange={(e) => setPayPhone(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '0 10px 10px 0',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              {/* Submit to WhatsApp */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #25D366 0%, #16A34A 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                }}
              >
                <span>വാട്സാപ്പ് വഴി അടയ്ക്കുക (Pay via WhatsApp)</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
