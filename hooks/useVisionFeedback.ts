'use client';

/**
 * useVisionFeedback Hook - Phase 6
 *
 * Triggers alert mode visual overlay when orchestration health score
 * drops below threshold (0.45 by default).
 */

import { useState, useEffect, useCallback } from 'react';

interface UseVisionFeedbackOptions {
  healthScore: number;
  threshold?: number;
  autoResetDelay?: number;
}

interface UseVisionFeedbackReturn {
  isAlertMode: boolean;
  triggerAlert: () => void;
  clearAlert: () => void;
  healthStatus: 'excellent' | 'good' | 'moderate' | 'struggling' | 'critical';
}

export function useVisionFeedback({
  healthScore,
  threshold = 0.45,
  autoResetDelay,
}: UseVisionFeedbackOptions): UseVisionFeedbackReturn {
  const [isAlertMode, setIsAlertMode] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

  // Determine health status based on score
  const getHealthStatus = useCallback((score: number) => {
    if (score >= 0.85) return 'excellent';
    if (score >= 0.70) return 'good';
    if (score >= 0.55) return 'moderate';
    if (score >= 0.35) return 'struggling';
    return 'critical';
  }, []);

  const healthStatus = getHealthStatus(healthScore);

  // Auto-trigger alert when health drops below threshold
  useEffect(() => {
    if (manualOverride) return;

    if (healthScore < threshold) {
      setIsAlertMode(true);

      // Auto-reset after delay if specified
      if (autoResetDelay && autoResetDelay > 0) {
        const timer = setTimeout(() => {
          setIsAlertMode(false);
        }, autoResetDelay);
        return () => clearTimeout(timer);
      }
    } else {
      setIsAlertMode(false);
    }
  }, [healthScore, threshold, autoResetDelay, manualOverride]);

  const triggerAlert = useCallback(() => {
    setIsAlertMode(true);
    setManualOverride(true);
  }, []);

  const clearAlert = useCallback(() => {
    setIsAlertMode(false);
    setManualOverride(false);
  }, []);

  return {
    isAlertMode,
    triggerAlert,
    clearAlert,
    healthStatus,
  };
}
