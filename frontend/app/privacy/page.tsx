import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Privacy Policy | CockroachTalk',
  description: 'Privacy Policy and anonymous data handling guidelines for CockroachTalk.'
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Back button */}
      <div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="border-b-3 border-border pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 text-primary font-mono text-xs uppercase font-bold tracking-wider">
          <Shield className="h-4 w-4" /> Legal & Compliance
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-mono uppercase tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Last Updated: September 2026 • Consent Version: 1.0
        </p>
      </div>

      {/* Legal Notice Banner */}
      <div className="p-4 rounded-brutal-md border-3 border-accent-gold bg-accent-gold/10 text-accent-gold space-y-1">
        <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase">
          <AlertTriangle className="h-4 w-4" /> Legal Copy Notice
        </div>
        <p className="text-xs font-mono font-bold">
          [PLACEHOLDER — replace with reviewed legal copy]
        </p>
        <p className="text-xs opacity-90">
          This draft outlines the operational privacy design of CockroachTalk. Formal reviewed legal terms will replace this placeholder text.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-6 text-sm text-muted-foreground font-sans leading-relaxed">
        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            1. Zero Personal Identifiable Information (PII)
          </h2>
          <p className="text-xs leading-normal">
            CockroachTalk operates under a strict privacy-by-design, zero-PII model. We never request, collect, or store your real legal name, email address, phone number, physical address, contacts, or passwords.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy on data minimization practices]
          </p>
        </div>

        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            2. Anonymous Handles & Identity
          </h2>
          <p className="text-xs leading-normal">
            Your participant identity is an ephemeral tag (e.g. #1042) paired with a randomly generated cultural pseudonym. Gender selection during onboarding is strictly used once to draw from regional name lists and is never shared, profiled, or used for targeted experiences.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy regarding pseudonym generation and anonymity guarantees]
          </p>
        </div>

        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            3. Cookies & Local Storage Usage
          </h2>
          <p className="text-xs leading-normal">
            We use an httpOnly session cookie to maintain your socket connection and prevent session hijacking. Consent verification (age confirmation, terms acceptance, and version code) is stored locally on your device in your browser's localStorage. No third-party tracking or advertising cookies are utilized.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy specifying cookie lifespans and regulatory disclosures]
          </p>
        </div>

        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            4. Real-Time Audio & WebRTC Streams
          </h2>
          <p className="text-xs leading-normal">
            Voice debates are broadcast in real time using encrypted WebRTC streams. CockroachTalk does not archive, record, or store live voice junction audio feeds on our servers.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy detailing audio transmission, WebRTC protocols, and ephemeral data policies]
          </p>
        </div>

        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            5. Age Eligibility (18+)
          </h2>
          <p className="text-xs leading-normal">
            CockroachTalk is strictly intended for individuals 18 years of age or older. We do not knowingly permit minors to access live voice debate rooms. Self-attested age verification is required prior to entering any chat room.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy regarding COPPA/child privacy protections and age restrictions]
          </p>
        </div>

        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            6. Inquiries & Content Removal
          </h2>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy containing designated compliance contact email and DMCA/abuse reporting procedures]
          </p>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t-2 border-border">
        <Button asChild variant="outline" size="sm">
          <Link href="/terms" className="gap-2">
            <FileText className="h-4 w-4" /> View Terms of Service
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/junctions">
            Explore Junctions
          </Link>
        </Button>
      </div>
    </div>
  );
}
