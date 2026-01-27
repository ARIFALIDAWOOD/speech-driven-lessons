"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Loader2,
  Pause,
  Play,
  Send,
  SkipForward,
  X,
} from "lucide-react";

interface AgentControlPaneProps {
  currentState: string;
  currentTopic?: {
    section: string;
    subtopic: string;
  };
  upcomingTopics: string[];
  onSendMessage: (message: string) => void;
  onQuickAction: (action: string) => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  isPaused: boolean;
  isProcessing: boolean;
}

const QUICK_ACTIONS = [
  { id: "explain_more", label: "Explain More", icon: Lightbulb },
  { id: "give_example", label: "Give Example", icon: BookOpen },
  { id: "ask_question", label: "I Have a Question", icon: HelpCircle },
  { id: "continue", label: "Continue", icon: ArrowRight },
  { id: "skip", label: "Skip Topic", icon: SkipForward },
];

export function AgentControlPane({
  currentState,
  currentTopic,
  upcomingTopics,
  onSendMessage,
  onQuickAction,
  onPause,
  onResume,
  onEnd,
  isPaused,
  isProcessing,
}: AgentControlPaneProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !isProcessing) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 border-l border-border bg-muted flex flex-col h-full">
      {/* Current Topic */}
      <Card className="m-4 mb-2">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Topic
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          {currentTopic ? (
            <div>
              <p className="font-medium text-foreground">{currentTopic.subtopic}</p>
              <p className="text-xs text-muted-foreground">{currentTopic.section}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </CardContent>
      </Card>

      {/* Session Controls */}
      <div className="px-4 py-2 flex gap-2">
        {isPaused ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={onResume}
          >
            <Play className="h-4 w-4" />
            Resume
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={onPause}
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onEnd}
        >
          <X className="h-4 w-4" />
          End
        </Button>
      </div>

      {/* Quick Actions */}
      <Card className="mx-4 my-2">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={() => onQuickAction(action.id)}
                disabled={isProcessing || isPaused}
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Topics */}
      {upcomingTopics.length > 0 && (
        <Card className="mx-4 my-2">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coming Up
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <ul className="space-y-1">
              {upcomingTopics.slice(0, 3).map((topic, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-muted text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="truncate">{topic}</span>
                </li>
              ))}
              {upcomingTopics.length > 3 && (
                <li className="text-xs text-muted-foreground/70">
                  +{upcomingTopics.length - 3} more topics
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Response Input */}
      <div className="mt-auto p-4 border-t border-border bg-card">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isPaused
                ? "Session paused..."
                : isProcessing
                ? "Tutor is responding..."
                : "Type your response or question..."
            }
            disabled={isPaused || isProcessing}
            className="min-h-[80px] pr-12 resize-none"
          />
          <Button
            size="sm"
            className="absolute bottom-2 right-2"
            onClick={handleSend}
            disabled={!message.trim() || isProcessing || isPaused}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
