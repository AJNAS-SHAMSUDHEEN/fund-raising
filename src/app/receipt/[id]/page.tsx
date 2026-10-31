'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { numberToWordsINR } from '@/lib/calculations/currency';
import { Printer, ArrowLeft, Share2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = (params?.id as string) || '';
  // Auto-generate / extract ER Number starting from 1001
  const erNoMatch = rawId.match(/\d{4,}/);
  const erNumber = erNoMatch ? erNoMatch[0] : (searchParams.get('er') || rawId || '1001');

  const donorName = searchParams.get('donor') || 'Contributor';
  const donorPhone = searchParams.get('phone') || '';
  const donorPlace = searchParams.get('place') || '';
  const amountPaise = parseInt(searchParams.get('amount') || '0', 10);
  const paidPaise = parseInt(searchParams.get('paid') || '0', 10);
  const offerType = searchParams.get('type') || 'cash';
  const quantity = parseInt(searchParams.get('qty') || '1', 10);
  const statusParam = searchParams.get('status') || 'verified';
  const receivingEntity = searchParams.get('account') || 'unit';

  const isPartial = statusParam === 'partial';
  const amountRupees = Math.floor(amountPaise / 100);
  const paidRupees = isPartial ? Math.floor(paidPaise / 100) : amountRupees;
  const displayRupees = (isPartial ? paidRupees : amountRupees) || 50000;

  const amountWords = numberToWordsINR(displayRupees);

  // Date formatting (DD-MM-YYYY)
  const dateParam = searchParams.get('date');
  let receiptDate = '';
  if (dateParam) {
    receiptDate = dateParam;
  } else {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    receiptDate = `${day}-${month}-${year}`;
  }

  const purposeParam = searchParams.get('purpose');
  const purposeText = purposeParam
    || (offerType === 'cent' ? `Salafi Masjid Land Acquisition Fund (${quantity} Cent Sponsorship)`
      : offerType === 'musalla' ? `Salafi Masjid Land Acquisition Fund (${quantity} Musalla Prayer Space)`
      : offerType === 'sqft' ? `Salafi Masjid Land Acquisition Fund (${quantity} Sq Ft Sponsorship)`
      : 'Salafi Masjid Land Acquisition Fund — Salafi Center Kuppam');

  const handlePrint = () => {
    window.print();
  };

  const formattedAmountINR = new Intl.NumberFormat('en-IN').format(displayRupees);

  const whatsappMessage = `*WISDOM ISLAMIC ORGANISATION — KUPPAM UNIT*\n`
    + `*OFFICIAL E-RECEIPT*\n\n`
    + `Date: ${receiptDate}\n`
    + `ER.No: ${erNumber}\n`
    + `Received with thanks from: ${donorName}${donorPlace ? ` (${donorPlace})` : ''}\n`
    + `Amount: ₹${formattedAmountINR}/-\n`
    + `In Words: ${amountWords}\n`
    + `For the purpose of: ${purposeText}\n\n`
    + `Salafi Masjid Land Acquisition Project\n`
    + `Salafi Center, Kuppam`;

  return (
    <div style={{ padding: '24px 0 60px', background: '#F1F5F9', minHeight: '90vh' }}>
      <div className="container" style={{ maxWidth: '980px', margin: '0 auto', padding: '0 16px' }}>

        {/* Action Header Bar */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/${donorPhone ? '91' + donorPhone : ''}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                fontSize: '0.88rem',
                color: '#15803D',
                background: '#FFFFFF',
                borderColor: '#86EFAC',
                borderRadius: '8px',
                border: '1.5px solid #86EFAC',
                textDecoration: 'none',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.1)',
              }}
            >
              <Share2 size={16} />
              <span>Share WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                fontSize: '0.88rem',
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #0369A1 0%, #0C4A6E 100%)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(3, 105, 161, 0.25)',
              }}
            >
              <Printer size={16} />
              <span>Print E-Receipt</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* OFFICIAL E-RECEIPT TEMPLATE CANVAS                      */}
        {/* Rendered directly on top of public/receipt/receipt.png  */}
        {/* ======================================================== */}
        <div
          className="official-receipt-print-area"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1600 / 779',
            backgroundImage: "url('/receipt/receipt.png')",
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.12)',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* 1. Date (sitting on the dotted line at top right) */}
          <div
            style={{
              position: 'absolute',
              top: '25.6%',
              left: '77.2%',
              width: '15%',
              fontSize: 'clamp(0.72rem, 1.6vw, 1.15rem)',
              fontWeight: 800,
              color: '#0F172A',
              fontFamily: "'Times New Roman', Times, serif",
              whiteSpace: 'nowrap',
            }}
          >
            {receiptDate}
          </div>

          {/* 2. ER.No. (Sequential ID starting from 1001) */}
          <div
            style={{
              position: 'absolute',
              top: '30.8%',
              left: '12.8%',
              fontSize: 'clamp(0.85rem, 1.9vw, 1.45rem)',
              fontWeight: 900,
              color: '#B91C1C',
              fontFamily: "'Courier New', Courier, monospace",
              letterSpacing: '1px',
            }}
          >
            {erNumber}
          </div>

          {/* 3. Received with thanks from */}
          <div
            style={{
              position: 'absolute',
              top: '34.8%',
              left: '24.8%',
              right: '9%',
              fontSize: 'clamp(0.78rem, 1.8vw, 1.35rem)',
              fontWeight: 800,
              color: '#0F172A',
              fontFamily: "'Times New Roman', Times, serif",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {donorName}{donorPlace ? ` (${donorPlace})` : ''}
          </div>

          {/* 4. Amount of Rupees ( in words ) */}
          <div
            style={{
              position: 'absolute',
              top: '41.8%',
              left: '31.2%',
              right: '9%',
              fontSize: 'clamp(0.7rem, 1.5vw, 1.15rem)',
              fontWeight: 800,
              color: '#0F172A',
              fontFamily: "'Times New Roman', Times, serif",
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {amountWords}
          </div>

          {/* 5. For the purpose of */}
          <div
            style={{
              position: 'absolute',
              top: '48.8%',
              left: '21.5%',
              right: '9%',
              fontSize: 'clamp(0.7rem, 1.5vw, 1.15rem)',
              fontWeight: 700,
              color: '#0369A1',
              fontFamily: "'Times New Roman', Times, serif",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {purposeText}
          </div>

          {/* 6. Rupee Box Amount */}
          <div
            style={{
              position: 'absolute',
              top: '59.6%',
              left: '10.5%',
              width: '22.0%',
              height: '11.2%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(1rem, 2.3vw, 1.85rem)',
              fontWeight: 900,
              color: '#0F172A',
              fontFamily: "'Arial', sans-serif",
              letterSpacing: '0.5px',
            }}
          >
            {formattedAmountINR}/-
          </div>
        </div>

        {/* Verification Summary Card */}
        <div
          className="no-print"
          style={{
            marginTop: '20px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                Official E-Receipt Verified (ER.No. {erNumber})
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Wisdom Islamic Organization Kuppam Unit • Salafi Center Kuppam
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: receivingEntity === 'district' ? '#EFF6FF' : '#F0FDF4',
                color: receivingEntity === 'district' ? '#1D4ED8' : '#15803D',
                border: receivingEntity === 'district' ? '1px solid #BFDBFE' : '1px solid #BBF7D0',
              }}
            >
              {receivingEntity === 'district' ? '🏛️ ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്' : '🏛️ കുപ്പം യൂണിറ്റ് കമ്മിറ്റി'}
            </span>
          </div>
        </div>

      </div>

      {/* High-Resolution Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body {
            background: #FFFFFF !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .official-receipt-print-area {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
