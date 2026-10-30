'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatINRFromPaise, formatINR, numberToWordsINR } from '@/lib/calculations/currency';
import { Printer, ArrowLeft, Share2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const receiptId = (params?.id as string) || '10664';
  const donorName = searchParams.get('donor') || 'Ajnas Shamsudheen';
  const donorPhone = searchParams.get('phone') || '';
  const amountPaise = parseInt(searchParams.get('amount') || '50000', 10);
  const paidPaise = parseInt(searchParams.get('paid') || '0', 10);
  const offerType = searchParams.get('type') || 'cash';
  const quantity = parseInt(searchParams.get('qty') || '1', 10);
  const statusParam = searchParams.get('status') || '';

  // Determine document type: Offer Slip vs Payment Receipt
  const isPledgedOffer = statusParam === 'pledged' || searchParams.get('mode') === 'offer_slip';
  const isPartial = statusParam === 'partial';

  const amountRupees = Math.floor(amountPaise / 100);
  const paidRupees = isPartial ? Math.floor(paidPaise / 100) : amountRupees;
  const remainingRupees = isPartial ? Math.max(0, amountRupees - paidRupees) : 0;

  const displayRupees = isPartial ? paidRupees : amountRupees;
  const amountWords = numberToWordsINR(displayRupees);
  // Remove trailing "Rupees Only" or "Only" to match the formal voucher line which ends in "only"
  const displayWords = amountWords
    .replace(/\s+Rupees\s+Only$/i, ' rupees')
    .replace(/\s+Only$/i, '');

  // Format date as DD-MM-YYYY
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const receiptDate = `${day}-${month}-${year}`;

  const purposeText = searchParams.get('purpose')
    || (offerType === 'cent' ? `Salafi Masjid Land Acquisition Fund (${quantity} Cent Sponsorship)`
      : offerType === 'musalla' ? `Salafi Masjid Land Acquisition Fund (${quantity} Musalla Prayer Space)`
      : offerType === 'sqft' ? `Salafi Masjid Land Acquisition Fund (${quantity} Sq Ft Sponsorship)`
      : 'Wisdom Islamic Organisation Kuppam Unit — Salafi Masjid Land Project');

  const handlePrint = () => {
    window.print();
  };

  const docTitle = isPledgedOffer
    ? 'OFFER REGISTRATION SLIP (വാഗ്ദാന സ്ലിപ്പ്)'
    : isPartial
    ? 'PARTIAL PAYMENT RECEIPT (ഭാഗിക രസീത്)'
    : 'OFFICIAL PAYMENT RECEIPT (ഔദ്യോഗിക രസീത്)';

  const whatsappMessage = isPledgedOffer
    ? `*WISDOM ISLAMIC ORGANISATION — KUPPAM UNIT*\n`
      + `*OFFER REGISTRATION SLIP (വാഗ്ദാന സ്ലിപ്പ്)*\n\n`
      + `Date: ${receiptDate}\n`
      + `Ref: ${receiptId}\n`
      + `Contributor: ${donorName}\n`
      + `Pledged Offer: ₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(amountRupees)}\n`
      + `In Words: ${amountWords}\n`
      + `Towards: ${purposeText}\n\n`
      + `ℹ️ Note: This is an offer registration confirmation. An official payment receipt will be issued upon cash/online payment verification.\n`
      + `Salafi Masjid Land Acquisition Project`
    : `*WISDOM ISLAMIC ORGANISATION — KUPPAM UNIT*\n`
      + `*${docTitle}*\n\n`
      + `Date: ${receiptDate}\n`
      + `Receipt No: ${receiptId}\n`
      + `Received From: ${donorName}\n`
      + `Amount Received: ₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(displayRupees)}\n`
      + `In Words: ${amountWords}\n`
      + (isPartial ? `Remaining Pledged Balance: ₹${new Intl.NumberFormat('en-IN').format(remainingRupees)}\n` : '')
      + `Towards: ${purposeText}\n\n`
      + `Salafi Masjid Land Acquisition Project`;

  return (
    <div style={{ padding: 'var(--space-8) 0 var(--space-16)', background: '#F1F5F9', minHeight: '85vh' }}>
      <div className="container" style={{ maxWidth: '940px' }}>

        {/* Navigation & Action Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '12px',
          flexWrap: 'wrap',
        }} className="no-print">
          <Link href="/" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/${donorPhone ? '91' + donorPhone : ''}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ padding: '9px 16px', fontSize: '0.88rem', color: '#15803D', borderColor: '#86EFAC' }}
            >
              <Share2 size={16} />
              <span>Share WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                padding: '9px 20px',
                fontSize: '0.88rem',
                gap: '8px',
                background: isPledgedOffer
                  ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)'
                  : 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                borderColor: isPledgedOffer ? '#D97706' : '#0284C7',
              }}
            >
              <Printer size={16} />
              <span>{isPledgedOffer ? 'Print Offer Slip (പ്രിന്റ് സ്ലിപ്പ്)' : 'Print Official Receipt (പ്രിന്റ് രസീത്)'}</span>
            </button>
          </div>
        </div>

        {/* Scroll wrapper for mobile screens to keep cheque voucher intact */}
        <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '12px' }}>
          {/* THE CHEQUE / VOUCHER RECEIPT CONTAINER */}
          <div
            id="official-receipt-voucher"
            style={{
              minWidth: '780px',
              maxWidth: '880px',
              margin: '0 auto',
              background: isPledgedOffer
                ? 'linear-gradient(135deg, #FEFCE8 0%, #FEF9C3 35%, #FEFCE8 70%, #FFFBEB 100%)'
                : 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 35%, #E0F2FE 70%, #F0F9FF 100%)',
              border: isPledgedOffer ? '2px solid #FACC15' : '2px solid #7DD3FC',
              borderRadius: '12px',
              padding: '30px 40px 28px',
              boxShadow: isPledgedOffer ? '0 12px 36px rgba(202, 138, 4, 0.15)' : '0 12px 36px rgba(2, 132, 199, 0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background Watermark using logo.png */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              opacity: 0.06,
              zIndex: 0,
            }}>
              <img
                src="/logo.png"
                alt="Watermark"
                style={{
                  width: '380px',
                  height: '380px',
                  objectFit: 'contain',
                  filter: 'grayscale(100%)',
                }}
              />
            </div>

            {/* Subtle top decorative border */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: isPledgedOffer
                ? 'linear-gradient(90deg, #CA8A04, #FACC15, #CA8A04)'
                : 'linear-gradient(90deg, #0284C7, #38BDF8, #0284C7)',
            }} />

            {/* ======================================================== */}
            {/* TOP HEADER SECTION                                       */}
            {/* ======================================================== */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '26px',
              paddingBottom: '16px',
              borderBottom: isPledgedOffer ? '1.5px solid rgba(202, 138, 4, 0.25)' : '1.5px solid rgba(2, 132, 199, 0.25)',
            }}>
              {/* Left Column: Larger Official Logo */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src="/wisdom islamic org.png"
                  alt="Wisdom Islamic Organisation"
                  style={{
                    height: '76px',
                    width: 'auto',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Right Column: Wisdom Islamic Organisation Kuppam Unit + Document Badge + Date */}
              <div style={{
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  marginBottom: '4px',
                  background: isPledgedOffer ? '#FEF3C7' : isPartial ? '#EFF6FF' : '#DCFCE7',
                  color: isPledgedOffer ? '#B45309' : isPartial ? '#1D4ED8' : '#15803D',
                  border: isPledgedOffer ? '1px solid #FDE68A' : isPartial ? '1px solid #BFDBFE' : '1px solid #86EFAC',
                }}>
                  {isPledgedOffer ? 'OFFER SLIP (വാഗ്ദാന സ്ലിപ്പ്)' : isPartial ? 'PARTIAL RECEIPT (ഭാഗിക രസീത്)' : 'OFFICIAL PAYMENT RECEIPT (ഔദ്യോഗിക രസീത്)'}
                </div>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.55rem)',
                  fontWeight: 900,
                  color: isPledgedOffer ? '#92400E' : '#0369A1',
                  margin: '0 0 2px 0',
                  lineHeight: 1.2,
                  letterSpacing: '0.4px',
                }}>
                  Wisdom Islamic Organisation
                </h1>
                <div style={{
                  fontSize: '1.05rem',
                  color: '#15803D',
                  fontWeight: 800,
                  marginBottom: '6px',
                }}>
                  Kuppam Unit — Salafi Masjid Land Project
                </div>
                <div style={{
                  fontSize: '0.94rem',
                  color: '#0F172A',
                  fontFamily: 'serif',
                }}>
                  <span style={{ fontStyle: 'italic', color: '#334155' }}>
                    {isPledgedOffer ? 'Offer Ref:' : 'Receipt No:'}
                  </span>{' '}
                  <strong style={{ fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                    {receiptId}
                  </strong>
                  <span style={{ margin: '0 8px', color: '#94A3B8' }}>•</span>
                  <span style={{ fontStyle: 'italic', color: '#334155' }}>Date:</span>{' '}
                  <strong style={{
                    fontWeight: 800,
                    fontFamily: 'serif',
                    letterSpacing: '0.5px',
                  }}>
                    {receiptDate}
                  </strong>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* MIDDLE BODY LINES (Formal Underlined Voucher Fields)      */}
            {/* ======================================================== */}
            <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>

              {/* Line 1: Received With Prayers From OR Offered By */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                marginBottom: '20px',
              }}>
                <span style={{
                  fontStyle: 'italic',
                  fontFamily: 'serif',
                  color: '#1E293B',
                  fontSize: '1.05rem',
                  whiteSpace: 'nowrap',
                }}>
                  {isPledgedOffer ? 'Offer Registered By / വാഗ്ദാനം നൽകിയത് :' : 'Received With Prayers From :'}
                </span>
                <div style={{
                  flex: 1,
                  borderBottom: '1.5px solid #334155',
                  paddingBottom: '2px',
                  paddingLeft: '14px',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  color: '#0F172A',
                  fontFamily: 'serif',
                  lineHeight: 1.2,
                }}>
                  {donorName}
                </div>
              </div>

              {/* Line 2: The Sum Of Rupees */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                marginBottom: '20px',
              }}>
                <span style={{
                  fontStyle: 'italic',
                  fontFamily: 'serif',
                  color: '#1E293B',
                  fontSize: '1.05rem',
                  whiteSpace: 'nowrap',
                }}>
                  {isPledgedOffer ? 'The Sum Of Rupees / വാഗ്ദാനം ചെയ്ത തുക :' : 'The Sum Of Rupees:'}
                </span>
                <div style={{
                  flex: 1,
                  borderBottom: '1.5px solid #334155',
                  paddingBottom: '2px',
                  paddingLeft: '14px',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  color: '#0F172A',
                  fontFamily: 'serif',
                  lineHeight: 1.2,
                }}>
                  {displayWords}
                </div>
                <span style={{
                  fontStyle: 'italic',
                  fontFamily: 'serif',
                  color: '#334155',
                  fontSize: '1.05rem',
                  whiteSpace: 'nowrap',
                }}>
                  only
                </span>
              </div>

              {/* Line 3: Towards */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
              }}>
                <span style={{
                  fontStyle: 'italic',
                  fontFamily: 'serif',
                  color: '#1E293B',
                  fontSize: '1.05rem',
                  whiteSpace: 'nowrap',
                }}>
                  Towards :
                </span>
                <div style={{
                  flex: 1,
                  borderBottom: '1.5px solid #334155',
                  paddingBottom: '2px',
                  paddingLeft: '14px',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: isPledgedOffer ? '#92400E' : '#0369A1',
                  fontFamily: 'serif',
                  fontStyle: 'italic',
                  lineHeight: 1.2,
                }}>
                  {purposeText}
                </div>
              </div>

              {/* Notice / Status Clarification Banner */}
              {isPledgedOffer && (
                <div style={{
                  background: 'rgba(254, 243, 199, 0.85)',
                  border: '1.5px solid #FCD34D',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginTop: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#92400E',
                  fontSize: '0.88rem',
                  lineHeight: 1.4,
                }}>
                  <AlertCircle size={22} color="#D97706" style={{ flexShrink: 0 }} />
                  <div>
                    <div><strong>ശ്രദ്ധിക്കുക:</strong> ഇത് സംഭാവന രേഖപ്പെടുത്തിയ <strong>വാഗ്ദാന സ്ലിപ്പ് (Offer Confirmation Slip)</strong> മാത്രമാണ്. പണം ലഭിച്ച ശേഷമേ ഔദ്യോഗിക പെയ്‌മെന്റ് രസീത് (Official Payment Receipt) ലഭ്യമാകൂ.</div>
                    <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '2px' }}>This is an offer registration confirmation. An official payment receipt will be issued upon payment realisation.</div>
                  </div>
                </div>
              )}

              {isPartial && (
                <div style={{
                  background: 'rgba(239, 246, 255, 0.9)',
                  border: '1.5px solid #93C5FD',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginTop: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#1E40AF',
                  fontSize: '0.88rem',
                  lineHeight: 1.4,
                }}>
                  <CheckCircle2 size={22} color="#2563EB" style={{ flexShrink: 0 }} />
                  <div>
                    <div><strong>ഭാഗിക അടവ് രസീത് (Partial Payment Receipt):</strong> ആകെ വാഗ്ദാനം ചെയ്ത ₹{amountRupees.toLocaleString('en-IN')}-ൽ ഇപ്പോൾ ₹{paidRupees.toLocaleString('en-IN')} ലഭിച്ചിരിക്കുന്നു. ബാക്കി നൽകാനുള്ള തുക: <strong>₹{remainingRupees.toLocaleString('en-IN')}</strong>.</div>
                  </div>
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* BOTTOM SECTION: Amount Box + Official Rubber Stamp Seal  */}
            {/* ======================================================== */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              paddingTop: '8px',
            }}>
              {/* 1. Left: Formal Amount Box */}
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'stretch',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: isPledgedOffer ? '2px solid #CA8A04' : '2px solid #0284C7',
                  background: '#FFFFFF',
                  boxShadow: isPledgedOffer ? '0 3px 8px rgba(202, 138, 4, 0.15)' : '0 3px 8px rgba(2, 132, 199, 0.15)',
                  height: '48px',
                }}>
                  {/* Left Rupee Symbol Badge */}
                  <div style={{
                    background: isPledgedOffer ? '#CA8A04' : '#0284C7',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 18px',
                    fontSize: '1.55rem',
                    fontWeight: 900,
                  }}>
                    ₹
                  </div>

                  {/* Numeric Amount Box */}
                  <div style={{
                    padding: '6px 26px',
                    fontSize: '1.55rem',
                    fontWeight: 900,
                    color: '#0F172A',
                    letterSpacing: '1px',
                    fontFamily: "'Courier New', monospace, var(--font-display)",
                    minWidth: '160px',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {new Intl.NumberFormat('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(displayRupees)}
                  </div>
                </div>

                <div style={{
                  fontSize: '0.76rem',
                  fontStyle: 'italic',
                  color: isPledgedOffer ? '#92400E' : '#475569',
                  marginTop: '6px',
                  fontWeight: 600,
                }}>
                  {isPledgedOffer ? '** Pledged Offer Commitment / വാഗ്ദാന തുക' : '** Subject to realisation'}
                </div>
              </div>

              {/* 2. Right: Official Circular Rubber Stamp Seal */}
              <div style={{
                transform: 'rotate(-7deg)',
                userSelect: 'none',
                filter: isPledgedOffer ? 'drop-shadow(0 2px 4px rgba(202, 138, 4, 0.15))' : 'drop-shadow(0 2px 4px rgba(29, 78, 216, 0.12))',
                marginRight: '12px',
              }}>
                <svg width="135" height="135" viewBox="0 0 160 160">
                  {/* Outer solid & dashed circles */}
                  <circle cx="80" cy="80" r="74" fill="none" stroke={isPledgedOffer ? '#B45309' : '#1D4ED8'} strokeWidth="2.8" />
                  <circle cx="80" cy="80" r="70" fill="none" stroke={isPledgedOffer ? '#B45309' : '#1D4ED8'} strokeWidth="1" strokeDasharray="3 2" />
                  <circle cx="80" cy="80" r="48" fill="none" stroke={isPledgedOffer ? '#B45309' : '#1D4ED8'} strokeWidth="1.5" />

                  {/* Circular Arc Paths */}
                  <defs>
                    <path id="stampTopPath" d="M 18,80 A 62,62 0 0,1 142,80" fill="none" />
                    <path id="stampBottomPath" d="M 142,80 A 62,62 0 0,1 18,80" fill="none" />
                  </defs>

                  {/* Top Arc Text */}
                  <text fill={isPledgedOffer ? '#B45309' : '#1D4ED8'} fontSize="8.6" fontWeight="900" letterSpacing="1.2">
                    <textPath href="#stampTopPath" startOffset="50%" textAnchor="middle">
                      WISDOM ISLAMIC ORGANIZATION
                    </textPath>
                  </text>

                  {/* Bottom Arc Text */}
                  <text fill={isPledgedOffer ? '#B45309' : '#1D4ED8'} fontSize="8" fontWeight="800" letterSpacing="1">
                    <textPath href="#stampBottomPath" startOffset="50%" textAnchor="middle">
                      {isPledgedOffer ? '★ KUPPAM UNIT ★' : '★ KOZHIKODE - 673002 ★'}
                    </textPath>
                  </text>

                  {/* Center registration / offer box */}
                  <rect x="34" y="66" width="92" height="28" rx="4" fill="none" stroke={isPledgedOffer ? '#B45309' : '#1D4ED8'} strokeWidth="1" />
                  <text x="80" y="77" fill={isPledgedOffer ? '#B45309' : '#1D4ED8'} fontSize="7.5" fontWeight="700" textAnchor="middle">
                    {isPledgedOffer ? 'STATUS' : 'Regd NO'}
                  </text>
                  <text x="80" y="89" fill={isPledgedOffer ? '#B45309' : '#1D4ED8'} fontSize={isPledgedOffer ? '8' : '9'} fontWeight="900" letterSpacing="0.5" textAnchor="middle">
                    {isPledgedOffer ? 'OFFER RECORDED' : 'KKD/CA/616/2017'}
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              background: #FFFFFF !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print, header, nav, footer {
              display: none !important;
            }
            #official-receipt-voucher {
              box-shadow: none !important;
              border: 1.5px solid #7DD3FC !important;
              page-break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 20px auto !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
