"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { SessionProgressBar } from "./SessionProgressBar";
import { LessonContentPane } from "./LessonContentPane";
import { AgentControlPane } from "./AgentControlPane";
import { BreakSuggestionModal } from "./BreakSuggestionModal";
import { AssessmentContainer, AssessmentQuestion, AssessmentAnswer } from "@/components/assessment";
import { Loader2 } from "lucide-react";

// Orchestration components - Phase 1
import {
  ActiveAgentDisplay,
  AgentIndicator,
  ProgressCheckOverlay,
  AgentTransitionNotification,
} from "@/components/orchestration";
import { useOrchestration } from "@/hooks/useOrchestration";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  state?: string;
}

interface TutorEvent {
  event: string;
  content: string;
  data: Record<string, any>;
  state: string | null;
  timestamp: string;
}

interface SessionState {
  currentState: string;
  studentLevel: string;
  assessmentScore: number;
  conceptsCovered: string[];
  currentTopic: {
    section: { title: string };
    subtopic: { title: string };
  } | null;
  progress: {
    sectionIndex: number;
    subtopicIndex: number;
    timeSpentMinutes: number;
  };
  isPaused: boolean;
}

interface TutorSessionLayoutProps {
  sessionId: string;
  accessToken: string;
}

export function TutorSessionLayout({
  sessionId,
  accessToken,
}: TutorSessionLayoutProps) {
  const router = useRouter();

  // Orchestration state - Phase 1
  const orchestration = useOrchestration(sessionId);

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>({
    currentState: "idle",
    studentLevel: "intermediate",
    assessmentScore: 0,
    conceptsCovered: [],
    currentTopic: null,
    progress: {
      sectionIndex: 0,
      subtopicIndex: 0,
      timeSpentMinutes: 0,
    },
    isPaused: false,
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [showAssessment, setShowAssessment] = useState(false);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Calculate progress
  const totalTopics = 5; // This should come from outline
  const topicsCompleted = sessionState.progress.subtopicIndex;
  const progress = (topicsCompleted / totalTopics) * 100;

  // Get upcoming topics
  const upcomingTopics = ["Next Topic 1", "Next Topic 2", "Next Topic 3"]; // From outline

  // Start SSE connection
  const startStream = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Pass token as query parameter since EventSource doesn't support custom headers
      const url = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/${sessionId}/stream?token=${encodeURIComponent(accessToken)}`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnecting(false);
        setIsStreaming(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: TutorEvent = JSON.parse(event.data);
          handleTutorEvent(data);
        } catch (e) {
          console.error("Failed to parse event:", e);
        }
      };

      eventSource.onerror = (e) => {
        console.error("SSE error:", e);
        setIsStreaming(false);
        setIsConnecting(false);
        eventSource.close();
      };
    } catch (e) {
      console.error("Stream error:", e);
      setError("Failed to connect to tutor");
      setIsConnecting(false);
    }
  }, [sessionId, accessToken]);

  // Handle tutor events
  const handleTutorEvent = (event: TutorEvent) => {
    switch (event.event) {
      case "agent_speak":
      case "transition":
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: event.content,
            timestamp: event.timestamp,
            state: event.state || undefined,
          },
        ]);
        setCurrentStreamContent("");
        break;

      case "ask_question":
        if (event.data?.type === "assessment") {
          // Handle assessment question
          setAssessmentQuestions((prev) => [
            ...prev,
            {
              questionIndex: event.data.question_index,
              questionText: event.content,
              questionType: event.data.question_type || "mcq",
              options: event.data.options || [],
              difficulty: event.data.difficulty || "medium",
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: event.content,
              timestamp: event.timestamp,
              state: event.state || undefined,
            },
          ]);
        }
        break;

      case "state_change":
        if (event.state) {
          setSessionState((prev) => ({
            ...prev,
            currentState: event.state!,
          }));

          if (event.state === "initial_assessment") {
            setShowAssessment(true);
          }
        }
        break;

      case "suggest_break":
        setShowBreakModal(true);
        break;

      case "session_complete":
        // Handle session completion
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: event.content,
            timestamp: event.timestamp,
            state: event.state || undefined,
          },
        ]);
        break;

      case "ready":
        setIsStreaming(false);
        break;

      case "complete":
        setIsStreaming(false);
        break;

      case "error":
        setError(event.data?.message || "An error occurred");
        break;
    }
  };

  // Send message to tutor
  const sendMessage = useCallback(
    async (message: string) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsStreaming(true);
      setCurrentStreamContent("");

      try {
        const url = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/${sessionId}/respond`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                handleTutorEvent(data);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (e) {
        console.error("Send error:", e);
        setError("Failed to send message");
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, accessToken]
  );

  // Quick action handlers
  const handleQuickAction = useCallback(
    (action: string) => {
      const actionMessages: Record<string, string> = {
        explain_more: "Can you explain that in more detail?",
        give_example: "Can you give me an example?",
        ask_question: "I have a question about this topic.",
        continue: "I understand, let's continue.",
        skip: "I'd like to skip this topic.",
      };

      const message = actionMessages[action];
      if (message) {
        sendMessage(message);
      }
    },
    [sendMessage]
  );

  // Pause/Resume handlers
  const handlePause = useCallback(async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/${sessionId}/pause`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setSessionState((prev) => ({ ...prev, isPaused: true }));
    } catch (e) {
      console.error("Pause error:", e);
    }
  }, [sessionId, accessToken]);

  const handleResume = useCallback(async () => {
    setSessionState((prev) => ({ ...prev, isPaused: false }));
    sendMessage("resume");
  }, [sendMessage]);

  // End session handler
  const handleEnd = useCallback(async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/${sessionId}/end`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (e) {
      console.error("End error:", e);
    }

    router.push("/learn");
  }, [sessionId, accessToken, router]);

  // Break modal handlers
  const handleTakeBreak = useCallback(() => {
    setShowBreakModal(false);
    handlePause();
  }, [handlePause]);

  const handleContinueFromBreak = useCallback(() => {
    setShowBreakModal(false);
    sendMessage("continue");
  }, [sendMessage]);

  // Assessment completion handler
  const handleAssessmentComplete = useCallback(
    (answers: AssessmentAnswer[]) => {
      setShowAssessment(false);
      // Send assessment completion to tutor
      const answersStr = answers
        .map((a) => `Q${a.questionIndex + 1}: ${a.answer}`)
        .join("; ");
      sendMessage(`Assessment answers: ${answersStr}`);
    },
    [sendMessage]
  );

  // Update time tracking
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 60000; // minutes
      setSessionState((prev) => ({
        ...prev,
        progress: {
          ...prev.progress,
          timeSpentMinutes: elapsed,
        },
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Start stream on mount
  useEffect(() => {
    startStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [startStream]);

  // Loading state
  if (isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Connecting to your tutor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={startStream}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Assessment view
  if (showAssessment && assessmentQuestions.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <AssessmentContainer
          questions={assessmentQuestions}
          onComplete={handleAssessmentComplete}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Orchestration Overlays - Phase 1 */}
      <ProgressCheckOverlay
        isActive={orchestration.isProgressCheck}
        checkType={orchestration.progressCheckType || 'routine'}
      />
      <AgentTransitionNotification
        fromAgent={orchestration.previousAgent}
        toAgent={orchestration.activeAgent}
        show={orchestration.showTransition}
      />

      {/* Progress Bar with Agent Indicator */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        {/* Agent Indicator showing active agent PNG */}
        <AgentIndicator
          activeAgent={orchestration.activeAgent}
          isSpeaking={orchestration.isSpeaking}
        />

        <SessionProgressBar
          currentState={sessionState.currentState}
          progress={progress}
          topicsCompleted={topicsCompleted}
          totalTopics={totalTopics}
          timeSpent={sessionState.progress.timeSpentMinutes}
          isPaused={sessionState.isPaused}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Lesson Content */}
        <div className="flex-1 flex flex-col">
          <LessonContentPane
            messages={messages}
            isStreaming={isStreaming}
            currentStreamContent={currentStreamContent}
          />
        </div>

        {/* Control Panel with Active Agent Display */}
        <div className="flex flex-col w-80 border-l bg-white">
          {/* Active Agent Display - Phase 1 */}
          <div className="border-b bg-gray-50">
            <ActiveAgentDisplay
              activeAgent={orchestration.activeAgent}
              isSpeaking={orchestration.isSpeaking}
              isThinking={orchestration.isThinking}
            />
          </div>

          {/* Original Control Panel */}
          <AgentControlPane
            currentState={sessionState.currentState}
            currentTopic={
              sessionState.currentTopic
                ? {
                    section: sessionState.currentTopic.section.title,
                    subtopic: sessionState.currentTopic.subtopic.title,
                  }
                : undefined
            }
            upcomingTopics={upcomingTopics}
            onSendMessage={sendMessage}
            onQuickAction={handleQuickAction}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
            isPaused={sessionState.isPaused}
            isProcessing={isStreaming}
          />
        </div>
      </div>

      {/* Break Modal */}
      <BreakSuggestionModal
        isOpen={showBreakModal}
        onClose={() => setShowBreakModal(false)}
        onTakeBreak={handleTakeBreak}
        onContinue={handleContinueFromBreak}
        timeElapsed={sessionState.progress.timeSpentMinutes}
        topicsCompleted={topicsCompleted}
      />
    </div>
  );
}
