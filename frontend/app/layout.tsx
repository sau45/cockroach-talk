import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ConsentGate } from '@/components/onboarding/ConsentGate';

export const metadata: Metadata = {
  title: 'CockroachTalk | Live State Voice Rooms. Every State Has a Room.',
  description: 'Join live, anonymous state cockroach voice rooms across India. Zero login required. WebRTC encrypted live audio streaming.',
  metadataBase: new URL('https://cockroachtalk.com')
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ConsentGate />
      </body>
    </html>
  );
}
