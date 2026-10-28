'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  LayoutDashboard,
  Coins,
  CheckCircle2,
  Receipt,
  Users,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Smartphone,
  Lock,
  FileText
} from 'lucide-react';
import { AdminAuthProvider, useAdminAuth, VolunteerStaff } from '@/lib/state/adminAuth';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminUser, isLoading, logout, volunteers, addVolunteer, removeVolunteer } = useAdminAuth();

  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [newVolName, setNewVolName] = useState('');
  const [newVolPhone, setNewVolPhone] = useState('');
  const [newVolPin, setNewVolPin] = useState('');
  const [newVolVenue, setNewVolVenue] = useState('Kuppam Unit Gathering');
  const [modalError, setModalError] = useState('');
  const [isAddingVol, setIsAddingVol] = useState(false);

  // If on login page, render children directly without admin sidebar
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoading && !adminUser && !isLoginPage) {
      router.push('/admin/login');
    }
  }, [adminUser, isLoading, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || !adminUser) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: 'var(--brand-900)',
      }}>
        <div className="spinner" style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--brand-100)',
          borderTopColor: 'var(--brand-800)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Verifying Admin Authorization...</span>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const isSuperAdmin = adminUser.role === 'super_admin';

  // Navigation Items
  const superAdminNavItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Events & Venues', href: '/admin/events', icon: Calendar },
    { label: 'Cash Collection POS', href: '/admin/cash', icon: Coins },
    { label: 'Cash Verification', href: '/admin/verify', icon: CheckCircle2 },
    { label: 'Transactions & Offers', href: '/admin/offers', icon: Receipt },
    { label: 'Financial Reports', href: '/admin/reports', icon: FileText },
    { label: 'Campaign Settings', href: '/admin/settings', icon: Settings },
  ];

  const volunteerNavItems = [
    { label: 'Cash Collection POS', href: '/admin/cash', icon: Coins },
    { label: 'Recent Transactions', href: '/admin/offers', icon: Receipt },
  ];

  const currentNavItems = isSuperAdmin ? superAdminNavItems : volunteerNavItems;

  const handleAddVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsAddingVol(true);
    const res = await addVolunteer(newVolName, newVolPhone, newVolPin, newVolVenue);
    setIsAddingVol(false);

    if (res.success) {
      setNewVolName('');
      setNewVolPhone('');
      setNewVolPin('');
    } else {
      setModalError(res.error || 'Failed to add volunteer');
    }
  };

  return (
    <div className="admin-layout-container">
      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        <div>
          {/* Admin Identity Card */}
          <div style={{
            background: isSuperAdmin ? 'var(--brand-50)' : '#FEF3C7',
            border: `1px solid ${isSuperAdmin ? 'var(--brand-100)' : '#FDE68A'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isSuperAdmin ? 'var(--brand-800)' : '#D97706',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isSuperAdmin ? <ShieldCheck size={20} color="var(--gold-400)" /> : <Smartphone size={18} />}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <strong style={{
                  fontSize: '0.88rem',
                  color: isSuperAdmin ? 'var(--brand-900)' : '#78350F',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}>
                  {adminUser.name}
                </strong>
                <span className={`badge ${isSuperAdmin ? 'badge-gold' : 'badge-brand'}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                  {isSuperAdmin ? 'SUPER ADMIN' : 'VOLUNTEER POS'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
              {isSuperAdmin ? adminUser.email : `+91 ${adminUser.phone}`}
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    background: isActive ? 'var(--brand-800)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={18} color={isActive ? 'var(--gold-400)' : 'currentColor'} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={16} />}
                </Link>
              );
            })}
          </nav>

          {/* Volunteer Management Button for Super Admin */}
          {isSuperAdmin && (
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => setIsVolunteerModalOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  background: 'var(--brand-50)',
                  color: 'var(--brand-900)',
                  border: '1.5px dashed var(--brand-300)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="var(--brand-800)" />
                  <span>Manage Volunteers</span>
                </div>
                <span className="badge badge-brand" style={{ fontSize: '0.7rem' }}>
                  {volunteers.length}
                </span>
              </button>
            </div>
          )}

          {/* Open Live Screen Button */}
          <div style={{ marginTop: '14px', marginBottom: '8px' }}>
            <Link
              href="/live"
              target="_blank"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                color: '#FFFFFF',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📺 Open Live Screen ↗</span>
            </Link>
          </div>
        </div>

        {/* Footer actions: Logout */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push('/admin/login');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.86rem',
              color: '#DC2626',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 4px',
              fontWeight: 700,
            }}
          >
            <LogOut size={16} />
            <span>Sign Out (ലോഗൗട്ട്)</span>
          </button>

          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            <span>← Return to Public Site</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="admin-main-content">
        {children}
      </main>

      {/* SUPER ADMIN VOLUNTEER MANAGEMENT MODAL */}
      {isVolunteerModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand-900)', margin: '0 0 4px' }}>
                  Volunteer Management (വോളന്റിയർമാർ)
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Add venue volunteers with mobile number and a 4-digit PIN for Cash POS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVolunteerModalOpen(false)}
                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form to Add Volunteer */}
            <form onSubmit={handleAddVolunteerSubmit} style={{
              background: '#F8FAFC',
              padding: '16px',
              borderRadius: '14px',
              border: '1px solid var(--border-medium)',
              marginBottom: '22px',
            }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--brand-900)', display: 'block', marginBottom: '12px' }}>
                + Add New Volunteer (പുതിയ വോളന്റിയറെ ചേർക്കുക)
              </strong>

              {modalError && (
                <div style={{ color: '#DC2626', fontSize: '0.82rem', marginBottom: '10px' }}>
                  {modalError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Volunteer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shaheer K"
                    value={newVolName}
                    onChange={(e) => setNewVolName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9847123456"
                    value={newVolPhone}
                    onChange={(e) => setNewVolPhone(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    4-Digit Security PIN *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    placeholder="1234"
                    value={newVolPin}
                    onChange={(e) => setNewVolPin(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', fontSize: '1rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 800 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Assigned Venue Tag
                  </label>
                  <input
                    type="text"
                    value={newVolVenue}
                    onChange={(e) => setNewVolVenue(e.target.value)}
                    placeholder="Kuppam Unit Gathering"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAddingVol}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '0.9rem', gap: '6px' }}
              >
                <Plus size={16} />
                <span>{isAddingVol ? 'Adding...' : 'Add Volunteer Staff'}</span>
              </button>
            </form>

            {/* List of Active Volunteers */}
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--brand-900)', display: 'block', marginBottom: '10px' }}>
                Active Volunteers List ({volunteers.length})
              </strong>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {volunteers.map((vol) => (
                  <div
                    key={vol.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#0F172A', display: 'block' }}>
                        {vol.name}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        📱 +91 {vol.phone} • PIN: •••• ({vol.assignedVenue || 'General'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeVolunteer(vol.id)}
                      title="Delete volunteer"
                      style={{
                        padding: '6px 8px',
                        background: '#FEE2E2',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#DC2626',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminAuthProvider>
  );
}
