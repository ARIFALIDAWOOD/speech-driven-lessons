"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { steps } from "./StepNavigation"

interface NavigationButtonsProps {
  currentStep: string
  goToPreviousStep: () => void
  handleNextClick: () => void
  handleCreateCourse?: () => Promise<void>
  handleViewSyllabus?: () => void
  canProceedToNextStep: boolean
  isGeneratingSyllabus: boolean
  isCreatingCourse: boolean
  isLoadingSyllabus?: boolean
  disableNext?: boolean
  saveStatus?: 'idle' | 'saving' | 'saved'
  lastSavedTime?: Date | null
  generationState?: string
}

export function NavigationButtons({
  currentStep,
  goToPreviousStep,
  handleNextClick,
  handleCreateCourse,
  handleViewSyllabus,
  canProceedToNextStep,
  isGeneratingSyllabus,
  isCreatingCourse,
  isLoadingSyllabus = false,
  disableNext = false,
  saveStatus = 'idle',
  lastSavedTime,
  generationState
}: NavigationButtonsProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t">
      <div className="flex items-center gap-4">
        {!isFirstStep && (
          <Button variant="outline" onClick={goToPreviousStep}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
        )}
        {handleViewSyllabus && (
          <Button variant="outline" onClick={handleViewSyllabus}>
            <Eye className="w-4 h-4 mr-2" />
            View Syllabus
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {saveStatus === 'saving' && (
          <span className="text-sm text-gray-500">Saving...</span>
        )}
        {saveStatus === 'saved' && lastSavedTime && (
          <span className="text-sm text-green-600">
            Saved {lastSavedTime.toLocaleTimeString()}
          </span>
        )}
        
        {isLastStep ? (
          <Button
            onClick={handleCreateCourse}
            disabled={isCreatingCourse || !canProceedToNextStep}
          >
            {isCreatingCourse ? "Creating..." : "Create Course"}
          </Button>
        ) : (
          <Button
            onClick={handleNextClick}
            disabled={!canProceedToNextStep || disableNext || isGeneratingSyllabus || isLoadingSyllabus}
          >
            {isGeneratingSyllabus || isLoadingSyllabus ? (
              "Processing..."
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
