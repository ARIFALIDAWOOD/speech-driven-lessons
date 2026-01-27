"""
Embedding Worker - Phase 2

Background worker for building and rebuilding course embeddings.
Implements debouncing to avoid redundant rebuilds when multiple files change.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional
from uuid import uuid4

from events.course_events import CourseEvent, CourseEventType
from events.event_bus import get_event_bus

logger = logging.getLogger(__name__)


@dataclass
class PendingJob:
    """Represents a pending embedding build job."""

    course_id: str
    user_email: str
    scheduled_at: datetime
    task: Optional[asyncio.Task] = None
    correlation_id: str = field(default_factory=lambda: str(uuid4()))


class EmbeddingWorker:
    """
    Background worker for embedding builds with debouncing.

    Features:
    - Debounced rebuilds: Multiple file changes within delay period
      result in a single rebuild
    - Progress tracking: Emits events during build process
    - Error handling: Reports failures via event bus
    """

    def __init__(self, default_delay: int = 30):
        """
        Initialize the embedding worker.

        Args:
            default_delay: Default delay in seconds before starting rebuild
        """
        self.default_delay = default_delay
        self._pending_jobs: Dict[str, PendingJob] = {}
        self._event_bus = get_event_bus()

    async def schedule_rebuild(
        self,
        course_id: str,
        user_email: str,
        delay_seconds: Optional[int] = None,
    ) -> str:
        """
        Schedule an embedding rebuild with debouncing.

        If a rebuild is already scheduled for this course, it will be
        cancelled and replaced with a new one (debouncing).

        Args:
            course_id: The course ID
            user_email: User's email address
            delay_seconds: Delay before starting rebuild (default: 30s)

        Returns:
            Correlation ID for tracking the job
        """
        delay = delay_seconds if delay_seconds is not None else self.default_delay
        key = f"{user_email}:{course_id}"

        # Cancel existing job if any
        if key in self._pending_jobs:
            existing = self._pending_jobs[key]
            if existing.task and not existing.task.done():
                existing.task.cancel()
                logger.info(f"Cancelled pending rebuild for {key}")

        # Create new job
        job = PendingJob(
            course_id=course_id,
            user_email=user_email,
            scheduled_at=datetime.utcnow(),
        )

        # Schedule the delayed rebuild
        job.task = asyncio.create_task(
            self._delayed_rebuild(job, delay)
        )

        self._pending_jobs[key] = job
        logger.info(
            f"Scheduled embedding rebuild for {key} in {delay}s "
            f"(correlation_id={job.correlation_id})"
        )

        return job.correlation_id

    async def _delayed_rebuild(self, job: PendingJob, delay: int):
        """Execute rebuild after delay."""
        try:
            await asyncio.sleep(delay)

            # Check if still the active job
            key = f"{job.user_email}:{job.course_id}"
            if key not in self._pending_jobs:
                return

            current_job = self._pending_jobs[key]
            if current_job.correlation_id != job.correlation_id:
                return

            # Execute the rebuild
            await self._do_rebuild(job)

        except asyncio.CancelledError:
            logger.debug(f"Rebuild cancelled for {job.course_id}")
        except Exception as e:
            logger.error(f"Unexpected error in delayed rebuild: {e}")

    async def _do_rebuild(self, job: PendingJob):
        """Execute the actual embedding rebuild."""
        logger.info(f"Starting embedding rebuild for {job.course_id}")

        # Emit start event
        self._event_bus.emit(
            CourseEvent(
                event_type=CourseEventType.EMBEDDINGS_BUILD_STARTED,
                course_id=job.course_id,
                user_email=job.user_email,
                correlation_id=job.correlation_id,
            )
        )

        try:
            # Update status to building
            from services.course_service import CourseService

            service = CourseService(user_email=job.user_email)
            service.update_embeddings_status(job.course_id, "building")

            # Import and run the embedding processor
            from utils.load_and_process_index import process_course_context_s3

            await asyncio.to_thread(
                process_course_context_s3,
                job.user_email,
                job.course_id,
            )

            # Update status to ready
            service.update_embeddings_status(job.course_id, "ready")

            # Emit completion event
            self._event_bus.emit(
                CourseEvent(
                    event_type=CourseEventType.EMBEDDINGS_BUILD_COMPLETED,
                    course_id=job.course_id,
                    user_email=job.user_email,
                    correlation_id=job.correlation_id,
                )
            )

            logger.info(f"Completed embedding rebuild for {job.course_id}")

        except Exception as e:
            logger.error(f"Embedding rebuild failed for {job.course_id}: {e}")

            # Update status to error
            try:
                from services.course_service import CourseService

                service = CourseService(user_email=job.user_email)
                service.update_embeddings_status(
                    job.course_id, "error", error=str(e)
                )
            except Exception:
                pass

            # Emit failure event
            self._event_bus.emit(
                CourseEvent(
                    event_type=CourseEventType.EMBEDDINGS_BUILD_FAILED,
                    course_id=job.course_id,
                    user_email=job.user_email,
                    correlation_id=job.correlation_id,
                    data={"error": str(e)},
                )
            )

        finally:
            # Remove from pending jobs
            key = f"{job.user_email}:{job.course_id}"
            if key in self._pending_jobs:
                del self._pending_jobs[key]

    def get_pending_count(self) -> int:
        """Get count of pending rebuild jobs."""
        return len(self._pending_jobs)

    def is_rebuild_pending(self, course_id: str, user_email: str) -> bool:
        """Check if a rebuild is pending for a course."""
        key = f"{user_email}:{course_id}"
        return key in self._pending_jobs

    async def cancel_rebuild(self, course_id: str, user_email: str) -> bool:
        """
        Cancel a pending rebuild.

        Returns:
            True if a job was cancelled, False otherwise
        """
        key = f"{user_email}:{course_id}"
        if key in self._pending_jobs:
            job = self._pending_jobs[key]
            if job.task and not job.task.done():
                job.task.cancel()
            del self._pending_jobs[key]
            logger.info(f"Cancelled rebuild for {key}")
            return True
        return False

    async def force_rebuild_now(
        self,
        course_id: str,
        user_email: str,
    ) -> str:
        """
        Force an immediate embedding rebuild, bypassing debounce.

        Args:
            course_id: The course ID
            user_email: User's email address

        Returns:
            Correlation ID for tracking
        """
        # Cancel any pending job
        await self.cancel_rebuild(course_id, user_email)

        # Create and execute immediately
        job = PendingJob(
            course_id=course_id,
            user_email=user_email,
            scheduled_at=datetime.utcnow(),
        )

        key = f"{user_email}:{course_id}"
        self._pending_jobs[key] = job

        # Start rebuild without delay
        job.task = asyncio.create_task(self._do_rebuild(job))

        return job.correlation_id


# Global worker instance
_embedding_worker: Optional[EmbeddingWorker] = None


def get_embedding_worker() -> EmbeddingWorker:
    """Get the global embedding worker instance."""
    global _embedding_worker

    if _embedding_worker is None:
        _embedding_worker = EmbeddingWorker()

    return _embedding_worker
