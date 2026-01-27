"""
Orchestrator Agent - Phase 1

Central routing agent that determines which specialist agent should handle
the current interaction based on session phase and student state.
"""

from typing import Dict, Any
from ..state import OrchestratorState, SessionPhase, AgentType, ProgressHealth
from ..config import get_config


def orchestrator_node(state: OrchestratorState) -> Dict[str, Any]:
    """
    Main orchestrator node that routes to appropriate agents.

    This node analyzes the current state and determines:
    1. Which agent should handle the next interaction
    2. Whether a progress check is needed
    3. Any visual feedback signals to send to the UI
    """
    config = get_config()
    phase = state.get("current_phase", SessionPhase.INITIALIZATION)
    health = state.get("progress_health", ProgressHealth.GOOD)
    struggles = state.get("consecutive_struggles", 0)

    updates: Dict[str, Any] = {
        "previous_agent": state.get("active_agent"),
        "is_checking": False,
    }

    # Check if intervention is needed
    if _needs_intervention(state, config):
        updates["active_agent"] = AgentType.PROGRESS_TRACKER
        updates["is_checking"] = True
        return updates

    # Route based on phase
    if phase == SessionPhase.INITIALIZATION:
        # Check if we have materials to process
        if state.get("course_outline"):
            updates["current_phase"] = SessionPhase.ACTIVE_TUTORING
            updates["active_agent"] = AgentType.TUTOR
        else:
            # Need to create course first
            updates["current_phase"] = SessionPhase.COURSE_CREATION
            updates["active_agent"] = AgentType.COURSE_CREATOR

    elif phase == SessionPhase.COURSE_CREATION:
        updates["active_agent"] = AgentType.COURSE_CREATOR

    elif phase == SessionPhase.CURRICULUM_DESIGN:
        updates["active_agent"] = AgentType.CURRICULUM_DESIGNER

    elif phase == SessionPhase.ACTIVE_TUTORING:
        # Check tutor state for assessment trigger
        tutor_state = state.get("tutor_state", "")
        if tutor_state == "check_understanding":
            updates["current_phase"] = SessionPhase.ASSESSMENT
            updates["active_agent"] = AgentType.ASSESSOR
        else:
            updates["active_agent"] = AgentType.TUTOR

    elif phase == SessionPhase.ASSESSMENT:
        updates["active_agent"] = AgentType.ASSESSOR

    elif phase == SessionPhase.REVIEW:
        updates["active_agent"] = AgentType.PROGRESS_TRACKER
        updates["is_checking"] = True

    elif phase == SessionPhase.COMPLETE:
        # Session complete, stay in orchestrator
        updates["active_agent"] = AgentType.ORCHESTRATOR

    else:
        # Default to tutor
        updates["active_agent"] = AgentType.TUTOR

    return updates


def _needs_intervention(state: OrchestratorState, config) -> bool:
    """Check if progress tracker intervention is needed."""
    health = state.get("progress_health", ProgressHealth.GOOD)
    struggles = state.get("consecutive_struggles", 0)

    # Critical health requires intervention
    if health == ProgressHealth.CRITICAL:
        return True

    # Too many consecutive struggles
    if struggles >= config.max_consecutive_struggles:
        return True

    # Struggling health with recent confusion
    if health == ProgressHealth.STRUGGLING:
        confusion = state.get("confusion_events", 0)
        if confusion >= 2:
            return True

    return False


def route_from_orchestrator(state: OrchestratorState) -> str:
    """
    Conditional edge function for routing from orchestrator.

    Returns the name of the next node to route to.
    """
    active_agent = state.get("active_agent", AgentType.ORCHESTRATOR)

    # Map agent types to node names
    agent_to_node = {
        AgentType.ORCHESTRATOR: "__end__",  # End if staying in orchestrator
        AgentType.COURSE_CREATOR: "course_creator",
        AgentType.CURRICULUM_DESIGNER: "curriculum_designer",
        AgentType.TUTOR: "tutor",
        AgentType.ASSESSOR: "assessor",
        AgentType.PROGRESS_TRACKER: "progress_tracker",
    }

    return agent_to_node.get(active_agent, "tutor")
