'use client';

/**
 * WorkspaceMetrics - Phase 6
 *
 * Coherence/Interference/Gap Status metric cards for the workspace.
 */

import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value?: number; // 0-100 for progress bar
  textValue?: string; // For text-based values
  color: 'emerald' | 'amber' | 'blue' | 'rose';
}

function MetricCard({ label, value, textValue, color }: MetricCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    rose: 'bg-rose-500',
  };

  const textColorClasses = {
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    blue: 'text-blue-500',
    rose: 'text-rose-500',
  };

  return (
    <div className="metric-card glass-panel-learn">
      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
        {label}
      </p>
      {value !== undefined ? (
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', colorClasses[color])}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
      ) : (
        <p className={cn('text-xs font-bold', textColorClasses[color])}>
          {textValue}
        </p>
      )}
    </div>
  );
}

interface WorkspaceMetricsProps {
  coherence?: number; // 0-100
  interference?: number; // 0-100
  gapStatus?: 'filling' | 'identified' | 'resolved' | 'none';
  className?: string;
}

export function WorkspaceMetrics({
  coherence = 100,
  interference = 50,
  gapStatus = 'filling',
  className,
}: WorkspaceMetricsProps) {
  const gapStatusText = {
    filling: 'Filling...',
    identified: 'Identified',
    resolved: 'Resolved',
    none: 'None',
  };

  const gapStatusColor = {
    filling: 'emerald',
    identified: 'amber',
    resolved: 'blue',
    none: 'emerald',
  } as const;

  return (
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      <MetricCard label="Coherence" value={coherence} color="emerald" />
      <MetricCard label="Interference" value={interference} color="amber" />
      <MetricCard
        label="Gap Status"
        textValue={gapStatusText[gapStatus]}
        color={gapStatusColor[gapStatus]}
      />
    </div>
  );
}
