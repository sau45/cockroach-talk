import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
      <h1 className="text-6xl font-black font-mono text-primary">404</h1>
      <h2 className="text-xl font-bold font-mono uppercase">Junction Not Found</h2>
      <p className="text-xs text-muted-foreground font-sans max-w-sm">
        The state room or page you are looking for does not exist or has expired.
      </p>
      <Button asChild className="mt-4">
        <Link href="/junctions">Return to State Junctions</Link>
      </Button>
    </div>
  );
}
