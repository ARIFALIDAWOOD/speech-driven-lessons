"""
Orchestration Workflow - Phase 1

Main LangGraph StateGraph definition for the multi-agent orchestration system.
"""

import logging
from typing import Any, Optional

from langgraph.graph import END, START, StateGraph

from .agents import orchestrator_node, route_from_orchestrator, should_continue_tutoring, tutor_node
from .config import get_config
from .state import AgentType, OrchestratorState, SessionPhase

logger = logging.getLogger(__name__)


def create_orchestration_graph(
    redis_url: Optional[str] = None,
    with_checkpointer: bool = True,
) -> Any:
    """
    Create the orchestration workflow graph.

    Args:
        redis_url: Redis URL for checkpointing (uses config default if None)
        with_checkpointer: Whether to enable Redis checkpointing

    Returns:
        Compiled LangGraph workflow
    """
    config = get_config()

    if redis_url is None:
        redis_url = config.redis_url

    # Create state graph
    builder = StateGraph(OrchestratorState)

    # Add nodes (Phase 1: orchestrator and tutor only)
    builder.add_node("orchestrator", orchestrator_node)
    builder.add_node("tutor", tutor_node)

    # Placeholder nodes for future phases (return state unchanged)
    builder.add_node("course_creator", _placeholder_node("course_creator"))
    builder.add_node("curriculum_designer", _placeholder_node("curriculum_designer"))
    builder.add_node("assessor", _placeholder_node("assessor"))
    builder.add_node("progress_tracker", _placeholder_node("progress_tracker"))

    # Entry point: start with orchestrator
    builder.add_edge(START, "orchestrator")

    # Orchestrator routes to appropriate agent
    builder.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            "tutor": "tutor",
            "course_creator": "course_creator",
            "curriculum_designer": "curriculum_designer",
            "assessor": "assessor",
            "progress_tracker": "progress_tracker",
            "__end__": END,
        },
    )

    # Tutor returns to orchestrator (with intervention check) or ends
    builder.add_conditional_edges(
        "tutor",
        should_continue_tutoring,
        {
            "orchestrator": "orchestrator",
            "assessor": "assessor",
            "progress_tracker": "progress_tracker",
            "__end__": END,
        },
    )

    # Other agents return to orchestrator
    builder.add_edge("course_creator", "orchestrator")
    builder.add_edge("curriculum_designer", "orchestrator")
    builder.add_edge("assessor", "orchestrator")
    builder.add_edge("progress_tracker", "orchestrator")

    # Compile graph
    if with_checkpointer:
        try:
            from langgraph.checkpoint.memory import MemorySaver

            # Use MemorySaver for Phase 1 (Redis in later phase)
            checkpointer = MemorySaver()
            graph = builder.compile(checkpointer=checkpointer)
            logger.info("Orchestration graph compiled with memory checkpointer")
        except ImportError:
            logger.warning("MemorySaver not available, compiling without checkpointer")
            graph = builder.compile()
    else:
        graph = builder.compile()

    return graph


def _placeholder_node(agent_name: str):
    """Create a placeholder node for agents not yet implemented."""

    def node(state: OrchestratorState):
        logger.warning(f"{agent_name} agent called but not yet implemented")
        # Just return to orchestrator
        return {
            "active_agent": AgentType.ORCHESTRATOR,
            "messages": [
                {
                    "role": "assistant",
                    "content": f"[{agent_name}] This agent is not yet implemented. Returning to main tutor.",
                }
            ],
        }

    return node


# Async version for web handlers
async def process_orchestration_turn(
    graph: Any,
    state: OrchestratorState,
    user_input: str,
    thread_id: str,
) -> OrchestratorState:
    """
    Process a single turn through the orchestration graph.

    Args:
        graph: Compiled orchestration graph
        state: Current state
        user_input: User's message
        thread_id: Thread ID for checkpointing

    Returns:
        Updated state after processing
    """
    # Update state with user input
    state["user_input"] = user_input

    # Run graph
    config = {"configurable": {"thread_id": thread_id}}

    result = await graph.ainvoke(state, config)

    return result
