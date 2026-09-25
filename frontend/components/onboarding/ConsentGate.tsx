'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  User,
  Users,
  Check,
  ExternalLink,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthorTag } from '@/hooks/useAuthorTag';

import { cn } from '@/lib/utils';

export const CURRENT_CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = 'ct_consent_state';

export interface ConsentRecord {
  version: number;
  ageConfirmed: boolean;
  termsAccepted: boolean;
  gender: 'male' | 'female' | 'skip';
  timestamp: number;
}

export function isConsentComplete(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return false;
    const record: ConsentRecord = JSON.parse(stored);
    return (
      record.version === CURRENT_CONSENT_VERSION &&
      record.ageConfirmed === true &&
      record.termsAccepted === true
    );
  } catch {
    return false;
  }
}

type GateStep = 1 | 2 | 3 | 'blocked_age' | 'blocked_terms';

export function ConsentGate() {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<GateStep>(1);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'skip'>('skip');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { submitConsent } = useAuthorTag();

  // Only gate automatically when the user tries to enter a junction room (e.g. /room/...)
  const isJunctionRoute = pathname?.startsWith('/room');

  useEffect(() => {
    setIsMounted(true);

    if (!isJunctionRoute) {
      return;
    }

    if (isConsentComplete()) {
      setIsOpen(false);
      return;
    }

    // First visit entering any junction: trigger gate
    setIsOpen(true);
    setStep(1);
  }, [pathname, isJunctionRoute]);

  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      setIsOpen(true);
      const isComplete = isConsentComplete();
      setStep(e.detail?.step || (isComplete ? 3 : 1));
    };

    window.addEventListener('open-consent-gate', handleOpenEvent as EventListener);
    return () => {
      window.removeEventListener('open-consent-gate', handleOpenEvent as EventListener);
    };
  }, []);

  if (!isMounted || !isOpen) {
    return null;
  }

  const handleAgeConfirm = () => {
    setStep(2);
  };

  const handleAgeDecline = () => {
    setStep('blocked_age');
  };

  const handleTermsAccept = () => {
    setStep(3);
  };

  const handleTermsDecline = () => {
    setStep('blocked_terms');
  };

  const handleCompleteConsent = async () => {
    setIsSubmitting(true);
    try {
      // 1. Submit gender to backend to generate gender-aligned realistic name
      await submitConsent(selectedGender);

      // 2. Persist consent state locally with versioning
      const record: ConsentRecord = {
        version: CURRENT_CONSENT_VERSION,
        ageConfirmed: true,
        termsAccepted: true,
        gender: selectedGender,
        timestamp: Date.now()
      };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      window.dispatchEvent(new CustomEvent('ct-consent-updated', { detail: record }));

      // 3. Close the gate and let user into junction
      setIsOpen(false);
    } catch (err) {
      console.error('Error completing consent:', err);
      // Fallback: still persist locally so user is not stuck
      const record: ConsentRecord = {
        version: CURRENT_CONSENT_VERSION,
        ageConfirmed: true,
        termsAccepted: true,
        gender: selectedGender,
        timestamp: Date.now()
      };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      window.dispatchEvent(new CustomEvent('ct-consent-updated', { detail: record }));
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isJunctionRoute) setIsOpen(open);
    }}>
      <DialogContent
        onPointerDownOutside={(e) => {
          if (isJunctionRoute) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isJunctionRoute) e.preventDefault();
        }}
        className={cn(
          "max-w-md w-[92vw] border-4 border-border bg-card shadow-brutal-lg rounded-brutal-md p-6 sm:p-7 gap-5",
          isJunctionRoute && "[&>button]:hidden"
        )}
      >
        {/* STEP 1: Age Confirmation (18+) */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <DialogHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  Step 1 of 3 • Junction Gate
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">v{CURRENT_CONSENT_VERSION}.0</span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black font-mono uppercase tracking-tight flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-accent-coral" />
                Age Verification
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground font-sans leading-relaxed pt-1">
                CockroachTalk contains unmoderated real-time voice debates across 28 Indian state junctions. You must be <strong className="text-foreground font-mono">18 years of age or older</strong> to enter this room.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-brutal-sm border-2 border-border bg-secondary/40 space-y-1 text-xs text-muted-foreground">
              <p className="font-mono font-bold text-foreground uppercase">Privacy Notice</p>
              <p>We do not collect birthdates or personal documents. This is a one-time self-attested consent gate.</p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleAgeConfirm}
                size="lg"
                className="w-full font-mono font-bold uppercase tracking-wider text-sm gap-2"
              >
                I am 18 or older <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleAgeDecline}
                variant="outline"
                size="lg"
                className="w-full font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive hover:border-destructive"
              >
                I am under 18
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Privacy Policy + Terms Acceptance */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <DialogHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  Step 2 of 3 • Junction Gate
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">v{CURRENT_CONSENT_VERSION}.0</span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black font-mono uppercase tracking-tight flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Terms & Privacy
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground font-sans leading-relaxed pt-1">
                Please review and explicitly accept our Terms of Service and Privacy Policy before joining live junctions.
              </DialogDescription>
            </DialogHeader>

            {/* Links to legal pages */}
            <div className="space-y-2">
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-brutal-sm border-2 border-border bg-secondary/30 hover:border-primary hover:bg-secondary/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs font-bold uppercase group-hover:text-primary transition-colors">
                    Terms of Service
                  </span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>

              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-brutal-sm border-2 border-border bg-secondary/30 hover:border-primary hover:bg-secondary/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs font-bold uppercase group-hover:text-primary transition-colors">
                    Privacy Policy
                  </span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </div>

            <div className="p-3 rounded-brutal-sm border-2 border-border bg-secondary/20 text-[11px] text-muted-foreground font-sans">
              <p>
                By clicking <strong>&quot;I Agree &amp; Accept&quot;</strong>, you acknowledge that you have reviewed and agree to the platform rules, stage moderation policies, and privacy principles.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleTermsAccept}
                size="lg"
                className="w-full font-mono font-bold uppercase tracking-wider text-sm gap-2"
              >
                I Agree & Accept <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleTermsDecline}
                variant="outline"
                size="lg"
                className="w-full font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive hover:border-destructive"
              >
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Gender Selection (Determines Name Pool) */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <DialogHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  Step 3 of 3 • Persona Setup
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">Identity</span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black font-mono uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-accent-gold" />
                Select Persona Pool
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground font-sans leading-relaxed pt-1">
                CockroachTalk generates a realistic anonymous pseudonym for you. Choose which name pool to sample your initial handle from:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setSelectedGender('male')}
                className={`w-full text-left p-3.5 rounded-brutal-sm border-2 transition-all flex items-center justify-between ${
                  selectedGender === 'male'
                    ? 'border-primary bg-primary/10 shadow-brutal-sm'
                    : 'border-border bg-secondary/30 hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-brutal-sm border border-border bg-secondary text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-xs uppercase text-foreground">Male Pool</p>
                    <p className="text-[11px] text-muted-foreground font-sans">e.g. Harpreet, Karthik, Aditya, Liam</p>
                  </div>
                </div>
                {selectedGender === 'male' && <Check className="h-4 w-4 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedGender('female')}
                className={`w-full text-left p-3.5 rounded-brutal-sm border-2 transition-all flex items-center justify-between ${
                  selectedGender === 'female'
                    ? 'border-primary bg-primary/10 shadow-brutal-sm'
                    : 'border-border bg-secondary/30 hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-brutal-sm border border-border bg-secondary text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-xs uppercase text-foreground">Female Pool</p>
                    <p className="text-[11px] text-muted-foreground font-sans">e.g. Simran, Tanvi, Priya, Emma</p>
                  </div>
                </div>
                {selectedGender === 'female' && <Check className="h-4 w-4 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedGender('skip')}
                className={`w-full text-left p-3.5 rounded-brutal-sm border-2 transition-all flex items-center justify-between ${
                  selectedGender === 'skip'
                    ? 'border-primary bg-primary/10 shadow-brutal-sm'
                    : 'border-border bg-secondary/30 hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-brutal-sm border border-border bg-secondary text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-xs uppercase text-foreground">Prefer Not to Say / Anonymous</p>
                    <p className="text-[11px] text-muted-foreground font-sans">Assigns a unique identifier (e.g. Cockroach #1042)</p>
                  </div>
                </div>
                {selectedGender === 'skip' && <Check className="h-4 w-4 text-primary" />}
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground font-sans">
              * Used strictly for realistic name generation. CockroachTalk never shares or profiles your gender selection.
            </p>

            <div className="pt-2">
              <Button
                onClick={handleCompleteConsent}
                disabled={isSubmitting}
                size="lg"
                className="w-full font-mono font-bold uppercase tracking-wider text-sm gap-2"
              >
                {isSubmitting ? 'Generating Identity...' : 'Enter CockroachTalk'}
              </Button>
            </div>
          </div>
        )}

        {/* BLOCKED STATE: Under 18 */}
        {step === 'blocked_age' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div className="p-5 rounded-brutal-md border-3 border-destructive bg-destructive/10 space-y-3">
              <div className="flex items-center gap-2 font-mono font-black text-sm uppercase text-destructive">
                <ShieldAlert className="h-5 w-5" /> Access Restricted
              </div>
              <p className="text-xs text-foreground/90 font-sans leading-relaxed">
                CockroachTalk is strictly for users 18 years of age or older. Because you indicated that you are under 18, access to live voice debate junctions is unavailable.
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                Thank you for your understanding. Please return once you reach 18.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                size="sm"
                className="w-full font-mono text-xs uppercase gap-2 text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Review / Try Again
              </Button>
              <Button
                onClick={() => router.push('/junctions')}
                variant="ghost"
                size="sm"
                className="w-full font-mono text-xs uppercase gap-2 text-muted-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Exit to Junctions
              </Button>
            </div>
          </div>
        )}

        {/* BLOCKED STATE: Declined Terms */}
        {step === 'blocked_terms' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div className="p-5 rounded-brutal-md border-3 border-destructive bg-destructive/10 space-y-3">
              <div className="flex items-center gap-2 font-mono font-black text-sm uppercase text-destructive">
                <ShieldAlert className="h-5 w-5" /> Agreement Required
              </div>
              <p className="text-xs text-foreground/90 font-sans leading-relaxed">
                Participation in CockroachTalk voice junctions requires acceptance of our Terms of Service and Privacy Policy. Because you declined the terms, access to the rooms is unavailable.
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                You may review our policies at any time before proceeding.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                size="sm"
                className="w-full font-mono text-xs uppercase gap-2 text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Review Policies Again
              </Button>
              <Button
                onClick={() => router.push('/junctions')}
                variant="ghost"
                size="sm"
                className="w-full font-mono text-xs uppercase gap-2 text-muted-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Exit to Junctions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
