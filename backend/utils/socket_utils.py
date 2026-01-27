# Socket utilities for FastAPI WebSocket

# This module provides compatibility functions for slide navigation
# In FastAPI, WebSocket connections are managed in routers/websocket.py
# These functions are kept for backward compatibility with existing code

import asyncio
import logging

logger = logging.getLogger(__name__)

# Store reference to WebSocket broadcast function
_websocket_broadcast_func = None


def init_socketio(socketio_instance=None):
    """Initialize function - kept for compatibility, no-op in FastAPI"""
    # In FastAPI, WebSocket is handled differently
    # This function is kept for backward compatibility
    pass


def set_websocket_broadcast_func(broadcast_func):
    """Set the WebSocket broadcast function from FastAPI router"""
    global _websocket_broadcast_func
    _websocket_broadcast_func = broadcast_func


def emit_slide_change(assistant_id, position):
    """Emit slide change event to a specific room (synchronous wrapper)"""
    if _websocket_broadcast_func:
        # Run async function in event loop if available
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, schedule the coroutine
                asyncio.create_task(
                    _websocket_broadcast_func(assistant_id, "slide_changed", {"position": position})
                )
            else:
                loop.run_until_complete(
                    _websocket_broadcast_func(assistant_id, "slide_changed", {"position": position})
                )
        except RuntimeError:
            # No event loop, create new one
            asyncio.run(
                _websocket_broadcast_func(assistant_id, "slide_changed", {"position": position})
            )
    else:
        logger.warning("WebSocket broadcast function not initialized yet")


def emit_assistant_activity(assistant_id):
    """Emit assistant activity event to reset inactivity timer (synchronous wrapper)"""
    if _websocket_broadcast_func:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    _websocket_broadcast_func(assistant_id, "assistant_activity", {})
                )
            else:
                loop.run_until_complete(
                    _websocket_broadcast_func(assistant_id, "assistant_activity", {})
                )
        except RuntimeError:
            asyncio.run(_websocket_broadcast_func(assistant_id, "assistant_activity", {}))
    else:
        logger.warning("WebSocket broadcast function not initialized yet")
