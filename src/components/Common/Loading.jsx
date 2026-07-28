import React from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'w-4 h-4' }) {
  return <Loader2 className={`${className} animate-spin text-[var(--accent)]`} />;
}

export function InlineLoading({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-muted-color ${className}`}>
      <Spinner className="w-3.5 h-3.5" /> {label}
    </div>
  );
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`animate-pulse rounded-md bg-[var(--bg-muted)] ${className}`} />;
}

export function SkeletonTiles({ count = 4, className = 'h-20' }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}
