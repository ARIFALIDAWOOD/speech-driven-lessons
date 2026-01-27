'use client';

/**
 * VisionFeedbackOverlay - Phase 6
 *
 * Red glow overlay triggered by low health score.
 * Provides visual feedback when student is struggling.
 */

import { cn } from '@/lib/utils';

interface VisionFeedbackOverlayProps {
  isAlertMode: boolean;
  className?: string;
}

export function VisionFeedbackOverlay({
  isAlertMode,
  className,
}: VisionFeedbackOverlayProps) {
  return (
    <div
      className={cn(
        'vision-feedback-overlay',
        isAlertMode && 'alert-mode',
        className
      )}
      aria-hidden="true"
    />
  );
}
