import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Terms of Service | CockroachTalk',
  description: 'Terms of Service and participant rules for CockroachTalk live voice junctions.'
};

export default function TermsPage() {
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
          <FileText className="h-4 w-4" /> Platform Agreement
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-mono uppercase tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Last Updated: September 2026 • Version: 1.0
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
          This document represents the platform agreement draft. Formal reviewed legal language will replace this placeholder text.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-6 text-sm text-muted-foreground font-sans leading-relaxed">
        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            1. Age Eligibility (18+ Requirement)
          </h2>
          <p className="text-xs leading-normal">
            You must be at least 18 years old to access or participate in CockroachTalk voice junctions. By completing the initial consent confirmation, you self-attest that you are 18 years of age or older. Any user discovered to be under 18 will be permanently prohibited from the platform.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy regarding legal capacity and binding representations]
          </p>
        </div>

        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            2. Acceptable Conduct & Zero-Tolerance Violations
          </h2>
          <p className="text-xs leading-normal">
            CockroachTalk fosters spontaneous, energetic debate. However, unlawful speech, targeted harassment, hate speech, threats of physical harm, sexual solicitation, non-consensual sharing of personal information (doxxing), and automated bot abuse are strictly prohibited.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy detailing prohibited activities and platform community guidelines]
          </p>
        </div>

        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            3. Stage Moderation & Enforcement
          </h2>
          <p className="text-xs leading-normal">
            Live rooms feature decentralized community moderation. Active participants who maintain constructive stage presence for 10+ minutes earn moderator privileges (up to 4 per junction). Room moderators and administrators reserve the right to mute, demote to audience, or permanently ban disruptive members.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy on moderation rights, automated tag bans, and appeal mechanisms]
          </p>
        </div>

        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            4. Real-Time Audio Broadcasts & Assumption of Risk
          </h2>
          <p className="text-xs leading-normal">
            Audio transmitted on stage is broadcast live to all listening participants in that state junction. Do not disclose sensitive personal information over live voice streams.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy covering user-generated content, live transmission risks, and intellectual property]
          </p>
        </div>

        <div className="p-5 rounded-brutal-md border-2 border-border bg-card space-y-3">
          <h2 className="font-mono font-bold text-foreground text-sm uppercase flex items-center gap-2">
            5. Disclaimers & Limitation of Liability
          </h2>
          <p className="text-xs leading-normal">
            CockroachTalk is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind.
          </p>
          <p className="text-xs leading-normal">
            [PLACEHOLDER — replace with reviewed legal copy specifying liability caps, warranties disclaimer, and governing jurisdiction]
          </p>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t-2 border-border">
        <Button asChild variant="outline" size="sm">
          <Link href="/privacy" className="gap-2">
            <Shield className="h-4 w-4" /> View Privacy Policy
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
