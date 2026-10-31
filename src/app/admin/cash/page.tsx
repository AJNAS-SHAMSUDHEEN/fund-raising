'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { OfferType, ReceivingEntity } from '@/lib/types';
import { INITIAL_CAMPAIGN } from '@/lib/state/mockStore';
import { formatINRFromPaise, formatINR, normalizePhoneNumber } from '@/lib/calculations/currency';
import {
  Coins,
  Search,
  UserPlus,
  CheckCircle2,
  Printer,
  ShieldCheck,
  AlertCircle,
  Clock,
  Check,
  ArrowRight,
  Handshake,
  Calendar,
  Share2,
  RotateCcw
} from 'lucide-react';
import { recordCashToFirebase, getDonorHistoryByPhone, getNextReceiptNumber, DonorHistory, DonorOfferRecord } from '@/lib/firebase/db';
import { useAdminAuth } from '@/lib/state/adminAuth';

export default function CashCollectionPOSPage() {
  const { adminUser } = useAdminAuth();
  // Step 1: Phone Search State
  const [phoneInput, setPhoneInput] = useState('');
  const [hasNoPhone, setHasNoPhone] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Step 2: Donor Profile & Previous Offers State
  const [donorHistory, setDonorHistory] = useState<DonorHistory | null>(null);
  const [contributorName, setContributorName] = useState('');
  const [contributorPlace, setContributorPlace] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<DonorOfferRecord | null>(null);

  // Step 3: Cash Recording Form State
  const [receivingEntity, setReceivingEntity] = useState<ReceivingEntity>('unit');
  const [receivingEntityName, setReceivingEntityName] = useState('');
  const [eventsList, setEventsList] = useState<{ id: string; name: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('general');
  const [offerType, setOfferType] = useState<OfferType>('musalla');
  const [quantity, setQuantity] = useState<number>(1);
  const [cashAmountRupees, setCashAmountRupees] = useState<number>(10360);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Provisional Receipt Success State
  const [provisionalReceipt, setProvisionalReceipt] = useState<any | null>(null);

  // Synchronize events dynamically from Firebase
  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: { id: string; name: string }[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name || docSnap.id,
          });
        });
        setEventsList(list);
      },
      (err) => {
        console.warn('Could not fetch events for POS:', err);
      }
    );
    return () => unsub();
  }, []);

  const handleToggleNoPhone = (checked: boolean) => {
    setHasNoPhone(checked);
    if (checked) {
      setPhoneInput('');
      setDonorHistory(null);
      setSelectedOffer(null);
      setHasSearched(true); // Open step 2 & 3 immediately
    } else {
      resetLookup();
    }
  };

  // Auto-search when 10 digits are entered
  const handlePhoneChange = async (val: string) => {
    setPhoneInput(val);
    const clean = val.replace(/\D/g, '').slice(-10);
    if (clean.length === 10) {
      performLookup(clean);
    } else if (clean.length === 0) {
      resetLookup();
    }
  };

  const performLookup = async (phoneToLookup: string) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const history = await getDonorHistoryByPhone(phoneToLookup);
      setDonorHistory(history);
      setContributorName(history.contributorName !== 'Well Wisher' ? history.contributorName : '');

      // If donor has pending pledges with balance, auto-focus the first one
      const pendingWithBalance = history.offers.find((o) => o.remainingPaise > 0);
      if (pendingWithBalance) {
        selectOfferToPay(pendingWithBalance);
      } else {
        setSelectedOffer(null);
        setOfferType('musalla');
        setCashAmountRupees(10360);
      }
    } catch (err) {
      console.error('Donor lookup error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const resetLookup = () => {
    setDonorHistory(null);
    setHasSearched(false);
    setSelectedOffer(null);
    setContributorName('');
    setCashAmountRupees(10360);
  };

  const selectOfferToPay = (offer: DonorOfferRecord) => {
    setSelectedOffer(offer);
    setOfferType(offer.offerType);
    setQuantity(offer.quantity);
    // Autofill cash amount to remaining balance (or total amount)
    const rupeesRemaining = Math.max(1, Math.round(offer.remainingPaise / 100));
    setCashAmountRupees(rupeesRemaining);
  };

  const selectFreshContribution = () => {
    setSelectedOffer(null);
    setOfferType('musalla');
    setQuantity(1);
    setCashAmountRupees(10360);
  };

  // Synchronize unit rate calculations when user manually alters units
  const updateUnitType = (type: OfferType) => {
    setOfferType(type);
    setSelectedOffer(null);
    if (type === 'cent') {
      setCashAmountRupees(INITIAL_CAMPAIGN.centRatePaise / 100);
    } else if (type === 'sqft') {
      setCashAmountRupees((INITIAL_CAMPAIGN.sqFtRatePaise * 10) / 100);
      setQuantity(10);
    } else if (type === 'musalla') {
      setCashAmountRupees(INITIAL_CAMPAIGN.musallaRatePaise / 100);
      setQuantity(1);
    } else {
      setCashAmountRupees(5000);
      setQuantity(1);
    }
  };

  const handleRecordCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = hasNoPhone ? '' : phoneInput.replace(/\D/g, '').slice(-10);
    if (!hasNoPhone && (!cleanPhone || cleanPhone.length !== 10)) {
      alert('Please enter a valid 10-digit mobile number, or check "Donor has no mobile number"');
      return;
    }

    if (!cashAmountRupees || cashAmountRupees <= 0) {
      alert('Please enter a valid cash amount in Rupees');
      return;
    }

    const resolvedContributorName = contributorName.trim() || donorHistory?.contributorName || (hasNoPhone ? '' : 'Well Wisher');
    if (!resolvedContributorName) {
      alert('ദയവായി സംഭാവന നൽകിയ ആളുടെ പേര് നൽകുക (Please enter contributor name)');
      return;
    }

    setIsSubmitting(true);

    const matchedEvent = eventsList.find((ev) => ev.id === selectedEventId);
    const eventName = matchedEvent ? matchedEvent.name : (selectedEventId === 'general' ? 'General Campaign' : selectedEventId); // dynamic event name





    const generatedReceiptNumber = await getNextReceiptNumber();
    const calculatedPaise = Math.round(cashAmountRupees * 100);

    const newReceipt = {
      receiptNumber: generatedReceiptNumber,
      contributorName: resolvedContributorName,
      contributorPhone: cleanPhone,
      contributorPlace: contributorPlace.trim(),
      hasNoPhone,
      receivingEntity,
      receivingEntityName: receivingEntity === 'external' ? receivingEntityName.trim() : '',
      offerType,
      quantity,
      amountPaise: calculatedPaise,
      eventId: selectedEventId,
      eventName,
      collectorName: adminUser ? `${adminUser.name} (${adminUser.role === 'super_admin' ? 'Super Admin' : 'Volunteer'})` : 'Authorized Collector',
      offerId: selectedOffer?.id,
      notes: notes.trim(),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    try {
      await recordCashToFirebase({
        receiptNumber: newReceipt.receiptNumber,
        contributorName: resolvedContributorName,
        contributorPhone: cleanPhone,
        contributorPlace: contributorPlace.trim(),
        hasNoPhone,
        receivingEntity,
        receivingEntityName: receivingEntity === 'external' ? receivingEntityName.trim() : '',
        offerType,
        quantity,
        amountPaise: calculatedPaise,
        collectorName: adminUser ? `${adminUser.name} (${adminUser.role === 'super_admin' ? 'Super Admin' : 'Volunteer'})` : 'Authorized Collector',
        eventId: selectedEventId,
        eventName,
        offerId: selectedOffer?.id,
        notes: notes.trim(),
      });
    } catch (err) {
      console.warn('Firebase cash write fallback to local:', err);
    }

    // Persist locally for offline continuity
    try {
      const existingCash = JSON.parse(localStorage.getItem('masjid_cash_collections') || '[]');
      localStorage.setItem('masjid_cash_collections', JSON.stringify([newReceipt, ...existingCash]));
    } catch (e) {}

    setIsSubmitting(false);
    setProvisionalReceipt(newReceipt);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge badge-gold">
            <Coins size={14} /> Field Cash Collection POS
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Wisdom Islamic Organization Kuppam Unit
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--brand-900)', margin: 0 }}>
          Record Cash Collection
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
          Enter contributor mobile number to view previous pledges, fulfill pledges, or record fresh cash receipts.
        </p>
      </div>

      {!provisionalReceipt ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* STEP 1: MOBILE NUMBER LOOKUP CARD */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px',
            border: '2px solid var(--brand-700)',
            boxShadow: '0 4px 16px rgba(11, 61, 39, 0.08)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--brand-800)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                }}>
                  1
                </span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-900)', margin: 0 }}>
                  Enter Contributor Mobile Number (മൊബൈൽ നമ്പർ)
                </h2>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Primary Donor ID
              </small>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                border: hasNoPhone ? '1.5px dashed #CBD5E1' : '2px solid var(--border-medium)',
                borderRadius: '12px',
                background: hasNoPhone ? '#F1F5F9' : '#F8FAFC',
                padding: '4px 14px',
                opacity: hasNoPhone ? 0.75 : 1,
                transition: 'border-color 0.2s ease',
              }}>
                <span style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: hasNoPhone ? '#94A3B8' : 'var(--brand-800)',
                  marginRight: '10px',
                  borderRight: '1px solid var(--border-medium)',
                  paddingRight: '10px',
                }}>
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  disabled={hasNoPhone}
                  placeholder={hasNoPhone ? "മൊബൈൽ നമ്പർ ലഭ്യമല്ല (Direct Cash Entry)" : "Enter 10-digit mobile number (e.g. 9847123456)"}
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    outline: 'none',
                    padding: '8px 0',
                    color: hasNoPhone ? '#64748B' : '#0F172A',
                    cursor: hasNoPhone ? 'not-allowed' : 'text',
                  }}
                />
                {phoneInput && !hasNoPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput('');
                      resetLookup();
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {!hasNoPhone && (
                <button
type="button"
onClick={() => performLookup(phoneInput.replace(/\D/g, '').slice(-10))}
                  disabled={isSearching || phoneInput.length < 10}
                  className="btn btn-primary"
                  style={{ padding: '14px 22px', fontSize: '0.95rem', fontWeight: 700, gap: '6px' }}
                >
                  <Search size={18} />
                  <span>{isSearching ? 'Searching...' : 'Search'}</span>
                </button>
              )}
            </div>

            {/* No Mobile Number Checkbox */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: hasNoPhone ? '#B45309' : '#475569',
              }}>
                <input
                  type="checkbox"
                  checked={hasNoPhone}
                  onChange={(e) => handleToggleNoPhone(e.target.checked)}
                  style={{ width: '17px', height: '17px', accentColor: '#D97706', cursor: 'pointer' }}
                />
                <span>മൊബൈൽ നമ്പർ ലഭ്യമല്ല (Donor has no mobile number — Direct entry)</span>
              </label>
            </div>
          </div>

          {/* STEP 2: DETAILS & PREVIOUS OFFERS UNDER THIS MOBILE NUMBER */}
          {hasSearched && (
            hasNoPhone ? (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '24px',
                border: '1.5px solid #FCD34D',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#D97706',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                  }}>
                    2
                  </span>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#92400E', margin: 0 }}>
                    Contributor Profile (മൊബൈൽ നമ്പർ ഇല്ലാത്ത വ്യക്തി)
                  </h2>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '14px',
                  background: '#FEFCE8',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #FDE68A',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#92400E', marginBottom: '4px' }}>
                      Contributor Full Name (ദാതാവിന്റെ പേര്) *
                    </label>
                    <input
                      type="text"
                      required
                      value={contributorName}
                      placeholder="e.g. C.K. Abdulla Haji"
                      onChange={(e) => setContributorName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #F59E0B',
                        fontWeight: 700,
                        color: '#0F172A',
                        background: '#FFFFFF',
                        fontSize: '1rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#92400E', marginBottom: '4px' }}>
                      Place / Address (സ്ഥലം / വീട്ടുപേര്)
                    </label>
                    <input
                      type="text"
                      value={contributorPlace}
                      placeholder="e.g. Kuppam / Taliparamba"
                      onChange={(e) => setContributorPlace(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        color: '#0F172A',
                        background: '#FFFFFF',
                        fontSize: '0.95rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              border: '1.5px solid #BBF7D0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#15803D',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                }}>
                  2
                </span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#14532D', margin: 0 }}>
                  Contributor Profile &amp; Previous Offers
                </h2>
              </div>

              {/* Profile Bar & Financial Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                background: '#F0FDF4',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #86EFAC',
                marginBottom: '20px',
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>
                    Contributor Name
                  </span>
                  <input
                    type="text"
                    value={contributorName}
                    placeholder="Enter name (or leave for Well Wisher)"
                    onChange={(e) => setContributorName(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #86EFAC',
                      fontWeight: 700,
                      color: '#14532D',
                      background: '#FFFFFF',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Total Pledged (ആകെ ഓഫർ)
                  </span>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                    {formatINRFromPaise(donorHistory?.totalOfferedPaise || 0)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>
                    Total Paid (ഇതുവരെ നൽകിയത്)
                  </span>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                    {formatINRFromPaise(donorHistory?.totalPaidPaise || 0)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C2410C', textTransform: 'uppercase' }}>
                    Outstanding Balance (ബാക്കി)
                  </span>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: (donorHistory?.remainingPaise || 0) > 0 ? '#EA580C' : '#15803D',
                    marginTop: '4px',
                  }}>
                    {formatINRFromPaise(donorHistory?.remainingPaise || 0)}
                  </div>
                </div>
              </div>

              {/* OFFERS LIST UNDER THIS NUMBER */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>
                    Offers Registered under +91 {donorHistory?.phone}:
                  </strong>
                  <button
                    type="button"
                    onClick={selectFreshContribution}
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: selectedOffer === null ? '#15803D' : '#64748B',
                      background: selectedOffer === null ? '#DCFCE7' : 'transparent',
                      border: selectedOffer === null ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    + Record Fresh Extra Donation
                  </button>
                </div>

                {donorHistory && donorHistory.offers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {donorHistory.offers.map((off) => {
                      const isSelected = selectedOffer?.id === off.id;
                      return (
                        <div
                          key={off.id}
                          style={{
                            border: isSelected ? '2px solid #16A34A' : '1px solid #E2E8F0',
                            background: isSelected ? '#F0FDF4' : '#FFFFFF',
                            borderRadius: '14px',
                            padding: '14px 18px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: isSelected ? '0 4px 12px rgba(22, 163, 74, 0.12)' : 'none',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '1rem', color: '#0F172A', textTransform: 'capitalize' }}>
                                {off.quantity} {off.offerType} Offer
                              </strong>
                              {off.eventName && (
                                <span style={{ fontSize: '0.72rem', background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                  {off.eventName}
                                </span>
                              )}
                              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                ({off.date})
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '4px' }}>
                              Total Pledged: <strong>{formatINRFromPaise(off.totalOfferedPaise)}</strong>
                              {' • '}
                              Paid: <strong style={{ color: '#15803D' }}>{formatINRFromPaise(off.paidPaise)}</strong>
                              {' • '}
                              Balance: <strong style={{ color: off.remainingPaise > 0 ? '#EA580C' : '#15803D' }}>{formatINRFromPaise(off.remainingPaise)}</strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => selectOfferToPay(off)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: isSelected ? '#16A34A' : '#F1F5F9',
                              color: isSelected ? '#FFFFFF' : '#334155',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSelected && <Check size={16} />}
                            <span>{isSelected ? 'Selected for Payment' : 'Pay Towards This Offer'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    background: '#F8FAFC',
                    padding: '16px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: '1px dashed #CBD5E1',
                    color: '#64748B',
                    fontSize: '0.88rem',
                  }}>
                    No prior pledges found for this number. Recording a <strong>Fresh Direct Cash Collection</strong>.
                  </div>
                )}
              </div>
            </div>
            )
          )}

          {/* STEP 3: RECORD CASH COLLECTION CARD */}
          {hasSearched && (
            <form onSubmit={handleRecordCash} style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              border: '2px solid var(--gold-400)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--gold-600)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                }}>
                  3
                </span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-900)', margin: 0 }}>
                  Record Cash Collection (തുക അടക്കുക)
                </h2>
              </div>

              {/* Status Banner indicating payment target */}
              <div style={{
                background: selectedOffer ? '#DCFCE7' : 'var(--bg-subtle)',
                border: selectedOffer ? '1.5px solid #86EFAC' : '1px solid var(--border-medium)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <Handshake size={20} color={selectedOffer ? '#15803D' : '#64748B'} />
                <div style={{ fontSize: '0.9rem' }}>
                  {selectedOffer ? (
                    <>
                      Fulfilling existing pledge: <strong style={{ color: '#15803D' }}>{selectedOffer.quantity} {selectedOffer.offerType.toUpperCase()}</strong>
                      {' • '}
                      Remaining Balance: <strong style={{ color: '#EA580C' }}>{formatINRFromPaise(selectedOffer.remainingPaise)}</strong>
                    </>
                  ) : (
                    <>
                      Recording a <strong>New Direct Cash Contribution</strong> (Fresh Entry)
                    </>
                  )}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '18px',
                marginBottom: '20px',
              }}>
                {/* Receiving Committee / Account Selector */}
                <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1.5px solid #E2E8F0', marginBottom: '4px' }}>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                    🏛️ തുക സ്വീകരിച്ച അക്കൗണ്ട് / കമ്മിറ്റി (Received Into Account / Committee) *
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '10px',
                  }}>
                    {[
                      { id: 'unit', label: 'കുപ്പം യൂണിറ്റ് കമ്മിറ്റി', desc: 'Salafi Masjid Kuppam Direct Fund', color: '#15803D' },
                      { id: 'district', label: 'ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്', desc: 'District Committee Bank Account', color: '#0369A1' },
                      { id: 'external', label: 'മറ്റ് എക്സ്റ്റേണൽ കമ്മിറ്റികൾ', desc: 'Other External Units / Committees', color: '#7C3AED' },
                    ].map((item) => {
                      const isSelected = receivingEntity === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setReceivingEntity(item.id as any)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: isSelected ? `2px solid ${item.color}` : '1.5px solid #CBD5E1',
                            background: isSelected ? '#FFFFFF' : '#F8FAFC',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: isSelected ? `5px solid ${item.color}` : '2px solid #94A3B8',
                              background: '#FFFFFF',
                            }} />
                            <strong style={{ fontSize: '0.88rem', color: isSelected ? item.color : '#1E293B' }}>
                              {item.label}
                            </strong>
                          </div>
                          <span style={{ fontSize: '0.74rem', color: '#64748B', paddingLeft: '24px' }}>
                            {item.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {receivingEntity === 'external' && (
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#6D28D9', marginBottom: '4px' }}>
                        കമ്മിറ്റിയുടെ പേര് നൽകുക (External Committee Name) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Taliparamba Unit / Kannur District Committee"
                        value={receivingEntityName}
                        onChange={(e) => setReceivingEntityName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1.5px solid #8B5CF6',
                          fontSize: '0.9rem',
                          background: '#FFFFFF',
                          color: '#0F172A',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Event Assignment Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#15803D', marginBottom: '6px' }}>
                    📍 Assign to Event / Program (Live Screen Tag)
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #16A34A',
                      background: '#F0FDF4',
                      fontWeight: 700,
                      color: '#15803D',
                      fontSize: '0.92rem',
                    }}
                  >
                    <option value="general">General Campaign (പൊതു കാമ്പയിൻ)</option>
                    {eventsList.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                    Cash recorded here will immediately reflect on the selected venue&apos;s live projector screen.
                  </small>
                </div>

                {/* Offer Category Selector (if fresh) */}
                {!selectedOffer && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-900)', marginBottom: '6px' }}>
                      Category / Unit Type
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {(['musalla', 'sqft', 'cent', 'custom'] as OfferType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateUnitType(t)}
                          style={{
                            padding: '10px 4px',
                            borderRadius: '8px',
                            border: offerType === t ? '2px solid var(--brand-800)' : '1px solid var(--border-medium)',
                            background: offerType === t ? 'var(--brand-100)' : '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            textTransform: 'capitalize',
                            color: offerType === t ? 'var(--brand-900)' : 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amount Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-900)', marginBottom: '6px' }}>
                    Cash Amount Received (തുക ₹) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: 'var(--brand-800)',
                    }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      min={1}
                      step="any"
                      required
                      value={cashAmountRupees || ''}
                      onChange={(e) => setCashAmountRupees(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 34px',
                        fontSize: '1.4rem',
                        fontWeight: 900,
                        fontFamily: 'var(--font-display)',
                        borderRadius: '10px',
                        border: '2px solid var(--brand-700)',
                        color: 'var(--brand-900)',
                      }}
                    />
                  </div>

                  {/* Quick Chips */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {[1000, 5000, 10360, 25000, 51800].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashAmountRupees(amt)}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: cashAmountRupees === amt ? '1px solid var(--brand-800)' : '1px solid var(--border-medium)',
                          background: cashAmountRupees === amt ? 'var(--brand-100)' : '#FFFFFF',
                          color: cashAmountRupees === amt ? 'var(--brand-900)' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {formatINR(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes & Book Reference */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Book / Receipt Reference / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Receipt Book #4 / Counter Collection"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-medium)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              {/* Action Submit */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <ShieldCheck size={18} color="var(--brand-700)" />
                  <span>Authorized Collector: <strong>{adminUser?.name || 'Counter Desk'}</strong></span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-gold"
                  style={{
                    padding: '14px 28px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    boxShadow: '0 4px 14px rgba(197, 160, 89, 0.3)',
                  }}
                >
                  {isSubmitting ? 'Recording...' : `Record ₹${cashAmountRupees.toLocaleString('en-IN')} & Issue Provisional Receipt →`}
                </button>
              </div>
            </form>
          )}

        </div>
      ) : (
        /* PROVISIONAL RECEIPT SUCCESS STATE */
        <div style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '36px',
          border: '2px solid var(--brand-700)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
          maxWidth: '640px',
          margin: '0 auto',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <CheckCircle2 size={36} />
            </div>
            <span className="badge badge-brand" style={{ marginBottom: '8px' }}>
              PROVISIONAL CASH RECEIPT ISSUED
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--brand-900)', margin: '4px 0' }}>
              Cash Recorded Successfully
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Wisdom Islamic Organization Kuppam Unit • Salafi Masjid Land Acquisition
            </p>
          </div>

          <div style={{
            background: 'var(--bg-base)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '0.92rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Official E-Receipt #:</span>
              <strong style={{ color: '#B91C1C', fontFamily: 'monospace', fontSize: '1.05rem' }}>ER.No. {provisionalReceipt.receiptNumber}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Contributor:</span>
              <strong style={{ color: 'var(--brand-900)' }}>
                {provisionalReceipt.contributorName} {provisionalReceipt.contributorPhone ? `(+91 ${provisionalReceipt.contributorPhone})` : '• [No Phone]'}
                {provisionalReceipt.contributorPlace ? ` • 📍 ${provisionalReceipt.contributorPlace}` : ''}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Received Into:</span>
              <strong style={{
                color: provisionalReceipt.receivingEntity === 'district' ? '#0369A1' : provisionalReceipt.receivingEntity === 'external' ? '#7C3AED' : '#15803D'
              }}>
                {provisionalReceipt.receivingEntity === 'district'
                  ? '🏛️ ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്'
                  : provisionalReceipt.receivingEntity === 'external'
                  ? `🏛️ ${provisionalReceipt.receivingEntityName || 'മറ്റ് കമ്മിറ്റികൾ'}`
                  : '🏛️ കുപ്പം യൂണിറ്റ് കമ്മിറ്റി'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Offer Allocated:</span>
              <strong style={{ color: 'var(--brand-900)', textTransform: 'capitalize' }}>
                {provisionalReceipt.quantity} {provisionalReceipt.offerType}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Event Tag (Live Screen):</span>
              <strong style={{ color: '#15803D' }}>{provisionalReceipt.eventName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Acting Collector:</span>
              <strong style={{ color: 'var(--brand-900)' }}>{provisionalReceipt.collectorName}</strong>
            </div>

            {provisionalReceipt.notes && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Notes:</span>
                <span style={{ color: 'var(--brand-900)' }}>&quot;{provisionalReceipt.notes}&quot;</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '2px dashed var(--border-medium)',
              paddingTop: '12px',
              marginTop: '4px',
            }}>
              <span style={{ fontWeight: 800, color: 'var(--brand-900)' }}>Cash Amount Received:</span>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--brand-800)' }}>
                {formatINRFromPaise(provisionalReceipt.amountPaise)}
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={`/receipt/${provisionalReceipt.receiptNumber}?donor=${encodeURIComponent(provisionalReceipt.contributorName)}&phone=${provisionalReceipt.contributorPhone}&place=${encodeURIComponent(provisionalReceipt.contributorPlace || '')}&amount=${provisionalReceipt.amountPaise}&type=${provisionalReceipt.offerType}&qty=${provisionalReceipt.quantity}&purpose=${encodeURIComponent(`Salafi Masjid Land Acquisition — ${provisionalReceipt.eventName}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', gap: '8px', minWidth: '140px', background: '#0284C7', borderColor: '#0284C7' }}
            >
              <Printer size={16} />
              <span>Official E-Receipt</span>
            </a>

            {provisionalReceipt.contributorPhone ? (
              <a
                href={`https://wa.me/91${provisionalReceipt.contributorPhone}?text=${encodeURIComponent(
                  `Wisdom Islamic Organization Kuppam Unit - Salafi Masjid Land Acquisition\n\nReceived with thanks: ${formatINRFromPaise(
                    provisionalReceipt.amountPaise
                  )} as Cash Collection.\nER.No: ${provisionalReceipt.receiptNumber}\nEvent: ${provisionalReceipt.eventName}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ flex: 1, padding: '12px', gap: '8px', minWidth: '140px', color: '#15803D' }}
              >
                <Share2 size={16} />
                <span>WhatsApp</span>
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setProvisionalReceipt(null);
                setPhoneInput('');
                resetLookup();
              }}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', gap: '8px', minWidth: '140px' }}
            >
              <RotateCcw size={16} />
              <span>Record Next</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
