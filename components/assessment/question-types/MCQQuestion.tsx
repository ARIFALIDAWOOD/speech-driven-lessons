"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

interface MCQQuestionProps {
  questionText: string;
  options: string[];
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
  disabled?: boolean;
  feedback?: {
    isCorrect: boolean;
    correctAnswer: string;
  };
}

export function MCQQuestion({
  questionText,
  options,
  selectedAnswer,
  onSelect,
  disabled = false,
  feedback,
}: MCQQuestionProps) {
  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  const getOptionStyle = (option: string, index: number) => {
    const letter = getOptionLetter(index);
    const isSelected = selectedAnswer === letter || selectedAnswer === option;

    if (feedback) {
      const isCorrectAnswer = feedback.correctAnswer === letter || feedback.correctAnswer === option;

      if (isCorrectAnswer) {
        return "border-green-500 bg-green-50 text-green-800";
      }
      if (isSelected && !feedback.isCorrect) {
        return "border-red-500 bg-red-50 text-red-800";
      }
    }

    if (isSelected) {
      return "border-blue-500 bg-blue-50 text-blue-800";
    }

    return "border-gray-200 hover:border-gray-300 hover:bg-gray-50";
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-900">{questionText}</p>

      <div className="space-y-3">
        {options.map((option, index) => {
          const letter = getOptionLetter(index);
          const isSelected = selectedAnswer === letter || selectedAnswer === option;
          const showIcon = feedback || isSelected;

          return (
            <button
              key={index}
              onClick={() => !disabled && onSelect(letter)}
              disabled={disabled}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all",
                getOptionStyle(option, index),
                disabled ? "cursor-not-allowed" : "cursor-pointer"
              )}
            >
              <span
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {letter}
              </span>
              <span className="flex-grow">{option.replace(/^[A-D]\)\s*/, "")}</span>
              {showIcon && (
                <span className="flex-shrink-0">
                  {feedback ? (
                    feedback.correctAnswer === letter ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : isSelected ? (
                      <Circle className="h-5 w-5 text-red-600" />
                    ) : null
                  ) : isSelected ? (
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  ) : null}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
