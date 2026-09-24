import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t-3 border-border bg-card/60 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
        <div>
          <span className="font-bold text-foreground">CockroachTalk</span> · 100% Anonymous WebRTC Voice Rooms.
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link href="/junctions" className="hover:text-primary transition-colors">
            Junctions
          </Link>
          <Link href="/about" className="hover:text-primary transition-colors">
            About
          </Link>
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Privacy
          </Link>
          <Link href="/admin" className="hover:text-primary transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
