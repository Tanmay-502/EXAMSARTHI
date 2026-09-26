'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error('Results page error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full h-full p-8 text-center space-y-6">
      <h1 className="text-3xl font-bold text-destructive" aria-live="assertive">Failed to load results</h1>
      <p className="text-lg text-muted-foreground max-w-md">
        We encountered an error while trying to fetch or calculate your exam results.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-lg hover:bg-secondary/90 focus-visible:ring-4 focus-visible:ring-ring"
        >
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
