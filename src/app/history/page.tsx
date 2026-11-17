'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUserSession } from '@/lib/state/userSession';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import { fetchUserContributionsFromFirebase } from '@/lib/firebase/db';
import {
  Handshake,
  Heart,
  ArrowLeft,
  Receipt,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Coins,
  Download,
  ExternalLink,
} from 'lucide-react';

interface UserOfferItem {
  id: string;
  offerType: string;
  quantity: number;
  totalOfferedPaise: number;
  paidPaise: number;
  date: string;
  status?: string;
}

interface UserDonationItem {
  id: string;
  receiptNumber: string;
  amountPaise: number;
  offerType: string;
  quantity: number;
  date: string;
  method: string;
  eventName?: string;
  collectorName?: string;
  status: string;
  notes?: string;
  offerId?: string;
}

export default function HistoryPage() {
  const { session } = useUserSession();
  const [activeTab, setActiveTab] = useState<'donations' | 'offers'>('offers');

  const [offers, setOffers] = useState<UserOfferItem[]>([]);
  const [donations, setDonations] = useState<UserDonationItem[]>([]);

  // Read stored offers and donations authoritatively from Firestore
  useEffect(() => {
    const rawPhone = (session.phone || '').trim();

    if (rawPhone) {
      // Live sync from Firestore with normalized phone variants
      fetchUserContributionsFromFirebase(rawPhone)
        .then(({ offers: remoteOffers, cashList: remoteCash }) => {
          if (remoteOffers && remoteOffers.length > 0) {
            const mapped: UserOfferItem[] = remoteOffers.map((ro: any) => ({
              id: ro.id,
              offerType: ro.offerType || 'cash',
              quantity: ro.quantity || 1,
              totalOfferedPaise: Number(ro.totalOfferedPaise) || 0,
              paidPaise: Number(ro.paidPaise) || 0,
              status: ro.status || (Number(ro.paidPaise) >= Number(ro.totalOfferedPaise) && Number(ro.totalOfferedPaise) > 0 ? 'verified' : Number(ro.paidPaise) > 0 ? 'partial' : 'pledged'),
              date: ro.createdAt?.toDate ? ro.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            }));
            setOffers(mapped);
          } else {
            setOffers([]);
          }

          if (remoteCash && remoteCash.length > 0) {
            const mappedCash: UserDonationItem[] = remoteCash.map((rc: any) => ({
              id: rc.id,
              receiptNumber: rc.receiptNumber ? String(rc.receiptNumber) : (rc.erNo ? String(rc.erNo) : rc.id),
              amountPaise: Number(rc.amountPaise) || 0,
              offerType: rc.offerType || 'cash',
              quantity: rc.quantity || 1,
              date: rc.createdAt?.toDate ? rc.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
              method: 'Cash',
              eventName: rc.eventName || '',
              collectorName: rc.collectorName || '',
              status: rc.status || 'verified',
              notes: rc.notes || '',
              offerId: rc.offerId || '',
            }));
            setDonations(mappedCash);

            // If user has direct cash contributions but no offers, default to donations tab
            if ((!remoteOffers || remoteOffers.length === 0) && mappedCash.length > 0) {
              setActiveTab('donations');
            }
          } else {
            setDonations([]);
          }
        })
        .catch((err) => {
          console.warn('History fetch error:', err);
          setOffers([]);
          setDonations([]);
        });
    } else {
      setOffers([]);
      setDonations([]);
    }
  }, [session.phone]);

  return (
    <div style={{ padding: 'var(--space-10) 0 var(--space-16)', background: 'var(--bg-base)', minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        {/* Title matching Screenshot 2 */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
            fontWeight: 800,
            color: 'var(--brand-900)',
            marginBottom: '6px',
            fontFamily: 'var(--font-display)',
          }}>
            Payment &amp; Offer History
          </h1>
          {session.isRegistered && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Contributor: <strong>{session.name}</strong> (+91 {session.phone})
            </p>
          )}
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          borderBottom: '2px solid var(--border-light)',
          marginBottom: '28px',
          flexWrap: 'wrap',
        }}>
          {/* Donations Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('donations')}
            style={{
              padding: '12px 18px',
              fontSize: '1rem',
              fontWeight: 700,
              color: activeTab === 'donations' ? 'var(--brand-800)' : 'var(--text-muted)',
              borderBottom: activeTab === 'donations' ? '3px solid var(--brand-700)' : '3px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>Direct Cash Donations</span>
            {donations.length > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  background: activeTab === 'donations' ? '#DCFCE7' : '#F1F5F9',
                  color: activeTab === 'donations' ? '#15803D' : '#64748B',
                }}
              >
                {donations.length}
              </span>
            )}
          </button>

          {/* Offers Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            style={{
              padding: '12px 18px',
              fontSize: '1rem',
              fontWeight: 700,
              color: activeTab === 'offers' ? 'var(--brand-800)' : 'var(--text-muted)',
              borderBottom: activeTab === 'offers' ? '3px solid var(--brand-700)' : '3px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>Pledged Offers</span>
            {offers.length > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  background: activeTab === 'offers' ? 'var(--brand-100)' : '#F1F5F9',
                  color: activeTab === 'offers' ? 'var(--brand-800)' : '#64748B',
                }}
              >
                {offers.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Box */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid var(--border-light)',
          padding: 'clamp(20px, 4vw, 36px)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Offers Tab View */}
          {activeTab === 'offers' ? (
            offers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {offers.map((item) => {
                  const balancePaise = Math.max(0, item.totalOfferedPaise - item.paidPaise);
                  const isFullyPaid = balancePaise === 0;

                  return (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: '16px',
                        border: '1.5px solid var(--border-light)',
                        padding: '20px',
                        background: 'var(--bg-base)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}
                    >
                      {/* Top Header of Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'var(--brand-100)',
                            color: 'var(--brand-800)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Handshake size={22} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '1.05rem', color: 'var(--brand-900)', textTransform: 'capitalize' }}>
                              {item.quantity} {item.offerType} Offer
                            </strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pledged on {item.date}</div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isFullyPaid ? (
                          <span className="badge badge-success" style={{ gap: '4px' }}>
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'var(--status-warning-bg)', color: 'var(--status-warning)', gap: '4px' }}>
                            <Clock size={12} /> Partial Paid
                          </span>
                        )}
                      </div>

                      {/* Amounts Breakdown Grid (Offered vs Paid vs Balance) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                        gap: '12px',
                        background: '#FFFFFF',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-light)',
                        textAlign: 'center',
                      }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                            Offered Amount
                          </span>
                          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--brand-900)' }}>
                            {formatINRFromPaise(item.totalOfferedPaise)}
                          </strong>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                            Paid Amount
                          </span>
                          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--status-success)' }}>
                            {formatINRFromPaise(item.paidPaise)}
                          </strong>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                            Remaining Balance
                          </span>
                          <strong style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.15rem',
                            color: balancePaise > 0 ? '#DC2626' : 'var(--text-muted)',
                          }}>
                            {formatINRFromPaise(balancePaise)}
                          </strong>
                        </div>
                      </div>

                      {/* Action Row */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <Link
                          href={isFullyPaid
                            ? `/receipt/${item.id}?donor=${encodeURIComponent(session.name || 'Well Wisher')}&phone=${encodeURIComponent(session.phone || '')}&amount=${item.totalOfferedPaise}&paid=${item.paidPaise || 0}&type=${item.offerType}&qty=${item.quantity}&status=${item.status || 'verified'}`
                            : `/offer/slip/${item.id}?donor=${encodeURIComponent(session.name || 'Well Wisher')}&phone=${encodeURIComponent(session.phone || '')}&amount=${item.totalOfferedPaise}&type=${item.offerType}&qty=${item.quantity}`
                          }
                          target="_blank"
                          className="btn btn-outline"
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            color: isFullyPaid ? '#15803D' : '#065F46',
                            borderColor: isFullyPaid ? '#86EFAC' : '#A7F3D0',
                            background: isFullyPaid ? '#F0FDF4' : '#F0FDF4',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                          }}
                        >
                          {isFullyPaid ? <Receipt size={14} /> : <FileText size={14} />}
                          <span>{isFullyPaid ? 'View Payment Receipt' : 'View Offer Slip (സ്ലിപ്പ്)'}</span>
                        </Link>

                        {!isFullyPaid && (
                          <a
                            href={`https://wa.me/919947748552?text=${encodeURIComponent(`Assalamu Alaikum, I would like to pay the balance of ₹${balancePaise / 100} for my offer (${item.quantity} ${item.offerType}) to Wisdom Islamic Organization Kuppam Unit (Salafi Masjid Project).`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '8px 14px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              borderRadius: '8px',
                              background: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              textDecoration: 'none',
                            }}
                          >
                            <span>Pay Cash to Committee ({formatINRFromPaise(balancePaise)})</span>
                            <ChevronRight size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty Offers State matching Screenshot 2 */
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--brand-100)',
                  color: 'var(--brand-800)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Handshake size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '8px' }}>
                  No Offer History
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  You haven&apos;t made any offers yet. Make your first offer to see your offer history.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Link
                    href="/offer?mode=offer"
                    className="btn btn-primary"
                    style={{ padding: '12px 24px', fontWeight: 700, borderRadius: '12px', gap: '8px' }}
                  >
                    <Handshake size={18} />
                    <span>Make an Offer</span>
                  </Link>

                  <Link
                    href="/"
                    className="btn btn-outline"
                    style={{ padding: '12px 20px', borderRadius: '12px', gap: '8px' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Home</span>
                  </Link>
                </div>
              </div>
            )
          ) : (
            /* Donations Tab View (Direct Cash Contributions) */
            donations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {donations.map((item) => {
                  const receiptTarget = item.receiptNumber || item.id;
                  const isOfferPayment = Boolean(item.offerId && item.offerType !== 'cash');
                  const itemTitle = isOfferPayment
                    ? `${item.quantity} ${item.offerType.toUpperCase()} Pledged Offer Payment`
                    : 'Direct Cash Contribution';
                  const receiptUrl = `/receipt/${receiptTarget}?donor=${encodeURIComponent(session.name || 'Contributor')}&phone=${encodeURIComponent(session.phone || '')}&amount=${item.amountPaise}&type=${item.offerType}&qty=${item.quantity}&status=verified&purpose=${encodeURIComponent('Salafi Masjid Land Acquisition Fund — Direct Cash Contribution')}`;

                  return (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: '16px',
                        border: '1.5px solid #BBF7D0',
                        background: '#FFFFFF',
                        boxShadow: '0 4px 16px rgba(22, 163, 74, 0.05)',
                        overflow: 'hidden',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      {/* Card Header Bar */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                          padding: '14px 18px',
                          borderBottom: '1px solid #BBF7D0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: '#16A34A',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Coins size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#14532D' }}>
                              {itemTitle}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#166534' }}>
                              Receipt No: <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>ER-{item.receiptNumber.replace(/^ER-?/i, '')}</span> • {item.date}
                            </div>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              background: '#16A34A',
                              color: '#FFFFFF',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Verified / Received</span>
                          </span>

                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              background: '#E2E8F0',
                              color: '#334155',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            Cash
                          </span>

                          {item.eventName && (
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: '#FEF3C7',
                                color: '#92400E',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              {item.eventName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content & Details */}
                      <div
                        style={{
                          padding: '16px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                            Contributed Amount
                          </span>
                          <div
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '1.45rem',
                              fontWeight: 800,
                              color: '#15803D',
                              marginTop: '2px',
                            }}
                          >
                            {formatINRFromPaise(item.amountPaise)}
                          </div>
                          {item.collectorName && (
                            <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                              Received by: <span style={{ fontWeight: 600, color: '#334155' }}>{item.collectorName}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Link
                            href={receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '10px 18px',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              borderRadius: '10px',
                              background: '#16A34A',
                              color: '#FFFFFF',
                              textDecoration: 'none',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Receipt size={16} />
                            <span>View & Download Receipt</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty Donations State */
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Coins size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '8px' }}>
                  No Direct Cash Donations Yet
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px' }}>
                  Direct cash payments given to the committee under your mobile number will appear here with official receipts once entered and verified.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Link
                    href="/offer?mode=offer"
                    className="btn btn-primary"
                    style={{ padding: '12px 24px', fontWeight: 700, borderRadius: '12px', gap: '8px' }}
                  >
                    <Handshake size={18} />
                    <span>Make an Offer</span>
                  </Link>

                  <Link
                    href="/"
                    className="btn btn-outline"
                    style={{ padding: '12px 20px', borderRadius: '12px', gap: '8px' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Home</span>
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
