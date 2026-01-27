"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  Lightbulb,
  MessageSquare,
  Pause,
  Target,
} from "lucide-react";

interface SessionProgressBarProps {
  currentState: string;
  progress: number; // 0-100
  topicsCompleted: number;
  totalTopics: number;
  timeSpent: number; // minutes
  isPaused: boolean;
}

const STATE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  idle: { label: "Starting", icon: <Clock className="h-4 w-4" /> },
  course_setup: { label: "Setting Up", icon: <BookOpen className="h-4 w-4" /> },
  initial_assessment: { label: "Assessment", icon: <Brain className="h-4 w-4" /> },
  assessment_review: { label: "Review", icon: <Target className="h-4 w-4" /> },
  lesson_introduction: { label: "Introduction", icon: <BookOpen className="h-4 w-4" /> },
  concept_explanation: { label: "Concepts", icon: <Lightbulb className="h-4 w-4" /> },
  example_demonstration: { label: "Examples", icon: <Target className="h-4 w-4" /> },
  guided_practice: { label: "Practice", icon: <Brain className="h-4 w-4" /> },
  check_understanding: { label: "Check", icon: <CheckCircle className="h-4 w-4" /> },
  topic_summary: { label: "Summary", icon: <MessageSquare className="h-4 w-4" /> },
  answering_question: { label: "Q&A", icon: <MessageSquare className="h-4 w-4" /> },
  handling_confusion: { label: "Clarifying", icon: <Lightbulb className="h-4 w-4" /> },
  break_suggestion: { label: "Break", icon: <Pause className="h-4 w-4" /> },
  lesson_complete: { label: "Complete", icon: <CheckCircle className="h-4 w-4" /> },
  session_complete: { label: "Done", icon: <CheckCircle className="h-4 w-4" /> },
  session_paused: { label: "Paused", icon: <Pause className="h-4 w-4" /> },
};

export function SessionProgressBar({
  currentState,
  progress,
  topicsCompleted,
  totalTopics,
  timeSpent,
  isPaused,
}: SessionProgressBarProps) {
  const stateInfo = STATE_LABELS[currentState] || {
    label: currentState,
    icon: <BookOpen className="h-4 w-4" />,
  };

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card border-b border-border px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          {/* Current Phase */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 px-3 py-1",
                isPaused
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-primary/10 text-primary border-primary/20"
              )}
            >
              {stateInfo.icon}
              <span className="font-medium">{stateInfo.label}</span>
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>
                {topicsCompleted}/{totalTopics} topics
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatTime(timeSpent)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
}
