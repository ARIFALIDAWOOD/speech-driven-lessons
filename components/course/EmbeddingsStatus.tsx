'use client';

import { CheckCircle, AlertCircle, Loader2, XCircle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EmbeddingsStatusType = 'ready' | 'stale' | 'building' | 'error' | 'unknown';

interface EmbeddingsStatusProps {
  status: EmbeddingsStatusType;
  lastBuilt?: string;
  error?: string;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<
  EmbeddingsStatusType,
  {
    icon: typeof CheckCircle;
    color: string;
    bgColor: string;
    text: string;
    spin?: boolean;
  }
> = {
  ready: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    text: 'Ready',
  },
  stale: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    text: 'Outdated',
  },
  building: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    text: 'Building...',
    spin: true,
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    text: 'Error',
  },
  unknown: {
    icon: Database,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    text: 'Not built',
  },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function EmbeddingsStatus({
  status,
  lastBuilt,
  error,
  className,
  showLabel = true,
}: EmbeddingsStatusProps) {
  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full',
          config.bgColor
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4',
            config.color,
            config.spin && 'animate-spin'
          )}
        />
        {showLabel && (
          <span className={cn('text-sm font-medium', config.color)}>
            {config.text}
          </span>
        )}
      </div>

      {lastBuilt && status === 'ready' && (
        <span className="text-xs text-muted-foreground">
          Built {formatRelativeTime(lastBuilt)}
        </span>
      )}

      {error && status === 'error' && (
        <span className="text-xs text-red-500 truncate max-w-[200px]" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}

export function EmbeddingsStatusCompact({
  status,
  className,
}: {
  status: EmbeddingsStatusType;
  className?: string;
}) {
  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center',
        config.bgColor,
        className
      )}
      title={`Knowledge Base: ${config.text}`}
    >
      <Icon
        className={cn(
          'w-3.5 h-3.5',
          config.color,
          config.spin && 'animate-spin'
        )}
      />
    </div>
  );
}
