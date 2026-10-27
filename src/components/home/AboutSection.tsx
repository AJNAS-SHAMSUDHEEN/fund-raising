import { ShieldCheck, Building2, CheckCircle2, FileText } from 'lucide-react';

export default function AboutSection() {
  return (
    <section style={{ padding: 'var(--space-16) 0', background: 'var(--bg-base)' }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-10)',
          alignItems: 'center',
        }}>
          {/* Narrative & Mission */}
          <div>
            <span className="badge badge-brand" style={{ marginBottom: '12px' }}>
              <Building2 size={14} /> Trust &amp; Transparency
            </span>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
              fontWeight: 800,
              color: 'var(--brand-900)',
              lineHeight: 1.2,
              marginBottom: '16px',
            }}>
              A Foundation Built on Complete Financial Integrity
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '20px' }}>
              The Masjid Fund project is established under a registered public charitable trust. Every single rupee received online or via physical cash is verified by authorized committee members and reflected instantaneously on our public ledger and live event screens.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle2 size={20} color="var(--brand-700)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--brand-900)', fontSize: '0.95rem' }}>100% Verified Collections:</strong>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    No estimated or unconfirmed pledges are counted. All collections are backed by verified gateway captures or physical cash audits.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle2 size={20} color="var(--brand-700)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--brand-900)', fontSize: '0.95rem' }}>Instant Official Receipts:</strong>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Immediate digital receipt generation with unique serial numbers and cryptographic QR code verification.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle2 size={20} color="var(--brand-700)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--brand-900)', fontSize: '0.95rem' }}>Multi-Admin Cash Control:</strong>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Field collections require dual-control verification before addition to the campaign aggregate.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Official Bank Account Card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '2px solid var(--gold-400)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            boxShadow: 'var(--shadow-md)',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--gold-100)',
                color: 'var(--gold-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FileText size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-900)' }}>
                  Direct Bank Transfer (NEFT/RTGS/IMPS)
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official Trust Account</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Name:</span>
                <strong style={{ color: 'var(--brand-900)' }}>CENTRAL MASJID CONSTRUCTION TRUST</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Number:</span>
                <strong style={{ color: 'var(--brand-900)', fontFamily: 'var(--font-display)', fontSize: '1.05rem', letterSpacing: '0.04em' }}>
                  926010001234567
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>IFSC Code:</span>
                <strong style={{ color: 'var(--brand-900)', fontFamily: 'var(--font-display)' }}>
                  UTIB0000123
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bank &amp; Branch:</span>
                <strong style={{ color: 'var(--brand-900)' }}>Axis Bank, Kerala Main Branch</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>UPI ID:</span>
                <strong style={{ color: 'var(--gold-700)', fontFamily: 'var(--font-display)' }}>
                  masjidfund@upi
                </strong>
              </div>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-50)',
              border: '1px solid var(--brand-100)',
              fontSize: '0.8rem',
              color: 'var(--brand-800)',
              lineHeight: 1.5,
            }}>
              After direct bank transfer, please contact our committee with UTR reference number to issue your official verified receipt.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
