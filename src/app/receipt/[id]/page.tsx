'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { numberToWordsINR } from '@/lib/calculations/currency';
import { buildWhatsAppLink, buildStoredPhoneNumber } from '@/lib/utils/phone';
import CountryCodeSelect from '@/components/common/CountryCodeSelect';
import {
  Printer,
  ArrowLeft,
  Share2,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Copy,
  Check,
  Send,
  X,
  Phone,
  AlertCircle
} from 'lucide-react';

export default function ReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = (params?.id as string) || '';
  const cleanDigits = rawId.replace(/\D/g, '');
  const [dbData, setDbData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sharing & copy state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingJpg, setIsGeneratingJpg] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showNoPhoneModal, setShowNoPhoneModal] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const [customCountryCode, setCustomCountryCode] = useState('+91');

  useEffect(() => {
    let isMounted = true;
    async function fetchReceiptData() {
      if (!rawId) {
        setLoading(false);
        return;
      }

      const numValue = cleanDigits ? Number(cleanDigits) : null;

      try {
        // 1. Try cashCollections by doc ID (exact match)
        const cashDocRef = doc(db, 'cashCollections', rawId);
        const cashSnap = await getDoc(cashDocRef);
        if (cashSnap.exists()) {
          if (isMounted) {
            setDbData({ id: cashSnap.id, ...cashSnap.data() });
            setLoading(false);
          }
          return;
        }

        // 2. Try cashCollections by receiptNumber variants (e.g. '10011', 'ER-10011', rawId)
        const candidates = [rawId];
        if (cleanDigits && cleanDigits !== rawId) {
          candidates.push(cleanDigits);
          candidates.push(`ER-${cleanDigits}`);
        }

        for (const candidate of candidates) {
          const cashQ = query(
            collection(db, 'cashCollections'),
            where('receiptNumber', '==', candidate),
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
        }

        // 3. Try cashCollections by numeric erNo
        if (numValue !== null && !isNaN(numValue)) {
          const erQ = query(
            collection(db, 'cashCollections'),
            where('erNo', '==', numValue),
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

        // 4. Try offers collection by doc ID
        const offerDocRef = doc(db, 'offers', rawId);
        const offerSnap = await getDoc(offerDocRef);
        if (offerSnap.exists()) {
          if (isMounted) {
            setDbData({ id: offerSnap.id, ...offerSnap.data() });
            setLoading(false);
          }
          return;
        }

        // 5. Try offers by offerNumber variants
        const offerCandidates = [rawId];
        if (cleanDigits) {
          if (!offerCandidates.includes(cleanDigits)) offerCandidates.push(cleanDigits);
          if (!offerCandidates.includes(`OFF-${cleanDigits}`)) offerCandidates.push(`OFF-${cleanDigits}`);
          if (!offerCandidates.includes(`ER-${cleanDigits}`)) offerCandidates.push(`ER-${cleanDigits}`);
        }
        for (const cand of offerCandidates) {
          const offerQ = query(
            collection(db, 'offers'),
            where('offerNumber', '==', cand),
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
        }

        // 6. Try offers by receiptNumber or erNo
        if (cleanDigits) {
          const offRecQ = query(
            collection(db, 'offers'),
            where('receiptNumber', '==', cleanDigits),
            limit(1)
          );
          const offRecSnap = await getDocs(offRecQ);
          if (!offRecSnap.empty) {
            const d = offRecSnap.docs[0];
            if (isMounted) {
              setDbData({ id: d.id, ...d.data() });
              setLoading(false);
            }
            return;
          }
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
  }, [rawId, cleanDigits]);

  // Resolve ER Number
  let erNumber = '1001';
  if (dbData?.erNo) {
    erNumber = String(dbData.erNo);
  } else if (dbData?.receiptNumber && /^\d+$/.test(String(dbData.receiptNumber))) {
    erNumber = String(dbData.receiptNumber);
  } else if (searchParams.get('er')) {
    erNumber = searchParams.get('er')!;
  } else if (cleanDigits.length >= 4) {
    erNumber = cleanDigits;
  } else if (/^\d+$/.test(rawId)) {
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
  if (dbData?.cashReceivedDate) {
    receiptDate = dbData.cashReceivedDate;
  }
  if (!receiptDate && dbData?.createdAt) {
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
  // Last resort fallback
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

  const [origin, setOrigin] = useState('https://kuppammasjid.web.app');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const directReceiptUrl = `${origin}/receipt/${erNumber}`;

  const hasPhone = Boolean(
    donorPhone &&
    donorPhone.trim() !== '' &&
    donorPhone !== '0000000000' &&
    donorPhone.replace(/\D/g, '').length >= 7 &&
    !dbData?.hasNoPhone
  );

  const formattedAmountINR = new Intl.NumberFormat('en-IN').format(displayRupees);

  const whatsappMessage = `*WISDOM ISLAMIC ORGANISATION — KUPPAM UNIT*\n\n`
    + `ബഹുമാനപ്പെട്ട *${donorName}*,\n`
    + `സലഫി മസ്ജിദ് ഭൂമി ഏറ്റെടുക്കൽ ഫണ്ടിലേക്ക് താങ്കൾ നൽകിയ സംഭാവന സ്വീകരിച്ചിരിക്കുന്നു. جزاك الله خيرا كثيرا 🤲\n\n`
    + `📄 *രസീത് നമ്പർ (ER.No):* ${erNumber}\n`
    + `📅 *തീയതി (Date):* ${receiptDate}\n`
    + `👤 *പേര് (Name):* ${donorName}${donorPlace ? ` (${donorPlace})` : ''}\n`
    + `💰 *തുക (Amount):* ₹${formattedAmountINR}/-\n`
    + `📝 *അക്ഷരത്തിൽ:* ${amountWords}\n`
    + `🎯 *ഉദ്ദേശ്യം:* ${purposeText}\n\n`
    + `🔗 *രസീത് കാണാനും ഡൗൺലോഡ് ചെയ്യാനും താഴെയുള്ള ലിങ്കിൽ ക്ലിക്ക് ചെയ്യുക:*\n`
    + `${directReceiptUrl}\n\n`
    + `Salafi Masjid Land Acquisition Project\n`
    + `Salafi Center, Kuppam`;

  const generateReceiptCanvas = async (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = '/receipt/receipt.png';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 779;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Draw background template
        ctx.drawImage(img, 0, 0, 1600, 779);

        // 1. Date (top: 34.2% -> 266px, left: 77.5% -> 1240px)
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 22px "Roboto", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(receiptDate, 1240, 266);

        // 2. ER.No. (top: 40.0% -> 312px, left: 12.8% -> 205px)
        ctx.fillStyle = '#B91C1C';
        ctx.font = '900 34px "Roboto", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(erNumber, 205, 312);

        // 3. Contributor Name (top: 46.0% -> 358px, left: 30.5% -> 488px)
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 28px "Roboto", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const displayName = donorName + (donorPlace ? ` (${donorPlace})` : '');
        ctx.fillText(displayName, 488, 358);

        // 4. Amount of Rupees in words (top: 55.2% -> 430px, left: 31.0% -> 496px)
        ctx.fillStyle = '#0F172A';
        ctx.font = 'italic 600 23px "Roboto", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(amountWords, 496, 430);

        // 5. Purpose (top: 65.8% -> 513px, left: 24.5% -> 392px)
        ctx.fillStyle = '#0369A1';
        ctx.font = '600 20px "Roboto", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(purposeText, 392, 513);

        // 6. Rupee Box Amount (Centered horizontally and vertically in box at center: 343, 637)
        ctx.fillStyle = '#0F172A';
        ctx.font = '800 36px "Roboto", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${formattedAmountINR}/-`, 343, 637);

        resolve(canvas);
      };
      img.onerror = (e) => reject(e);
    });
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const canvas = await generateReceiptCanvas();
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const { jsPDF } = await import('jspdf');
      // Exact landscape card format: 160mm x 77.9mm (matching 1600x779 ratio)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [160, 77.9],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 160, 77.9);
      pdf.save(`Official-Receipt-${erNumber}.pdf`);
    } catch (err) {
      console.error('PDF generation failed, falling back to print:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadJPG = async () => {
    try {
      setIsGeneratingJpg(true);
      const canvas = await generateReceiptCanvas();
      const link = document.createElement('a');
      link.download = `Official-Receipt-${erNumber}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (err) {
      console.error('JPG generation failed:', err);
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!hasPhone) {
      // Contributor has no registered phone number -> open modal
      setShowNoPhoneModal(true);
      return;
    }
    const targetLink = buildWhatsAppLink(donorPhone, whatsappMessage);
    if (targetLink) {
      window.open(targetLink, '_blank');
    } else {
      setShowNoPhoneModal(true);
    }
  };

  const handleSendCustomWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = customPhone.replace(/\D/g, '');
    if (!cleanNum || cleanNum.length < 7) {
      alert('ദയവായി സാധുവായ ഒരു മൊബൈൽ നമ്പർ നൽകുക (Please enter a valid mobile number)');
      return;
    }
    const fullPhone = buildStoredPhoneNumber(cleanNum, customCountryCode);
    const targetLink = buildWhatsAppLink(fullPhone, whatsappMessage);
    if (targetLink) {
      window.open(targetLink, '_blank');
      setShowNoPhoneModal(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(directReceiptUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        prompt('Copy receipt link:', directReceiptUrl);
      }
    } catch {
      prompt('Copy receipt link:', directReceiptUrl);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* 1. Share WhatsApp Button (Auto-opens donor chat if phone is registered, otherwise opens prompt) */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
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
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.1)',
              }}
              title={hasPhone ? `Send receipt directly to ${donorName}'s WhatsApp (${donorPhone})` : 'Share receipt via WhatsApp (Enter custom number)'}
            >
              <Share2 size={16} />
              <span>{hasPhone ? 'Share WhatsApp' : 'WhatsApp'}</span>
            </button>

            {/* 2. Direct Link Copy Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                fontSize: '0.88rem',
                color: copiedLink ? '#15803D' : '#334155',
                background: copiedLink ? '#DCFCE7' : '#FFFFFF',
                border: `1.5px solid ${copiedLink ? '#86EFAC' : '#CBD5E1'}`,
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease',
              }}
              title="Copy direct receipt download link"
            >
              {copiedLink ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                fontSize: '0.88rem',
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: isGeneratingPdf ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(185, 28, 28, 0.25)',
              }}
              title="Download high-resolution Receipt-Only PDF"
            >
              {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJPG}
              disabled={isGeneratingJpg}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                fontSize: '0.88rem',
                color: '#1E293B',
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: isGeneratingJpg ? 'wait' : 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
              }}
              title="Download high-resolution Receipt JPG Image"
            >
              {isGeneratingJpg ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              <span>{isGeneratingJpg ? 'Saving...' : 'Download Image'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
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
              <span>Print</span>
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

      {/* No Phone / Alternate Number Sharing Modal */}
      {showNoPhoneModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowNoPhoneModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                  <Share2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    WhatsApp Receipt Sharing
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                    Official Receipt #{erNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNoPhoneModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Alert info */}
            <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '12px', marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertCircle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.82rem', color: '#92400E', lineHeight: 1.45 }}>
                <strong>മൊബൈൽ നമ്പർ ലഭ്യമല്ല:</strong> {donorName}-ന്റെ പേരിൽ സിസ്റ്റത്തിൽ മൊബൈൽ നമ്പർ രേഖപ്പെടുത്തിയിട്ടില്ല. താഴെ നൽകിയിട്ടുള്ള രീതികളിൽ രസീത് ഷെയർ ചെയ്യാം:
              </div>
            </div>

            {/* Option 1: Send to another WhatsApp number */}
            <form onSubmit={handleSendCustomWhatsApp} style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                മറ്റൊരു WhatsApp നമ്പറിലേക്ക് അയക്കുക:
              </label>
              <div style={{ display: 'flex', width: '100%', marginBottom: '10px' }}>
                <CountryCodeSelect
                  value={customCountryCode}
                  onChange={setCustomCountryCode}
                  style={{ height: '44px', borderRadius: '10px 0 0 10px' }}
                />
                <input
                  type="tel"
                  placeholder="WhatsApp Mobile Number"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: '0 10px 10px 0',
                    border: '1.5px solid var(--border-medium, #CBD5E1)',
                    borderLeft: 'none',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <Send size={15} />
                <span>ഈ നമ്പറിലേക്ക് WhatsApp അയക്കുക</span>
              </button>
            </form>

            <div style={{ height: '1px', background: '#E2E8F0', margin: '16px 0' }} />

            {/* Option 2: Copy Direct Download Link */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                രസീത് ഡയറക്റ്റ് ഡൗൺലോഡ് ലിങ്ക്:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={directReceiptUrl}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '0.8rem',
                    color: '#334155',
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: copiedLink ? '#DCFCE7' : '#F1F5F9',
                    color: copiedLink ? '#15803D' : '#334155',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Option 3: Direct Downloads */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setShowNoPhoneModal(false); handleDownloadJPG(); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#1E293B',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ImageIcon size={15} />
                <span>Download Image</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowNoPhoneModal(false); handleDownloadPDF(); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#B91C1C',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Download size={15} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
