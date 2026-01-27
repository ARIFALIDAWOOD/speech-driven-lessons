"""
Event Handlers - Phase 2

Defines handlers for course lifecycle events.
These handlers coordinate between different system components.
"""

import asyncio
import logging
from typing import Optional

from .course_events import CourseEvent, CourseEventType
from .event_bus import get_event_bus

logger = logging.getLogger(__name__)

# Debounce delay for embedding rebuilds (in seconds)
EMBEDDING_REBUILD_DELAY = 30


async def on_file_uploaded(event: CourseEvent):
    """
    Handle file upload events.

    Marks embeddings as stale and schedules a rebuild.
    """
    logger.info(
        f"File uploaded for course {event.course_id}: {event.data.get('filename')}"
    )

    # Import here to avoid circular imports
    from services.course_service import CourseService

    try:
        service = CourseService(user_email=event.user_email)
        service.update_embeddings_status(event.course_id, "stale")

        # Schedule embedding rebuild with debounce
        from workers.embedding_worker import get_embedding_worker

        worker = get_embedding_worker()
        await worker.schedule_rebuild(
            course_id=event.course_id,
            user_email=event.user_email,
            delay_seconds=EMBEDDING_REBUILD_DELAY,
        )

    except Exception as e:
        logger.error(f"Error handling file upload event: {e}")


async def on_file_deleted(event: CourseEvent):
    """
    Handle file deletion events.

    Invalidates embeddings and schedules a rebuild.
    """
    logger.info(
        f"File deleted from course {event.course_id}: {event.data.get('filename')}"
    )

    # Import here to avoid circular imports
    from services.course_service import CourseService

    try:
        service = CourseService(user_email=event.user_email)
        service.update_embeddings_status(event.course_id, "stale")

        # Schedule embedding rebuild with debounce
        from workers.embedding_worker import get_embedding_worker

        worker = get_embedding_worker()
        await worker.schedule_rebuild(
            course_id=event.course_id,
            user_email=event.user_email,
            delay_seconds=EMBEDDING_REBUILD_DELAY,
        )

    except Exception as e:
        logger.error(f"Error handling file delete event: {e}")


async def on_course_created(event: CourseEvent):
    """
    Handle course creation events.

    Optionally triggers outline generation if materials are present.
    """
    logger.info(f"Course created: {event.course_id}")

    if event.data.get("trigger_outline"):
        # Import here to avoid circular imports
        from services.plan_generator import PlanGenerator

        try:
            generator = PlanGenerator()
            await generator.generate_async(
                course_id=event.course_id,
                user_email=event.user_email,
            )
        except Exception as e:
            logger.error(f"Error generating outline for new course: {e}")


async def on_embeddings_completed(event: CourseEvent):
    """
    Handle embeddings build completion.

    Updates course status and notifies any waiting sessions.
    """
    logger.info(f"Embeddings completed for course {event.course_id}")

    # Import here to avoid circular imports
    from services.course_service import CourseService

    try:
        service = CourseService(user_email=event.user_email)
        service.update_embeddings_status(
            event.course_id,
            "ready",
            built_at=event.timestamp.isoformat(),
        )
    except Exception as e:
        logger.error(f"Error updating embeddings status: {e}")


async def on_embeddings_failed(event: CourseEvent):
    """Handle embeddings build failure."""
    logger.error(
        f"Embeddings build failed for course {event.course_id}: {event.data.get('error')}"
    )

    # Import here to avoid circular imports
    from services.course_service import CourseService

    try:
        service = CourseService(user_email=event.user_email)
        service.update_embeddings_status(
            event.course_id,
            "error",
            error=event.data.get("error"),
        )
    except Exception as e:
        logger.error(f"Error updating embeddings status: {e}")


def register_event_handlers():
    """
    Register all event handlers with the event bus.

    Call this during application startup.
    """
    event_bus = get_event_bus()

    # File events
    event_bus.subscribe(
        event_types=[CourseEventType.FILE_UPLOADED],
        handler=on_file_uploaded,
        is_async=True,
    )

    event_bus.subscribe(
        event_types=[CourseEventType.FILE_DELETED],
        handler=on_file_deleted,
        is_async=True,
    )

    # Course creation
    event_bus.subscribe(
        event_types=[CourseEventType.COURSE_CREATED],
        handler=on_course_created,
        is_async=True,
    )

    # Embeddings events
    event_bus.subscribe(
        event_types=[CourseEventType.EMBEDDINGS_BUILD_COMPLETED],
        handler=on_embeddings_completed,
        is_async=True,
    )

    event_bus.subscribe(
        event_types=[CourseEventType.EMBEDDINGS_BUILD_FAILED],
        handler=on_embeddings_failed,
        is_async=True,
    )

    logger.info("Registered course event handlers")
