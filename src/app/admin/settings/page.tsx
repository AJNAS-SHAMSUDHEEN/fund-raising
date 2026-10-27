'use client';

import { useState } from 'react';
import { INITIAL_CAMPAIGN } from '@/lib/state/mockStore';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import { Settings, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function CampaignSettingsPage() {
  const [targetRupees, setTargetRupees] = useState(INITIAL_CAMPAIGN.targetAmountPaise / 100);
  const [landAreaCent, setLandAreaCent] = useState(INITIAL_CAMPAIGN.landAreaCent);
  const [landAreaSqFt, setLandAreaSqFt] = useState(INITIAL_CAMPAIGN.landAreaSqFt);
  const [centRateRupees, setCentRateRupees] = useState(INITIAL_CAMPAIGN.centRatePaise / 100);
  const [sqFtRateRupees, setSqFtRateRupees] = useState(INITIAL_CAMPAIGN.sqFtRatePaise / 100);
  const [musallaRateRupees, setMusallaRateRupees] = useState(INITIAL_CAMPAIGN.musallaRatePaise / 100);
  const [package5Rupees, setPackage5Rupees] = useState(INITIAL_CAMPAIGN.musallaPackage5Paise / 100);
  const [liveScreenMode, setLiveScreenMode] = useState(INITIAL_CAMPAIGN.liveScreenMode);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
          <Settings size={14} /> Super Admin Configuration
        </span>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand-900)' }}>
          Campaign Settings &amp; Rate Configuration
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Configurable campaign parameters. Rates are versioned and recalculated server-side.
        </p>
      </div>

      {savedSuccess && (
        <div style={{
          background: 'var(--status-success-bg)',
          border: '1px solid var(--status-success)',
          color: 'var(--status-success)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <CheckCircle2 size={18} />
          <strong>Campaign settings updated successfully! New pricing version created.</strong>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Section 1: Campaign Targets & Land */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          border: '1px solid var(--border-light)',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '16px' }}>
            1. Campaign Target &amp; Land Area
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Total Target Amount (INR)
              </label>
              <input
                type="number"
                value={targetRupees}
                onChange={(e) => setTargetRupees(parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>Initial: ₹1,10,00,000 (1.10 Crore)</small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Total Land Area (Cent)
              </label>
              <input
                type="number"
                step="0.1"
                value={landAreaCent}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLandAreaCent(val);
                  setLandAreaSqFt(parseFloat((val * 435.6).toFixed(1)));
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  fontWeight: 700,
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>Initial: 19.5 Cent</small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Approx Area (Sq. Ft. @ 435.6/Cent)
              </label>
              <input
                type="number"
                value={landAreaSqFt}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-subtle)',
                  fontWeight: 700,
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>Auto-calculated: 8,494.2 Sq. Ft.</small>
            </div>
          </div>
        </div>

        {/* Section 2: Indicative Unit Rates */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          border: '1px solid var(--border-light)',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '16px' }}>
            2. Indicative Unit Rates &amp; Packages
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Rate Per Cent (INR)
              </label>
              <input
                type="number"
                value={centRateRupees}
                onChange={(e) => setCentRateRupees(parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  fontWeight: 700,
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>Standard: ₹5,64,103</small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Rate Per Square Foot (INR)
              </label>
              <input
                type="number"
                value={sqFtRateRupees}
                onChange={(e) => setSqFtRateRupees(parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  fontWeight: 700,
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>Standard: ₹1,295</small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Rate Per Musalla (8 Sq. Ft.)
              </label>
              <input
                type="number"
                value={musallaRateRupees}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setMusallaRateRupees(val);
                  setPackage5Rupees(val * 5);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  fontWeight: 700,
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>Standard: ₹10,360</small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                5-Musalla Package Rate
              </label>
              <input
                type="number"
                value={package5Rupees}
                onChange={(e) => setPackage5Rupees(parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  fontWeight: 700,
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>Standard: ₹51,800</small>
            </div>
          </div>
        </div>

        {/* Section 3: Live Screen Display Mode */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          border: '1px solid var(--border-light)',
          marginBottom: '28px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-900)', marginBottom: '16px' }}>
            3. Live Screen Presentation Defaults
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Public Display Mode for Projectors (`/live`)
            </label>
            <select
              value={liveScreenMode}
              onChange={(e) => setLiveScreenMode(e.target.value as any)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                fontWeight: 600,
              }}
            >
              <option value="totals_only">1. Totals &amp; Progress Bar Only</option>
              <option value="anonymous_feed">2. Anonymous Ticker Feed (&quot;A Well Wisher&quot;) (Default)</option>
              <option value="public_feed">3. Public Contributor Names &amp; Amounts (Consented)</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            className="btn btn-gold"
            style={{ padding: '14px 28px', fontSize: '1rem', fontWeight: 800, gap: '8px' }}
          >
            <Save size={18} />
            <span>Save Campaign Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
