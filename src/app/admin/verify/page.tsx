'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, query, orderBy, where, limit, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAdminAuth } from '@/lib/state/adminAuth';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Receipt
} from 'lucide-react';

export default function CashVerificationPage() {
  const { adminUser } = useAdminAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');

  useEffect(() => {
    try {
      const q = query(collection(db, 'cashCollections'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              ...d,
              createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
            });
          });
          setCollections(list);
        },
        (err) => {
          console.warn('Firestore cash collections subscription fallback:', err.message);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('Firestore cash collections query fallback:', e);
    }
  }, []);

  const pendingList = collections.filter((c) => c.status === 'pending_verification');
  const verifiedList = collections.filter((c) => c.status === 'verified');

  const handleApprove = async (id: string) => {
    const verifierName = adminUser?.name ? `${adminUser.name} (Verified)` : 'Authorized Verifier';
    setCollections((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'verified',
              verifiedByName: verifierName,
              verifiedAt: new Date().toISOString(),
            }
          : c
      )
    );

    try {
      const cashRef = doc(db, 'cashCollections', id);
      const cashSnap = await getDoc(cashRef);

      await updateDoc(cashRef, {
        status: 'verified',
        verifiedByName: verifierName,
        verifiedAt: serverTimestamp(),
      });

      // Synchronize linked Offer status if this collection was for an offer
      if (cashSnap.exists()) {
        const cashData = cashSnap.data();
        if (cashData.offerId && !cashData.offerId.startsWith('mock-')) {
          try {
            let offerRef = doc(db, 'offers', cashData.offerId);
            let offerSnap = await getDoc(offerRef);
            if (!offerSnap.exists()) {
              const qSnap = await getDocs(query(collection(db, 'offers'), where('offerNumber', '==', cashData.offerId), limit(1)));
              if (!qSnap.empty) {
                offerSnap = qSnap.docs[0];
                offerRef = offerSnap.ref;
              }
            }
            if (offerSnap.exists()) {
              const offerData = offerSnap.data();
              const currentPaid = Number(offerData.paidPaise || 0);
              const totalOffered = Number(offerData.totalOfferedPaise || 0);
              const newStatus = currentPaid >= totalOffered ? 'verified' : 'partial';

              await setDoc(
                offerRef,
                {
                  status: newStatus,
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            }
          } catch (offerErr) {
            console.warn('Error syncing offer status in verification approval:', offerErr);
          }
        }
      }
    } catch (e) {
      console.warn('Firestore cash approve error:', e);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter the reason for returning/rejecting this cash entry:');
    if (reason) {
      setCollections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: 'rejected',
                rejectionReason: reason,
              }
            : c
        )
      );

      try {
        await updateDoc(doc(db, 'cashCollections', id), {
          status: 'rejected',
          rejectionReason: reason,
          rejectedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firestore cash reject error:', e);
      }
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px',
      }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
            <ShieldCheck size={14} /> Dual-Control Treasury Audit
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand-900)' }}>
            Cash Collection Verification Queue
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enforce segregation-of-duties: Cash recorded by collectors must be treasury-audited before contributing to the verified public total.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: 'flex',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          border: '1px solid var(--border-light)',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.85rem',
              background: activeTab === 'pending' ? 'var(--brand-800)' : 'transparent',
              color: activeTab === 'pending' ? '#FFFFFF' : 'var(--text-muted)',
            }}
          >
            Pending Verification ({pendingList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verified')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.85rem',
              background: activeTab === 'verified' ? 'var(--brand-800)' : 'transparent',
              color: activeTab === 'verified' ? '#FFFFFF' : 'var(--text-muted)',
            }}
          >
            Verified History ({verifiedList.length})
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {activeTab === 'pending' ? (
          pendingList.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '14px 20px' }}>Receipt #</th>
                    <th style={{ padding: '14px 20px' }}>Contributor</th>
                    <th style={{ padding: '14px 20px' }}>Offer Units</th>
                    <th style={{ padding: '14px 20px' }}>Field Collector</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Verification Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingList.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--brand-900)' }}>
                        {item.receiptNumber}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <strong style={{ color: 'var(--brand-900)', display: 'block' }}>{item.contributorName || 'Well Wisher'}</strong>
                        <small style={{ color: 'var(--text-muted)' }}>+91 {item.contributorPhone}</small>
                      </td>
                      <td style={{ padding: '16px 20px', textTransform: 'capitalize' }}>
                        {item.quantity} {item.offerType}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: 'var(--brand-900)' }}>{item.collectorName}</div>
                        {item.notes && <small style={{ color: 'var(--text-muted)' }}>&quot;{item.notes}&quot;</small>}
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: 'var(--brand-900)',
                      }}>
                        {formatINRFromPaise(item.amountPaise)}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            className="btn btn-primary"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.8rem',
                              borderRadius: 'var(--radius-sm)',
                              gap: '6px',
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>Verify Cash</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReject(item.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--status-danger)',
                              color: 'var(--status-danger)',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              background: '#FFFFFF',
                            }}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={48} color="var(--status-success)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-900)' }}>
                Verification Queue Clear
              </h3>
              <p style={{ fontSize: '0.9rem' }}>All recorded cash entries have been audited and verified into the official fund.</p>
            </div>
          )
        ) : (
          /* Verified History List */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '14px 20px' }}>Receipt #</th>
                  <th style={{ padding: '14px 20px' }}>Contributor</th>
                  <th style={{ padding: '14px 20px' }}>Amount</th>
                  <th style={{ padding: '14px 20px' }}>Collector</th>
                  <th style={{ padding: '14px 20px' }}>Verified By</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center' }}>Official Receipt</th>
                </tr>
              </thead>
              <tbody>
                {verifiedList.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--brand-900)' }}>
                      {item.receiptNumber}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <strong style={{ color: 'var(--brand-900)', display: 'block' }}>{item.contributorName || 'Well Wisher'}</strong>
                      <small style={{ color: 'var(--text-muted)' }}>+91 {item.contributorPhone}</small>
                    </td>
                    <td style={{
                      padding: '16px 20px',
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--brand-800)',
                    }}>
                      {formatINRFromPaise(item.amountPaise)}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                      {item.collectorName}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        {item.verifiedByName || 'Authorized Verifier'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <a
                        href={`/receipt/RCP-2026-000101?donor=${encodeURIComponent(item.contributorName || 'Well Wisher')}&amount=${item.amountPaise}&type=${item.offerType}&qty=${item.quantity}`}
                        target="_blank"
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}
                      >
                        <Receipt size={14} />
                        <span>View Receipt</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
