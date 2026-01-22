"use client";

import { useState } from "react";
import { MCQQuestion } from "./question-types/MCQQuestion";
import { TrueFalseQuestion } from "./question-types/TrueFalseQuestion";
import { ShortAnswerQuestion } from "./question-types/ShortAnswerQuestion";
import { AssessmentQuestion, AssessmentFeedback } from "./types";

interface QuestionRendererProps {
  question: AssessmentQuestion;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
  feedback?: AssessmentFeedback;
}

export function QuestionRenderer({
  question,
  onAnswer,
  disabled = false,
  feedback,
}: QuestionRendererProps) {
  const [selectedMCQ, setSelectedMCQ] = useState<string | null>(null);
  const [selectedTF, setSelectedTF] = useState<boolean | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");

  const handleMCQSelect = (answer: string) => {
    setSelectedMCQ(answer);
    onAnswer(answer);
  };

  const handleTFSelect = (answer: boolean) => {
    setSelectedTF(answer);
    onAnswer(answer ? "true" : "false");
  };

  const handleShortAnswerSubmit = () => {
    if (shortAnswer.trim()) {
      onAnswer(shortAnswer.trim());
    }
  };

  // Render based on question type
  switch (question.questionType) {
    case "mcq":
      return (
        <MCQQuestion
          questionText={question.questionText}
          options={question.options || []}
          selectedAnswer={selectedMCQ}
          onSelect={handleMCQSelect}
          disabled={disabled}
          feedback={
            feedback
              ? {
                  isCorrect: feedback.isCorrect,
                  correctAnswer: feedback.correctAnswer || "",
                }
              : undefined
          }
        />
      );

    case "true_false":
      return (
        <TrueFalseQuestion
          questionText={question.questionText}
          selectedAnswer={selectedTF}
          onSelect={handleTFSelect}
          disabled={disabled}
          feedback={
            feedback
              ? {
                  isCorrect: feedback.isCorrect,
                  correctAnswer: feedback.correctAnswer === "true",
                }
              : undefined
          }
        />
      );

    case "short_answer":
      return (
        <ShortAnswerQuestion
          questionText={question.questionText}
          answer={shortAnswer}
          onChange={setShortAnswer}
          onSubmit={handleShortAnswerSubmit}
          disabled={disabled}
          feedback={
            feedback
              ? {
                  isCorrect: feedback.isCorrect,
                  explanation: feedback.explanation,
                }
              : undefined
          }
        />
      );

    default:
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Unknown question type: {question.questionType}</p>
        </div>
      );
  }
}
