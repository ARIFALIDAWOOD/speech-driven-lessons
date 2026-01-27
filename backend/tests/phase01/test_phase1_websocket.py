"""
P1-8: WebSocket receives orchestration updates.

Contract: state change -> WS message { "event": "orchestration_update", "data": { "state": ... } }.
Placeholder until orchestration_update is wired.
"""

from __future__ import annotations

import pytest


@pytest.mark.integration
@pytest.mark.skip(reason="Orchestration WS updates not wired yet")
def test_state_change_sends_orchestration_update_via_websocket():
    """P1-8: When orchestration state changes, backend sends orchestration_update WS message.

    Expected contract: { "event": "orchestration_update", "data": { "state": { ... } } }
    to the relevant room/session. Implement when notify_orchestration_update (or equivalent)
    is added and broadcast_to_room is called for orchestration updates.
    """
    pass
