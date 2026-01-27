'use client';

/**
 * CurrentGoalCard - Phase 6
 *
 * Displays current learning goal with progress indicator at sidebar bottom.
 */

import { cn } from '@/lib/utils';

interface CurrentGoalCardProps {
  goalTitle: string;
  progress: number; // 0-100
  className?: string;
}

export function CurrentGoalCard({
  goalTitle,
  progress,
  className,
}: CurrentGoalCardProps) {
  return (
    <div
      className={cn(
        'p-4 bg-primary/10 rounded-2xl border border-primary/20',
        className
      )}
    >
      <p className="text-[10px] font-bold text-primary uppercase mb-2">
        Current Goal
      </p>
      <p className="text-[11px] leading-tight mb-2 line-clamp-2">{goalTitle}</p>
      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 text-right">
        {Math.round(progress)}% complete
      </p>
    </div>
  );
}
