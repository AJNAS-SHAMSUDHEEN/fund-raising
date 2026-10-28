'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { OfferType, CommitmentType } from '@/lib/types';
import { INITIAL_CAMPAIGN } from '@/lib/state/mockStore';
import { formatINR, formatINRFromPaise, normalizePhoneNumber } from '@/lib/calculations/currency';
import { useUserSession } from '@/lib/state/userSession';
import {
  Coins,
  MapPin,
  Grid,
  Sparkles,
  Percent,
  Plus,
  Minus,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  Printer,
  Share2,
  Check,
  AlertCircle,
  HelpCircle,
  Handshake,
  Heart
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitOfferToFirebase } from '@/lib/firebase/db';

function OfferWorkflowContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session } = useUserSession();

  // Step state: 1 = Offer Details, 2 = Payment Commitment, 3 = Contributor & Review, 4 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Event param from URL (e.g. /offer?event=ulikkal)
  const eventIdParam = searchParams.get('event') || 'general';
  const eventNameParam = eventIdParam !== 'general'
    ? `${eventIdParam.charAt(0).toUpperCase() + eventIdParam.slice(1)} Event`
    : 'General Campaign';

  // 1. STEP 1: Offer Type & Amounts
  // 4 Allowed Offer Options: Amount, 5 Musalla, 1 Musalla, Cent
  type OfferSelection = 'cash' | 'musalla_5' | 'musalla_1' | 'cent';
  const typeParam = searchParams.get('type');
  const initialOption: OfferSelection =
    typeParam === 'cent' ? 'cent'
    : typeParam === 'musalla_1' ? 'musalla_1'
    : typeParam === 'musalla' ? 'musalla_5'
    : 'cash';

  const [selectedOption, setSelectedOption] = useState<OfferSelection>(initialOption);

  // Cash / Direct Amount: initially empty string, NOT pre-filled with an arbitrary donation amount
  const [directAmountInput, setDirectAmountInput] = useState<string>('');

  // Unit quantities for the options
  const [musalla5Qty, setMusalla5Qty] = useState<number>(5);
  const [musalla1Qty, setMusalla1Qty] = useState<number>(1);
  const [centQty, setCentQty] = useState<number>(1);

  // 2. STEP 2: Payment Commitment
  const [commitmentType, setCommitmentType] = useState<CommitmentType>('one_time');
  const [installmentDuration, setInstallmentDuration] = useState<'1' | '3' | 'other'>('1');
  const [customMonthsInput, setCustomMonthsInput] = useState<string>('6');

  // 3. STEP 3: Contributor Details
  const [fullName, setFullName] = useState<string>(session.name || '');
  const [phone, setPhone] = useState<string>(session.phone || '');

  // Validation errors & submission flags
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOffer, setSubmittedOffer] = useState<any | null>(null);

  // Auto-populate from user session if available
  useEffect(() => {
    if (session.name && !fullName) setFullName(session.name);
    if (session.phone && !phone) setPhone(session.phone);
  }, [session]);

  // Read URL query parameter for amount if passed from home quick chip
  useEffect(() => {
    const amtParam = searchParams.get('amount');
    if (amtParam && parseInt(amtParam, 10) >= 10) {
      setDirectAmountInput(amtParam);
    }
  }, [searchParams]);

  // ==========================================
  // Calculations
  // ==========================================
  const centRatePaise = INITIAL_CAMPAIGN.centRatePaise;   // 5,64,103 INR = 56410300 paise
  const musallaRatePaise = INITIAL_CAMPAIGN.musallaRatePaise; // 10,360 INR = 1036000 paise

  let calculatedTotalPaise = 0;
  let unitRatePaise = 0;
  let displayQuantity = 1;
  let unitLabel = '';
  let offerType: OfferType = 'cash';

  if (selectedOption === 'cash') {
    offerType = 'cash';
    const parsed = parseFloat(directAmountInput) || 0;
    calculatedTotalPaise = Math.round(parsed * 100);
    unitRatePaise = calculatedTotalPaise;
    displayQuantity = 1;
    unitLabel = directAmountInput ? `നേരിട്ടുള്ള തുക: ₹${directAmountInput}` : 'നേരിട്ടുള്ള തുക (Direct Amount)';
  } else if (selectedOption === 'musalla_5') {
    offerType = 'musalla';
    displayQuantity = musalla5Qty;
    unitRatePaise = musallaRatePaise;
    calculatedTotalPaise = Math.round(musalla5Qty * musallaRatePaise);
    unitLabel = `${musalla5Qty} മുസല്ല (${musalla5Qty * 8} ചതുരശ്ര അടി - കുടുംബ പാക്കേജ്)`;
  } else if (selectedOption === 'musalla_1') {
    offerType = 'musalla';
    displayQuantity = musalla1Qty;
    unitRatePaise = musallaRatePaise;
    calculatedTotalPaise = Math.round(musalla1Qty * musallaRatePaise);
    unitLabel = `${musalla1Qty} മുസല്ല (${musalla1Qty * 8} ചതുരശ്ര അടി)`;
  } else if (selectedOption === 'cent') {
    offerType = 'cent';
    displayQuantity = centQty;
    unitRatePaise = centRatePaise;
    calculatedTotalPaise = Math.round(centQty * centRatePaise);
    unitLabel = `${centQty} സെന്റ് (${(centQty * 435.6).toFixed(1)} ചതുരശ്ര അടി)`;
  }

  // Calculate commitment months
  const effectiveMonths = commitmentType === 'one_time'
    ? 1
    : installmentDuration === 'other'
    ? Math.max(1, parseInt(customMonthsInput, 10) || 1)
    : parseInt(installmentDuration, 10);

  // ==========================================
  // Step Validations
  // ==========================================
  const validateStep1 = () => {
    const errs: { [key: string]: string } = {};

    if (selectedOption === 'cash') {
      const parsed = parseFloat(directAmountInput);
      if (!directAmountInput.trim() || isNaN(parsed) || parsed < 10) {
        errs.amount = 'ദയവായി കുറഞ്ഞത് 10 രൂപയെങ്കിലും നൽകുക (Please enter an amount of at least ₹10)';
      }
    } else if (selectedOption === 'musalla_5') {
      if (!musalla5Qty || musalla5Qty < 1) {
        errs.quantity = 'കുറഞ്ഞത് 5 മുസല്ല തിരഞ്ഞെടുക്കുക';
      }
    } else if (selectedOption === 'musalla_1') {
      if (!musalla1Qty || musalla1Qty < 1) {
        errs.quantity = 'കുറഞ്ഞത് 1 മുസല്ല തിരഞ്ഞെടുക്കുക';
      }
    } else if (selectedOption === 'cent') {
      if (!centQty || centQty <= 0) {
        errs.quantity = 'കുറഞ്ഞത് 0.5 സെന്റ് തിരഞ്ഞെടുക്കുക';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: { [key: string]: string } = {};
    if (commitmentType === 'installments' && installmentDuration === 'other') {
      const parsed = parseInt(customMonthsInput, 10);
      if (!customMonthsInput.trim() || isNaN(parsed) || parsed < 1 || parsed > 60) {
        errs.months = 'ദയവായി 1 മുതൽ 60 വരെയുള്ള മാസങ്ങൾ നൽകുക (Enter valid months between 1 and 60)';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: { [key: string]: string } = {};
    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      errs.phone = 'സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക (Enter a valid 10-digit mobile number)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Navigation Handlers
  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit Offer
  const handleConfirmOffer = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    const resolvedName = fullName.trim() || 'Well Wisher';
    const cleanPhone = normalizePhoneNumber(phone);
    const generatedOfferNumber = `OFF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const offerRecord = {
      offerNumber: generatedOfferNumber,
      contributorName: resolvedName,
      contributorPhone: cleanPhone,
      offerType,
      quantity: displayQuantity,
      unitRatePaise,
      totalOfferedPaise: calculatedTotalPaise,
      commitmentType,
      commitmentMonths: effectiveMonths,
      eventId: eventIdParam,
      eventName: eventNameParam,
      paidPaise: 0,
      status: 'pledged' as const,
      createdAt: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    try {
      await submitOfferToFirebase({
        offerNumber: generatedOfferNumber,
        contributorName: resolvedName,
        contributorPhone: cleanPhone,
        offerType,
        quantity: displayQuantity,
        totalOfferedPaise: calculatedTotalPaise,
        unitRatePaise,
        commitmentType,
        commitmentMonths: effectiveMonths,
        eventId: eventIdParam,
        eventName: eventNameParam,
      });
    } catch (err) {
      console.warn('Firebase offer write fallback to local storage:', err);
    }

    // Persist to local storage for instant reactive client profile
    try {
      const existing = JSON.parse(localStorage.getItem('masjid_user_offers') || '[]');
      localStorage.setItem('masjid_user_offers', JSON.stringify([offerRecord, ...existing]));
    } catch (e) {}

    // Trigger celebration
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#16A34A', '#22C55E', '#C5A059', '#F59E0B'],
      });
    } catch (e) {}

    setIsSubmitting(false);
    setSubmittedOffer(offerRecord);
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ padding: 'var(--space-8) 0 var(--space-16)', background: 'var(--bg-base)', minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: '840px' }}>

        {/* Brand Banner */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-brand">
              <Handshake size={14} /> Wisdom Islamic Organization Kuppam Unit
            </span>
            {eventIdParam !== 'general' && (
              <span className="badge badge-gold">
                📍 {eventNameParam}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 900, color: 'var(--brand-900)', margin: '4px 0' }}>
            Land Offer Commitment Form
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
            സലഫി മസ്ജിദ് 19.5 സെന്റ് സ്ഥലം ഏറ്റെടുക്കൽ പദ്ധതി (ലക്ഷ്യം: ₹1.10 കോടി)
          </p>
        </div>

        {/* 3-STEP PROGRESS INDICATOR */}
        {currentStep !== 4 && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px 20px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '24px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
            }}>
              {/* Step 1 Indicator */}
              <div
                onClick={() => { if (currentStep > 1) setCurrentStep(1); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: currentStep > 1 ? 'pointer' : 'default',
                  opacity: currentStep === 1 ? 1 : 0.8,
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: currentStep >= 1 ? 'var(--brand-800)' : '#E2E8F0',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}>
                  {currentStep > 1 ? <Check size={16} /> : '1'}
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: currentStep === 1 ? 'var(--brand-900)' : '#64748B', display: 'block' }}>
                    1. Offer Details
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>ഓഫർ വിവരങ്ങൾ</span>
                </div>
              </div>

              {/* Connecting Line 1-2 */}
              <div style={{
                flex: 1,
                height: '3px',
                background: currentStep >= 2 ? 'var(--brand-700)' : '#E2E8F0',
                margin: '0 12px',
                borderRadius: '9999px',
                transition: 'background 0.3s ease',
              }} />

              {/* Step 2 Indicator */}
              <div
                onClick={() => { if (currentStep > 2) setCurrentStep(2); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: currentStep > 2 ? 'pointer' : 'default',
                  opacity: currentStep === 2 ? 1 : currentStep > 2 ? 0.8 : 0.6,
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: currentStep >= 2 ? 'var(--brand-800)' : '#E2E8F0',
                  color: currentStep >= 2 ? '#FFFFFF' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}>
                  {currentStep > 2 ? <Check size={16} /> : '2'}
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: currentStep === 2 ? 'var(--brand-900)' : '#64748B', display: 'block' }}>
                    2. Payment Plan
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>പെയ്മെന്റ് പ്ലാൻ</span>
                </div>
              </div>

              {/* Connecting Line 2-3 */}
              <div style={{
                flex: 1,
                height: '3px',
                background: currentStep >= 3 ? 'var(--brand-700)' : '#E2E8F0',
                margin: '0 12px',
                borderRadius: '9999px',
                transition: 'background 0.3s ease',
              }} />

              {/* Step 3 Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: currentStep === 3 ? 1 : 0.6,
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: currentStep === 3 ? 'var(--brand-800)' : '#E2E8F0',
                  color: currentStep === 3 ? '#FFFFFF' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}>
                  3
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: currentStep === 3 ? 'var(--brand-900)' : '#64748B', display: 'block' }}>
                    3. Review &amp; Confirm
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>സ്ഥിരീകരിക്കുക</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: SELECT OFFER TYPE & AMOUNT                       */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: 'clamp(20px, 3.5vw, 36px)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-900)', margin: '0 0 6px 0' }}>
                Select Offer Type (ഓഫർ ഇനം തിരഞ്ഞെടുക്കുക)
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
                Choose your preferred unit or enter a custom amount (Minimum ₹10).
              </p>
            </div>

            {/* Offer Type Tabs Grid: 4 Allowed Options */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {/* 1. തുക (Amount) */}
              <button
                type="button"
                onClick={() => setSelectedOption('cash')}
                style={{
                  padding: '16px 12px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  border: selectedOption === 'cash' ? '2.5px solid var(--brand-800)' : '1px solid var(--border-medium)',
                  background: selectedOption === 'cash' ? 'var(--brand-50)' : '#FFFFFF',
                  color: selectedOption === 'cash' ? 'var(--brand-900)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedOption === 'cash' ? '0 4px 12px rgba(6, 78, 59, 0.1)' : 'var(--shadow-sm)',
                }}
              >
                <Coins size={24} color={selectedOption === 'cash' ? 'var(--brand-800)' : 'currentColor'} />
                <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>തുക (Amount)</span>
                <small style={{ fontSize: '0.74rem', color: selectedOption === 'cash' ? 'var(--brand-800)' : '#64748B' }}>ഇഷ്ടമുള്ള തുക</small>
              </button>

              {/* 2. 5 മുസല്ല */}
              <button
                type="button"
                onClick={() => setSelectedOption('musalla_5')}
                style={{
                  padding: '16px 12px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  border: selectedOption === 'musalla_5' ? '2.5px solid var(--gold-600)' : '1px solid var(--border-medium)',
                  background: selectedOption === 'musalla_5' ? 'var(--gold-50)' : '#FFFFFF',
                  color: selectedOption === 'musalla_5' ? 'var(--brand-900)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedOption === 'musalla_5' ? '0 4px 12px rgba(197, 160, 89, 0.15)' : 'var(--shadow-sm)',
                }}
              >
                <Sparkles size={24} color={selectedOption === 'musalla_5' ? 'var(--gold-600)' : 'currentColor'} />
                <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>5 മുസല്ല</span>
                <small style={{ fontSize: '0.74rem', color: selectedOption === 'musalla_5' ? 'var(--gold-700)' : '#64748B' }}>₹51,800</small>
              </button>

              {/* 3. 1 മുസല്ല */}
              <button
                type="button"
                onClick={() => setSelectedOption('musalla_1')}
                style={{
                  padding: '16px 12px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  border: selectedOption === 'musalla_1' ? '2.5px solid var(--gold-600)' : '1px solid var(--border-medium)',
                  background: selectedOption === 'musalla_1' ? 'var(--gold-50)' : '#FFFFFF',
                  color: selectedOption === 'musalla_1' ? 'var(--brand-900)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedOption === 'musalla_1' ? '0 4px 12px rgba(197, 160, 89, 0.15)' : 'var(--shadow-sm)',
                }}
              >
                <Sparkles size={24} color={selectedOption === 'musalla_1' ? 'var(--gold-600)' : 'currentColor'} />
                <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>1 മുസല്ല</span>
                <small style={{ fontSize: '0.74rem', color: selectedOption === 'musalla_1' ? 'var(--gold-700)' : '#64748B' }}>₹10,360</small>
              </button>

              {/* 4. സെന്റ് (Cent) */}
              <button
                type="button"
                onClick={() => setSelectedOption('cent')}
                style={{
                  padding: '16px 12px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  border: selectedOption === 'cent' ? '2.5px solid var(--brand-800)' : '1px solid var(--border-medium)',
                  background: selectedOption === 'cent' ? 'var(--brand-50)' : '#FFFFFF',
                  color: selectedOption === 'cent' ? 'var(--brand-900)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedOption === 'cent' ? '0 4px 12px rgba(6, 78, 59, 0.1)' : 'var(--shadow-sm)',
                }}
              >
                <MapPin size={24} color={selectedOption === 'cent' ? 'var(--brand-800)' : 'currentColor'} />
                <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>സെന്റ് (Cent)</span>
                <small style={{ fontSize: '0.74rem', color: selectedOption === 'cent' ? 'var(--brand-800)' : '#64748B' }}>₹5.64 ലക്ഷം / സെന്റ്</small>
              </button>
            </div>

            {/* CONTROLS PER SELECTED TYPE */}
            <div style={{
              background: selectedOption === 'cash' ? '#F0FDF4' : '#F8FAFC',
              borderRadius: '20px',
              padding: '24px',
              border: selectedOption === 'cash' ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
              boxShadow: selectedOption === 'cash' ? '0 4px 20px rgba(22, 163, 74, 0.08)' : 'none',
              marginBottom: '24px',
              transition: 'all 0.2s ease',
            }}>
              {/* 1. Cash / Direct Amount Panel */}
              {selectedOption === 'cash' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                    <label style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--brand-900)' }}>
                      ഇഷ്ടമുള്ള തുക നൽകുക (Direct Amount) *
                    </label>
                    <span style={{ fontSize: '0.82rem', color: '#15803D', fontWeight: 700 }}>
                      കുറഞ്ഞത് ₹10 മുതൽ ഏത് തുകയും നൽകാം
                    </span>
                  </div>

                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '1.6rem',
                      fontWeight: 900,
                      color: 'var(--brand-800)',
                    }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      min={10}
                      placeholder="തുക നൽകുക (ഉദാ: 500, 1053, 5000)"
                      value={directAmountInput}
                      onChange={(e) => {
                        setDirectAmountInput(e.target.value);
                        if (errors.amount) setErrors({});
                      }}
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 42px',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        fontFamily: 'var(--font-display)',
                        borderRadius: '12px',
                        border: errors.amount ? '2px solid var(--status-danger)' : '2px solid var(--brand-700)',
                        background: '#FFFFFF',
                        color: 'var(--brand-900)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      }}
                    />
                  </div>
                  {errors.amount && (
                    <div style={{ color: 'var(--status-danger)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={15} /> {errors.amount}
                    </div>
                  )}

                  {/* Quick Suggestion Chips (25000 descending down to 500) */}
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700, marginBottom: '8px' }}>
                      നേരിട്ട് തിരഞ്ഞെടുക്കാം (Quick select):
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {[25000, 10000, 5000, 2000, 1000, 500].map((amt) => {
                        const isSelected = directAmountInput === amt.toString();
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setDirectAmountInput(amt.toString());
                              if (errors.amount) setErrors({});
                            }}
                            style={{
                              padding: '9px 16px',
                              borderRadius: '10px',
                              fontSize: '0.92rem',
                              fontWeight: 800,
                              border: isSelected ? '2px solid var(--brand-800)' : '1px solid #BBF7D0',
                              background: isSelected ? 'var(--brand-800)' : '#FFFFFF',
                              color: isSelected ? '#FFFFFF' : '#14532D',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 2px 8px rgba(6, 78, 59, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {formatINR(amt)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. 5 Musalla Panel */}
              {selectedOption === 'musalla_5' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '4px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--brand-900)' }}>
                      5 മുസല്ല കുടുംബ പാക്കേജ് (5 Musalla Package)
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      നിരക്ക്: <strong>₹51,800</strong> (40 ചതുരശ്ര അടി)
                    </span>
                  </div>

                  {/* Quantity Stepper by 5 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <button
                      type="button"
                      aria-label="കുറക്കുക"
                      onClick={() => setMusalla5Qty(Math.max(5, musalla5Qty - 5))}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-900)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <Minus size={22} />
                    </button>
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#FFFFFF',
                      padding: '10px',
                      borderRadius: '12px',
                      border: '2px solid var(--gold-500)',
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '2rem',
                        fontWeight: 900,
                        color: 'var(--brand-900)',
                        lineHeight: 1.1,
                      }}>
                        {musalla5Qty} <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>മുസല്ല</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                        {musalla5Qty * 8} ചതുരശ്ര അടി ({formatINR(musalla5Qty * 10360)})
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="കൂട്ടുക"
                      onClick={() => setMusalla5Qty(musalla5Qty + 5)}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-900)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <Plus size={22} />
                    </button>
                  </div>

                  {/* Quick Select Chips */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { qty: 5, label: '5 മുസല്ല (1 കുടുംബം)', amt: '₹51,800' },
                      { qty: 10, label: '10 മുസല്ല', amt: '₹1,03,600' },
                      { qty: 15, label: '15 മുസല്ല', amt: '₹1,55,400' },
                      { qty: 20, label: '20 മുസല്ല', amt: '₹2,07,200' },
                    ].map((m) => (
                      <button
                        key={m.qty}
                        type="button"
                        onClick={() => setMusalla5Qty(m.qty)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          border: musalla5Qty === m.qty ? '1.5px solid var(--gold-600)' : '1px solid #CBD5E1',
                          background: musalla5Qty === m.qty ? 'var(--gold-100)' : '#FFFFFF',
                          color: musalla5Qty === m.qty ? 'var(--brand-900)' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {m.label} ({m.amt})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. 1 Musalla Panel */}
              {selectedOption === 'musalla_1' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '4px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--brand-900)' }}>
                      1 മുസല്ല പ്രാർത്ഥനാ സ്ഥലം (1 Musalla Space)
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      നിരക്ക്: <strong>₹10,360</strong> / മുസല്ല (8 Sq. Ft.)
                    </span>
                  </div>

                  {/* Quantity Stepper by 1 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <button
                      type="button"
                      aria-label="കുറക്കുക"
                      onClick={() => setMusalla1Qty(Math.max(1, musalla1Qty - 1))}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-900)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <Minus size={22} />
                    </button>
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#FFFFFF',
                      padding: '10px',
                      borderRadius: '12px',
                      border: '2px solid var(--gold-500)',
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '2rem',
                        fontWeight: 900,
                        color: 'var(--brand-900)',
                        lineHeight: 1.1,
                      }}>
                        {musalla1Qty} <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>മുസല്ല</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                        {musalla1Qty * 8} ചതുരശ്ര അടി ({formatINR(musalla1Qty * 10360)})
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="കൂട്ടുക"
                      onClick={() => setMusalla1Qty(musalla1Qty + 1)}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-900)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <Plus size={22} />
                    </button>
                  </div>

                  {/* Quick Select Chips */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { qty: 1, label: '1 മുസല്ല', amt: '₹10,360' },
                      { qty: 2, label: '2 മുസല്ല', amt: '₹20,720' },
                      { qty: 3, label: '3 മുസല്ല', amt: '₹31,080' },
                      { qty: 4, label: '4 മുസല്ല', amt: '₹41,440' },
                    ].map((m) => (
                      <button
                        key={m.qty}
                        type="button"
                        onClick={() => setMusalla1Qty(m.qty)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          border: musalla1Qty === m.qty ? '1.5px solid var(--gold-600)' : '1px solid #CBD5E1',
                          background: musalla1Qty === m.qty ? 'var(--gold-100)' : '#FFFFFF',
                          color: musalla1Qty === m.qty ? 'var(--brand-900)' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {m.label} ({m.amt})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Cent Panel */}
              {selectedOption === 'cent' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--brand-900)' }}>
                      സെന്റ് സ്പോൺസർഷിപ്പ് (Cent Units)
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      നിരക്ക്: <strong>{formatINRFromPaise(centRatePaise)}</strong> / സെന്റ്
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600, marginBottom: '10px' }}>
                    1 സെന്റ് = 435.6 ചതുരശ്ര അടി (ആകെ പദ്ധതി: 19.5 സെന്റ്)
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <button
                      type="button"
                      aria-label="കുറക്കുക"
                      onClick={() => setCentQty(Math.max(0.5, parseFloat((centQty - 0.5).toFixed(1))))}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-900)',
                      }}
                    >
                      <Minus size={22} />
                    </button>
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#FFFFFF',
                      padding: '10px',
                      borderRadius: '12px',
                      border: '2px solid var(--gold-500)',
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.9rem',
                        fontWeight: 900,
                        color: 'var(--brand-900)',
                      }}>
                        {centQty} <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>സെന്റ്</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                        {(centQty * 435.6).toFixed(1)} ചതുരശ്ര അടി (Sq. Ft.)
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="കൂട്ടുക"
                      onClick={() => setCentQty(parseFloat((centQty + 0.5).toFixed(1)))}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-900)',
                      }}
                    >
                      <Plus size={22} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[0.5, 1, 2, 5].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCentQty(c)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          border: centQty === c ? '1.5px solid var(--brand-800)' : '1px solid #CBD5E1',
                          background: centQty === c ? 'var(--brand-100)' : '#FFFFFF',
                          color: centQty === c ? 'var(--brand-900)' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {c} സെന്റ് ({formatINR(Math.round(c * 564103))})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* TOTAL COMMITMENT CALCULATION BAR */}
            <div style={{
              background: 'linear-gradient(135deg, var(--brand-900) 0%, #061B11 100%)',
              color: '#FFFFFF',
              borderRadius: '18px',
              padding: '20px 24px',
              border: '1.5px solid var(--gold-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              marginBottom: '24px',
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--gold-400)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em', display: 'block' }}>
                  Total Calculated Offer Amount (ആകെ തുക):
                </span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 4vw, 2.7rem)',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  lineHeight: 1.1,
                  marginTop: '2px',
                }}>
                  {formatINRFromPaise(calculatedTotalPaise)}
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-on-dark-muted)', marginTop: '4px' }}>
                  {unitLabel}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextFromStep1}
                disabled={calculatedTotalPaise < 1000}
                className="btn btn-gold"
                style={{
                  padding: '14px 26px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(197, 160, 89, 0.3)',
                  cursor: calculatedTotalPaise < 1000 ? 'not-allowed' : 'pointer',
                  opacity: calculatedTotalPaise < 1000 ? 0.6 : 1,
                }}
              >
                <span>Next: Payment Commitment</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: PAYMENT COMMITMENT PLAN                          */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: 'clamp(20px, 3.5vw, 36px)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ marginBottom: '22px' }}>
              <span className="badge badge-brand" style={{ marginBottom: '8px' }}>
                Step 2 of 3 • പെയ്മെന്റ് പ്ലാൻ
              </span>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--brand-900)', margin: '0 0 6px 0' }}>
                When do you plan to fulfil your offer?
              </h2>
              <p style={{ fontSize: '0.92rem', color: '#475569', margin: 0, fontWeight: 600 }}>
                നിങ്ങൾ എപ്പോഴാണ് ഈ ഓഫർ തുക പൂർണ്ണമായും നൽകാൻ ഉദ്ദേശിക്കുന്നത്?
              </p>
            </div>

            {/* Offer Summary Ribbon */}
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: '14px',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 700, textTransform: 'uppercase' }}>
                  Offered Commitment:
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#14532D' }}>
                  {unitLabel}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, color: '#15803D' }}>
                {formatINRFromPaise(calculatedTotalPaise)}
              </div>
            </div>

            {/* OPTION CARDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              
              {/* Option A: One-Time Payment */}
              <div
                onClick={() => setCommitmentType('one_time')}
                style={{
                  border: commitmentType === 'one_time' ? '2.5px solid #16A34A' : '1.5px solid #CBD5E1',
                  background: commitmentType === 'one_time' ? '#F0FDF4' : '#FFFFFF',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                  boxShadow: commitmentType === 'one_time' ? '0 4px 14px rgba(22, 163, 74, 0.12)' : 'none',
                }}
              >
                <input
                  type="radio"
                  name="commitment"
                  checked={commitmentType === 'one_time'}
                  onChange={() => setCommitmentType('one_time')}
                  style={{ width: '20px', height: '20px', accentColor: '#16A34A', marginTop: '2px', cursor: 'pointer' }}
                />
                <div>
                  <strong style={{ fontSize: '1.1rem', color: '#0F172A', display: 'block' }}>
                    Option A: ഒറ്റത്തവണയായി നൽകും (One-Time Payment)
                  </strong>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                    The user intends to fulfil the entire offered amount in one single payment.
                  </p>
                </div>
              </div>

              {/* Option B: In Monthly Instalments */}
              <div
                onClick={() => setCommitmentType('installments')}
                style={{
                  border: commitmentType === 'installments' ? '2.5px solid #16A34A' : '1.5px solid #CBD5E1',
                  background: commitmentType === 'installments' ? '#F0FDF4' : '#FFFFFF',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: commitmentType === 'installments' ? '0 4px 14px rgba(22, 163, 74, 0.12)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <input
                    type="radio"
                    name="commitment"
                    checked={commitmentType === 'installments'}
                    onChange={() => setCommitmentType('installments')}
                    style={{ width: '20px', height: '20px', accentColor: '#16A34A', marginTop: '2px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '1.1rem', color: '#0F172A', display: 'block' }}>
                      Option B: തവണകളായി നൽകും (In Monthly Instalments)
                    </strong>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                      Fulfil the committed amount conveniently over a selected period of months.
                    </p>

                    {/* DURATION SELECTOR (shown when Option B is active) */}
                    {commitmentType === 'installments' && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          marginTop: '16px',
                          paddingTop: '16px',
                          borderTop: '1px solid #BBF7D0',
                        }}
                      >
                        <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 800, color: '#15803D', marginBottom: '8px' }}>
                          എത്ര മാസത്തിനുള്ളിൽ മുഴുവൻ തുകയും നൽകും? (Within how many months?)
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                          {[
                            { id: '1', label: '1 Month', ml: '1 മാസം' },
                            { id: '3', label: '3 Months', ml: '3 മാസം' },
                            { id: 'other', label: 'Other', ml: 'മറ്റുള്ളവ' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setInstallmentDuration(item.id as '1' | '3' | 'other')}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '12px',
                                border: installmentDuration === item.id ? '2.5px solid #16A34A' : '1px solid #CBD5E1',
                                background: installmentDuration === item.id ? '#DCFCE7' : '#FFFFFF',
                                color: installmentDuration === item.id ? '#15803D' : '#334155',
                                fontWeight: 800,
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div>{item.label}</div>
                              <small style={{ fontSize: '0.74rem', opacity: 0.85 }}>{item.ml}</small>
                            </button>
                          ))}
                        </div>

                        {installmentDuration === 'other' && (
                          <div style={{ marginTop: '10px' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
                              Specify number of months (മാസങ്ങൾ നൽകുക):
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={customMonthsInput}
                              onChange={(e) => setCustomMonthsInput(e.target.value)}
                              placeholder="e.g. 6, 12, 18, 24"
                              style={{
                                width: '100%',
                                maxWidth: '200px',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: errors.months ? '1.5px solid var(--status-danger)' : '1px solid #CBD5E1',
                                fontWeight: 700,
                                fontSize: '1rem',
                              }}
                            />
                            {errors.months && (
                              <div style={{ color: 'var(--status-danger)', fontSize: '0.78rem', marginTop: '4px' }}>
                                {errors.months}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Note on Payment Commitment */}
            <div style={{
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '24px',
              fontSize: '0.84rem',
              color: '#92400E',
            }}>
              <AlertCircle size={18} flex-shrink={0} />
              <span>
                <strong>ശ്രദ്ധിക്കുക:</strong> ഇതൊരു വാഗ്ദാനമാണ് (Pledge Commitment). ഇപ്പോൾ ബാങ്കിൽ നിന്ന് തുക കുറവ് ചെയ്യില്ല. പിന്നീട് സൗകര്യപ്രദമായി നൽകാം.
              </span>
            </div>

            {/* Back & Next Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn btn-outline"
                style={{ padding: '12px 20px', fontWeight: 700, gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back (പിന്നോട്ട്)</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep2}
                className="btn btn-gold"
                style={{ padding: '12px 26px', fontWeight: 800, gap: '8px' }}
              >
                <span>Next: Contributor Details</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: CONTRIBUTOR DETAILS & CONFIRMATION               */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: 'clamp(20px, 3.5vw, 36px)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ marginBottom: '22px' }}>
              <span className="badge badge-brand" style={{ marginBottom: '8px' }}>
                Step 3 of 3 • വിവരങ്ങളും സ്ഥിരീകരണവും
              </span>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--brand-900)', margin: '0 0 6px 0' }}>
                Contributor Details &amp; Confirmation
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                Please provide your contact details for official receipting and review the offer summary.
              </p>
            </div>

            {/* INPUT FIELDS */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #E2E8F0',
              marginBottom: '24px',
            }}>
              {/* Full Name */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-900)' }}>
                    Full Name (പേര്)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '4px' }}>
                    Optional / സുമനസ്സ്
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Enter name (or leave blank for Well Wisher / സുമനസ്സ്)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Mobile Number - Mandatory Primary ID */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-900)', marginBottom: '6px' }}>
                  Mobile Number (മൊബൈൽ നമ്പർ - നിർബന്ധം) *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    fontWeight: 800,
                    color: 'var(--brand-800)',
                  }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors({});
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: errors.phone ? '2px solid var(--status-danger)' : '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '1rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
                {errors.phone && (
                  <div style={{ color: 'var(--status-danger)', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px' }}>
                    {errors.phone}
                  </div>
                )}
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Used for digital receipt delivery and contributor verification.
                </small>
              </div>
            </div>

            {/* REVIEW SUMMARY CARD */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '2px solid var(--gold-400)',
              padding: '22px',
              marginBottom: '24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '14px' }}>
                📋 Review Offer Summary (ഓഫർ ചുരുക്കം)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.92rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Contributor:</span>
                  <strong style={{ color: 'var(--brand-900)' }}>
                    {fullName.trim() || 'Well Wisher (സുമനസ്സ്)'} (+91 {phone || '---'})
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Offer Category:</span>
                  <strong style={{ color: 'var(--brand-900)', textTransform: 'capitalize' }}>
                    {unitLabel}
                  </strong>
                </div>

                {unitRatePaise > 0 && offerType !== 'cash' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Configured Rate:</span>
                    <span style={{ color: 'var(--brand-800)', fontWeight: 600 }}>
                      {formatINRFromPaise(unitRatePaise)} / unit
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment Plan:</span>
                  <strong style={{ color: '#15803D' }}>
                    {commitmentType === 'one_time' ? 'One-Time Payment (ഒറ്റത്തവണയായി)' : `Within ${effectiveMonths} Months (${effectiveMonths} മാസത്തിനുള്ളിൽ)`}
                  </strong>
                </div>

                {eventIdParam !== 'general' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Event Tag:</span>
                    <strong style={{ color: '#15803D' }}>{eventNameParam}</strong>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '2px dashed var(--border-medium)',
                  paddingTop: '12px',
                  marginTop: '6px',
                }}>
                  <span style={{ fontWeight: 800, color: 'var(--brand-900)' }}>Total Committed Amount:</span>
                  <strong style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.5rem',
                    color: 'var(--brand-800)',
                  }}>
                    {formatINRFromPaise(calculatedTotalPaise)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Back & Confirm Submit Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn btn-outline"
                style={{ padding: '12px 20px', fontWeight: 700, gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back (തിരുത്തുക)</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmOffer}
                className="btn btn-gold"
                style={{
                  padding: '14px 32px',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(197, 160, 89, 0.35)',
                }}
              >
                {isSubmitting ? (
                  <span>Submitting Offer...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirm &amp; Submit Offer (സമർപ്പിക്കുക)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: SUCCESS CONFIRMATION SCREEN                      */}
        {/* ======================================================== */}
        {currentStep === 4 && submittedOffer && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: 'clamp(28px, 4.5vw, 48px) 24px',
            border: '2px solid #86EFAC',
            boxShadow: '0 12px 36px rgba(22, 163, 74, 0.1)',
            textAlign: 'center',
            maxWidth: '680px',
            margin: '0 auto',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle2 size={36} />
            </div>

            <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', marginBottom: '8px' }}>
              STATUS: PROMISED / PENDING FULFILMENT
            </span>

            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: 900, color: 'var(--brand-900)', margin: '4px 0' }}>
              ഓഫർ വിജയകരമായി സമർപ്പിച്ചു!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '24px' }}>
              Thank you for partnering in the Salafi Masjid Land Acquisition project.
            </p>

            {/* Offer ID Card */}
            <div style={{
              background: '#F0FDF4',
              borderRadius: '16px',
              border: '1px solid #86EFAC',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.92rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Offer Reference ID:</span>
                <strong style={{ color: '#15803D', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                  {submittedOffer.offerNumber}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Contributor:</span>
                <strong style={{ color: '#0F172A' }}>
                  {submittedOffer.contributorName} (+91 {submittedOffer.contributorPhone})
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Allocated Offer:</span>
                <strong style={{ color: '#0F172A', textTransform: 'capitalize' }}>
                  {submittedOffer.quantity} {submittedOffer.offerType}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Payment Plan:</span>
                <strong style={{ color: '#15803D' }}>
                  {submittedOffer.commitmentType === 'one_time' ? 'One-Time Payment' : `Within ${submittedOffer.commitmentMonths} Months`}
                </strong>
              </div>

              {submittedOffer.eventName && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Event / Venue:</span>
                  <strong style={{ color: '#15803D' }}>{submittedOffer.eventName}</strong>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px dashed #86EFAC',
                paddingTop: '12px',
                marginTop: '4px',
              }}>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>Committed Offer Amount:</span>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#15803D' }}>
                  {formatINRFromPaise(submittedOffer.totalOfferedPaise)}
                </strong>
              </div>
            </div>

            {/* Note on Cash Receipt */}
            <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
              ℹ️ ഈ തുക നിങ്ങളുടെ സൗകര്യത്തിനനുസരിച്ച് നേരിട്ടോ ബാങ്ക് വഴിയോ നൽകാം. തുക ലഭിക്കുമ്പോൾ ഒഫീഷ്യൽ രസീത് ലഭ്യമാകും. സഹായങ്ങൾക്ക്: <strong>+91 99477 48552</strong>
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-outline"
                style={{ padding: '12px 20px', gap: '8px' }}
              >
                <Printer size={16} />
                <span>Print Slip (പ്രിന്റ്)</span>
              </button>

              <a
                href={`https://wa.me/919947748552?text=${encodeURIComponent(
                  `Salafi Masjid Land Acquisition - Wisdom Islamic Organization Kuppam Unit\n\nI have submitted a Land Offer pledge.\nOffer ID: ${submittedOffer.offerNumber}\nName: ${submittedOffer.contributorName}\nAmount: ${formatINRFromPaise(submittedOffer.totalOfferedPaise)}\nPlan: ${submittedOffer.commitmentType === 'one_time' ? 'One-Time' : `${submittedOffer.commitmentMonths} Months`}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ padding: '12px 20px', gap: '8px', color: '#15803D' }}
              >
                <Share2 size={16} />
                <span>Share via WhatsApp</span>
              </a>

              <Link
                href="/"
                className="btn btn-primary"
                style={{ padding: '12px 22px' }}
              >
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function OfferPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center', color: 'var(--brand-900)' }}>Loading Offer Portal...</div>}>
      <OfferWorkflowContent />
    </Suspense>
  );
}
