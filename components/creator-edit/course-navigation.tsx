"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface SlideLike {
  id?: string | number
  title?: string
  [key: string]: any
}

interface CourseNavigationProps {
  slides: SlideLike[]
  currentSlide: number
  setCurrentSlide: (index: number) => void
}

export function CourseNavigation({ slides, currentSlide, setCurrentSlide }: CourseNavigationProps) {
  const safeSlides = slides || []
  const totalSlides = safeSlides.length

  const onPrevious = () => setCurrentSlide(Math.max(0, currentSlide - 1))
  const onNext = () => setCurrentSlide(Math.min(totalSlides - 1, currentSlide + 1))

  return (
    <div className="w-64 flex flex-col bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onPrevious} disabled={currentSlide === 0}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">
            {totalSlides > 0 ? `${currentSlide + 1} / ${totalSlides}` : "0 / 0"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={totalSlides === 0 || currentSlide >= totalSlides - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-2 overflow-auto">
        {totalSlides === 0 ? (
          <div className="p-3 text-sm text-gray-500">No slides</div>
        ) : (
          <div className="space-y-1">
            {safeSlides.map((s, idx) => (
              <button
                key={String(s.id ?? idx)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  idx === currentSlide ? "bg-gray-100 font-medium" : "hover:bg-gray-50"
                }`}
                onClick={() => setCurrentSlide(idx)}
              >
                {s.title || `Slide ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
