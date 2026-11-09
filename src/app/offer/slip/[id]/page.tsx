'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { numberToWordsINR, formatINR } from '@/lib/calculations/currency';
import {
  Download,
  Share2,
  Printer,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Calendar,
  User,
  Phone,
  Clock,
  Sparkles,
  FileText,
  Building,
  Info,
} from 'lucide-react';

export default function OfferSlipPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = (params?.id as string) || '';
  const cleanId = rawId.trim();

  const [dbData, setDbData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);

  // Fetch offer details from Firestore if available
  useEffect(() => {
    let isMounted = true;
    async function fetchOffer() {
      if (!cleanId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Try doc by ID in 'offers' collection
        const docRef = doc(db, 'offers', cleanId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          if (isMounted) {
            setDbData({ id: docSnap.id, ...docSnap.data() });
            setLoading(false);
          }
          return;
        }

        // 2. Try querying by offerNumber
        const qByNum = query(collection(db, 'offers'), where('offerNumber', '==', cleanId), limit(1));
        const snapByNum = await getDocs(qByNum);
        if (!snapByNum.empty) {
          const d = snapByNum.docs[0];
          if (isMounted) {
            setDbData({ id: d.id, ...d.data() });
            setLoading(false);
          }
          return;
        }

        // 3. Try check localStorage fallback
        try {
          const localOffers = JSON.parse(localStorage.getItem('masjid_user_offers') || '[]');
          const match = localOffers.find((o: any) => o.offerNumber === cleanId || o.id === cleanId);
          if (match && isMounted) {
            setDbData(match);
            setLoading(false);
            return;
          }
        } catch {}
      } catch (err) {
        console.warn('Error fetching offer slip data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOffer();
    return () => {
      isMounted = false;
    };
  }, [cleanId]);

  // Resolve Display Values
  const offerNumber = dbData?.offerNumber || searchParams.get('order') || cleanId || `OFF-${new Date().getFullYear()}-001`;
  const donorName = dbData?.contributorName || searchParams.get('donor') || 'Well Wisher';
  const donorPhone = dbData?.contributorPhone || searchParams.get('phone') || '';
  const donorPlace = dbData?.contributorPlace || searchParams.get('place') || '';

  const rawAmountPaise = dbData?.totalOfferedPaise || dbData?.amountPaise || parseInt(searchParams.get('amount') || '0', 10);
  const amountRupees = Math.round(rawAmountPaise / 100);
  const amountWords = numberToWordsINR(amountRupees);
  const formattedAmountINR = new Intl.NumberFormat('en-IN').format(amountRupees);

  const offerType = dbData?.offerType || searchParams.get('type') || 'cash';
  const quantity = dbData?.quantity || parseFloat(searchParams.get('qty') || '1') || 1;

  let unitLabel = '';
  if (offerType === 'musalla') {
    unitLabel = `${quantity} മുസല്ല പ്രാർത്ഥനാ സ്ഥലം (${quantity * 8} ചതുരശ്ര അടി)`;
  } else if (offerType === 'cent') {
    const centDisplay = quantity === 0.25 ? '1/4' : quantity === 0.5 ? '1/2' : quantity === 0.75 ? '3/4' : quantity;
    unitLabel = `${centDisplay} സെന്റ് സ്പോൺസർഷിപ്പ് (${(quantity * 435.6).toFixed(1)} ചതുരശ്ര അടി)`;
  } else if (offerType === 'sqft') {
    unitLabel = `${quantity} ചതുരശ്ര അടി (Sq. Ft.)`;
  } else {
    unitLabel = `ഡയറക്റ്റ് തുക (Direct Contribution)`;
  }

  // Commitment Plan
  const planParam = searchParams.get('plan');
  const commitmentType = dbData?.commitmentType || (planParam?.toLowerCase().includes('month') ? 'installments' : 'one_time');
  const commitmentMonths = dbData?.commitmentMonths || (planParam?.match(/\d+/) ? parseInt(planParam.match(/\d+/)![0], 10) : 1);
  const planText = planParam
    || (commitmentType === 'one_time' ? 'ഒറ്റത്തവണ (One-Time Payment)' : `${commitmentMonths} മാസത്തിനകം (Within ${commitmentMonths} Months)`);

  // Date
  let offerDate = dbData?.date || '';
  if (!offerDate && dbData?.createdAt) {
    try {
      const d = dbData.createdAt.toDate ? dbData.createdAt.toDate() : new Date(dbData.createdAt);
      if (!isNaN(d.getTime())) {
        offerDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      }
    } catch {}
  }
  if (!offerDate) {
    const today = new Date();
    offerDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
  }

  const eventName = dbData?.eventName || searchParams.get('event') || 'Salafi Masjid Land Acquisition Project';

  // Canvas Image Generator for instant High-Res Download
  const generateSlipCanvas = async (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const width = 1200;
      const height = 800;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Subtle Outer Border
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // 2. Top Header Banner (Emerald Gradient)
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#064E3B');
      grad.addColorStop(1, '#065F46');
      ctx.fillStyle = grad;
      ctx.fillRect(20, 20, width - 40, 150);

      // Header Texts
      ctx.fillStyle = '#C5A059';
      ctx.font = '800 16px "Inter", sans-serif';
      ctx.fillText('WISDOM ISLAMIC ORGANIZATION — KUPPAM UNIT', 50, 60);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 32px "Inter", sans-serif';
      ctx.fillText('SALAFI CENTER KUPPAM', 50, 100);

      ctx.fillStyle = '#A7F3D0';
      ctx.font = '600 16px "Inter", sans-serif';
      ctx.fillText('Salafi Masjid Land Acquisition Project (ഭൂമി ഏറ്റെടുക്കൽ ഫണ്ട്)', 50, 130);

      // Top Right Badge: OFFER ACKNOWLEDGEMENT
      ctx.fillStyle = '#C5A059';
      ctx.beginPath();
      ctx.roundRect(width - 360, 50, 310, 80, 12);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 18px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OFFER ACKNOWLEDGEMENT', width - 205, 82);
      ctx.font = '700 15px "Inter", sans-serif';
      ctx.fillText('വാഗ്ദാന പത്രം (OFFER SLIP)', width - 205, 110);
      ctx.textAlign = 'left';

      // 3. Metadata Bar (Offer ID & Date)
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(40, 190, width - 80, 50);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 190, width - 80, 50);

      ctx.fillStyle = '#475569';
      ctx.font = '700 16px "Inter", sans-serif';
      ctx.fillText(`Offer ID: ${offerNumber}`, 60, 222);

      ctx.textAlign = 'right';
      ctx.fillText(`Date: ${offerDate}`, width - 60, 222);
      ctx.textAlign = 'left';

      // 4. Details Section (2-Column Grid)
      // Left Column: Contributor
      ctx.fillStyle = '#064E3B';
      ctx.font = '800 18px "Inter", sans-serif';
      ctx.fillText('CONTRIBUTOR DETAILS (വിവരങ്ങൾ):', 50, 280);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 15px "Inter", sans-serif';
      ctx.fillText('Name (പേര്):', 50, 315);
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 22px "Inter", sans-serif';
      ctx.fillText(donorName, 180, 315);

      if (donorPlace) {
        ctx.fillStyle = '#64748B';
        ctx.font = '600 15px "Inter", sans-serif';
        ctx.fillText('Place (സ്ഥലം):', 50, 350);
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 18px "Inter", sans-serif';
        ctx.fillText(donorPlace, 180, 350);
      }

      if (donorPhone) {
        ctx.fillStyle = '#64748B';
        ctx.font = '600 15px "Inter", sans-serif';
        ctx.fillText('Phone (ഫോൺ):', 50, 385);
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 18px "Inter", sans-serif';
        ctx.fillText(donorPhone, 180, 385);
      }

      // Right Column: Offer Item & Plan
      ctx.fillStyle = '#064E3B';
      ctx.font = '800 18px "Inter", sans-serif';
      ctx.fillText('OFFER SPECIFICATION (ഇനം):', 650, 280);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 15px "Inter", sans-serif';
      ctx.fillText('Offer Item:', 650, 315);
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 18px "Inter", sans-serif';
      ctx.fillText(unitLabel, 770, 315);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 15px "Inter", sans-serif';
      ctx.fillText('Plan (തവണ):', 650, 350);
      ctx.fillStyle = '#0F172A';
      ctx.font = '700 18px "Inter", sans-serif';
      ctx.fillText(planText, 770, 350);

      // 5. Total Committed Amount Card
      ctx.fillStyle = '#ECFDF5';
      ctx.beginPath();
      ctx.roundRect(40, 420, width - 80, 140, 16);
      ctx.fill();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 420, width - 80, 140);

      ctx.fillStyle = '#047857';
      ctx.font = '800 16px "Inter", sans-serif';
      ctx.fillText('COMMITTED OFFER AMOUNT (വാഗ്ദാനം ചെയ്ത ആകെ തുക):', 70, 455);

      ctx.fillStyle = '#064E3B';
      ctx.font = '900 44px "Inter", sans-serif';
      ctx.fillText(`₹ ${formattedAmountINR}/-`, 70, 505);

      ctx.fillStyle = '#475569';
      ctx.font = 'italic 600 16px "Inter", sans-serif';
      ctx.fillText(`(${amountWords})`, 70, 535);

      // 6. Important Notice Box (Crucial for non-receipt distinction)
      ctx.fillStyle = '#FFFBEB';
      ctx.beginPath();
      ctx.roundRect(40, 580, width - 80, 95, 12);
      ctx.fill();
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(40, 580, width - 80, 95);

      ctx.fillStyle = '#B45309';
      ctx.font = '800 15px "Inter", sans-serif';
      ctx.fillText('ℹ️ പ്രധാന അറിയിപ്പ് (Important Notice):', 60, 610);

      ctx.fillStyle = '#78350F';
      ctx.font = '600 14px "Inter", sans-serif';
      ctx.fillText('ഇത് ഔദ്യോഗിക രസീത് അല്ല, താങ്കളുടെ വാഗ്ദാന പത്രം (Offer Slip) മാത്രമാണ്.', 60, 635);
      ctx.fillText('ഈ തുക കമ്മിറ്റി നേരിട്ടോ ബാങ്ക് വഴിയോ സ്വീകരിക്കുമ്പോൾ ഔദ്യോഗിക ഇ-രസീത് (Official E-Receipt) ലഭ്യമാകുന്നതാണ്.', 60, 658);

      // 7. Footer & Dua
      ctx.fillStyle = '#064E3B';
      ctx.font = '800 18px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('جزاك الله خيرا كثيرا 🤲 — അല്ലാഹു നിങ്ങളുടെ ഈ ഉദ്യമത്തെ സ്വീകരിക്കട്ടെ', width / 2, 715);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 13px "Inter", sans-serif';
      ctx.fillText('Wisdom Islamic Organization • Kuppam Unit • Help Desk: +91 99477 48552', width / 2, 745);

      resolve(canvas);
    });
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const canvas = await generateSlipCanvas();
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Offer_Slip_${offerNumber.replace(/[^a-zA-Z0-9_-]/g, '')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating offer slip image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const whatsappMessage = `*WISDOM ISLAMIC ORGANISATION — KUPPAM UNIT*\n\n`
    + `*സലഫി മസ്ജിദ് ഭൂമി ഏറ്റെടുക്കൽ ഫണ്ട്*\n`
    + `*വാഗ്ദാന പത്രം (OFFER ACKNOWLEDGEMENT)*\n\n`
    + `ബഹുമാനപ്പെട്ട *${donorName}*,\n`
    + `താങ്കളുടെ വാഗ്ദാനം (Offer) വിജയകരമായി രേഖപ്പെടുത്തിയിരിക്കുന്നു. جزاك الله خيرا كثيرا 🤲\n\n`
    + `🔖 *Offer ID:* ${offerNumber}\n`
    + `📅 *തീയതി (Date):* ${offerDate}\n`
    + `👤 *പേര്:* ${donorName}${donorPlace ? ` (${donorPlace})` : ''}\n`
    + `📦 *ഇനം:* ${unitLabel}\n`
    + `💰 *വാഗ്ദാനം ചെയ്ത തുക:* ₹${formattedAmountINR}/-\n`
    + `🗓️ *തവണ:* ${planText}\n\n`
    + `ℹ️ _ഇത് ഔദ്യോഗിക രസീത് അല്ല. തുക കൈപ്പറ്റുമ്പോൾ ഒഫീഷ്യൽ ഇ-രസീത് ലഭ്യമാകുന്നതാണ്._\n\n`
    + `🔗 *വാഗ്ദാന സ്ലിപ്പ് കാണാൻ:*\n${typeof window !== 'undefined' ? window.location.href : ''}`;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F0FDF4 0%, #F8FAFC 100%)',
      padding: 'clamp(16px, 4vw, 40px) 16px',
      fontFamily: 'var(--font-sans, sans-serif)',
    }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        {/* Back Link & Actions Top Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--brand-800, #065F46)',
              textDecoration: 'none',
              background: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <ArrowLeft size={16} />
            <span>ഹോം പേജിലേക്ക് (Home)</span>
          </Link>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                border: 'none',
                background: '#047857',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)',
              }}
            >
              <Download size={16} />
              <span>{isDownloading ? 'ഡൗൺലോഡ് ചെയ്യുന്നു...' : 'ഇമേജ് ഡൗൺലോഡ് (Download)'}</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                border: '1px solid #BBF7D0',
                background: '#F0FDF4',
                color: '#15803D',
                fontWeight: 700,
                fontSize: '0.86rem',
                textDecoration: 'none',
              }}
            >
              <Share2 size={16} />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* THE OFFER SLIP CARD (Carefully Styled Distinct from Receipt) */}
        {/* ======================================================== */}
        <div
          ref={slipRef}
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '2px solid #10B981',
            boxShadow: '0 20px 45px rgba(6, 78, 59, 0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
            color: '#FFFFFF',
            padding: '24px 28px',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '16px',
            }}>
              <div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: 'var(--gold-400, #FDE68A)',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '4px',
                }}>
                  Wisdom Islamic Organization • Kuppam Unit
                </span>
                <h1 style={{
                  fontSize: 'clamp(1.3rem, 3.5vw, 1.75rem)',
                  fontWeight: 900,
                  margin: '0 0 4px 0',
                  letterSpacing: '-0.02em',
                }}>
                  Salafi Center Kuppam
                </h1>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#A7F3D0',
                  margin: 0,
                  fontWeight: 600,
                }}>
                  Salafi Masjid Land Acquisition Project (ഭൂമി ഏറ്റെടുക്കൽ ഫണ്ട്)
                </p>
              </div>

              {/* Offer Badge (Distinction from Receipt) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1.5px solid rgba(253, 230, 138, 0.5)',
                backdropFilter: 'blur(8px)',
                borderRadius: '16px',
                padding: '10px 18px',
                textAlign: 'right',
              }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#FDE68A',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>
                  OFFER ACKNOWLEDGEMENT
                </div>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                }}>
                  വാഗ്ദാന പത്രം
                </div>
              </div>
            </div>
          </div>

          {/* Subheader Metadata Ribbon */}
          <div style={{
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '12px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '0.84rem',
          }}>
            <div>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Offer ID: </span>
              <strong style={{ color: '#0F172A', fontFamily: 'monospace', fontSize: '0.92rem' }}>{offerNumber}</strong>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Date: </span>
                <strong style={{ color: '#0F172A' }}>{offerDate}</strong>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#15803D',
                fontWeight: 700,
              }}>
                <CheckCircle2 size={14} />
                <span>രേഖപ്പെടുത്തി (Pledged)</span>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div style={{ padding: 'clamp(20px, 3.5vw, 32px)' }}>

            {/* Grid of Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}>
              {/* Contributor Card */}
              <div style={{
                background: '#F8FAFC',
                borderRadius: '16px',
                padding: '16px 20px',
                border: '1px solid #E2E8F0',
              }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#065F46',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                }}>
                  <User size={14} /> വാഗ്ദാനം നൽകിയ വ്യക്തി (Pledged By)
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0' }}>
                  {donorName}
                </h3>
                {donorPlace && (
                  <div style={{ fontSize: '0.86rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <MapPin size={14} color="#64748B" />
                    <span>{donorPlace}</span>
                  </div>
                )}
                {donorPhone && (
                  <div style={{ fontSize: '0.86rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={14} color="#64748B" />
                    <span>{donorPhone}</span>
                  </div>
                )}
              </div>

              {/* Offer Specification Card */}
              <div style={{
                background: '#F8FAFC',
                borderRadius: '16px',
                padding: '16px 20px',
                border: '1px solid #E2E8F0',
              }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#065F46',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                }}>
                  <Sparkles size={14} /> ഓഫർ ഇനവും വ്യവസ്ഥയും (Specification)
                </span>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>ഇനം (Offer Item):</span>
                  <strong style={{ fontSize: '1.02rem', color: '#0F172A' }}>{unitLabel}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>തവണ വ്യവസ്ഥ (Payment Plan):</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {planText}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Committed Amount Highlight Box */}
            <div style={{
              background: 'linear-gradient(135deg, #ECFDF5 0%, #DCFCE7 100%)',
              border: '2px solid #10B981',
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#047857',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: '6px',
              }}>
                Committed Offer Amount (വാഗ്ദാനം ചെയ്ത ആകെ തുക)
              </span>
              <div style={{
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
                fontWeight: 900,
                color: '#064E3B',
                lineHeight: 1.1,
                marginBottom: '6px',
              }}>
                ₹ {formattedAmountINR}/-
              </div>
              <div style={{
                fontSize: '0.92rem',
                color: '#047857',
                fontWeight: 600,
                fontStyle: 'italic',
              }}>
                {amountWords}
              </div>
            </div>

            {/* Crucial Distinguishing Notice Box */}
            <div style={{
              background: '#FFFBEB',
              border: '1.5px solid #FDE68A',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start',
            }}>
              <Info size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#92400E', display: 'block', marginBottom: '2px' }}>
                  പ്രധാന അറിയിപ്പ് (Important Notice)
                </strong>
                <p style={{ fontSize: '0.82rem', color: '#78350F', margin: 0, lineHeight: 1.5 }}>
                  ഇത് ഔദ്യോഗിക രസീത് അല്ല, താങ്കൾ സമർപ്പിച്ച <strong>വാഗ്ദാന പത്രം (Offer Slip)</strong> മാത്രമാണ്. ഈ തുക സൗകര്യത്തിനനുസരിച്ച് നേരിട്ടോ ബാങ്ക് വഴിയോ കൈപ്പറ്റുമ്പോൾ കമ്മിറ്റിയിൽ നിന്നും ഔദ്യോഗിക ഇ-രസീത് (Official E-Receipt) ലഭ്യമാകുന്നതാണ്.
                </p>
              </div>
            </div>

            {/* Dua & Contact Footer */}
            <div style={{
              textAlign: 'center',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '20px',
            }}>
              <p style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#064E3B',
                margin: '0 0 6px 0',
              }}>
                جزاك الله خيرا كثيرا 🤲
              </p>
              <p style={{
                fontSize: '0.84rem',
                color: '#64748B',
                margin: '0 0 10px 0',
              }}>
                അല്ലാഹു നിങ്ങളുടെ ഈ ഉദ്യമത്തെ ഇരുലോകത്തും സ്വീകരിച്ച് അനുഗ്രഹിക്കട്ടെ. ആമീൻ.
              </p>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                Wisdom Islamic Organization Kuppam Unit • Salafi Center Kuppam • സഹായങ്ങൾക്ക്: <strong>+91 99477 48552</strong>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Navigation */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link
            href="/"
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#64748B',
              textDecoration: 'none',
            }}
          >
            ← ഹോം പേജിലേക്ക് മടങ്ങുക
          </Link>
        </div>

      </div>
    </div>
  );
}
