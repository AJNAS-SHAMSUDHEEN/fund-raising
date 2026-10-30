'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { INITIAL_CAMPAIGN, INITIAL_AGGREGATES } from '@/lib/state/mockStore';
import { CampaignAggregates, CampaignEvent, CashCollection } from '@/lib/types';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import { subscribeToCampaignAggregates } from '@/lib/firebase/db';
import {
  TrendingUp,
  CreditCard,
  Coins,
  Clock,
  Users,
  Receipt,
  Plus,
  CheckCircle2,
  ArrowUpRight,
  FileText
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [aggregates, setAggregates] = useState<CampaignAggregates>(INITIAL_AGGREGATES);
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [recentCash, setRecentCash] = useState<CashCollection[]>([]);
  const [pendingVerificationCount, setPendingVerificationCount] = useState<number>(0);
  const campaign = INITIAL_CAMPAIGN;

  useEffect(() => {
    const unsubAgg = subscribeToCampaignAggregates((data) => {
      setAggregates((prev) => ({
        ...prev,
        totalVerifiedPaise: data.totalVerifiedPaise || prev.totalVerifiedPaise,
        totalOffersCount: data.offerCount || prev.totalOffersCount,
        totalCentUnits: data.centCount || prev.totalCentUnits,
        totalSqFtUnits: data.sqFtCount || prev.totalSqFtUnits,
        totalMusallaUnits: data.musallaCount || prev.totalMusallaUnits,
      }));
    });

    // Real-time events from Firestore
    const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubEvents = onSnapshot(eventsQuery, (snap) => {
      const list: CampaignEvent[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      setEvents(list);
    }, (err) => console.warn('Events snapshot error:', err));

    // Real-time cash collections from Firestore
    const cashQuery = query(collection(db, 'cashCollections'), orderBy('createdAt', 'desc'), limit(10));
    const unsubCash = onSnapshot(cashQuery, (snap) => {
      const list: CashCollection[] = [];
      let pendingCount = 0;
      snap.forEach((d) => {
        const data = d.data() as any;
        if (data.status === 'pending_verification') pendingCount++;
        list.push({
          id: d.id,
          receiptNumber: data.receiptNumber || d.id,
          offerId: data.offerId || '',
          contributorId: data.contributorId || '',
          contributorName: data.contributorName || 'Well Wisher',
          contributorPhone: data.contributorPhone || '',
          amountPaise: data.amountPaise || 0,
          offerType: data.offerType || 'cash',
          quantity: data.quantity || 1,
          collectorUid: data.collectorUid || '',
          collectorName: data.collectorName || 'Collector',
          status: data.status || 'verified',
        } as any);
      });
      setRecentCash(list);
      setPendingVerificationCount(pendingCount);
    }, (err) => console.warn('Cash snapshot error:', err));

    return () => {
      unsubAgg();
      unsubEvents();
      unsubCash();
    };
  }, []);

  const percentage = Math.min(
    100,
    parseFloat(((aggregates.totalVerifiedPaise / campaign.targetAmountPaise) * 100).toFixed(1))
  );

  const remainingPaise = Math.max(0, campaign.targetAmountPaise - aggregates.totalVerifiedPaise);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Title & Quick Actions */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand-900)' }}>
            Administrative Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time financial status, cash queues, and collection aggregates.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <Link
            href="/live"
            target="_blank"
            className="btn btn-gold"
            style={{ padding: '10px 16px', fontSize: '0.88rem', gap: '6px' }}
          >
            <span>📺 Open Live Screen ↗</span>
          </Link>

          <Link
            href="/admin/verify"
            className="btn btn-outline"
            style={{ padding: '10px 16px', fontSize: '0.88rem', gap: '6px' }}
          >
            <Clock size={16} color="var(--status-warning)" />
            <span>Pending Verifications ({pendingVerificationCount})</span>
          </Link>

          <Link
            href="/admin/reports"
            className="btn btn-outline"
            style={{ padding: '10px 16px', fontSize: '0.88rem', gap: '6px', background: '#F8FAFC' }}
          >
            <FileText size={16} color="var(--brand-800)" />
            <span>Reports & PDF Backup</span>
          </Link>

          <Link
            href="/admin/cash"
            className="btn btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.88rem', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Record Cash Collection</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '28px',
      }}>
        {/* Card 1: Total Verified */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          padding: '22px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Verified Collections
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--brand-100)',
              color: 'var(--brand-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.9rem',
            fontWeight: 800,
            color: 'var(--brand-900)',
            lineHeight: 1.1,
          }}>
            {formatINRFromPaise(aggregates.totalVerifiedPaise)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--brand-700)', marginTop: '8px', fontWeight: 600 }}>
            {percentage}% of ₹1.10 Cr Target Achieved
          </div>
        </div>

        {/* Card 2: Online Collections */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          padding: '22px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Online (Razorpay)
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--gold-100)',
              color: 'var(--gold-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.9rem',
            fontWeight: 800,
            color: 'var(--brand-900)',
            lineHeight: 1.1,
          }}>
            {formatINRFromPaise(aggregates.totalOnlinePaise)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Direct Gateway Settlements
          </div>
        </div>

        {/* Card 3: Verified Cash */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          padding: '22px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Verified Cash
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#E0F2FE',
              color: '#0369A1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Coins size={20} />
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.9rem',
            fontWeight: 800,
            color: 'var(--brand-900)',
            lineHeight: 1.1,
          }}>
            {formatINRFromPaise(aggregates.totalCashPaise)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Deposited &amp; Treasury Approved
          </div>
        </div>

        {/* Card 4: Pending Cash Verification */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          padding: '22px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pending Cash Verification
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--status-warning-bg)',
              color: 'var(--status-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.9rem',
            fontWeight: 800,
            color: 'var(--status-warning)',
            lineHeight: 1.1,
          }}>
            {formatINRFromPaise(aggregates.pendingCashPaise)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Awaiting Super Admin Audit
          </div>
        </div>
      </div>

      {/* Progress & Target Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        border: '1px solid var(--border-light)',
        marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontWeight: 700, color: 'var(--brand-900)' }}>
            Campaign Goal Progress Bar
          </span>
          <span style={{ fontWeight: 800, color: 'var(--brand-800)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
            {percentage}% Achieved
          </span>
        </div>

        <div style={{
          height: '14px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          marginBottom: '14px',
        }}>
          <div style={{
            height: '100%',
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, var(--brand-700) 0%, var(--gold-500) 100%)',
            borderRadius: 'var(--radius-full)',
          }} />
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}>
          <span>Raised: <strong>{formatINRFromPaise(aggregates.totalVerifiedPaise)}</strong></span>
          <span>Remaining: <strong>{formatINRFromPaise(remainingPaise)}</strong></span>
          <span>Target: <strong>{formatINRFromPaise(campaign.targetAmountPaise)}</strong></span>
        </div>
      </div>

      {/* Program & Venue-Wise Events Breakdown */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        border: '1px solid var(--border-light)',
        marginBottom: '28px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-900)', margin: 0 }}>
              📍 Active Programs &amp; Venue Collections (Event Status)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Each venue has its own dedicated live projector screen starting from ₹0, while all amounts roll up into the Grand Total above.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link
              href="/admin/events"
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            >
              Manage Events &amp; QR Codes →
            </Link>
            <Link
              href="/admin/cash"
              className="btn btn-outline"
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              + Record Cash
            </Link>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
        }}>
          {events.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              padding: '24px',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px dashed var(--brand-200)',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 12px' }}>
                No events created yet. Add programs to generate venue QR codes and dedicated live presentation screens.
              </p>
              <Link
                href="/admin/events"
                className="btn btn-outline"
                style={{ padding: '8px 16px', fontSize: '0.84rem', gap: '6px', display: 'inline-flex' }}
              >
                <Plus size={14} />
                <span>Create First Event</span>
              </Link>
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  border: '1.5px solid #BBF7D0',
                  background: '#F0FDF4',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: '1rem', color: '#14532D' }}>{ev.name}</strong>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: '#DCFCE7',
                      color: '#15803D',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #86EFAC',
                    }}>
                      {ev.location}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                    Venue Code: <code style={{ color: '#15803D' }}>?event={ev.id}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link
                    href={`/live?event=${ev.id}`}
                    target="_blank"
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#15803D',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>📺 Open Live Screen ↗</span>
                  </Link>
                  <Link
                    href={`/offer?event=${ev.id}`}
                    target="_blank"
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748B',
                      textDecoration: 'underline',
                    }}
                  >
                    Offer Link
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Cash Entries & Verification Queue Preview */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-900)' }}>
            Recent Cash Collections Ledger
          </h2>
          <Link
            href="/admin/offers"
            style={{
              fontSize: '0.85rem',
              color: 'var(--brand-800)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View All Transactions</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '12px 20px' }}>Receipt #</th>
                <th style={{ padding: '12px 20px' }}>Contributor</th>
                <th style={{ padding: '12px 20px' }}>Offer / Category</th>
                <th style={{ padding: '12px 20px' }}>Collector</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 20px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentCash.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    ഇതുവരെ ക്യാഷ് എൻട്രികൾ രേഖപ്പെടുത്തിയിട്ടില്ല (No cash collections recorded yet).
                  </td>
                </tr>
              ) : (
                recentCash.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--brand-900)' }}>
                      {c.receiptNumber}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--brand-900)' }}>{c.contributorName || 'Well Wisher'}</div>
                      <small style={{ color: 'var(--text-muted)' }}>+91 {c.contributorPhone}</small>
                    </td>
                    <td style={{ padding: '14px 20px', textTransform: 'capitalize' }}>
                      {c.quantity} {c.offerType}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                      {c.collectorName}
                    </td>
                    <td style={{
                      padding: '14px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--brand-900)',
                    }}>
                      {formatINRFromPaise(c.amountPaise)}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      {c.status === 'verified' ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}>
                          <Clock size={12} /> Pending Verify
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
