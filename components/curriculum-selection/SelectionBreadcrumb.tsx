"use client";

import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CurriculumSelection, SELECTION_STEPS } from "./types";

interface SelectionBreadcrumbProps {
  selection: CurriculumSelection;
  onClearFrom?: (stepId: keyof Omit<CurriculumSelection, 'topic'>) => void;
}

export function SelectionBreadcrumb({
  selection,
  onClearFrom,
}: SelectionBreadcrumbProps) {
  const selectedSteps = SELECTION_STEPS.filter(
    (step) => selection[step.id] !== null
  );

  if (selectedSteps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <span>Start by selecting your state</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center flex-wrap gap-1 py-2" aria-label="Breadcrumb">
      {selectedSteps.map((step, index) => {
        const value = selection[step.id];
        const isLast = index === selectedSteps.length - 1;

        // Handle different value types
        const displayName = typeof value === 'object' && value !== null && 'name' in value
          ? (value as { name: string }).name
          : typeof value === 'string'
            ? value
            : '';

        return (
          <div key={step.id} className="flex items-center">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm",
                isLast
                  ? "bg-blue-100 text-blue-800 font-medium"
                  : "bg-gray-100 text-gray-700"
              )}
            >
              <span className="truncate max-w-[120px]">{displayName}</span>
              {onClearFrom && (
                <button
                  onClick={() => onClearFrom(step.id)}
                  className="ml-1 hover:bg-gray-200 rounded p-0.5 transition-colors"
                  title={`Clear from ${step.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-1 flex-shrink-0" />
            )}
          </div>
        );
      })}

      {selection.topic && (
        <>
          <ChevronRight className="h-4 w-4 text-gray-400 mx-1 flex-shrink-0" />
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm bg-green-100 text-green-800 font-medium">
            <span className="truncate max-w-[200px]">{selection.topic}</span>
          </span>
        </>
      )}
    </nav>
  );
}
