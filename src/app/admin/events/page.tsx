'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { INITIAL_EVENTS } from '@/lib/state/mockStore';
import { CampaignEvent } from '@/lib/types';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import EventQRCode from '@/components/common/EventQRCode';
import {
  Calendar,
  Plus,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  MapPin,
  TrendingUp,
  X,
  Printer,
  Sparkles
} from 'lucide-react';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<CampaignEvent[]>(INITIAL_EVENTS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<{ id: string; name: string; url: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // New Event Form State
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [targetRupees, setTargetRupees] = useState('');

  // Host URL for generating absolute links
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !eventLocation.trim()) return;

    // Generate slug from event name
    const slug = eventName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newEvent: CampaignEvent = {
      id: slug || `event-${Date.now()}`,
      name: eventName.trim(),
      location: eventLocation.trim(),
      totalOfferedPaise: 0,
      totalVerifiedPaise: 0,
      offerCount: 0,
      verifiedCount: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    setEvents([newEvent, ...events]);
    setIsCreateOpen(false);
    setEventName('');
    setEventLocation('');
    setTargetRupees('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px',
      }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
            <Calendar size={14} /> Programs &amp; Venues Management
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand-900)' }}>
            Events &amp; Venues
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Create venue events, copy presentation links, and generate attendee QR codes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="btn btn-primary"
          style={{ padding: '12px 20px', fontWeight: 700, gap: '8px', fontSize: '0.95rem' }}
        >
          <Plus size={18} />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Events Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px',
      }}>
        {events.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            padding: '48px 24px',
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '2px dashed var(--brand-200)',
            textAlign: 'center',
          }}>
            <Calendar size={44} color="var(--brand-400)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-900)', margin: '0 0 6px' }}>
              No Events Created Yet
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 20px' }}>
              The system is fresh and ready! Click below to create your first venue gathering, public fundraising program, or Friday collection event.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontWeight: 700, gap: '8px', margin: '0 auto' }}
            >
              <Plus size={18} />
              <span>Create First Event</span>
            </button>
          </div>
        ) : (
          events.map((ev) => {
          const liveUrl = `${origin}/live?event=${ev.id}`;
          const offerUrl = `${origin}/offer?event=${ev.id}`;

          return (
            <div
              key={ev.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1.5px solid #BBF7D0',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '18px',
              }}
            >
              {/* Event Title & Location Badge */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#14532D', margin: 0 }}>
                    {ev.name}
                  </h3>
                  <span style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    border: '1px solid #86EFAC',
                    whiteSpace: 'nowrap',
                  }}>
                    📍 {ev.location}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Event Code: <code style={{ color: '#15803D', fontWeight: 700 }}>{ev.id}</code>
                </div>

                {/* Amount Raised so far */}
                <div style={{
                  background: '#F0FDF4',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginTop: '14px',
                  border: '1px solid #BBF7D0',
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', display: 'block' }}>
                    Event Collection (Starts at ₹0)
                  </span>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.7rem',
                    fontWeight: 900,
                    color: '#15803D',
                    lineHeight: 1.1,
                    marginTop: '2px',
                  }}>
                    {formatINRFromPaise(ev.totalOfferedPaise)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                    {ev.offerCount} contributions recorded at this venue
                  </div>
                </div>
              </div>

              {/* Action Links & QR Code Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* 1. Projector Live Screen Link */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.82rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>📺 Projector Screen:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopy(liveUrl, `live-${ev.id}`)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: copiedLink === `live-${ev.id}` ? '#15803D' : '#475569',
                      }}
                    >
                      {copiedLink === `live-${ev.id}` ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedLink === `live-${ev.id}` ? 'Copied' : 'Copy'}</span>
                    </button>
                    <Link
                      href={`/live?event=${ev.id}`}
                      target="_blank"
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: '#15803D',
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Open</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>

                {/* 2. Venue Offer Form Link */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.82rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>🔗 Attendee Offer Link:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopy(offerUrl, `offer-${ev.id}`)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: copiedLink === `offer-${ev.id}` ? '#15803D' : '#475569',
                      }}
                    >
                      {copiedLink === `offer-${ev.id}` ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedLink === `offer-${ev.id}` ? 'Copied' : 'Copy'}</span>
                    </button>
                    <Link
                      href={`/offer?event=${ev.id}`}
                      target="_blank"
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#0F172A',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Open</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>

                {/* 3. Venue QR Code Button */}
                <button
                  type="button"
                  onClick={() => setSelectedQR({ id: ev.id, name: ev.name, url: offerUrl })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    color: '#B45309',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <QrCode size={16} />
                  <span>Show &amp; Print Attendee QR Code</span>
                </button>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Modal: Create New Event */}
      {isCreateOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '480px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            border: '2px solid #86EFAC',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={22} color="#15803D" />
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-900)', margin: 0 }}>
                  Create New Event
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent}>
              {/* Event Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Event / Program Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ulikkal Family Meet"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Event Location */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Venue / Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ulikkal, Taliparamba"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Optional Target */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Target for this Venue (₹ Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={targetRupees}
                  onChange={(e) => setTargetRupees(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.95rem',
                  }}
                />
                <small style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  The live projector screen will start at ₹0 and increment as offers arrive.
                </small>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '12px', fontWeight: 800 }}
                >
                  Create &amp; Generate Links
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Attendee QR Code Display */}
      {selectedQR && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '440px',
            width: '100%',
            padding: '32px 24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setSelectedQR(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#14532D', marginBottom: '4px' }}>
              {selectedQR.name}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '20px' }}>
              Venue Attendee Offer QR Code • Wisdom Islamic Organization
            </p>

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
              <EventQRCode
                url={selectedQR.url}
                size={220}
                title="സ്കാൻ ചെയ്ത് ഓഫർ ചെയ്യുക"
                subtitle="Scan to make a Land Offer"
              />
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '20px', wordBreak: 'break-all' }}>
              URL: <code style={{ color: '#15803D' }}>{selectedQR.url}</code>
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleCopy(selectedQR.url, 'modal-qr')}
                className="btn btn-outline"
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', gap: '6px' }}
              >
                {copiedLink === 'modal-qr' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink === 'modal-qr' ? 'Copied' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', gap: '6px' }}
              >
                <Printer size={14} />
                <span>Print QR Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
