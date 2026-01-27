'use client';

import { CheckCircle, Loader2, XCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlanStatusType = 'ready' | 'generating' | 'error' | 'unknown';

interface PlanStatusProps {
  status: PlanStatusType;
  version?: number;
  generatedAt?: string;
  error?: string;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<
  PlanStatusType,
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
  generating: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    text: 'Generating...',
    spin: true,
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    text: 'Error',
  },
  unknown: {
    icon: FileText,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    text: 'Not generated',
  },
};

export function PlanStatus({
  status,
  version,
  generatedAt,
  error,
  className,
  showLabel = true,
}: PlanStatusProps) {
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
            {status === 'ready' && version ? `v${version}` : config.text}
          </span>
        )}
      </div>

      {error && status === 'error' && (
        <span className="text-xs text-red-500 truncate max-w-[200px]" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}

export function PlanStatusCompact({
  status,
  version,
  className,
}: {
  status: PlanStatusType;
  version?: number;
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
      title={`Course Outline: ${status === 'ready' && version ? `v${version}` : config.text}`}
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
