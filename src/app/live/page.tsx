'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { INITIAL_CAMPAIGN, INITIAL_AGGREGATES, INITIAL_EVENTS } from '@/lib/state/mockStore';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import BrandLogo from '@/components/common/BrandLogo';
import EventQRCode from '@/components/common/EventQRCode';
import {
  Maximize2,
  Sparkles,
  ArrowLeft,
  Handshake,
  MapPin,
  Clock,
  Coins,
  ChevronDown,
  Layers,
  Calendar,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { subscribeToCampaignAggregates, subscribeToEventAggregates } from '@/lib/firebase/db';

function LiveScreenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Selected event from URL query, e.g. /live?event=ulikkal
  const eventParam = searchParams.get('event') || 'ulikkal';
  const [selectedEventId, setSelectedEventId] = useState<string>(eventParam);
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [offerUrl, setOfferUrl] = useState('');

  // Overall Campaign Target: ₹1.10 Crore
  const overallTargetPaise = INITIAL_CAMPAIGN.targetAmountPaise;

  // 1. Overall Campaign Grand Totals (shown at bottom bar)
  const [overallTotalOfferedPaise, setOverallTotalOfferedPaise] = useState(INITIAL_AGGREGATES.totalVerifiedPaise);
  const [overallTotalVerifiedPaise, setOverallTotalVerifiedPaise] = useState(INITIAL_AGGREGATES.totalVerifiedPaise);

  // 2. Event-Specific Collection Totals (Big Display - Starts at ₹0 for each new event!)
  const [eventName, setEventName] = useState<string>(
    INITIAL_EVENTS.find((e) => e.id === eventParam)?.name || `${eventParam.charAt(0).toUpperCase() + eventParam.slice(1)} Event`
  );
  const [eventLocation, setEventLocation] = useState<string>(
    INITIAL_EVENTS.find((e) => e.id === eventParam)?.location || 'Event Venue'
  );
  const [eventOfferedPaise, setEventOfferedPaise] = useState<number>(0);
  const [eventVerifiedPaise, setEventVerifiedPaise] = useState<number>(0);
  const [eventOfferCount, setEventOfferCount] = useState<number>(0);

  // Update URL and state when event changes
  const switchEvent = (eventId: string, name: string, location: string) => {
    setSelectedEventId(eventId);
    setEventName(name);
    setEventLocation(location);
    setIsEventPickerOpen(false);
    router.replace(`/live?event=${eventId}`);
  };

  // Real-time listener for Grand Total
  useEffect(() => {
    const unsubOverall = subscribeToCampaignAggregates((data) => {
      if (data.totalOfferedPaise) setOverallTotalOfferedPaise(data.totalOfferedPaise);
      if (data.totalVerifiedPaise) setOverallTotalVerifiedPaise(data.totalVerifiedPaise);
    });

    return () => unsubOverall();
  }, []);

  // Real-time listener for the Active Event (starts at ₹0 and counts up as collections come in)
  useEffect(() => {
    // Reset to 0 when switching to a new event
    setEventOfferedPaise(0);
    setEventVerifiedPaise(0);
    setEventOfferCount(0);

    const unsubEvent = subscribeToEventAggregates(selectedEventId, (eventData) => {
      setEventOfferedPaise(eventData.totalOfferedPaise || 0);
      setEventVerifiedPaise(eventData.totalVerifiedPaise || 0);
      setEventOfferCount(eventData.offerCount || 0);
      if (eventData.name) setEventName(eventData.name);
    });

    return () => unsubEvent();
  }, [selectedEventId]);

  // Live Clock updater
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOfferUrl(`${window.location.origin}/offer?event=${selectedEventId}`);
    }
  }, [selectedEventId]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerCelebration = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#16A34A', '#22C55E', '#86EFAC', '#F59E0B', '#15803D'],
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Overall metrics calculation
  const overallPercentage = Math.min(100, parseFloat(((overallTotalVerifiedPaise / overallTargetPaise) * 100).toFixed(1)));
  const overallRemainingPaise = Math.max(0, overallTargetPaise - overallTotalVerifiedPaise);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(ellipse at 50% 0%, #DCFCE7 0%, #F0FDF4 40%, #FAFCF9 100%)',
      color: '#0F172A',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      padding: 'clamp(14px, 2vw, 24px)',
      overflowY: 'auto',
      fontFamily: 'var(--font-body)',
    }}>
      {/* 1. Header: Wisdom Islamic Organization + Event Selector */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1.5px solid #BBF7D0',
        boxShadow: '0 4px 16px rgba(22, 101, 52, 0.06)',
        marginBottom: '16px',
        position: 'relative',
      }}>
        {/* Left: Brand Identity & Organization */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <BrandLogo size={48} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{
                fontSize: 'clamp(1.1rem, 2vw, 1.45rem)',
                fontWeight: 900,
                color: '#14532D',
                fontFamily: 'var(--font-display)',
                margin: 0,
                lineHeight: 1.2,
              }}>
                Wisdom Islamic Organization
              </h1>
              <span style={{
                background: '#DCFCE7',
                color: '#15803D',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '2px 10px',
                borderRadius: '9999px',
                border: '1px solid #86EFAC',
              }}>
                കുപ്പം യൂണിറ്റ്
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '2px 0 0 0' }}>
              സലഫി മസ്ജിദ് 19.5 സെന്റ് സ്ഥലം ഏറ്റെടുക്കൽ പദ്ധതി (ആകെ ലക്ഷ്യം: ₹1.10 കോടി)
            </p>
          </div>
        </div>

        {/* Center: Active Event Badge with Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsEventPickerOpen(!isEventPickerOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#F0FDF4',
              border: '2px solid #16A34A',
              padding: '8px 18px',
              borderRadius: '9999px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)',
            }}
          >
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#16A34A',
              display: 'inline-block',
              animation: 'pulseSubtle 1.5s infinite ease-in-out',
            }} />
            <span style={{
              fontSize: '0.92rem',
              fontWeight: 800,
              color: '#15803D',
              letterSpacing: '0.02em',
            }}>
              📍 {eventName}
            </span>
            <ChevronDown size={16} color="#15803D" />
          </button>

          {/* Event Picker Dropdown */}
          {isEventPickerOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)',
              border: '1px solid #BBF7D0',
              padding: '12px',
              minWidth: '260px',
              zIndex: 100,
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '8px', padding: '0 6px', textTransform: 'uppercase' }}>
                പ്രോഗ്രാം തിരഞ്ഞെടുക്കുക (Switch Event):
              </div>
              {INITIAL_EVENTS.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => switchEvent(ev.id, ev.name, ev.location)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: selectedEventId === ev.id ? '#DCFCE7' : 'transparent',
                    color: selectedEventId === ev.id ? '#15803D' : '#1E293B',
                    fontWeight: selectedEventId === ev.id ? 800 : 600,
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <span>{ev.name}</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{ev.location}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Controls & Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            color: '#15803D',
            background: '#F0FDF4',
            padding: '6px 14px',
            borderRadius: '10px',
            border: '1px solid #BBF7D0',
          }}>
            {currentTime}
          </div>

          <button
            type="button"
            onClick={triggerCelebration}
            title="Celebrate with confetti"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={16} />
            <span>Celebrate</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title="Fullscreen Mode"
            style={{
              padding: '8px 10px',
              borderRadius: '10px',
              background: '#FFFFFF',
              color: '#475569',
              border: '1px solid #E2E8F0',
              cursor: 'pointer',
            }}
          >
            <Maximize2 size={18} />
          </button>

          <Link
            href="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              color: '#64748B',
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            <span>Admin</span>
          </Link>
        </div>
      </header>

      {/* 2. Main Live Event Showcase Stage (FULL WIDTH — NO SIDE STREAM) */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '20px',
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
      }}>
        {/* BIG SHOWCASE CARD: THIS EVENT COLLECTION ONLY (Starts at ₹0) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '32px',
          border: '3px solid #86EFAC',
          padding: 'clamp(24px, 3.5vw, 42px) clamp(18px, 3vw, 36px)',
          boxShadow: '0 12px 40px rgba(22, 163, 74, 0.12)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '28px',
        }}>
          {/* Left/Center: Main Counter Column */}
          <div style={{ flex: '1 1 520px', textAlign: 'center' }}>
            {/* Top Event Header Ribbon */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
              color: '#14532D',
              padding: '8px 24px',
              borderRadius: '9999px',
              fontWeight: 900,
              fontSize: 'clamp(0.9rem, 1.8vw, 1.15rem)',
              letterSpacing: '0.04em',
              marginBottom: '12px',
              border: '1.5px solid #86EFAC',
            }}>
              <Handshake size={22} color="#15803D" />
              <span>{eventName.toUpperCase()} — ആകെ ലഭിച്ച തുക (EVENT TOTAL)</span>
            </div>

            {/* THE GIANT AMOUNT COUNTER */}
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.8rem, 9.5vw, 8.8rem)',
              fontWeight: 900,
              color: '#15803D',
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
              margin: '8px 0',
            }}>
              {formatINRFromPaise(eventOfferedPaise)}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: 'clamp(0.95rem, 1.4vw, 1.25rem)',
                color: '#334155',
                fontWeight: 700,
              }}>
                ഈ പരിപാടിയിൽ ഇതുവരെ ലഭിച്ച ഓഫറുകൾ &amp; പിരിവ്
              </span>
              {eventOfferCount > 0 && (
                <span style={{
                  background: '#FEF3C7',
                  color: '#B45309',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  border: '1px solid #FDE68A',
                }}>
                  {eventOfferCount} വ്യക്തികൾ പങ്കാളികളായി
                </span>
              )}
            </div>
          </div>

          {/* Right: Attendee Scan to Offer QR Code Badge */}
          {offerUrl && (
            <div style={{
              flex: '0 0 auto',
              margin: '0 auto',
              background: '#F0FDF4',
              borderRadius: '24px',
              border: '2px solid #86EFAC',
              padding: '16px 20px',
              boxShadow: '0 6px 20px rgba(22, 163, 74, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <EventQRCode
                url={offerUrl}
                size={135}
                darkColor="#14532D"
              />
              <div style={{
                marginTop: '10px',
                fontWeight: 900,
                fontSize: '0.88rem',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}>
                <QrCode size={16} />
                <span>സ്കാൻ ചെയ്ത് ഓഫർ ചെയ്യുക</span>
              </div>
              <div style={{
                fontSize: '0.72rem',
                color: '#64748B',
                fontWeight: 600,
                marginTop: '2px',
              }}>
                Scan to make a Land Offer
              </div>
            </div>
          )}
        </div>

        {/* TWO EVENT SUB-CARDS: Direct Cash Received vs Pledges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {/* Card 1: Direct Cash Received at Venue */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '2px solid #BFDBFE',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.06)',
          }}>
            <div>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#1D4ED8',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block',
                marginBottom: '4px',
              }}>
                സ്ഥലത്ത് നേരിട്ട് ലഭിച്ച ക്യാഷ് (CASH RECEIVED)
              </span>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)',
                fontWeight: 900,
                color: '#2563EB',
                lineHeight: 1.1,
              }}>
                {formatINRFromPaise(eventVerifiedPaise)}
              </div>
            </div>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
            }}>
              <Coins size={28} />
            </div>
          </div>

          {/* Card 2: Pledged Offers at Venue */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '2px solid #FED7AA',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(234, 88, 12, 0.06)',
          }}>
            <div>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#C2410C',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block',
                marginBottom: '4px',
              }}>
                ഓഫർ ചെയ്ത ബാക്കി തുക (PLEDGED BALANCE)
              </span>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)',
                fontWeight: 900,
                color: '#EA580C',
                lineHeight: 1.1,
              }}>
                {formatINRFromPaise(Math.max(0, eventOfferedPaise - eventVerifiedPaise))}
              </div>
            </div>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: '#FFF7ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EA580C',
            }}>
              <Calendar size={28} />
            </div>
          </div>
        </div>
      </main>

      {/* 3. Bottom Compact Bar: Overall Project Campaign Status */}
      <footer style={{
        marginTop: '16px',
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1.5px solid #E2E8F0',
        padding: '14px 20px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#15803D" />
            <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>
              ആകെ പ്രൊജക്റ്റ് കളക്ഷൻ (OVERALL CAMPAIGN TOTAL):
            </strong>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              fontWeight: 900,
              color: '#15803D',
            }}>
              {formatINRFromPaise(overallTotalVerifiedPaise)}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
              / {formatINRFromPaise(overallTargetPaise)} (19.5 സെന്റ്)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.88rem' }}>
            <span style={{ color: '#64748B' }}>
              ലക്ഷ്യത്തിലേക്ക് ബാക്കി: <strong style={{ color: '#EA580C' }}>{formatINRFromPaise(overallRemainingPaise)}</strong>
            </span>
            <span style={{
              background: '#DCFCE7',
              color: '#15803D',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.8rem',
            }}>
              {overallPercentage}% പൂർത്തിയായി
            </span>
          </div>
        </div>

        {/* Minimal Thin Overall Progress Bar */}
        <div style={{
          width: '100%',
          height: '10px',
          background: '#E2E8F0',
          borderRadius: '9999px',
          overflow: 'hidden',
          marginBottom: '6px',
        }}>
          <div style={{
            width: `${overallPercentage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #22C55E 0%, #15803D 100%)',
            borderRadius: '9999px',
            transition: 'width 1s ease-in-out',
          }} />
        </div>

        {/* Organization & Helpdesk Contact */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.78rem',
          color: '#64748B',
          paddingTop: '4px',
        }}>
          <span>Wisdom Islamic Organization Kuppam Unit • തളിപ്പറമ്പ്</span>
          <span>Contact &amp; WhatsApp: <strong>+91 99477 48552</strong></span>
        </div>
      </footer>
    </div>
  );
}

export default function LiveScreenPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center', color: '#15803D' }}>Loading Event Live Screen...</div>}>
      <LiveScreenContent />
    </Suspense>
  );
}
