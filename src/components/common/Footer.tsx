import Link from 'next/link';
import { Landmark, Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--brand-900)',
      color: 'var(--text-on-dark)',
      paddingTop: 'var(--space-12)',
      paddingBottom: 'var(--space-8)',
      marginTop: 'var(--space-16)',
      borderTop: '3px solid var(--gold-500)',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-8)',
          marginBottom: 'var(--space-10)',
        }}>
          {/* Brand & Purpose */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <BrandLogo size={42} />
              <div>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  color: '#FFFFFF',
                  display: 'block',
                  lineHeight: 1.2,
                }}>
                  Wisdom Islamic Organization
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--gold-400)', fontWeight: 600 }}>
                  Kuppam Unit • തളിപ്പറമ്പ്
                </span>
              </div>
            </div>
            <p style={{ color: 'var(--text-on-dark-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              A transparent, community-driven fundraising initiative to acquire 19.5 Cents of land and construct a central Islamic center in Kerala, India. Every contribution brings us closer to completion.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{
              color: 'var(--gold-400)',
              fontSize: '1rem',
              fontWeight: 700,
              marginBottom: '16px',
              fontFamily: 'var(--font-display)',
            }}>
              QUICK ACCESS
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <li>
                <Link href="/offer" style={{ color: 'var(--text-on-dark-muted)', transition: 'color 0.2s' }}>
                  → Make Land Offer / Donation
                </Link>
              </li>
              <li>
                <Link href="/history" style={{ color: 'var(--text-on-dark-muted)', transition: 'color 0.2s' }}>
                  → Payments &amp; History
                </Link>
              </li>
              <li>
                <Link href="/live" target="_blank" style={{ color: 'var(--text-on-dark-muted)', transition: 'color 0.2s' }}>
                  → Live Screen (തത്സമയ സ്ക്രീൻ) ↗
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Transparency */}
          <div>
            <h4 style={{
              color: 'var(--gold-400)',
              fontSize: '1rem',
              fontWeight: 700,
              marginBottom: '16px',
              fontFamily: 'var(--font-display)',
            }}>
              OFFICIAL CONTACT
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: 'var(--text-on-dark-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={18} color="var(--gold-400)" />
                <span>Wisdom Islamic Organization, Kuppam Unit, Taliparamba, Kerala</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={18} color="var(--gold-400)" />
                <span>+91 99477 48552</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={18} color="var(--gold-400)" />
                <span>kuppam@wisdomkerala.org</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} color="var(--gold-400)" />
                <span>Audited &amp; verified financial records</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer & Copyright */}
        <div style={{
          borderTop: '1px solid var(--border-dark)',
          paddingTop: 'var(--space-6)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-on-dark-muted)',
        }}>
          <div>
            © {new Date().getFullYear()} Wisdom Islamic Organization Kuppam Unit. All Rights Reserved.
          </div>
          <div>
            Contributions represent charitable sponsorships/donations towards Salafi Masjid Kuppam Land Acquisition.
          </div>
        </div>
      </div>
    </footer>
  );
}
