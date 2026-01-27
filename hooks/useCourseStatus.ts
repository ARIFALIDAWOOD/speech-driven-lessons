'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EmbeddingsStatusType } from '@/components/course/EmbeddingsStatus';
import type { PlanStatusType } from '@/components/course/PlanStatus';

interface CourseStatus {
  courseId: string;
  title: string;
  isCreationComplete: boolean;
  plan: {
    status: PlanStatusType;
    version?: number;
    generatedAt?: string;
    error?: string;
  };
  embeddings: {
    status: EmbeddingsStatusType;
    builtAt?: string;
    error?: string;
  };
  lastUpdatedAt?: string;
}

interface UseCourseStatusOptions {
  pollInterval?: number; // Polling interval in ms (default: 5000)
  enabled?: boolean;
}

interface UseCourseStatusReturn {
  status: CourseStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  rebuildEmbeddings: () => Promise<{ correlationId?: string; error?: string }>;
  generatePlan: () => Promise<{ planId?: string; error?: string }>;
}

export function useCourseStatus(
  courseId: string | null,
  options: UseCourseStatusOptions = {}
): UseCourseStatusReturn {
  const { pollInterval = 5000, enabled = true } = options;

  const [status, setStatus] = useState<CourseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!courseId || !enabled) return;

    try {
      const response = await fetch(`/api/course/status/${courseId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course status');
      }

      const data = await response.json();

      setStatus({
        courseId: data.course_id,
        title: data.title,
        isCreationComplete: data.is_creation_complete,
        plan: {
          status: (data.plan?.status as PlanStatusType) || 'unknown',
          version: data.plan?.version,
          generatedAt: data.plan?.generated_at,
          error: data.plan?.error,
        },
        embeddings: {
          status: (data.embeddings?.status as EmbeddingsStatusType) || 'unknown',
          builtAt: data.embeddings?.built_at,
          error: data.embeddings?.error,
        },
        lastUpdatedAt: data.last_updated_at,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [courseId, enabled]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchStatus();
    setIsLoading(false);
  }, [fetchStatus]);

  // Initial fetch
  useEffect(() => {
    if (courseId && enabled) {
      refetch();
    }
  }, [courseId, enabled, refetch]);

  // Polling for status updates when building/generating
  useEffect(() => {
    if (!courseId || !enabled) return;

    const shouldPoll =
      status?.embeddings.status === 'building' ||
      status?.plan.status === 'generating';

    if (!shouldPoll) return;

    const intervalId = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(intervalId);
  }, [courseId, enabled, status, pollInterval, fetchStatus]);

  const rebuildEmbeddings = useCallback(async () => {
    if (!courseId) {
      return { error: 'No course ID' };
    }

    try {
      const response = await fetch(`/api/course/rebuild-embeddings/${courseId}`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Failed to rebuild embeddings' };
      }

      // Update local status to building
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              embeddings: { ...prev.embeddings, status: 'building' },
            }
          : null
      );

      return { correlationId: data.correlation_id };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [courseId]);

  const generatePlan = useCallback(async () => {
    if (!courseId) {
      return { error: 'No course ID' };
    }

    try {
      const response = await fetch(`/api/course/generate-plan/${courseId}`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Failed to generate plan' };
      }

      // Update local status to generating then refetch
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              plan: { ...prev.plan, status: 'generating' },
            }
          : null
      );

      // Refetch after short delay to get updated status
      setTimeout(refetch, 1000);

      return { planId: data.plan_id };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [courseId, refetch]);

  return {
    status,
    isLoading,
    error,
    refetch,
    rebuildEmbeddings,
    generatePlan,
  };
}
