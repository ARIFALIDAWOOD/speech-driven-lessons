"""
Event Bus - Phase 2

Provides publish/subscribe functionality for course lifecycle events.
Supports both in-memory and Redis-based event distribution.
"""

import asyncio
import json
import logging
import os
from typing import Any, Callable, Dict, List, Optional
from dataclasses import dataclass, field

from .course_events import CourseEvent, CourseEventType

logger = logging.getLogger(__name__)


@dataclass
class Subscription:
    """Represents an event subscription."""

    event_types: List[CourseEventType]
    handler: Callable[[CourseEvent], Any]
    course_id: Optional[str] = None  # None means all courses
    is_async: bool = False


class EventBus:
    """
    Event bus for course lifecycle events.

    Supports:
    - In-memory pub/sub for single-instance deployments
    - Redis pub/sub for distributed deployments (when redis_url is provided)
    - Async and sync handlers
    - Course-specific and global subscriptions
    """

    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize the event bus.

        Args:
            redis_url: Optional Redis URL for distributed pub/sub.
                       If None, uses in-memory only.
        """
        self.redis_url = redis_url
        self._subscriptions: List[Subscription] = []
        self._redis_client = None
        self._pubsub = None

        if redis_url:
            self._init_redis(redis_url)

    def _init_redis(self, redis_url: str):
        """Initialize Redis connection for distributed events."""
        try:
            import redis

            self._redis_client = redis.from_url(redis_url)
            self._pubsub = self._redis_client.pubsub()
            logger.info("Event bus connected to Redis")
        except ImportError:
            logger.warning("Redis not available, using in-memory only")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}, using in-memory only")

    def subscribe(
        self,
        event_types: List[CourseEventType],
        handler: Callable[[CourseEvent], Any],
        course_id: Optional[str] = None,
        is_async: bool = False,
    ) -> Subscription:
        """
        Subscribe to course events.

        Args:
            event_types: List of event types to subscribe to
            handler: Callback function to handle events
            course_id: Optional course ID to filter events (None = all)
            is_async: Whether the handler is async

        Returns:
            Subscription object (can be used to unsubscribe)
        """
        subscription = Subscription(
            event_types=event_types,
            handler=handler,
            course_id=course_id,
            is_async=is_async,
        )
        self._subscriptions.append(subscription)
        logger.debug(f"Added subscription for events: {event_types}")
        return subscription

    def unsubscribe(self, subscription: Subscription):
        """Remove a subscription."""
        if subscription in self._subscriptions:
            self._subscriptions.remove(subscription)
            logger.debug("Removed subscription")

    def emit(self, event: CourseEvent):
        """
        Emit an event synchronously.

        This will:
        1. Notify all in-memory subscribers
        2. Publish to Redis if configured
        """
        logger.info(
            f"Emitting event: {event.event_type.value} for course {event.course_id}"
        )

        # Publish to Redis if available
        if self._redis_client:
            try:
                channel = f"course_events:{event.course_id}"
                self._redis_client.publish(channel, json.dumps(event.to_dict()))
            except Exception as e:
                logger.error(f"Failed to publish to Redis: {e}")

        # Notify in-memory subscribers
        self._notify_subscribers(event)

    async def emit_async(self, event: CourseEvent):
        """
        Emit an event asynchronously.

        Similar to emit() but awaits async handlers.
        """
        logger.info(
            f"Emitting async event: {event.event_type.value} for course {event.course_id}"
        )

        # Publish to Redis if available
        if self._redis_client:
            try:
                channel = f"course_events:{event.course_id}"
                self._redis_client.publish(channel, json.dumps(event.to_dict()))
            except Exception as e:
                logger.error(f"Failed to publish to Redis: {e}")

        # Notify in-memory subscribers
        await self._notify_subscribers_async(event)

    def _notify_subscribers(self, event: CourseEvent):
        """Notify all matching subscribers synchronously."""
        for sub in self._subscriptions:
            if self._matches_subscription(event, sub):
                try:
                    if sub.is_async:
                        # Schedule async handler
                        asyncio.create_task(sub.handler(event))
                    else:
                        sub.handler(event)
                except Exception as e:
                    logger.error(f"Error in event handler: {e}")

    async def _notify_subscribers_async(self, event: CourseEvent):
        """Notify all matching subscribers asynchronously."""
        tasks = []
        for sub in self._subscriptions:
            if self._matches_subscription(event, sub):
                try:
                    if sub.is_async:
                        tasks.append(sub.handler(event))
                    else:
                        sub.handler(event)
                except Exception as e:
                    logger.error(f"Error in event handler: {e}")

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    def _matches_subscription(self, event: CourseEvent, sub: Subscription) -> bool:
        """Check if an event matches a subscription."""
        # Check event type
        if event.event_type not in sub.event_types:
            return False

        # Check course ID filter
        if sub.course_id is not None and sub.course_id != event.course_id:
            return False

        return True


# Global event bus instance
_event_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """
    Get the global event bus instance.

    Creates the event bus on first call, using Redis if configured.
    """
    global _event_bus

    if _event_bus is None:
        redis_url = os.getenv("REDIS_URL") or os.getenv("LANGGRAPH_REDIS_URL")
        _event_bus = EventBus(redis_url=redis_url)

    return _event_bus
