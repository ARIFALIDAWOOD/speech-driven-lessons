'use client';

/**
 * useOrchestration Hook - Phase 1
 *
 * Hook for managing orchestration state with WebSocket connection.
 * Tracks active agent, progress checks, and visual feedback.
 */

import { useState, useEffect, useCallback } from 'react';

interface OrchestrationState {
  activeAgent: string;
  previousAgent: string | null;
  sessionPhase: string;
  healthScore: number;
  isProgressCheck: boolean;
  progressCheckType: 'routine' | 'intervention' | 'assessment' | null;
  isSpeaking: boolean;
  isThinking: boolean;
  showTransition: boolean;
  isConnected: boolean;
}

const initialState: OrchestrationState = {
  activeAgent: 'orchestrator',
  previousAgent: null,
  sessionPhase: 'initialization',
  healthScore: 1.0,
  isProgressCheck: false,
  progressCheckType: null,
  isSpeaking: false,
  isThinking: false,
  showTransition: false,
  isConnected: false,
};

export function useOrchestration(sessionId: string) {
  const [state, setState] = useState<OrchestrationState>(initialState);

  useEffect(() => {
    if (!sessionId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws/orchestration/${sessionId}`);

    ws.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
      console.log('Orchestration WebSocket connected');
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      console.log('Orchestration WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('Orchestration WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'orchestration_update':
            handleOrchestrationUpdate(data.data);
            break;

          case 'agent_speaking':
            setState((prev) => ({ ...prev, isSpeaking: data.is_speaking }));
            break;

          case 'agent_thinking':
            setState((prev) => ({ ...prev, isThinking: data.is_thinking }));
            break;

          case 'progress_check':
            setState((prev) => ({
              ...prev,
              isProgressCheck: true,
              progressCheckType: data.check_type || 'routine',
            }));
            break;

          case 'progress_check_end':
            setState((prev) => ({
              ...prev,
              isProgressCheck: false,
              progressCheckType: null,
            }));
            break;

          default:
            break;
        }
      } catch (error) {
        console.error('Error parsing orchestration message:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  const handleOrchestrationUpdate = useCallback((data: any) => {
    setState((prev) => {
      const newAgent = data.active_agent || prev.activeAgent;
      const oldAgent = prev.activeAgent;

      // Detect agent switch
      const agentChanged = newAgent !== oldAgent;

      // Detect progress check round
      const isProgressCheck =
        (newAgent === 'progress_tracker' || newAgent === 'orchestrator') &&
        data.is_checking;

      // Determine check type based on health score
      let checkType: 'routine' | 'intervention' | 'assessment' | null = null;
      if (isProgressCheck) {
        if ((data.health_score || 1) < 0.45) {
          checkType = 'intervention';
        } else if (newAgent === 'assessor') {
          checkType = 'assessment';
        } else {
          checkType = 'routine';
        }
      }

      return {
        ...prev,
        activeAgent: newAgent,
        previousAgent: agentChanged ? oldAgent : prev.previousAgent,
        sessionPhase: data.session_phase || prev.sessionPhase,
        healthScore: data.health_score ?? prev.healthScore,
        isProgressCheck,
        progressCheckType: checkType,
        showTransition: agentChanged,
      };
    });

    // Clear transition notification after delay
    if (state.showTransition) {
      setTimeout(() => {
        setState((prev) => ({ ...prev, showTransition: false }));
      }, 3000);
    }
  }, []);

  // Manual clear for transition notification
  const clearTransition = useCallback(() => {
    setState((prev) => ({ ...prev, showTransition: false }));
  }, []);

  // Manual clear for progress check
  const clearProgressCheck = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isProgressCheck: false,
      progressCheckType: null,
    }));
  }, []);

  return {
    ...state,
    clearTransition,
    clearProgressCheck,
  };
}
