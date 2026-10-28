import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import Navbar from '@/components/common/Navbar';
import StickyBottomBar from '@/components/common/StickyBottomBar';
import WelcomeModal from '@/components/common/WelcomeModal';
import PwaRegister from '@/components/common/PwaRegister';
import { UserSessionProvider } from '@/lib/state/userSession';

export const viewport: Viewport = {
  themeColor: '#064E3B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Wisdom Islamic Organization Kuppam Unit — Salafi Masjid Land Project',
  description: 'തളിപ്പറമ്പ് കുപ്പം പ്രദേശത്ത് സലഫി മസ്ജിദിനായി 19.5 സെന്റ് സ്ഥലം ഏറ്റെടുക്കുന്ന പദ്ധതി. വിസ്ഡം ഇസ്ലാമിക് ഓർഗനൈസേഷൻ കുപ്പം യൂണിറ്റ്. 1,10,00,000 രൂപ ലക്ഷ്യം.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Masjid Kuppam',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <PwaRegister />
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
