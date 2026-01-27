'use client';

/**
 * useRecentSessions Hook - Phase 6
 *
 * Fetches recent tutor sessions for the sidebar.
 * Uses existing /api/tutor-session/scheduled endpoint.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/auth/supabase';

export interface RecentSession {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'scheduled';
  lastActivity: string;
  courseId?: string;
  progress?: number;
}

interface UseRecentSessionsReturn {
  sessions: RecentSession[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecentSessions(limit: number = 10): UseRecentSessionsReturn {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
      const response = await fetch(
        `${baseUrl}/api/tutor-session/scheduled?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();

      // Transform to RecentSession format
      const transformed: RecentSession[] = (data.sessions || []).map((session: any) => ({
        id: session.session_id || session.id,
        title: session.title || session.course_title || 'Untitled Session',
        status: session.status || 'scheduled',
        lastActivity: session.last_activity || session.created_at || new Date().toISOString(),
        courseId: session.course_id,
        progress: session.progress || 0,
      }));

      setSessions(transformed);
    } catch (err) {
      console.error('Error fetching recent sessions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, limit]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    isLoading,
    error,
    refresh: fetchSessions,
  };
}

/**
 * Helper to format relative time (e.g., "2 days ago", "Active now")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) return 'Active now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
