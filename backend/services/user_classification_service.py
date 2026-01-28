"""User Classification Service.

Business logic for managing user classification (State/City/Board/Class).
"""

import logging
import os
from datetime import datetime, timezone
from typing import Optional

from supabase import Client, create_client

from models.exceptions import NotFoundError, StorageError, ValidationError
from models.user_classification import (
    ClassificationCheckResponse,
    SetClassificationRequest,
    UserClassification,
)

logger = logging.getLogger(__name__)


class UserClassificationService:
    """Service for user classification operations."""

    def __init__(self, user_id: str, user_email: str):
        """Initialize with authenticated user context."""
        if not user_id:
            raise ValidationError("User ID cannot be empty", field="user_id")
        self.user_id = user_id
        self.user_email = user_email

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not supabase_url or not supabase_key:
            raise ValidationError("Supabase credentials not configured")
        self.supabase: Client = create_client(supabase_url, supabase_key)

    def _get_utc_now(self) -> str:
        """Returns current UTC time in ISO 8601 format."""
        return datetime.now(timezone.utc).isoformat()

    def get_classification(self) -> Optional[UserClassification]:
        """Get user's classification.

        Returns:
            UserClassification if exists, None otherwise.
        """
        try:
            # Use SECURITY DEFINER function to bypass RLS safely
            result = self.supabase.rpc(
                "get_user_classification",
                {"p_user_id": self.user_id},
            ).execute()

            if not result.data:
                return None

            return UserClassification.from_dict(result.data)
        except Exception as e:
            logger.error(f"Error fetching classification for user {self.user_id}: {e}")
            raise StorageError("read", f"Failed to fetch classification: {e}")

    def set_classification(self, request: SetClassificationRequest) -> UserClassification:
        """Create or update user classification.

        Args:
            request: Classification data to set.

        Returns:
            Updated UserClassification.
        """
        # Validate request
        if not request.state_id:
            raise ValidationError("State is required", field="state_id")
        if not request.city_id:
            raise ValidationError("City is required", field="city_id")
        if not request.board_id:
            raise ValidationError("Board is required", field="board_id")
        if not request.class_level or request.class_level < 6 or request.class_level > 12:
            raise ValidationError("Class level must be between 6 and 12", field="class_level")

        try:
            # Use SECURITY DEFINER function to bypass RLS safely
            result = self.supabase.rpc(
                "upsert_user_classification",
                {
                    "p_user_id": self.user_id,
                    "p_state_id": request.state_id,
                    "p_city_id": request.city_id,
                    "p_board_id": request.board_id,
                    "p_class_level": request.class_level,
                    "p_state_name": request.state_name,
                    "p_city_name": request.city_name,
                    "p_board_name": request.board_name,
                },
            ).execute()

            if not result.data:
                raise StorageError("save", "Failed to save classification")

            return UserClassification.from_dict(result.data)
        except ValidationError:
            raise
        except StorageError:
            raise
        except Exception as e:
            logger.error(f"Error saving classification for user {self.user_id}: {e}")
            raise StorageError("save", f"Failed to save classification: {e}")

    def is_classification_complete(self) -> ClassificationCheckResponse:
        """Check if user has completed classification.

        Returns:
            ClassificationCheckResponse with completion status.
        """
        classification = self.get_classification()

        if not classification:
            return ClassificationCheckResponse(is_complete=False)

        return ClassificationCheckResponse(
            is_complete=classification.is_complete,
            classification=classification,
        )

    def promote_class(self) -> UserClassification:
        """Promote user to next class level.

        Returns:
            Updated UserClassification.

        Raises:
            NotFoundError: If classification doesn't exist.
            ValidationError: If already at max class level.
        """
        classification = self.get_classification()

        if not classification:
            raise NotFoundError("Classification", self.user_id)

        if classification.class_level >= 12:
            raise ValidationError("Already at maximum class level (12)", field="class_level")

        # Promote to next class
        new_class_level = classification.class_level + 1

        try:
            result = (
                self.supabase.table("user_classification")
                .update({
                    "class_level": new_class_level,
                    "updated_at": self._get_utc_now(),
                })
                .eq("user_id", self.user_id)
                .execute()
            )

            if not result.data:
                raise StorageError("update", "Failed to promote class")

            return UserClassification.from_dict(result.data[0])
        except ValidationError:
            raise
        except StorageError:
            raise
        except Exception as e:
            logger.error(f"Error promoting class for user {self.user_id}: {e}")
            raise StorageError("update", f"Failed to promote class: {e}")
