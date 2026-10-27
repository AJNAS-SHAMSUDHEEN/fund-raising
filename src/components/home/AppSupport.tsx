import { Phone, MessageCircle } from 'lucide-react';

export default function AppSupport() {
  const whatsappNumber = '919947748552';
  const phoneNumber = '+919947748552';

  return (
    <section style={{ marginBottom: '24px' }}>
      {/* 1. App Support White Card matching Screenshot */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '24px',
        padding: '28px 20px',
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        marginBottom: '20px',
      }}>
        <h3 style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          color: '#0F172A',
          marginBottom: '6px',
          fontFamily: 'var(--font-display)',
        }}>
          App Support
        </h3>
        <p style={{
          fontSize: '0.92rem',
          color: '#64748B',
          marginBottom: '22px',
        }}>
          Our app support team is here to help you
        </p>

        {/* Action Buttons: WhatsApp & Call side by side */}
        <div style={{
          display: 'flex',
          gap: '12px',
          maxWidth: '380px',
          margin: '0 auto',
        }}>
          {/* WhatsApp Button */}
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Assalamu Alaikum, I have an inquiry regarding Wisdom Islamic Organization Kuppam Unit (Masjid Land Fund).')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1.5px solid #22C55E',
              background: '#FFFFFF',
              color: '#16A34A',
              fontWeight: 700,
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(34, 197, 94, 0.08)',
            }}
          >
            <MessageCircle size={18} color="#16A34A" />
            <span>WhatsApp</span>
          </a>

          {/* Call Button */}
          <a
            href={`tel:${phoneNumber}`}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1.5px solid #3B82F6',
              background: '#FFFFFF',
              color: '#2563EB',
              fontWeight: 700,
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.08)',
            }}
          >
            <Phone size={18} color="#2563EB" />
            <span>Call</span>
          </a>
        </div>
      </div>

      {/* 2. Organization Dark Strip */}
      <div style={{
        background: '#1E2530',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '16px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'lowercase', marginBottom: '2px' }}>
          version 1.0
        </div>
        <div style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#FFFFFF',
          fontFamily: 'var(--font-display)',
        }}>
          Wisdom Islamic Organization Kuppam Unit
        </div>
      </div>
    </section>
  );
}
