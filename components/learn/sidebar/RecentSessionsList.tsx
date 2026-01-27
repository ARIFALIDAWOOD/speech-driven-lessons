'use client';

/**
 * RecentSessionsList - Phase 6
 *
 * Displays recent learning sessions in the sidebar with DiceBear identicons.
 */

import { cn } from '@/lib/utils';
import { getSessionDiceBearUrl } from '@/config/agentConfig';
import { formatRelativeTime, type RecentSession } from '@/hooks/useRecentSessions';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentSessionsListProps {
  sessions: RecentSession[];
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  isLoading?: boolean;
}

export function RecentSessionsList({
  sessions,
  activeSessionId,
  onSelectSession,
  isLoading = false,
}: RecentSessionsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2.5">
            <Skeleton className="w-7 h-7 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        No recent sessions
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;
        const isLive = session.status === 'active';

        return (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={cn(
              'w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-left',
              isActive
                ? 'bg-primary/10 border-primary/20'
                : 'border-transparent hover:bg-background hover:border-border opacity-70 hover:opacity-100',
              'group'
            )}
          >
            <img
              src={getSessionDiceBearUrl(session.title)}
              alt=""
              className={cn('w-7 h-7 rounded-lg', !isActive && 'opacity-80')}
            />
            <div className="overflow-hidden flex-1">
              <p
                className={cn(
                  'text-xs truncate transition-colors',
                  isActive ? 'font-semibold' : 'font-medium group-hover:text-primary'
                )}
              >
                {session.title}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isLive ? (
                  <span className="text-emerald-500">Active now</span>
                ) : (
                  formatRelativeTime(session.lastActivity)
                )}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
