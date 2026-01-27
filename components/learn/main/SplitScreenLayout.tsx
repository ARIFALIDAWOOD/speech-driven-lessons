'use client';

/**
 * SplitScreenLayout - Phase 6
 *
 * Resizable two-pane layout container for chat and workspace.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useResizablePane } from '@/hooks/useResizablePane';
import { ResizableDragHandle } from './ResizableDragHandle';

interface SplitScreenLayoutProps {
  leftPane: ReactNode;
  rightPane: ReactNode;
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  className?: string;
}

export function SplitScreenLayout({
  leftPane,
  rightPane,
  initialRatio = 50,
  minRatio = 20,
  maxRatio = 80,
  className,
}: SplitScreenLayoutProps) {
  const { ratio, isDragging, handleMouseDown, dragHandleRef } = useResizablePane({
    initialRatio,
    minRatio,
    maxRatio,
  });

  return (
    <div className={cn('split-screen-container h-full flex-1', className)}>
      {/* Left Pane (Chat) */}
      <div
        style={{ width: `${ratio}%` }}
        className="min-w-[300px] transition-none h-full"
      >
        {leftPane}
      </div>

      {/* Resize Handle */}
      <ResizableDragHandle
        ref={dragHandleRef}
        isDragging={isDragging}
        onMouseDown={handleMouseDown}
      />

      {/* Right Pane (Workspace) */}
      <div className="flex-1 h-full">{rightPane}</div>
    </div>
  );
}
