"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export const steps = [
  { id: "title", label: "Title", number: 1 },
  { id: "description", label: "Description", number: 2 },
  { id: "upload", label: "Upload Files", number: 3 },
  { id: "review", label: "Review Syllabus", number: 4 },
  { id: "voice", label: "Select Voice", number: 5 },
  { id: "confirm", label: "Confirm", number: 6 },
]

interface StepNavigationProps {
  currentStep: string
  setCurrentStep: (step: string) => void
  isStepCompleted?: (step: string) => boolean
}

export function StepNavigation({
  currentStep,
  setCurrentStep,
  isStepCompleted = () => false
}: StepNavigationProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <nav className="space-y-2">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep
        const isCompleted = isStepCompleted(step.id) || index < currentStepIndex
        const isAccessible = index <= currentStepIndex || isCompleted

        return (
          <Button
            key={step.id}
            variant={isActive ? "default" : "ghost"}
            className={`w-full justify-start ${
              !isAccessible ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => isAccessible && setCurrentStep(step.id)}
            disabled={!isAccessible}
          >
            <div className="flex items-center gap-2">
              {isCompleted && !isActive ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="w-4 h-4 text-center text-xs">{step.number}</span>
              )}
              <span>{step.label}</span>
            </div>
          </Button>
        )
      })}
    </nav>
  )
}
