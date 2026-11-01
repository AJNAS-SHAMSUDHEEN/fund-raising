'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { numberToWordsINR } from '@/lib/calculations/currency';
import { buildWhatsAppLink } from '@/lib/utils/phone';
import { Printer, ArrowLeft, Share2, CheckCircle2 } from 'lucide-react';

export default function ReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = (params?.id as string) || '';
  const [dbData, setDbData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchReceiptData() {
      if (!rawId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Try cashCollections by doc ID
        const cashDocRef = doc(db, 'cashCollections', rawId);
        const cashSnap = await getDoc(cashDocRef);
        if (cashSnap.exists()) {
          if (isMounted) {
            setDbData({ id: cashSnap.id, ...cashSnap.data() });
            setLoading(false);
          }
          return;
        }

        // 2. Try cashCollections by receiptNumber or erNo or legacyReceiptNumber
        const cashQ = query(
          collection(db, 'cashCollections'),
          where('receiptNumber', '==', rawId),
          limit(1)
        );
        const cashQSnap = await getDocs(cashQ);
        if (!cashQSnap.empty) {
          const d = cashQSnap.docs[0];
          if (isMounted) {
            setDbData({ id: d.id, ...d.data() });
            setLoading(false);
          }
          return;
        }

        if (!isNaN(Number(rawId))) {
          const erQ = query(
            collection(db, 'cashCollections'),
            where('erNo', '==', Number(rawId)),
            limit(1)
          );
          const erQSnap = await getDocs(erQ);
          if (!erQSnap.empty) {
            const d = erQSnap.docs[0];
            if (isMounted) {
              setDbData({ id: d.id, ...d.data() });
              setLoading(false);
            }
            return;
          }
        }

        // 3. Fallback: Try offers
        const offerDocRef = doc(db, 'offers', rawId);
        const offerSnap = await getDoc(offerDocRef);
        if (offerSnap.exists()) {
          if (isMounted) {
            setDbData({ id: offerSnap.id, ...offerSnap.data() });
            setLoading(false);
          }
          return;
        }

        const offerQ = query(
          collection(db, 'offers'),
          where('offerNumber', '==', rawId),
          limit(1)
        );
        const offerQSnap = await getDocs(offerQ);
        if (!offerQSnap.empty) {
          const d = offerQSnap.docs[0];
          if (isMounted) {
            setDbData({ id: d.id, ...d.data() });
            setLoading(false);
          }
          return;
        }
      } catch (err) {
        console.warn('Receipt Firestore fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReceiptData();
    return () => {
      isMounted = false;
    };
  }, [rawId]);

  // Resolve ER Number
  let erNumber = '1001';
  if (dbData?.erNo) {
    erNumber = String(dbData.erNo);
  } else if (dbData?.receiptNumber && /^\d+$/.test(String(dbData.receiptNumber))) {
    erNumber = String(dbData.receiptNumber);
  } else if (searchParams.get('er')) {
    erNumber = searchParams.get('er')!;
  } else if (/^\d{4,}$/.test(rawId)) {
    erNumber = rawId;
  } else if (rawId.startsWith('RCP-') && /^\d+$/.test(rawId.replace(/\D/g, ''))) {
    const num = rawId.replace(/\D/g, '');
    erNumber = num.length >= 4 ? num.slice(-4) : num;
  }

  const donorName = dbData?.contributorName || searchParams.get('donor') || 'Contributor';
  const donorPhone = dbData?.contributorPhone || searchParams.get('phone') || '';
  const donorPlace = dbData?.contributorPlace || searchParams.get('place') || '';

  const rawAmountPaise = dbData?.amountPaise || parseInt(searchParams.get('amount') || '0', 10);
  const rawPaidPaise = dbData?.paidPaise || parseInt(searchParams.get('paid') || '0', 10);
  const offerType = dbData?.offerType || searchParams.get('type') || 'cash';
  const quantity = dbData?.quantity || parseInt(searchParams.get('qty') || '1', 10);
  const statusParam = dbData?.status || searchParams.get('status') || 'verified';
  const receivingEntity = dbData?.receivingEntity || searchParams.get('account') || 'unit';

  const isPartial = statusParam === 'partial';
  const amountRupees = Math.floor(rawAmountPaise / 100);
  const paidRupees = isPartial ? Math.floor(rawPaidPaise / 100) : amountRupees;
  const displayRupees = (isPartial ? paidRupees : amountRupees) || 50000;

  const amountWords = numberToWordsINR(displayRupees);

  // Date formatting (DD-MM-YYYY)
  let receiptDate = '';
  if (dbData?.createdAt) {
    try {
      const d = dbData.createdAt.toDate ? dbData.createdAt.toDate() : new Date(dbData.createdAt);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        receiptDate = `${day}-${month}-${year}`;
      }
    } catch {}
  }
  if (!receiptDate && dbData?.date) {
    receiptDate = dbData.date;
  }
  if (!receiptDate && searchParams.get('date')) {
    receiptDate = searchParams.get('date')!;
  }
  if (!receiptDate) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    receiptDate = `${day}-${month}-${year}`;
  }

  const purposeParam = searchParams.get('purpose');
  const purposeText = purposeParam
    || (dbData?.eventName ? `Salafi Masjid Land Acquisition Fund — ${dbData.eventName}`
      : offerType === 'cent' ? `Salafi Masjid Land Acquisition Fund (${quantity} Cent Sponsorship)`
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
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;0,900;1,400;1,500;1,700&display=swap"
      />
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
              href={buildWhatsAppLink(donorPhone, whatsappMessage)}
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
          {/* 1. Date (adjusted slightly down closer to dotted line) */}
          <div
            style={{
              position: 'absolute',
              top: '34.2%',
              left: '77.5%',
              fontSize: 'clamp(0.68rem, 1.35vw, 0.98rem)',
              fontWeight: 700,
              color: '#0F172A',
              fontFamily: "'Roboto', sans-serif",
              whiteSpace: 'nowrap',
              lineHeight: 1,
              letterSpacing: '0.3px',
            }}
          >
            {receiptDate}
          </div>

          {/* 2. ER.No. (Sequential ID starting from 1001) */}
          <div
            style={{
              position: 'absolute',
              top: '40.0%',
              left: '12.8%',
              fontSize: 'clamp(0.95rem, 2.0vw, 1.55rem)',
              fontWeight: 900,
              color: '#B91C1C',
              fontFamily: "'Roboto', monospace",
              letterSpacing: '1px',
              lineHeight: 1,
            }}
          >
            {erNumber}
          </div>

          {/* 3. Received with thanks from (adjusted slightly down above dotted line) */}
          <div
            style={{
              position: 'absolute',
              top: '46.0%',
              left: '30.5%',
              right: '8%',
              fontSize: 'clamp(0.85rem, 1.85vw, 1.45rem)',
              fontWeight: 700,
              color: '#0F172A',
              fontFamily: "'Roboto', sans-serif",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.1,
              letterSpacing: '0.3px',
            }}
          >
            {donorName}{donorPlace ? ` (${donorPlace})` : ''}
          </div>

          {/* 4. Amount of Rupees ( in words ) (adjusted slightly down above dotted line) */}
          <div
            style={{
              position: 'absolute',
              top: '55.2%',
              left: '31.0%',
              right: '8%',
              fontSize: 'clamp(0.72rem, 1.4vw, 1.05rem)',
              fontWeight: 600,
              color: '#0F172A',
              fontFamily: "'Roboto', sans-serif",
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.1,
            }}
          >
            {amountWords}
          </div>

          {/* 5. For the purpose of (adjusted slightly down above dotted line) */}
          <div
            style={{
              position: 'absolute',
              top: '65.8%',
              left: '24.5%',
              right: '8%',
              fontSize: 'clamp(0.62rem, 1.15vw, 0.92rem)',
              fontWeight: 600,
              color: '#0369A1',
              fontFamily: "'Roboto', sans-serif",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.1,
            }}
          >
            {purposeText}
          </div>

          {/* 6. Rupee Box Amount */}
          <div
            style={{
              position: 'absolute',
              top: '77.5%',
              left: '10.3%',
              width: '22.25%',
              height: '8.6%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(1.1rem, 2.5vw, 2.0rem)',
              fontWeight: 800,
              color: '#0F172A',
              fontFamily: "'Roboto', sans-serif",
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
        @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;0,900;1,400;1,500;1,700&display=swap');

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
