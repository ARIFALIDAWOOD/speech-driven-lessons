"use client";

import { useState, useCallback, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  id: number;
  title: string;
  slide_markdown: string;
  transcript: string;
  preview: string;
}

interface SlideControllerProps {
  slides: Slide[];
  isLoading: boolean;
  hasSlideContent: boolean;
  assistantId: string | null;
  socket: any;
  showWelcomeBlock: boolean;
  onExplanationRequested: (slideIndex: number, message: string) => void;
  courseId: string;
}

interface SlideControllerReturn {
  currentSlide: number;
  setCurrentSlide: (index: number) => void;
  renderSlides: () => ReactNode;
  requestExplanation: () => void;
}

export function SlideController({
  slides,
  isLoading,
  hasSlideContent,
  assistantId,
  socket,
  showWelcomeBlock,
  onExplanationRequested,
  courseId,
}: SlideControllerProps): SlideControllerReturn {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToNextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  }, [currentSlide, slides.length]);

  const goToPrevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide]);

  const requestExplanation = useCallback(() => {
    const slide = slides[currentSlide];
    if (slide) {
      onExplanationRequested(currentSlide, `Please explain: ${slide.title}`);
    }
  }, [currentSlide, slides, onExplanationRequested]);

  const renderSlides = useCallback((): ReactNode => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-gray-500">Loading slides...</div>
        </div>
      );
    }

    if (!hasSlideContent || slides.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">No slide content available</div>
        </div>
      );
    }

    const slide = slides[currentSlide];

    return (
      <div className="relative w-full max-w-[1800px] mx-auto px-6">
        {/* Welcome block */}
        {showWelcomeBlock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-40">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Welcome to the Course</h2>
              <p className="text-gray-600 mb-6">
                Click the button below to start learning
              </p>
              <Button onClick={() => requestExplanation()}>
                Start Learning
              </Button>
            </div>
          </div>
        )}

        {/* Slide content */}
        <div className="bg-white rounded-lg shadow-lg p-8 min-h-[400px]">
          <h2 className="text-xl font-semibold mb-4">{slide.title}</h2>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: slide.slide_markdown }}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            onClick={goToPrevSlide}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            {currentSlide + 1} / {slides.length}
          </span>
          <Button
            variant="outline"
            onClick={goToNextSlide}
            disabled={currentSlide === slides.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }, [
    isLoading,
    hasSlideContent,
    slides,
    currentSlide,
    showWelcomeBlock,
    goToPrevSlide,
    goToNextSlide,
    requestExplanation,
  ]);

  return {
    currentSlide,
    setCurrentSlide,
    renderSlides,
    requestExplanation,
  };
}
