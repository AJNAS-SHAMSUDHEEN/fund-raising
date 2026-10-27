import UserStatusCard from '@/components/home/UserStatusCard';
import AppSupport from '@/components/home/AppSupport';
import MalayalamNarrative from '@/components/home/MalayalamNarrative';

export default function HomePage() {
  return (
    <div style={{ padding: '16px 16px 48px', width: '100%' }}>
      <div className="home-container">
        {/* 1. Architectural Banner & "Your Status" Card */}
        <UserStatusCard />

        {/* 2. Campaign Title & Malayalam Description matching Screenshot */}
        <section style={{ textAlign: 'center', marginBottom: '36px', padding: '0 8px' }}>
          <h1 style={{
            fontSize: '1.55rem',
            fontWeight: 800,
            color: '#0F172A',
            fontFamily: 'var(--font-display)',
            marginBottom: '4px',
          }}>
            Wisdom Islamic Organization
          </h1>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#15803D',
            marginBottom: '10px',
          }}>
            Kuppam Unit — Salafi Masjid Land Project
          </div>

          {/* Malayalam Narrative Component (matching screenshot style) */}
          <MalayalamNarrative />
        </section>

        {/* 3. App Support Card & Version 1.0 Strip matching Screenshot */}
        <AppSupport />
      </div>
    </div>
  );
}
