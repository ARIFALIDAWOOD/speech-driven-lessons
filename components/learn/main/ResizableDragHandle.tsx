'use client';

/**
 * ResizableDragHandle - Phase 6
 *
 * Drag handle component for resizing split-screen panes.
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizableDragHandleProps {
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export const ResizableDragHandle = forwardRef<HTMLDivElement, ResizableDragHandleProps>(
  ({ isDragging, onMouseDown }, ref) => {
    return (
      <div
        ref={ref}
        onMouseDown={onMouseDown}
        className={cn('drag-handle', isDragging && 'active')}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panes"
        tabIndex={0}
      />
    );
  }
);

ResizableDragHandle.displayName = 'ResizableDragHandle';
