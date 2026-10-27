import type { Metadata } from 'next';
import '@/styles/globals.css';
import Navbar from '@/components/common/Navbar';
import StickyBottomBar from '@/components/common/StickyBottomBar';
import WelcomeModal from '@/components/common/WelcomeModal';
import { UserSessionProvider } from '@/lib/state/userSession';

export const metadata: Metadata = {
  title: 'Wisdom Islamic Organization Kuppam Unit — Salafi Masjid Land Project',
  description: 'തളിപ്പറമ്പ് കുപ്പം പ്രദേശത്ത് സലഫി മസ്ജിദിനായി 19.5 സെന്റ് സ്ഥലം ഏറ്റെടുക്കുന്ന പദ്ധതി. വിസ്ഡം ഇസ്ലാമിക് ഓർഗനൈസേഷൻ കുപ്പം യൂണിറ്റ്. 1,10,00,000 രൂപ ലക്ഷ്യം.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <UserSessionProvider>
          <WelcomeModal />
          <Navbar />
          <main style={{ paddingBottom: '110px' }}>{children}</main>
          <StickyBottomBar />
        </UserSessionProvider>
      </body>
    </html>
  );
}
