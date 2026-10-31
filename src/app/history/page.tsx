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
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight
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
  receiptId: string;
  amountPaise: number;
  offerType: string;
  quantity: number;
  date: string;
  method: string;
}

export default function HistoryPage() {
  const { session } = useUserSession();
  const [activeTab, setActiveTab] = useState<'donations' | 'offers'>('offers');

  const [offers, setOffers] = useState<UserOfferItem[]>([]);
  const [donations, setDonations] = useState<UserDonationItem[]>([]);

  // Read stored offers and donations authoritatively from Firestore
  useEffect(() => {
    const cleanSessionPhone = (session.phone || '').replace(/\D/g, '').slice(-10);

    if (cleanSessionPhone) {
      // Live sync from Firestore
      fetchUserContributionsFromFirebase(cleanSessionPhone)
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
              receiptId: rc.receiptNumber || rc.id,
              amountPaise: Number(rc.amountPaise) || 0,
              offerType: rc.offerType || 'cash',
              quantity: rc.quantity || 1,
              date: rc.createdAt?.toDate ? rc.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent',
              method: 'CASH',
            }));
            setDonations(mappedCash);
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

        {/* Tab Selection matching Screenshot 2 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          borderBottom: '2px solid var(--border-light)',
          marginBottom: '28px',
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
            }}
          >
            Donations
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
            }}
          >
            Offers
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
                          href={`/receipt/${item.id}?donor=${encodeURIComponent(session.name || 'Well Wisher')}&phone=${encodeURIComponent(session.phone || '')}&amount=${item.totalOfferedPaise}&paid=${item.paidPaise || 0}&type=${item.offerType}&qty=${item.quantity}&status=${item.status || 'pledged'}`}
                          target="_blank"
                          className="btn btn-outline"
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            color: isFullyPaid ? '#15803D' : '#B45309',
                            borderColor: isFullyPaid ? '#86EFAC' : '#FDE68A',
                            background: isFullyPaid ? '#F0FDF4' : '#FFFBEB',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                          }}
                        >
                          <Receipt size={14} />
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
            /* Donations Tab View */
            donations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {donations.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: '16px',
                      border: '1.5px solid var(--border-light)',
                      padding: '18px 20px',
                      background: 'var(--bg-base)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: '#DCFCE7',
                        color: '#15803D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <div style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.3rem',
                          fontWeight: 800,
                          color: 'var(--brand-900)',
                        }}>
                          {formatINRFromPaise(item.amountPaise)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {item.date} • Paid via {item.method}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Link
                        href={`/receipt/${item.receiptId}?donor=${encodeURIComponent(session.name || 'Contributor')}&phone=${encodeURIComponent(session.phone || '')}&amount=${item.amountPaise}&type=${item.offerType}&qty=${item.quantity}`}
                        className="btn btn-outline"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px' }}
                      >
                        <Receipt size={16} />
                        <span>View Receipt</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty Donations State */
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Heart size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '8px' }}>
                  No Donation History
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  You haven&apos;t made any donations yet. Contribute towards the masjid to view your verified receipts.
                </p>

                <Link
                  href="/offer?mode=donate"
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', fontWeight: 700, borderRadius: '12px' }}
                >
                  Donate via UPI
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
