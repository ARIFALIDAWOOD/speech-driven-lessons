"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TopicSpecificationProps {
  value: string;
  onChange: (value: string) => void;
  chapterName?: string;
  disabled?: boolean;
}

const TOPIC_SUGGESTIONS = [
  "Focus on problem-solving techniques",
  "Include real-world examples",
  "Cover exam-important questions",
  "Explain fundamental concepts first",
  "Include practice exercises",
];

export function TopicSpecification({
  value,
  onChange,
  chapterName,
  disabled = false,
}: TopicSpecificationProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">
          Specific Focus (Optional)
        </Label>
        <button
          type="button"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Lightbulb className="h-3 w-3" />
          {showSuggestions ? "Hide" : "Show"} suggestions
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {chapterName
          ? `Optionally specify what aspects of "${chapterName}" you'd like to focus on`
          : "Add any specific topics or areas you want to cover"}
      </p>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Focus on Newton's Third Law applications in real life, or cover numerical problems for competitive exams..."
        disabled={disabled}
        className="min-h-[80px] resize-none"
        maxLength={500}
      />

      {showSuggestions && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {TOPIC_SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  const newValue = value
                    ? `${value}. ${suggestion}`
                    : suggestion;
                  onChange(newValue);
                }}
                className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-100 hover:border-gray-300 transition-colors"
                disabled={disabled}
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <span className="text-xs text-gray-400">{value.length}/500</span>
      </div>
    </div>
  );
}
