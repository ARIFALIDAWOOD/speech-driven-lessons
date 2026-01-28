"""
Community Course Service Layer.

This module provides operations for community courses including
course management, contributions, and memberships.
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from supabase import Client, create_client

import utils.s3_utils as s3_utils
from models.community_course import (
    CommunityCourseData,
    ContributionData,
    ContributionListResponse,
    CourseDetailData,
    CourseFilters,
    CourseListResponse,
    CreateCourseRequest,
    MaterialData,
    MembershipData,
    SubmitContributionRequest,
    UserProgressData,
)
from models.exceptions import NotFoundError, StorageError, ValidationError

logger = logging.getLogger(__name__)


class CommunityCourseService:
    """
    Service class for community course operations.

    Handles course creation, contributions, memberships, and progress tracking.
    """

    def __init__(self, user_id: str, user_email: str):
        """
        Initialize CommunityCourseService.

        Args:
            user_id: The authenticated user's ID (from auth.users).
            user_email: The user's email address.
        """
        if not user_id:
            raise ValidationError("User ID cannot be empty", field="user_id")

        self.user_id = user_id
        self.user_email = user_email
        self.s3_bucket = s3_utils.S3_BUCKET_NAME

        # Initialize Supabase client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not supabase_url or not supabase_key:
            raise ValidationError("Supabase credentials not configured")
        self.supabase: Client = create_client(supabase_url, supabase_key)

    def _get_utc_now(self) -> str:
        """Returns the current UTC time in ISO 8601 format."""
        return datetime.now(timezone.utc).isoformat()

    # =========================================================================
    # COURSE CRUD OPERATIONS
    # =========================================================================

    def check_duplicate(
        self, board_id: str, subject_id: str, chapter_id: str
    ) -> Optional[CommunityCourseData]:
        """
        Check if a course already exists for the given B/S/C combination.

        Returns the existing course if found, None otherwise.
        """
        result = self.supabase.table("community_courses").select("*").eq(
            "board_id", board_id
        ).eq("subject_id", subject_id).eq("chapter_id", chapter_id).eq(
            "is_custom", False
        ).eq("status", "active").execute()

        if result.data and len(result.data) > 0:
            return CommunityCourseData.from_dict(result.data[0])
        return None

    def create_course(self, request: CreateCourseRequest) -> CommunityCourseData:
        """
        Create a new community course.

        If a course already exists for the B/S/C combination, raises ValidationError.
        """
        # Check for existing course (unless custom)
        if not request.is_custom:
            existing = self.check_duplicate(
                request.board_id, request.subject_id, request.chapter_id
            )
            if existing:
                raise ValidationError(
                    f"Course already exists for {request.board_name or request.board_id} > "
                    f"{request.subject_name or request.subject_id} > "
                    f"{request.chapter_name or request.chapter_id}",
                    field="board_id",
                )

        # Create the course
        course_data = {
            "title": request.title,
            "description": request.description,
            "board_id": request.board_id,
            "subject_id": request.subject_id,
            "chapter_id": request.chapter_id,
            "board_name": request.board_name,
            "subject_name": request.subject_name,
            "chapter_name": request.chapter_name,
            "is_custom": request.is_custom,
            "creator_id": self.user_id,
            "status": "active",
            # Classification fields
            "class_level": request.class_level,
            "state_id": request.state_id,
            "city_id": request.city_id,
            "state_name": request.state_name,
            "city_name": request.city_name,
        }

        result = self.supabase.table("community_courses").insert(course_data).execute()

        if not result.data:
            raise StorageError("create", "Failed to create community course")

        course = CommunityCourseData.from_dict(result.data[0])

        # Add creator as a member with 'creator' role
        self._add_membership(course.id, self.user_id, "creator")

        logger.info(f"Created community course: {course.id} - {course.title}")
        return course

    def get_or_create_course(self, request: CreateCourseRequest) -> tuple[CommunityCourseData, bool]:
        """
        Get existing course or create new one.

        Returns tuple of (course, created) where created is True if new course was made.
        """
        if not request.is_custom:
            existing = self.check_duplicate(
                request.board_id, request.subject_id, request.chapter_id
            )
            if existing:
                return existing, False

        course = self.create_course(request)
        return course, True

    def list_courses(self, filters: CourseFilters) -> CourseListResponse:
        """
        List community courses with optional filters.
        """
        query = self.supabase.table("community_courses").select("*", count="exact")

        # Apply filters
        if filters.board_id:
            query = query.eq("board_id", filters.board_id)
        if filters.subject_id:
            query = query.eq("subject_id", filters.subject_id)
        if filters.chapter_id:
            query = query.eq("chapter_id", filters.chapter_id)
        if filters.status:
            query = query.eq("status", filters.status)

        # Apply classification filters
        if filters.class_level:
            query = query.eq("class_level", filters.class_level)
        if filters.state_id:
            query = query.eq("state_id", filters.state_id)
        if filters.city_id:
            query = query.eq("city_id", filters.city_id)

        # Apply search filter (title or description)
        if filters.search:
            query = query.or_(f"title.ilike.%{filters.search}%,description.ilike.%{filters.search}%")

        # Apply pagination
        query = query.order("created_at", desc=True)
        query = query.range(filters.offset, filters.offset + filters.limit - 1)

        result = query.execute()

        courses = [CommunityCourseData.from_dict(row) for row in (result.data or [])]
        total = result.count or len(courses)

        return CourseListResponse(
            courses=courses,
            total=total,
            limit=filters.limit,
            offset=filters.offset,
        )

    def get_course(self, course_id: str) -> CommunityCourseData:
        """
        Get a single course by ID.
        """
        result = self.supabase.table("community_courses").select("*").eq(
            "id", course_id
        ).execute()

        if not result.data or len(result.data) == 0:
            raise NotFoundError("Course", course_id)

        return CommunityCourseData.from_dict(result.data[0])

    def get_course_detail(self, course_id: str) -> CourseDetailData:
        """
        Get course detail with materials, contributors, and user's membership.
        """
        # Get course
        course = self.get_course(course_id)

        # Get materials
        materials_result = self.supabase.table("course_materials").select("*").eq(
            "course_id", course_id
        ).order("added_at", desc=True).execute()

        materials = [MaterialData.from_dict(row) for row in (materials_result.data or [])]

        # Get contributors (users with 'contributor' or 'creator' role)
        contributors_result = self.supabase.table("course_memberships").select(
            "user_id, role, joined_at"
        ).eq("course_id", course_id).in_(
            "role", ["creator", "contributor"]
        ).execute()

        contributors = contributors_result.data or []

        # Get user's membership
        user_membership = None
        membership_result = self.supabase.table("course_memberships").select("*").eq(
            "course_id", course_id
        ).eq("user_id", self.user_id).execute()

        if membership_result.data and len(membership_result.data) > 0:
            user_membership = MembershipData.from_dict(membership_result.data[0])

        return CourseDetailData(
            course=course,
            materials=materials,
            contributors=contributors,
            user_membership=user_membership,
        )

    # =========================================================================
    # CONTRIBUTION OPERATIONS
    # =========================================================================

    def submit_contribution(
        self, request: SubmitContributionRequest
    ) -> ContributionData:
        """
        Submit a file contribution to a course.

        Supports multiple contribution types: pdf, image, youtube, link, text.
        Uploads file to S3 (for pdf/image) and creates a pending contribution record.
        """
        # Verify course exists
        course = self.get_course(request.course_id)

        # Validate contribution type
        valid_types = ["pdf", "image", "youtube", "link", "text"]
        if request.contribution_type not in valid_types:
            raise ValidationError(
                f"Invalid contribution type. Must be one of: {', '.join(valid_types)}",
                field="contribution_type"
            )

        s3_key = ""
        file_id = str(uuid.uuid4())

        # Handle file-based contributions (pdf, image)
        if request.contribution_type in ["pdf", "image"]:
            # Validate file type
            if request.contribution_type == "pdf" and not request.filename.lower().endswith(".pdf"):
                raise ValidationError(
                    "Only PDF files are accepted for PDF contributions", field="filename"
                )
            if request.contribution_type == "image":
                valid_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
                if not any(request.filename.lower().endswith(ext) for ext in valid_extensions):
                    raise ValidationError(
                        f"Only image files ({', '.join(valid_extensions)}) are accepted",
                        field="filename"
                    )

            # Generate S3 key
            s3_key = f"community_courses/{request.course_id}/contributions/{file_id}/{request.filename}"

            # Upload to S3
            try:
                s3_utils.upload_file_to_s3(
                    request.file_content,
                    self.s3_bucket,
                    s3_key,
                )
            except Exception as e:
                logger.error(f"Failed to upload contribution to S3: {e}")
                raise StorageError("upload", "Failed to upload file")

        # Handle link-based contributions (youtube, link)
        elif request.contribution_type in ["youtube", "link"]:
            if not request.contribution_metadata or not request.contribution_metadata.get("url"):
                raise ValidationError(
                    "URL is required in contribution_metadata for youtube/link contributions",
                    field="contribution_metadata"
                )
            # For youtube, validate URL format
            if request.contribution_type == "youtube":
                url = request.contribution_metadata.get("url", "")
                if not ("youtube.com" in url or "youtu.be" in url):
                    raise ValidationError(
                        "Invalid YouTube URL", field="contribution_metadata"
                    )

        # Handle text contributions
        elif request.contribution_type == "text":
            if not request.contribution_metadata or not request.contribution_metadata.get("content"):
                raise ValidationError(
                    "Content is required in contribution_metadata for text contributions",
                    field="contribution_metadata"
                )

        # Create contribution record
        contribution_data = {
            "course_id": request.course_id,
            "contributor_id": self.user_id,
            "filename": request.filename,
            "file_size": request.file_size,
            "s3_key": s3_key,
            "status": "pending",
            "contribution_type": request.contribution_type,
            "contribution_metadata": request.contribution_metadata or {},
        }

        result = self.supabase.table("course_contributions").insert(
            contribution_data
        ).execute()

        if not result.data:
            raise StorageError("create", "Failed to create contribution record")

        contribution = ContributionData.from_dict(result.data[0])

        # Ensure user has contributor membership
        self._ensure_membership(request.course_id, self.user_id, "contributor")

        logger.info(
            f"Submitted {request.contribution_type} contribution {contribution.id} to course {request.course_id}"
        )

        # TODO: Trigger async validation agent
        # For now, auto-approve contributions with score 0.8
        self._auto_validate_contribution(contribution.id)

        return contribution

    def _auto_validate_contribution(self, contribution_id: str) -> None:
        """
        Placeholder for contribution validation.

        In production, this would trigger an async agent to validate
        the file content matches the course B/S/C.
        """
        # For now, auto-approve with a placeholder score
        # TODO: Implement actual validation with embeddings similarity
        validation_score = 0.8
        validation_result = {
            "method": "auto",
            "message": "Auto-approved (validation agent not yet implemented)",
        }

        self.supabase.table("course_contributions").update({
            "validation_score": validation_score,
            "validation_result": validation_result,
        }).eq("id", contribution_id).execute()

        # If score >= 0.7, auto-approve
        if validation_score >= 0.7:
            self.approve_contribution(contribution_id, auto_approved=True)

    def approve_contribution(
        self, contribution_id: str, auto_approved: bool = False
    ) -> ContributionData:
        """
        Approve a contribution and move it to course materials.
        """
        # Get contribution
        result = self.supabase.table("course_contributions").select("*").eq(
            "id", contribution_id
        ).execute()

        if not result.data or len(result.data) == 0:
            raise NotFoundError("Contribution", contribution_id)

        contribution = ContributionData.from_dict(result.data[0])

        if contribution.status == "approved":
            raise ValidationError("Contribution already approved")

        # Update contribution status
        update_data = {
            "status": "approved",
            "reviewed_at": self._get_utc_now(),
        }
        if not auto_approved:
            update_data["reviewed_by"] = self.user_id

        self.supabase.table("course_contributions").update(update_data).eq(
            "id", contribution_id
        ).execute()

        # Create material record
        material_data = {
            "course_id": contribution.course_id,
            "contribution_id": contribution_id,
            "filename": contribution.filename,
            "file_size": contribution.file_size,
            "s3_key": contribution.s3_key,
        }

        self.supabase.table("course_materials").insert(material_data).execute()

        contribution.status = "approved"
        logger.info(f"Approved contribution {contribution_id}")

        return contribution

    def reject_contribution(
        self, contribution_id: str, reason: str
    ) -> ContributionData:
        """
        Reject a contribution with a reason.
        """
        # Get contribution
        result = self.supabase.table("course_contributions").select("*").eq(
            "id", contribution_id
        ).execute()

        if not result.data or len(result.data) == 0:
            raise NotFoundError("Contribution", contribution_id)

        contribution = ContributionData.from_dict(result.data[0])

        if contribution.status != "pending":
            raise ValidationError("Can only reject pending contributions")

        # Update contribution status
        self.supabase.table("course_contributions").update({
            "status": "rejected",
            "reviewed_by": self.user_id,
            "reviewed_at": self._get_utc_now(),
            "rejection_reason": reason,
        }).eq("id", contribution_id).execute()

        contribution.status = "rejected"
        contribution.rejection_reason = reason

        logger.info(f"Rejected contribution {contribution_id}: {reason}")

        return contribution

    def list_contributions(
        self, course_id: str, status: Optional[str] = None
    ) -> ContributionListResponse:
        """
        List contributions for a course.
        """
        query = self.supabase.table("course_contributions").select(
            "*", count="exact"
        ).eq("course_id", course_id)

        if status:
            query = query.eq("status", status)

        query = query.order("submitted_at", desc=True)

        result = query.execute()

        contributions = [
            ContributionData.from_dict(row) for row in (result.data or [])
        ]

        return ContributionListResponse(
            contributions=contributions,
            total=result.count or len(contributions),
        )

    def list_pending_contributions(self) -> ContributionListResponse:
        """
        List all pending contributions (admin view).
        """
        result = self.supabase.table("course_contributions").select(
            "*", count="exact"
        ).eq("status", "pending").order("submitted_at", desc=True).execute()

        contributions = [
            ContributionData.from_dict(row) for row in (result.data or [])
        ]

        return ContributionListResponse(
            contributions=contributions,
            total=result.count or len(contributions),
        )

    # =========================================================================
    # MEMBERSHIP OPERATIONS
    # =========================================================================

    def _add_membership(
        self, course_id: str, user_id: str, role: str
    ) -> MembershipData:
        """
        Add a membership record (internal use).
        """
        membership_data = {
            "course_id": course_id,
            "user_id": user_id,
            "role": role,
        }

        result = self.supabase.table("course_memberships").insert(
            membership_data
        ).execute()

        if not result.data:
            raise StorageError("create", "Failed to create membership")

        return MembershipData.from_dict(result.data[0])

    def _ensure_membership(
        self, course_id: str, user_id: str, role: str
    ) -> MembershipData:
        """
        Ensure user has a membership, upgrading role if necessary.
        """
        result = self.supabase.table("course_memberships").select("*").eq(
            "course_id", course_id
        ).eq("user_id", user_id).execute()

        if result.data and len(result.data) > 0:
            existing = MembershipData.from_dict(result.data[0])
            # Upgrade role if needed (contributor > learner)
            role_priority = {"creator": 3, "contributor": 2, "learner": 1}
            if role_priority.get(role, 0) > role_priority.get(existing.role, 0):
                self.supabase.table("course_memberships").update({
                    "role": role
                }).eq("id", existing.id).execute()
                existing.role = role
            return existing

        return self._add_membership(course_id, user_id, role)

    def join_course(self, course_id: str) -> MembershipData:
        """
        Join a course as a learner.
        """
        # Verify course exists
        self.get_course(course_id)

        return self._ensure_membership(course_id, self.user_id, "learner")

    def leave_course(self, course_id: str) -> bool:
        """
        Leave a course (delete membership).
        """
        result = self.supabase.table("course_memberships").delete().eq(
            "course_id", course_id
        ).eq("user_id", self.user_id).execute()

        return True

    def update_progress(
        self, course_id: str, progress_pct: float, time_spent_mins: int
    ) -> MembershipData:
        """
        Update user's progress in a course.
        """
        result = self.supabase.table("course_memberships").update({
            "progress_pct": progress_pct,
            "time_spent_mins": time_spent_mins,
            "last_accessed_at": self._get_utc_now(),
        }).eq("course_id", course_id).eq("user_id", self.user_id).execute()

        if not result.data or len(result.data) == 0:
            raise NotFoundError("Membership", f"{course_id}/{self.user_id}")

        return MembershipData.from_dict(result.data[0])

    def get_user_progress(self) -> list[UserProgressData]:
        """
        Get all courses the user is enrolled in with progress.
        """
        # Use the helper function
        result = self.supabase.rpc(
            "get_user_courses_with_progress",
            {"p_user_id": self.user_id}
        ).execute()

        if not result.data:
            # Fallback: manual query if function doesn't exist
            return self._get_user_progress_fallback()

        return [UserProgressData.from_dict(row) for row in result.data]

    def _get_user_progress_fallback(self) -> list[UserProgressData]:
        """
        Fallback method to get user progress without stored procedure.
        """
        result = self.supabase.table("course_memberships").select(
            "*, community_courses(*)"
        ).eq("user_id", self.user_id).execute()

        progress_list = []
        for row in (result.data or []):
            course = row.get("community_courses", {})
            if course and course.get("status") == "active":
                progress_list.append(UserProgressData(
                    course_id=row["course_id"],
                    title=course.get("title", ""),
                    board_name=course.get("board_name"),
                    subject_name=course.get("subject_name"),
                    chapter_name=course.get("chapter_name"),
                    role=row["role"],
                    progress_pct=float(row.get("progress_pct", 0)),
                    time_spent_mins=row.get("time_spent_mins", 0),
                    material_count=course.get("material_count", 0),
                    last_accessed_at=row.get("last_accessed_at"),
                ))

        return sorted(
            progress_list,
            key=lambda x: x.last_accessed_at or "",
            reverse=True,
        )

    def get_user_contributions(self) -> list[ContributionData]:
        """
        Get all contributions made by the user.
        """
        result = self.supabase.table("course_contributions").select("*").eq(
            "contributor_id", self.user_id
        ).order("submitted_at", desc=True).execute()

        return [ContributionData.from_dict(row) for row in (result.data or [])]
