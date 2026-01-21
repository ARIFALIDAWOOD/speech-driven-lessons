"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CourseSlide } from './types'

interface SlidePreviewModalProps {
  slides: CourseSlide[]
  isOpen: boolean
  onClose: () => void
  initialSlideId?: string
}

export function SlidePreviewModal({
  slides,
  isOpen,
  onClose,
  initialSlideId
}: SlidePreviewModalProps) {
  const currentSlideIndex = initialSlideId
    ? slides.findIndex(s => s.id === initialSlideId)
    : 0
  const currentSlide = slides[currentSlideIndex] || slides[0]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{currentSlide?.title || 'Slide Preview'}</DialogTitle>
        </DialogHeader>
        {currentSlide && (
          <div className="mt-4">
            <div className="prose max-w-none">
              {currentSlide.content}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
