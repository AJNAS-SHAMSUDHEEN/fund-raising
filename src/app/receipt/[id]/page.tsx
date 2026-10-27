'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatINRFromPaise, numberToWordsINR } from '@/lib/calculations/currency';
import { Printer, ArrowLeft, Share2 } from 'lucide-react';

export default function ReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const receiptId = (params?.id as string) || '10664';
  const donorName = searchParams.get('donor') || 'Ajnas Shamsudheen';
  const donorPhone = searchParams.get('phone') || '';
  const amountPaise = parseInt(searchParams.get('amount') || '50000', 10);
  const offerType = searchParams.get('type') || 'cash';
  const quantity = parseInt(searchParams.get('qty') || '1', 10);

  const amountRupees = Math.floor(amountPaise / 100);
  const amountWords = numberToWordsINR(amountRupees);
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

  const whatsappMessage = `*WISDOM ISLAMIC ORGANISATION — KUPPAM UNIT*\n`
    + `*OFFICIAL RECEIPT*\n\n`
    + `Date: ${receiptDate}\n`
    + `Received From: ${donorName}\n`
    + `Amount: ₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(amountRupees)}\n`
    + `In Words: ${amountWords}\n`
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
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                borderColor: '#0284C7',
              }}
            >
              <Printer size={16} />
              <span>Print Official Receipt</span>
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
              background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 35%, #E0F2FE 70%, #F0F9FF 100%)',
              border: '2px solid #7DD3FC',
              borderRadius: '12px',
              padding: '30px 40px 28px',
              boxShadow: '0 12px 36px rgba(2, 132, 199, 0.15)',
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
              background: 'linear-gradient(90deg, #0284C7, #38BDF8, #0284C7)',
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
              marginBottom: '32px',
              paddingBottom: '16px',
              borderBottom: '1.5px solid rgba(2, 132, 199, 0.25)',
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

              {/* Right Column: Wisdom Islamic Organisation Kuppam Unit + Date */}
              <div style={{
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.55rem)',
                  fontWeight: 900,
                  color: '#0369A1',
                  margin: '0 0 2px 0',
                  lineHeight: 1.2,
                  letterSpacing: '0.4px',
                }}>
                  Wisdom Islamic Organisation
                </h1>
                <div style={{
                  fontSize: '1.1rem',
                  color: '#15803D',
                  fontWeight: 800,
                  marginBottom: '8px',
                }}>
                  Kuppam Unit
                </div>
                <div style={{
                  fontSize: '0.98rem',
                  color: '#0F172A',
                  fontFamily: 'serif',
                }}>
                  <span style={{ fontStyle: 'italic', color: '#334155' }}>Date:</span>{' '}
                  <strong style={{
                    fontWeight: 800,
                    fontFamily: 'serif',
                    letterSpacing: '0.5px',
                  }}>
                    {receiptDate}....
                  </strong>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* MIDDLE BODY LINES (Formal Underlined Voucher Fields)      */}
            {/* ======================================================== */}
            <div style={{ position: 'relative', zIndex: 1, marginBottom: '32px' }}>

              {/* Line 1: Received With Prayers From */}
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
                  Received With Prayers From :
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
                  The Sum Of Rupees:
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
                  Towards
                </span>
                <div style={{
                  flex: 1,
                  borderBottom: '1.5px solid #334155',
                  paddingBottom: '2px',
                  paddingLeft: '14px',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: '#0369A1',
                  fontFamily: 'serif',
                  fontStyle: 'italic',
                  lineHeight: 1.2,
                }}>
                  {purposeText}
                </div>
              </div>
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
                  border: '2px solid #0284C7',
                  background: '#FFFFFF',
                  boxShadow: '0 3px 8px rgba(2, 132, 199, 0.15)',
                  height: '48px',
                }}>
                  {/* Left Rupee Symbol Badge */}
                  <div style={{
                    background: '#0284C7',
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
                    }).format(amountRupees)}
                  </div>
                </div>

                <div style={{
                  fontSize: '0.76rem',
                  fontStyle: 'italic',
                  color: '#475569',
                  marginTop: '6px',
                  fontWeight: 600,
                }}>
                  ** Subject to realisation
                </div>
              </div>

              {/* 2. Right: Official Circular Rubber Stamp Seal */}
              <div style={{
                transform: 'rotate(-7deg)',
                userSelect: 'none',
                filter: 'drop-shadow(0 2px 4px rgba(29, 78, 216, 0.12))',
                marginRight: '12px',
              }}>
                <svg width="135" height="135" viewBox="0 0 160 160">
                  {/* Outer solid & dashed circles */}
                  <circle cx="80" cy="80" r="74" fill="none" stroke="#1D4ED8" strokeWidth="2.8" />
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#1D4ED8" strokeWidth="1" strokeDasharray="3 2" />
                  <circle cx="80" cy="80" r="48" fill="none" stroke="#1D4ED8" strokeWidth="1.5" />

                  {/* Circular Arc Paths */}
                  <defs>
                    <path id="stampTopPath" d="M 18,80 A 62,62 0 0,1 142,80" fill="none" />
                    <path id="stampBottomPath" d="M 142,80 A 62,62 0 0,1 18,80" fill="none" />
                  </defs>

                  {/* Top Arc Text */}
                  <text fill="#1D4ED8" fontSize="8.6" fontWeight="900" letterSpacing="1.2">
                    <textPath href="#stampTopPath" startOffset="50%" textAnchor="middle">
                      WISDOM ISLAMIC ORGANIZATION
                    </textPath>
                  </text>

                  {/* Bottom Arc Text */}
                  <text fill="#1D4ED8" fontSize="8" fontWeight="800" letterSpacing="1">
                    <textPath href="#stampBottomPath" startOffset="50%" textAnchor="middle">
                      ★ KOZHIKODE - 673002 ★
                    </textPath>
                  </text>

                  {/* Center registration box */}
                  <rect x="36" y="66" width="88" height="28" rx="4" fill="none" stroke="#1D4ED8" strokeWidth="1" />
                  <text x="80" y="77" fill="#1D4ED8" fontSize="8" fontWeight="700" textAnchor="middle">
                    Regd NO
                  </text>
                  <text x="80" y="89" fill="#1D4ED8" fontSize="9" fontWeight="900" letterSpacing="0.5" textAnchor="middle">
                    KKD/CA/616/2017
                  </text>
                </svg>
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
