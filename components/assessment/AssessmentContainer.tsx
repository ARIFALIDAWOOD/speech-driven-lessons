"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { QuestionRenderer } from "./QuestionRenderer";
import {
  AssessmentQuestion,
  AssessmentAnswer,
  AssessmentFeedback,
  AssessmentResult,
  DifficultyLevel,
} from "./types";
import { cn } from "@/lib/utils";
import {
  Brain,
  ChevronRight,
  Trophy,
  Target,
  Clock,
  Loader2,
} from "lucide-react";

interface AssessmentContainerProps {
  questions: AssessmentQuestion[];
  onComplete: (answers: AssessmentAnswer[]) => void;
  onAnswerSubmit?: (answer: AssessmentAnswer) => Promise<AssessmentFeedback>;
  title?: string;
  description?: string;
}

export function AssessmentContainer({
  questions,
  onComplete,
  onAnswerSubmit,
  title = "Initial Assessment",
  description = "Let's see what you already know about this topic.",
}: AssessmentContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<AssessmentFeedback | null>(null);
  const [isWaitingForFeedback, setIsWaitingForFeedback] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-amber-100 text-amber-800";
      case "hard":
        return "bg-red-100 text-red-800";
    }
  };

  const handleAnswer = async (answer: string) => {
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    const assessmentAnswer: AssessmentAnswer = {
      questionIndex: currentIndex,
      answer,
      timeSpent,
    };

    // Update local answers
    setAnswers((prev) => [...prev, assessmentAnswer]);

    // If there's a feedback handler, wait for it
    if (onAnswerSubmit) {
      setIsWaitingForFeedback(true);
      try {
        const feedback = await onAnswerSubmit(assessmentAnswer);
        setCurrentFeedback(feedback);
      } catch (error) {
        console.error("Error getting feedback:", error);
      } finally {
        setIsWaitingForFeedback(false);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentFeedback(null);
    } else {
      setIsComplete(true);
      onComplete(answers);
    }
  };

  const hasAnsweredCurrent = answers.some(
    (a) => a.questionIndex === currentIndex
  );

  if (isComplete) {
    return (
      <AssessmentComplete
        totalQuestions={questions.length}
        correctAnswers={answers.filter((_, i) => {
          const feedback = currentFeedback;
          return feedback?.isCorrect;
        }).length}
        totalTime={Math.round((Date.now() - startTime) / 1000)}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-blue-600" />
            {title}
          </CardTitle>
          <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
            {currentQuestion.difficulty}
          </Badge>
        </div>
        <p className="text-sm text-gray-500">{description}</p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-gray-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <QuestionRenderer
          question={currentQuestion}
          onAnswer={handleAnswer}
          disabled={hasAnsweredCurrent || isWaitingForFeedback}
          feedback={currentFeedback || undefined}
        />

        {/* Feedback display */}
        {currentFeedback && (
          <div
            className={cn(
              "p-4 rounded-lg border",
              currentFeedback.isCorrect
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            )}
          >
            <p
              className={cn(
                "font-medium",
                currentFeedback.isCorrect ? "text-green-800" : "text-amber-800"
              )}
            >
              {currentFeedback.isCorrect ? "Correct!" : "Not quite..."}
            </p>
            {currentFeedback.explanation && (
              <p
                className={cn(
                  "mt-1 text-sm",
                  currentFeedback.isCorrect ? "text-green-700" : "text-amber-700"
                )}
              >
                {currentFeedback.explanation}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-end pt-4 border-t">
          {isWaitingForFeedback ? (
            <Button disabled className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </Button>
          ) : hasAnsweredCurrent ? (
            <Button onClick={handleNext} className="gap-2">
              {currentIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Complete Assessment
                  <Trophy className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentComplete({
  totalQuestions,
  correctAnswers,
  totalTime,
}: {
  totalQuestions: number;
  correctAnswers: number;
  totalTime: number;
}) {
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;

  const getPerformanceLevel = () => {
    if (percentage >= 80) return { level: "Excellent", color: "text-green-600" };
    if (percentage >= 60) return { level: "Good", color: "text-blue-600" };
    if (percentage >= 40) return { level: "Fair", color: "text-amber-600" };
    return { level: "Needs Practice", color: "text-red-600" };
  };

  const performance = getPerformanceLevel();

  return (
    <Card className="w-full max-w-md mx-auto text-center">
      <CardContent className="pt-8 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
          <Trophy className="h-10 w-10 text-blue-600" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Assessment Complete!
          </h2>
          <p className={cn("text-lg font-medium mt-1", performance.color)}>
            {performance.level}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Target className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
            <div className="text-xs text-gray-500">Score</div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Brain className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {correctAnswers}/{totalQuestions}
            </div>
            <div className="text-xs text-gray-500">Correct</div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
            <div className="text-xs text-gray-500">Time</div>
          </div>
        </div>

        <p className="text-sm text-gray-500 pt-2">
          Great job completing the assessment! Your tutor will now customize the
          lesson based on your results.
        </p>
      </CardContent>
    </Card>
  );
}
