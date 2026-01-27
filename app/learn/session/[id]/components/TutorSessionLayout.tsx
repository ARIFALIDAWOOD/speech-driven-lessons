"use client";

/**
 * TutorSessionLayout - Phase 6 Redesign
 *
 * Sophisticated split-screen LMS interface with sidebar navigation,
 * resizable chat/workspace panes, and vision feedback system.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Orchestration components - Phase 1
import {
  ProgressCheckOverlay,
  AgentTransitionNotification,
} from "@/components/orchestration";
import { useOrchestration } from "@/hooks/useOrchestration";
import { useVisionFeedback } from "@/hooks/useVisionFeedback";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

// Phase 6 Components
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { LearnSidebar } from "@/components/learn/sidebar";
import { SplitScreenLayout, ChatPane, WorkspacePane } from "@/components/learn/main";
import { VisionFeedbackOverlay } from "@/components/learn/feedback";

// Legacy components (still used)
import { BreakSuggestionModal } from "./BreakSuggestionModal";
import { AssessmentContainer, AssessmentQuestion, AssessmentAnswer } from "@/components/assessment";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  state?: string;
  agentId?: string;
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

  // Token refresh - prevents token expiry during long SSE connections
  const { getValidToken, isRefreshing: isTokenRefreshing } = useTokenRefresh();

  // Orchestration state - Phase 1
  const orchestration = useOrchestration(sessionId);

  // Vision feedback - Phase 6
  const { isAlertMode, triggerAlert, clearAlert } = useVisionFeedback({
    healthScore: orchestration.healthScore,
    threshold: 0.45,
  });

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

  // Workspace metrics state
  const [coherence, setCoherence] = useState(100);
  const [interference, setInterference] = useState(50);
  const [gapStatus, setGapStatus] = useState<'filling' | 'identified' | 'resolved' | 'none'>('filling');

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Calculate progress
  const totalTopics = 5;
  const topicsCompleted = sessionState.progress.subtopicIndex;
  const progress = (topicsCompleted / totalTopics) * 100;

  // Current goal from topic
  const currentGoal = sessionState.currentTopic
    ? `${sessionState.currentTopic.section.title}: ${sessionState.currentTopic.subtopic.title}`
    : "Learning Session";

  // Track reconnection attempts
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 3;

  // Start SSE connection with token refresh
  const startStream = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get a valid token (refreshes if needed)
      const validToken = await getValidToken();
      if (!validToken) {
        setError("Unable to authenticate. Please sign in again.");
        setIsConnecting(false);
        return;
      }

      const url = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/${sessionId}/stream?token=${encodeURIComponent(validToken)}`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnecting(false);
        setIsStreaming(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      eventSource.onmessage = (event) => {
        try {
          const data: TutorEvent = JSON.parse(event.data);
          handleTutorEvent(data);
        } catch (e) {
          console.error("Failed to parse event:", e);
        }
      };

      eventSource.onerror = async (e) => {
        console.error("SSE error:", e);
        setIsStreaming(false);
        eventSource.close();

        // Attempt reconnection with fresh token
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `[TutorSession] SSE reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
          );

          // Wait a moment before reconnecting
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Try to get a fresh token and reconnect
          const freshToken = await getValidToken();
          if (freshToken) {
            startStream();
          } else {
            setError("Session expired. Please refresh the page.");
            setIsConnecting(false);
          }
        } else {
          setError("Connection lost. Please refresh the page.");
          setIsConnecting(false);
        }
      };
    } catch (e) {
      console.error("Stream error:", e);
      setError("Failed to connect to tutor");
      setIsConnecting(false);
    }
  }, [sessionId, getValidToken]);

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
            agentId: event.data?.agent_id,
          },
        ]);
        setCurrentStreamContent("");
        break;

      case "ask_question":
        if (event.data?.type === "assessment") {
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
              agentId: event.data?.agent_id,
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
      case "complete":
        setIsStreaming(false);
        break;

      case "error":
        setError(event.data?.message || "An error occurred");
        break;

      case "metrics_update":
        // Update workspace metrics from orchestration
        if (event.data?.coherence !== undefined) setCoherence(event.data.coherence);
        if (event.data?.interference !== undefined) setInterference(event.data.interference);
        if (event.data?.gap_status) setGapStatus(event.data.gap_status);
        break;
    }
  };

  // Send message to tutor with token refresh
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
        // Get a valid token before sending
        const validToken = await getValidToken();
        if (!validToken) {
          setError("Session expired. Please refresh the page.");
          setIsStreaming(false);
          return;
        }

        const url = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/${sessionId}/respond`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          // Check for auth errors
          if (response.status === 401 || response.status === 403) {
            // Try refreshing token and retrying once
            const freshToken = await getValidToken();
            if (freshToken) {
              const retryResponse = await fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${freshToken}`,
                },
                body: JSON.stringify({ message }),
              });
              if (!retryResponse.ok) {
                throw new Error("Failed to send message after token refresh");
              }
              // Continue with retry response
              const retryReader = retryResponse.body?.getReader();
              if (retryReader) {
                await processStreamResponse(retryReader);
              }
              return;
            }
          }
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        await processStreamResponse(reader);
      } catch (e) {
        console.error("Send error:", e);
        setError("Failed to send message");
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, getValidToken]
  );

  // Helper function to process stream responses
  const processStreamResponse = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
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
  };

  // Simulate stall for testing vision feedback
  const handleSimulateStall = useCallback(() => {
    if (isAlertMode) {
      clearAlert();
    } else {
      triggerAlert();
      // Add orchestrator intervention message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Intervention required: Student is physically interacting with the Lab nodes without progression. Overwatch Agent has signaled a potential cognitive gap. Switching to tactile-priority assessment.",
          timestamp: new Date().toISOString(),
          agentId: "orchestrator",
        },
      ]);
    }
  }, [isAlertMode, triggerAlert, clearAlert]);

  // Break modal handlers
  const handleTakeBreak = useCallback(() => {
    setShowBreakModal(false);
    setSessionState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const handleContinueFromBreak = useCallback(() => {
    setShowBreakModal(false);
    sendMessage("continue");
  }, [sendMessage]);

  // Assessment completion handler
  const handleAssessmentComplete = useCallback(
    (answers: AssessmentAnswer[]) => {
      setShowAssessment(false);
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
      const elapsed = (Date.now() - startTimeRef.current) / 60000;
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting to your tutor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={startStream}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
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
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <AssessmentContainer
          questions={assessmentQuestions}
          onComplete={handleAssessmentComplete}
        />
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* Vision Feedback Overlay */}
      <VisionFeedbackOverlay isAlertMode={isAlertMode} />

      {/* Orchestration Overlays - Phase 1 */}
      <ProgressCheckOverlay
        isActive={orchestration.isProgressCheck}
        checkType={orchestration.progressCheckType || "routine"}
      />
      <AgentTransitionNotification
        fromAgent={orchestration.previousAgent}
        toAgent={orchestration.activeAgent}
        show={orchestration.showTransition}
      />

      {/* Sidebar */}
      <LearnSidebar
        sessionId={sessionId}
        currentGoal={currentGoal}
        goalProgress={progress}
        activeAgent={orchestration.activeAgent}
        onlineAgents={["orchestrator", "tutor"]}
      />

      {/* Main Content Area */}
      <SidebarInset className="flex flex-col h-screen overflow-hidden min-h-0">
        {/* Mobile Sidebar Trigger */}
        <div className="md:hidden p-2 border-b flex-shrink-0">
          <SidebarTrigger />
        </div>

        {/* Split Screen Layout */}
        <SplitScreenLayout
          leftPane={
            <ChatPane
              messages={messages}
              isStreaming={isStreaming}
              currentStreamContent={currentStreamContent}
              activeAgent={orchestration.activeAgent}
              onSendMessage={sendMessage}
              onSimulateStall={handleSimulateStall}
              isAlertMode={isAlertMode}
            />
          }
          rightPane={
            <WorkspacePane
              title="Quantum Superposition Lab"
              description="Drag the energy nodes to observe state changes. The Assessor agent is watching your interaction speed."
              coherence={coherence}
              interference={interference}
              gapStatus={gapStatus}
            />
          }
          initialRatio={50}
          minRatio={20}
          maxRatio={80}
        />
      </SidebarInset>

      {/* Break Modal */}
      <BreakSuggestionModal
        isOpen={showBreakModal}
        onClose={() => setShowBreakModal(false)}
        onTakeBreak={handleTakeBreak}
        onContinue={handleContinueFromBreak}
        timeElapsed={sessionState.progress.timeSpentMinutes}
        topicsCompleted={topicsCompleted}
      />
    </SidebarProvider>
  );
}
