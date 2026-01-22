"use client";

import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface TrueFalseQuestionProps {
  questionText: string;
  selectedAnswer: boolean | null;
  onSelect: (answer: boolean) => void;
  disabled?: boolean;
  feedback?: {
    isCorrect: boolean;
    correctAnswer: boolean;
  };
}

export function TrueFalseQuestion({
  questionText,
  selectedAnswer,
  onSelect,
  disabled = false,
  feedback,
}: TrueFalseQuestionProps) {
  const getButtonStyle = (isTrue: boolean) => {
    const isSelected = selectedAnswer === isTrue;

    if (feedback) {
      const isCorrectAnswer = feedback.correctAnswer === isTrue;

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

      <div className="flex gap-4">
        <button
          onClick={() => !disabled && onSelect(true)}
          disabled={disabled}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all",
            getButtonStyle(true),
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <Check className="h-6 w-6" />
          <span className="text-lg font-medium">True</span>
        </button>

        <button
          onClick={() => !disabled && onSelect(false)}
          disabled={disabled}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all",
            getButtonStyle(false),
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <X className="h-6 w-6" />
          <span className="text-lg font-medium">False</span>
        </button>
      </div>
    </div>
  );
}
