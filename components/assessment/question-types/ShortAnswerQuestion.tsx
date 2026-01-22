"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ShortAnswerQuestionProps {
  questionText: string;
  answer: string;
  onChange: (answer: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  feedback?: {
    isCorrect: boolean;
    explanation?: string;
  };
}

export function ShortAnswerQuestion({
  questionText,
  answer,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type your answer here...",
  maxLength = 500,
  feedback,
}: ShortAnswerQuestionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey && answer.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-900">{questionText}</p>

      <div
        className={cn(
          "relative rounded-lg border-2 transition-all",
          isFocused && !disabled ? "border-blue-500" : "border-gray-200",
          feedback &&
            (feedback.isCorrect
              ? "border-green-500 bg-green-50"
              : "border-amber-500 bg-amber-50"),
          disabled && "bg-gray-50"
        )}
      >
        <Textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            "min-h-[120px] resize-none border-0 focus:ring-0 bg-transparent",
            feedback && (feedback.isCorrect ? "text-green-800" : "text-amber-800")
          )}
        />

        <div className="flex items-center justify-between p-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {answer.length}/{maxLength} characters
            {!disabled && " • Ctrl+Enter to submit"}
          </span>
          {!disabled && (
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={!answer.trim()}
              className="gap-2"
            >
              Submit
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            "p-4 rounded-lg",
            feedback.isCorrect
              ? "bg-green-100 border border-green-200"
              : "bg-amber-100 border border-amber-200"
          )}
        >
          <p
            className={cn(
              "font-medium",
              feedback.isCorrect ? "text-green-800" : "text-amber-800"
            )}
          >
            {feedback.isCorrect ? "Correct!" : "Let's review this..."}
          </p>
          {feedback.explanation && (
            <p
              className={cn(
                "mt-1 text-sm",
                feedback.isCorrect ? "text-green-700" : "text-amber-700"
              )}
            >
              {feedback.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
