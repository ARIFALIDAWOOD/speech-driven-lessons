"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Edit, Trash2 } from "lucide-react"

interface Slide {
  id?: string
  title?: string
  content?: string
  [key: string]: any
}

interface SlideGalleryProps {
  slides: Slide[]
  currentSlide: number
  setCurrentSlide: (index: number) => void
  onSlideEdit?: (index: number) => void
  onSlideDelete?: (index: number) => void
}

export function SlideGallery({ 
  slides, 
  currentSlide, 
  setCurrentSlide,
  onSlideEdit,
  onSlideDelete
}: SlideGalleryProps) {
  return (
    <div className="space-y-2">
      {slides.map((slide, index) => (
        <Card
          key={index}
          className={`cursor-pointer transition-all ${
            index === currentSlide ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setCurrentSlide(index)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm line-clamp-1">
                {slide.title || `Slide ${index + 1}`}
              </CardTitle>
              <div className="flex gap-1">
                {onSlideEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSlideEdit(index)
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
                {onSlideDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSlideDelete(index)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-gray-500 line-clamp-2">
              {slide.content || "No content"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
