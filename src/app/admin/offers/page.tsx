'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { updateOfferInFirebase, deleteOfferFromFirebase } from '@/lib/firebase/db';
import { OfferType, PaymentMethod, OfferStatus } from '@/lib/types';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import {
  Receipt,
  Download,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  Save,
  Check,
  RefreshCw,
  FileText
} from 'lucide-react';

interface MockTransaction {
  id: string;
  orderNumber: string;
  contributorName: string;
  phone: string;
  place?: string;
  offerType: OfferType;
  quantity: number;
  amountPaise: number;
  paidPaise?: number;
  channel: PaymentMethod;
  status: OfferStatus;
  eventName: string;
  eventId?: string;
  date: string;
}

// Official WhatsApp Brand Icon Component
function WhatsAppIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.476-.15-.677.15-.2.301-.777.98-.952 1.18-.176.201-.351.226-.652.076-.301-.15-1.272-.469-2.424-1.496-.896-.799-1.501-1.786-1.677-2.087-.176-.301-.019-.464.132-.614.135-.135.301-.351.451-.527.151-.176.201-.301.301-.502.1-.201.05-.376-.025-.526-.075-.15-.677-1.631-.927-2.233-.244-.587-.492-.507-.677-.517l-.577-.01c-.2 0-.527.075-.802.376s-1.053 1.028-1.053 2.508c0 1.48 1.078 2.91 1.228 3.111.15.201 2.122 3.24 5.14 4.544.718.31 1.278.496 1.716.635.722.23 1.378.197 1.9.12.581-.087 1.78-.727 2.03-1.43.25-.703.25-1.305.176-1.43-.075-.126-.276-.201-.577-.351zM12.04 2C6.54 2 2.08 6.46 2.08 11.96c0 1.92.54 3.71 1.48 5.23L2 22l4.98-1.51c1.47.88 3.19 1.41 5.06 1.41 5.5 0 9.96-4.46 9.96-9.94C22 6.46 17.54 2 12.04 2zm0 18.23c-1.66 0-3.21-.49-4.52-1.35l-.32-.21-2.96.9.92-2.88-.23-.36c-.95-1.35-1.49-2.97-1.49-4.7 0-4.55 3.7-8.25 8.28-8.25 4.57 0 8.28 3.7 8.28 8.25 0 4.55-3.71 8.2-8.28 8.2z" />
    </svg>
  );
}

// Generate Personalized Official WhatsApp Reminder URL
function getWhatsAppReminderUrl(item: MockTransaction): string | null {
  const cleanPhone = (item.phone || '').replace(/\D/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) return null;

  const contributorName = item.contributorName?.trim() || 'സുഹൃത്തേ';
  const masjidName = 'സലഫി മസ്ജിദ് കുപ്പം';
  const offeredAmount = formatINRFromPaise(item.amountPaise);

  const message =
    `السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ

ബഹുമാനപ്പെട്ട ${contributorName},

നമ്മുടെ ${masjidName}-ന്റെ ഭൂമി ഏറ്റെടുക്കൽ പദ്ധതിയിലേക്ക് താങ്കൾ ${offeredAmount} സംഭാവനയായി നൽകാമെന്ന് വാഗ്ദാനം ചെയ്തത് സ്നേഹപൂർവ്വം ഓർമ്മപ്പെടുത്തുന്നതിനായാണ് ഈ സന്ദേശം അയക്കുന്നത്.

സൗകര്യപ്പെടുന്ന സമയത്ത് താങ്കളുടെ വാഗ്ദാനം നിറവേറ്റാൻ ശ്രദ്ധിക്കുമല്ലോ.

താങ്കളുടെ ഓഫർ വിവരങ്ങൾ കാണാനും പേയ്മെന്റ് നൽകാനും താഴെയുള്ള ലിങ്ക് ഉപയോഗിക്കാം.

🔗 Payment Link:
https://kuppam-collection.vercel.app

അല്ലാഹു താങ്കളുടെ സൽപ്രവർത്തനങ്ങൾ സ്വീകരിക്കുമാറാകട്ടെ. 🤲🏻

ആമീൻ.

പ്രാർത്ഥനയോടെ,

${masjidName}
അഡ്മിൻ ടീം`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}

const MOCK_TRANSACTIONS: MockTransaction[] = [];

export default function OffersLedgerPage() {
  const [eventsList, setEventsList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: { id: string; name: string }[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({ id: docSnap.id, name: d.name || docSnap.id });
        });
        setEventsList(list);
      },
      (err) => console.warn('Could not fetch events for offers:', err)
    );
    return () => unsub();
  }, []);
  const [transactions, setTransactions] = useState<MockTransaction[]>(MOCK_TRANSACTIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');

  // Modal states
  const [editingOffer, setEditingOffer] = useState<MockTransaction | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<MockTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editType, setEditType] = useState<OfferType>('cash');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editAmountINR, setEditAmountINR] = useState('');
  const [editEventName, setEditEventName] = useState('General Campaign');
  const [editStatus, setEditStatus] = useState<OfferStatus>('pledged');

  useEffect(() => {
    try {
      const q = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            setTransactions([]);
            return;
          }
          const list: MockTransaction[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const total = Number(d.totalOfferedPaise) || 0;
            const paid = Number(d.paidPaise) || 0;

            // Authoritatively derive status from paid amount vs total offered
            let computedStatus: OfferStatus = d.status || 'pledged';
            if (computedStatus !== 'cancelled') {
              if (paid >= total && total > 0) {
                computedStatus = 'verified';
              } else if (paid > 0 && paid < total) {
                computedStatus = 'partial';
              } else {
                computedStatus = 'pledged';
              }
            }

            // If status in database is outdated/desynchronized, self-heal in Firestore
            if (d.status !== computedStatus && computedStatus !== 'cancelled') {
              setDoc(doc(db, 'offers', docSnap.id), { status: computedStatus }, { merge: true }).catch(() => {});
            }

            list.push({
              id: docSnap.id,
              orderNumber: d.offerNumber || docSnap.id.slice(0, 8),
              contributorName: d.contributorName || 'Well Wisher',
              phone: d.contributorPhone || '',
              place: d.contributorPlace || '',
              offerType: d.offerType || 'cash',
              quantity: d.quantity || 1,
              amountPaise: total,
              paidPaise: paid,
              channel: 'ONLINE',
              status: computedStatus,
              eventName: d.eventName || 'General Campaign',
              eventId: d.eventId || 'general',
              date: d.createdAt?.toDate
                ? d.createdAt.toDate().toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
                : 'Recent',
            });
          });
          setTransactions(list);
        },
        (err) => {
          console.warn('Firestore offers subscription fallback:', err.message);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('Firestore offers query fallback:', e);
    }
  }, []);

  const openEditModal = (offer: MockTransaction) => {
    setEditingOffer(offer);
    setEditName(offer.contributorName);
    setEditPhone(offer.phone);
    setEditType(offer.offerType);
    setEditQuantity(offer.quantity || 1);
    setEditAmountINR((offer.amountPaise / 100).toString());
    setEditEventName(offer.eventName || 'General Campaign');
    setEditStatus(offer.status || 'pledged');
    setActionError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffer) return;

    const numAmount = parseFloat(editAmountINR);
    if (isNaN(numAmount) || numAmount < 0) {
      setActionError('Please enter a valid donation amount in Rupees.');
      return;
    }

    const cleanPhone = editPhone.replace(/\D/g, '').slice(-10);

    try {
      setIsSubmitting(true);
      setActionError(null);

      const newAmountPaise = Math.round(numAmount * 100);
      const previousAmountPaise = editingOffer.amountPaise;
      const previousEventId = editingOffer.eventId || (editingOffer.eventName === 'General Campaign' ? 'general' : editingOffer.eventName);

      let eventId = 'general';
      if (editEventName.toLowerCase().includes('ulikkal')) eventId = 'ulikkal-event-2026';
      else if (editEventName.toLowerCase().includes('kuppam')) eventId = 'kuppam-gathering-2026';
      else if (editEventName !== 'General Campaign') eventId = editEventName.toLowerCase().replace(/\s+/g, '-');

      await updateOfferInFirebase(
        editingOffer.id,
        {
          contributorName: editName.trim() || 'Well Wisher',
          contributorPhone: cleanPhone,
          offerType: editType,
          quantity: Math.max(1, editQuantity),
          totalOfferedPaise: newAmountPaise,
          status: editStatus as any,
          eventName: editEventName,
          eventId: eventId,
        },
        previousAmountPaise,
        previousEventId
      );

      // Local state update for immediate responsiveness
      setTransactions((prev) =>
        prev.map((item) =>
          item.id === editingOffer.id
            ? {
              ...item,
              contributorName: editName.trim() || 'Well Wisher',
              phone: cleanPhone,
              offerType: editType,
              quantity: Math.max(1, editQuantity),
              amountPaise: newAmountPaise,
              status: editStatus,
              eventName: editEventName,
              eventId: eventId,
            }
            : item
        )
      );

      setEditingOffer(null);
      setActionSuccess(`Offer ${editingOffer.orderNumber} successfully updated.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error updating offer:', err);
      setActionError(err.message || 'Failed to update offer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingOffer) return;

    try {
      setIsSubmitting(true);
      setActionError(null);

      const eventId = deletingOffer.eventId || (deletingOffer.eventName === 'General Campaign' ? 'general' : deletingOffer.eventName);

      await deleteOfferFromFirebase(deletingOffer.id, deletingOffer.amountPaise, eventId);

      setTransactions((prev) => prev.filter((item) => item.id !== deletingOffer.id));

      const deletedOrderNumber = deletingOffer.orderNumber;
      const deletedAmount = deletingOffer.amountPaise / 100;
      setDeletingOffer(null);
      setActionSuccess(`Offer ${deletedOrderNumber} (₹${deletedAmount.toLocaleString('en-IN')}) was permanently deleted. Campaign totals adjusted.`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error deleting offer:', err);
      setActionError(err.message || 'Failed to delete offer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = transactions.filter((item) => {
    const matchesSearch =
      item.contributorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm) ||
      (item.place && item.place.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.eventName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.offerType === typeFilter;
    const matchesChannel = channelFilter === 'all' || item.channel === channelFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesEvent = eventFilter === 'all' || item.eventName === eventFilter;
    return matchesSearch && matchesType && matchesChannel && matchesStatus && matchesEvent;
  });

  const exportCSV = () => {
    const headers = ['Order Number,Contributor,Phone,Place,Offer Type,Units,Amount (INR),Payment Channel,Status,Event,Date\n'];
    const rows = filtered.map(
      (t) =>
        `"${t.orderNumber}","${t.contributorName}","+91${t.phone}","${t.place || ''}","${t.offerType.toUpperCase()}",${t.quantity},${t.amountPaise / 100},"${t.channel}","${t.status.toUpperCase()}","${t.eventName}","${t.date}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `masjid_fund_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper calculation for edit form
  const currentDiffINR = editingOffer
    ? (parseFloat(editAmountINR || '0') - editingOffer.amountPaise / 100)
    : 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Strip */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
            <Receipt size={14} /> Master Financial Ledger
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand-900)' }}>
            Offers &amp; Transactions
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage, edit mistakes, or remove offers to keep campaign totals exact.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="btn btn-outline"
          style={{ padding: '10px 18px', fontSize: '0.9rem', gap: '8px' }}
        >
          <Download size={16} />
          <span>Export Filtered CSV</span>
        </button>
      </div>

      {/* Action Success / Error Notifications */}
      {actionSuccess && (
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #86EFAC',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#15803D',
          fontSize: '0.92rem',
          fontWeight: 600,
        }}>
          <Check size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && !editingOffer && !deletingOffer && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#DC2626',
          fontSize: '0.92rem',
          fontWeight: 600,
        }}>
          <AlertTriangle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Strip */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        border: '1px solid var(--border-light)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by name, phone (+91), or order #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-medium)',
            fontSize: '0.88rem',
            color: 'var(--brand-900)',
          }}
        >
          <option value="all">All Offer Types</option>
          <option value="cash">Direct Cash / തുക</option>
          <option value="musalla">Musalla (മുസല്ല)</option>
          <option value="cent">Cent (സെന്റ്)</option>
          <option value="sqft">Square Feet</option>
          <option value="custom">Custom / മറ്റു തുകകൾ</option>
        </select>

        {/* Channel Filter */}
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-medium)',
            fontSize: '0.88rem',
            color: 'var(--brand-900)',
          }}
        >
          <option value="all">All Payment Channels</option>
          <option value="ONLINE">Online (Direct Offer)</option>
          <option value="CASH">Cash in Hand</option>
        </select>

        {/* Event Filter */}
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid #16A34A',
            fontSize: '0.88rem',
            color: '#15803D',
            fontWeight: 700,
            background: '#F0FDF4',
          }}
        >
          <option value="all">📍 All Events &amp; Locations</option>
          <option value="General Campaign">General Campaign</option>
          {eventsList.map((ev) => (
            <option key={ev.id} value={ev.name}>
              {ev.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-medium)',
            fontSize: '0.88rem',
            color: 'var(--brand-900)',
          }}
        >
          <option value="all">All Statuses</option>
          <option value="pledged">Pledged (വാഗ്ദാനം)</option>
          <option value="verified">Verified (ലഭിച്ചത്)</option>
          <option value="partial">Partial</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Ledger Table */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '14px 20px' }}>Order Ref</th>
                <th style={{ padding: '14px 20px' }}>Contributor</th>
                <th style={{ padding: '14px 20px' }}>Event Tag</th>
                <th style={{ padding: '14px 20px' }}>Offer Category</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '14px 20px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 20px' }}>Date</th>
                <th style={{ padding: '14px 20px', textAlign: 'center' }}>Receipt</th>
                <th style={{ padding: '14px 20px', textAlign: 'center' }}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No offers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--brand-900)' }}>
                      {item.orderNumber}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <strong style={{ color: 'var(--brand-900)', display: 'block' }}>{item.contributorName}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <small style={{ color: 'var(--text-muted)' }}>
                          {item.phone ? `+91 ${item.phone}` : 'No phone'}
                          {item.place ? ` • 📍 ${item.place}` : ''}
                        </small>

                        {/* Personalized Official WhatsApp Reminder Button */}
                        {(() => {
                          const isEligible = item.status !== 'verified' && item.status !== 'cancelled';
                          const waUrl = getWhatsAppReminderUrl(item);

                          if (!isEligible) {
                            return null;
                          }

                          if (!waUrl) {
                            return (
                              <span
                                title="Cannot send WhatsApp: invalid or missing phone number"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '3px 6px',
                                  borderRadius: '6px',
                                  background: '#F1F5F9',
                                  color: '#94A3B8',
                                  cursor: 'not-allowed',
                                  fontSize: '0.72rem',
                                  marginLeft: '4px',
                                }}
                              >
                                <WhatsAppIcon size={13} color="#94A3B8" />
                              </span>
                            );
                          }

                          return (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Send official WhatsApp reminder to ${item.contributorName} for ${formatINRFromPaise(item.amountPaise)}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: '#DCFCE7',
                                border: '1px solid #86EFAC',
                                color: '#15803D',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                                marginLeft: '4px',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#25D366';
                                e.currentTarget.style.color = '#FFFFFF';
                                e.currentTarget.style.borderColor = '#16A34A';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#DCFCE7';
                                e.currentTarget.style.color = '#15803D';
                                e.currentTarget.style.borderColor = '#86EFAC';
                              }}
                            >
                              <WhatsAppIcon size={12} color="currentColor" />
                              <span>Remind</span>
                            </a>
                          );
                        })()}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        background: '#F0FDF4',
                        color: '#15803D',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid #BBF7D0',
                        whiteSpace: 'nowrap',
                      }}>
                        📍 {item.eventName}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textTransform: 'capitalize' }}>
                      {item.quantity} {item.offerType}
                    </td>
                    <td style={{
                      padding: '16px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: 'var(--brand-900)',
                    }}>
                      <div>{formatINRFromPaise(item.amountPaise)}</div>
                      {item.paidPaise && item.paidPaise > 0 ? (
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: item.status === 'verified' ? '#15803D' : '#D97706', marginTop: '2px' }}>
                          {item.status === 'verified'
                            ? `Paid: ${formatINRFromPaise(item.paidPaise)}`
                            : `Paid: ${formatINRFromPaise(item.paidPaise)} • Due: ${formatINRFromPaise(Math.max(0, item.amountPaise - item.paidPaise))}`}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {item.status === 'verified' ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Paid
                        </span>
                      ) : item.status === 'partial' ? (
                        <span className="badge" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                          <Clock size={12} /> Partial
                        </span>
                      ) : item.status === 'cancelled' ? (
                        <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          Cancelled
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}>
                          <Clock size={12} /> Pledged
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.date}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {item.status === 'verified' ? (
                        <a
                          href={`/receipt/${item.orderNumber}?donor=${encodeURIComponent(item.contributorName)}&phone=${item.phone}&amount=${item.amountPaise}&type=${item.offerType}&qty=${item.quantity}&status=verified`}
                          target="_blank"
                          title="View Official Payment Receipt"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Receipt size={13} />
                          <span>Receipt</span>
                        </a>
                      ) : item.status === 'partial' ? (
                        <a
                          href={`/receipt/${item.orderNumber}?donor=${encodeURIComponent(item.contributorName)}&phone=${item.phone}&amount=${item.amountPaise}&paid=${item.paidPaise || 0}&type=${item.offerType}&qty=${item.quantity}&status=partial`}
                          target="_blank"
                          title="View Partial Payment Receipt"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: '#F0FDF4',
                            color: '#15803D',
                            border: '1px solid #86EFAC',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Receipt size={13} />
                          <span>Partial</span>
                        </a>
                      ) : (
                        <a
                          href={`/receipt/${item.orderNumber}?donor=${encodeURIComponent(item.contributorName)}&phone=${item.phone}&amount=${item.amountPaise}&type=${item.offerType}&qty=${item.quantity}&status=pledged`}
                          target="_blank"
                          title="View Official Offer Slip"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: '#FFFBEB',
                            color: '#B45309',
                            border: '1px solid #FDE68A',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <FileText size={13} />
                          <span>Offer Slip</span>
                        </a>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            gap: '4px',
                            borderColor: 'var(--brand-300)',
                            color: 'var(--brand-900)',
                          }}
                          title="Edit this offer (തിരുത്തുക)"
                        >
                          <Edit3 size={13} color="var(--brand-800)" />
                          <span>Edit</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeletingOffer(item)}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 9px',
                            fontSize: '0.78rem',
                            gap: '4px',
                            color: '#DC2626',
                            borderColor: '#FECACA',
                            background: '#FEF2F2',
                          }}
                          title="Delete / Remove this mistaken offer (നീക്കം ചെയ്യുക)"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Offer Modal */}
      {editingOffer && (
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
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px 28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid var(--border-light)',
              paddingBottom: '14px',
              marginBottom: '18px',
            }}>
              <div>
                <span className="badge badge-gold" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>
                  {editingOffer.orderNumber}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-900)', margin: 0 }}>
                  Edit Offer / വാഗ്ദാനം തിരുത്തുക
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Correct user mistakes or adjust entered amounts. Campaign totals update automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOffer(null)}
                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {actionError && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#DC2626',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                {actionError}
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSaveEdit}>
              {/* Contributor Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Contributor Name (ദാതാവിന്റെ പേര്) *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              {/* Contributor Phone */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Phone Number (10 Digits) *
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    padding: '10px 12px',
                    background: '#F1F5F9',
                    border: '1px solid var(--border-medium)',
                    borderRight: 'none',
                    borderRadius: '8px 0 0 8px',
                    fontSize: '0.9rem',
                    color: '#64748B',
                    fontWeight: 600,
                  }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '0 8px 8px 0',
                      border: '1px solid var(--border-medium)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              {/* Offer Category and Quantity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                    Offer Category (വിഭാഗം)
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => {
                      const nextType = e.target.value as OfferType;
                      setEditType(nextType);
                      // Suggest standard rate if switching to standard unit
                      if (nextType === 'musalla') {
                        setEditAmountINR((editQuantity * 10360).toString());
                      } else if (nextType === 'cent') {
                        setEditAmountINR((editQuantity * 564103).toString());
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      fontSize: '0.88rem',
                      color: 'var(--brand-900)',
                      fontWeight: 600,
                    }}
                  >
                    <option value="cash">Direct Cash / തുക</option>
                    <option value="musalla">Musalla (മുസല്ല - ₹10,360)</option>
                    <option value="cent">Cent (സെന്റ് - ₹5,64,103)</option>
                    <option value="sqft">Square Feet</option>
                    <option value="custom">Custom Donation</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                    Quantity (എണ്ണം)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editQuantity}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      setEditQuantity(qty);
                      if (editType === 'musalla') {
                        setEditAmountINR((qty * 10360).toString());
                      } else if (editType === 'cent') {
                        setEditAmountINR((qty * 564103).toString());
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              {/* Amount in INR */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Total Amount (₹ തുക) *
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    padding: '10px 14px',
                    background: '#F1F5F9',
                    border: '1px solid var(--border-medium)',
                    borderRight: 'none',
                    borderRadius: '8px 0 0 8px',
                    fontSize: '1rem',
                    color: 'var(--brand-900)',
                    fontWeight: 700,
                  }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    step="any"
                    min={1}
                    placeholder="Enter corrected amount in ₹"
                    value={editAmountINR}
                    onChange={(e) => setEditAmountINR(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '0 8px 8px 0',
                      border: '1.5px solid var(--gold-500)',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--brand-900)',
                    }}
                  />
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditType('musalla');
                      setEditQuantity(1);
                      setEditAmountINR('10360');
                    }}
                    style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer' }}
                  >
                    1 Musalla (₹10,360)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditType('musalla');
                      setEditQuantity(5);
                      setEditAmountINR('51800');
                    }}
                    style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer' }}
                  >
                    5 Musalla (₹51,800)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditType('cent');
                      setEditQuantity(1);
                      setEditAmountINR('564103');
                    }}
                    style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer' }}
                  >
                    1 Cent (₹5,64,103)
                  </button>
                </div>

                {/* Difference Indicator */}
                {currentDiffINR !== 0 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: currentDiffINR < 0 ? '#FEF2F2' : '#F0FDF4',
                    border: `1px solid ${currentDiffINR < 0 ? '#FECACA' : '#BBF7D0'}`,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: currentDiffINR < 0 ? '#DC2626' : '#15803D',
                  }}>
                    {currentDiffINR < 0 ? '▼ Reduction: ' : '▲ Increase: '}
                    ₹{Math.abs(currentDiffINR).toLocaleString('en-IN')} will be adjusted on the campaign grand total.
                  </div>
                )}
              </div>

              {/* Event Tag */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Event / Location Tag (ഇവന്റ് ടാഗ്)
                </label>
                <select
                  value={editEventName}
                  onChange={(e) => setEditEventName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #16A34A',
                    fontSize: '0.88rem',
                    color: '#15803D',
                    fontWeight: 700,
                    background: '#F0FDF4',
                  }}
                >
                  <option value="General Campaign">General Campaign</option>
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.name}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Status (നില)
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as OfferStatus)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="pledged">Pledged (വാഗ്ദാനം ചെയ്തത്)</option>
                  <option value="verified">Verified (പൂർണ്ണമായി ലഭിച്ചത്)</option>
                  <option value="partial">Partial (ഭാഗികമായി ലഭിച്ചത്)</option>
                  <option value="cancelled">Cancelled (റദ്ദാക്കിയത്)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingOffer(null)}
                  disabled={isSubmitting}
                  className="btn btn-outline"
                  style={{ padding: '10px 18px', fontSize: '0.9rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '10px 22px', fontSize: '0.9rem', gap: '6px' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="spin-slow" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingOffer && (
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
            borderRadius: '20px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px 28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-900)', margin: 0 }}>
                  Delete Mistaken Offer?
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 600 }}>
                  വാഗ്ദാനം സ്ഥിരമായി നീക്കം ചെയ്യുക
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
              Are you sure you want to delete this offer from the system?
            </p>

            {/* Offer details card */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid var(--border-medium)',
              marginBottom: '18px',
              fontSize: '0.86rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Order Reference:</span>
                <strong style={{ color: 'var(--brand-900)' }}>{deletingOffer.orderNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Contributor:</span>
                <strong style={{ color: 'var(--brand-900)' }}>{deletingOffer.contributorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                <span style={{ color: 'var(--text-dark)' }}>+91 {deletingOffer.phone || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                <strong style={{ color: '#DC2626', fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>
                  {formatINRFromPaise(deletingOffer.amountPaise)}
                </strong>
              </div>
            </div>

            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '20px',
              fontSize: '0.8rem',
              color: '#92400E',
            }}>
              ⚠️ <strong>Impact:</strong> Deleting this offer will reduce the campaign total offered amount by <strong>{formatINRFromPaise(deletingOffer.amountPaise)}</strong> and decrement the donor count.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeletingOffer(null)}
                disabled={isSubmitting}
                className="btn btn-outline"
                style={{ padding: '10px 16px', fontSize: '0.88rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                style={{
                  padding: '10px 20px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-md)',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="spin-slow" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Yes, Delete Offer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
