'use client';

/**
 * useResizablePane Hook - Phase 6
 *
 * Provides mouse drag logic for resizing split-screen panes.
 * Constrains resize to 20-80% range.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizablePaneOptions {
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  sidebarWidth?: number;
}

interface UseResizablePaneReturn {
  ratio: number;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  dragHandleRef: React.RefObject<HTMLDivElement>;
}

export function useResizablePane({
  initialRatio = 50,
  minRatio = 20,
  maxRatio = 80,
  sidebarWidth = 280,
}: UseResizablePaneOptions = {}): UseResizablePaneReturn {
  const [ratio, setRatio] = useState(initialRatio);
  const [isDragging, setIsDragging] = useState(false);
  const dragHandleRef = useRef<HTMLDivElement>(null!);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const windowWidth = window.innerWidth;
      const availableWidth = windowWidth - sidebarWidth;
      const mouseX = e.clientX - sidebarWidth;
      const newRatio = (mouseX / availableWidth) * 100;

      // Constrain to min/max range
      const clampedRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));
      setRatio(clampedRatio);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minRatio, maxRatio, sidebarWidth]);

  return {
    ratio,
    isDragging,
    handleMouseDown,
    dragHandleRef,
  };
}
