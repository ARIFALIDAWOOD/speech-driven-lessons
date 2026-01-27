"""
Agent-related Data Transfer Objects.

These dataclasses define the contracts for agent operations.
"""

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Optional

from .enums import TutorState
from .session import SessionContext


@dataclass
class StateTransition:
    """Represents a valid state transition."""

    from_state: TutorState
    to_state: TutorState
    condition: Optional[Callable[[SessionContext], bool]] = None
    trigger: str = "auto"  # "auto", "user_input", "timeout", "complete"


class TutorEvent:
    """Represents an event from the tutor for SSE streaming."""

    def __init__(
        self,
        event_type: str,
        content: str = "",
        data: Optional[dict] = None,
        state: Optional[TutorState] = None,
    ):
        self.event_type = event_type
        self.content = content
        self.data = data or {}
        self.state = state
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> dict:
        return {
            "event": self.event_type,
            "content": self.content,
            "data": self.data,
            "state": self.state.value if self.state else None,
            "timestamp": self.timestamp,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict())
