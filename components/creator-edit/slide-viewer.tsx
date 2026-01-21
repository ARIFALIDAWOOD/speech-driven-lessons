"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface SlideViewerProps {
  currentSlide: number
  totalSlides: number
  slideContent?: string
  onPrevious?: () => void
  onNext?: () => void
}

export function SlideViewer({
  currentSlide,
  totalSlides,
  slideContent,
  onPrevious,
  onNext,
}: SlideViewerProps) {
  const safeTotal = Number.isFinite(totalSlides) ? totalSlides : 0
  const hasSlides = safeTotal > 0

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border overflow-hidden">
      <div className="flex-1 overflow-auto p-8">
        {!hasSlides ? (
          <div className="text-center text-gray-500">
            <p>No slides available</p>
          </div>
        ) : (
          <div className="max-w-4xl w-full mx-auto">
            <div className="prose max-w-none">
              {slideContent ? (
                <pre className="whitespace-pre-wrap font-sans text-gray-800">
                  {slideContent}
                </pre>
              ) : (
                <p className="text-gray-500">No content for this slide.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-4 border-t bg-white">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!hasSlides || currentSlide <= 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <span className="text-sm text-gray-600">
          {hasSlides ? `${currentSlide + 1} / ${safeTotal}` : "0 / 0"}
        </span>

        <Button
          variant="outline"
          onClick={onNext}
          disabled={!hasSlides || currentSlide >= safeTotal - 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
