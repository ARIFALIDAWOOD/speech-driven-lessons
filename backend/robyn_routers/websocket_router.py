"""WebSocket utilities for Robyn.

Note: WebSocket routes must be added to the main Robyn app using the WebSocket class.
This module provides the handler and utility functions.
"""

import json
import logging
from typing import Dict, List, Any

from robyn import WebSocket as RobynWebSocket

logger = logging.getLogger(__name__)

# Store active WebSocket connections by assistant_id
# Maps assistant_id -> list of (websocket_instance, client_id) tuples
active_connections: Dict[str, List[tuple]] = {}

# Store the websocket instance for broadcasting
_websocket_instance = None


async def broadcast_to_room(assistant_id: str, event: str, data: dict):
    """Broadcast a message to all connections in a room."""
    if assistant_id in active_connections and _websocket_instance:
        message = json.dumps({"event": event, "data": data})
        disconnected = []

        for ws, client_id in active_connections[assistant_id]:
            try:
                ws.sync_send_to(client_id, message)
            except Exception as e:
                logger.error(f"Error sending message to connection {client_id}: {e}")
                disconnected.append((ws, client_id))

        # Remove disconnected connections
        for conn in disconnected:
            if conn in active_connections[assistant_id]:
                active_connections[assistant_id].remove(conn)


def register_websocket(app):
    """Register WebSocket routes on the main Robyn app.

    Must be called from the main app module since WebSockets
    can't be added to SubRouters.
    """
    import utils.s3_utils as s3_utils
    from functions.slides_navigation import go_to_starting_slide, update_viewing_slide

    global _websocket_instance

    # Create WebSocket instance
    websocket = RobynWebSocket(app, "/ws")
    _websocket_instance = websocket

    # Store client to assistant mapping
    client_assistant_map: Dict[str, str] = {}

    @websocket.on("connect")
    def on_connect():
        """Handle new WebSocket connection."""
        logger.info("WebSocket client connected")
        return "Connected to Anantra LMS WebSocket"

    @websocket.on("message")
    def on_message(ws, message: str) -> str:
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            event_type = data.get("event")
            payload = data.get("data", {})

            if event_type == "join_course":
                assistant_id = payload.get("assistant_id")
                if assistant_id:
                    if assistant_id not in active_connections:
                        active_connections[assistant_id] = []
                    active_connections[assistant_id].append((ws, ws.id))
                    client_assistant_map[ws.id] = assistant_id
                    logger.info(f"User {ws.id} joined course room: {assistant_id}")
                    return json.dumps({"event": "joined", "room": assistant_id})

            elif event_type == "update_viewing_slide":
                assistant_id = payload.get("assistant_id")
                position = payload.get("position")
                if assistant_id and position is not None:
                    logger.info(
                        f"Received slide update for {assistant_id}: {position}"
                    )
                    update_viewing_slide(assistant_id, position)
                    return json.dumps({"event": "slide_updated", "position": position})

            elif event_type == "welcome_block_start":
                assistant_id = payload.get("assistant_id")
                if assistant_id:
                    logger.info(
                        f"Welcome block start requested for {assistant_id}"
                    )
                    user_course_data = s3_utils.load_assistant_user_from_s3(
                        assistant_id
                    )
                    if user_course_data:
                        starting_slide_response = go_to_starting_slide(
                            assistant_id,
                            user_course_data["course_id"],
                            user_course_data["username"],
                        )
                        logger.info(
                            f"Starting slide response: {starting_slide_response}"
                        )
                        return json.dumps({"event": "welcome_started"})

            elif event_type == "ping":
                return json.dumps({"event": "pong"})

            return json.dumps({"event": "received"})

        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received: {message}")
            return json.dumps({"event": "error", "message": "Invalid JSON"})
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {e}")
            return json.dumps({"event": "error", "message": str(e)})

    @websocket.on("close")
    def on_close(ws):
        """Handle WebSocket disconnection."""
        client_id = ws.id
        logger.info(f"WebSocket client {client_id} disconnected")

        # Cleanup connections
        assistant_id = client_assistant_map.pop(client_id, None)
        if assistant_id and assistant_id in active_connections:
            active_connections[assistant_id] = [
                (w, c) for w, c in active_connections[assistant_id] if c != client_id
            ]
            if not active_connections[assistant_id]:
                del active_connections[assistant_id]

        return "Connection closed"


# Dummy router for compatibility with import structure
class DummyRouter:
    """Placeholder router since WebSockets use main app."""
    pass

router = DummyRouter()
