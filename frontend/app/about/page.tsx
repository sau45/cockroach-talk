import React from 'react';
import { Bug, Mic, ShieldCheck, Cpu } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="border-b-3 border-border pb-6">
        <h1 className="text-3xl font-black font-mono uppercase tracking-tight">About CockroachTalk</h1>
        <p className="text-sm text-muted-foreground font-sans mt-2">
          Decentralized, anonymous state voice junctions powered by WebRTC and Next.js.
        </p>
      </div>

      <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed font-sans">
        <div className="p-6 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark text-foreground space-y-3">
          <div className="flex items-center gap-2 font-mono font-bold text-base text-primary">
            <Bug className="h-5 w-5" />
            <span>The Cockroach Philosophy</span>
          </div>
          <p>
            Like cockroaches that survive in every environment without registration or credentials, CockroachTalk gives voice rooms to every state in India with zero login, zero passwords, and zero tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-brutal-sm border-2 border-border bg-card">
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-foreground mb-1">
              <ShieldCheck className="h-4 w-4 text-accent-gold" />
              <span>Zero-Knowledge Identity</span>
            </div>
            <p className="text-xs">
              Collision-free tags (#1001, #1002...) are assigned on arrival via secure httpOnly cookies. We do not store email addresses, phone numbers, or passwords.
            </p>
          </div>

          <div className="p-4 rounded-brutal-sm border-2 border-border bg-card">
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-foreground mb-1">
              <Cpu className="h-4 w-4 text-accent-coral" />
              <span>Mesh WebRTC Audio & Screen</span>
            </div>
            <p className="text-xs">
              Direct peer-to-peer audio transmission with dynamic speaking indication, mute toggling, and HD screen presentation capability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
