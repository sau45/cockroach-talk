import React from 'react';
import Link from 'next/link';
import { Mic, ShieldCheck, Zap, Radio, ArrowRight, Bug, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvatarGroup } from '@/components/ui/AvatarGroup';
import { SPECIES_LIST } from '@/lib/constants';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20 space-y-6">
        <div className="inline-flex items-center gap-2">
          <Badge variant="live" className="px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-accent-coral animate-ping mr-1" />
            28 State Voice Rooms Active
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-tight uppercase max-w-4xl mx-auto leading-none">
          Live Voice Rooms.<br />
          <span className="text-primary underline decoration-border decoration-wavy decoration-2">
            Every State Has a Room.
          </span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto font-sans leading-relaxed">
          Drop into live audio junctions representing 28 Indian States & UTs. Zero login, zero password, 100% anonymous WebRTC voice streams.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button asChild size="lg" className="gap-2">
            <Link href="/junctions">
              Explore State Junctions <Mic className="h-5 w-5" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg">
            <Link href="/room/maharashtra">
              Drop into Maharashtra <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Highlights Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
          <Radio className="h-8 w-8 text-primary mb-3" />
          <h2 className="font-mono text-base font-bold uppercase mb-1">28 State Junctions</h2>
          <p className="text-xs text-muted-foreground font-sans leading-relaxed">
            Dedicated cockroach voice rooms for Maharashtra, Delhi, Karnataka, UP, Tamil Nadu, and states across India.
          </p>
        </div>

        <div className="p-6 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
          <ShieldCheck className="h-8 w-8 text-accent-gold mb-3" />
          <h2 className="font-mono text-base font-bold uppercase mb-1">100% Anonymous</h2>
          <p className="text-xs text-muted-foreground font-sans leading-relaxed">
            Instant collision-free ID handle automatically assigned on arrival via secure cookies. Zero passwords or tracking.
          </p>
        </div>

        <div className="p-6 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
          <Zap className="h-8 w-8 text-accent-coral mb-3" />
          <h2 className="font-mono text-base font-bold uppercase mb-1">Low Latency WebRTC</h2>
          <p className="text-xs text-muted-foreground font-sans leading-relaxed">
            Encrypted high-fidelity audio and screen sharing directly in browser with zero downloads or plugins required.
          </p>
        </div>

        <div className="p-6 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
          <Mic className="h-8 w-8 text-primary mb-3" />
          <h2 className="font-mono text-base font-bold uppercase mb-1">Live Speaker Stage</h2>
          <p className="text-xs text-muted-foreground font-sans leading-relaxed">
            Interactive 8-speaker stage with single-tap mute, screen share, queue hand-raising, and real-time moderator rules.
          </p>
        </div>
      </section>

      {/* Popular State Rooms Showcase */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-mono font-bold uppercase">Featured Junctions</h2>
            <p className="text-xs text-muted-foreground">Hop straight into high activity rooms</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/junctions">View All 28 States</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SPECIES_LIST.slice(0, 8).map((sp) => (
            <Link
              key={sp.id}
              href={`/room/${sp.id}`}
              className="p-4 rounded-brutal-md border-2 border-border bg-card shadow-brutal-dark-sm hover:border-primary hover:shadow-brutal transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-muted-foreground font-bold">STATE</span>
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <h3 className="font-mono font-bold text-base group-hover:text-primary transition-colors">
                  {sp.name}
                </h3>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50 text-xs text-muted-foreground font-mono">
                <AvatarGroup
                  users={[]}
                  totalCount={0}
                  maxDisplay={4}
                  size="xs"
                />
                <span className="group-hover:translate-x-1 transition-transform text-primary font-bold">
                  Enter →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="p-8 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="gold">Seamless WebRTC Audio</Badge>
          <h2 className="text-2xl sm:text-3xl font-mono font-bold uppercase">
            How CockroachTalk Works
          </h2>
          <p className="text-xs text-muted-foreground">
            Instant voice communication without accounts or tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-brutal-sm border-2 border-border bg-background space-y-2">
            <span className="font-mono text-3xl font-black text-primary">01</span>
            <h3 className="font-mono font-bold text-sm uppercase">Instant Realistic Identity</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get an authentic regional or international name (e.g. <code>Aarav Sharma</code>) issued via secure session cookies.
            </p>
          </div>

          <div className="p-4 rounded-brutal-sm border-2 border-border bg-background space-y-2">
            <span className="font-mono text-3xl font-black text-accent-coral">02</span>
            <h3 className="font-mono font-bold text-sm uppercase">Pick Your State Junction</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Browse 28 state voice rooms — Maharashtra, Delhi, Karnataka, UP, and more on a single directory.
            </p>
          </div>

          <div className="p-4 rounded-brutal-sm border-2 border-border bg-background space-y-2">
            <span className="font-mono text-3xl font-black text-accent-gold">03</span>
            <h3 className="font-mono font-bold text-sm uppercase">Speak & Share Screen</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hop onto the live speaker stage with ultra-low latency WebRTC audio streams, share your screen, or chat.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
