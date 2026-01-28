"""
Community Course Data Transfer Objects.

These dataclasses define the contracts for community course operations.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class CommunityCourseData:
    """Full community course data structure."""

    id: str
    title: str
    description: Optional[str]
    board_id: str
    subject_id: str
    chapter_id: str
    board_name: Optional[str] = None
    subject_name: Optional[str] = None
    chapter_name: Optional[str] = None
    is_custom: bool = False
    creator_id: Optional[str] = None
    material_count: int = 0
    contributor_count: int = 0
    learner_count: int = 0
    status: str = "active"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # Classification fields
    class_level: Optional[int] = None
    state_id: Optional[str] = None
    city_id: Optional[str] = None
    state_name: Optional[str] = None
    city_name: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "board_id": self.board_id,
            "subject_id": self.subject_id,
            "chapter_id": self.chapter_id,
            "board_name": self.board_name,
            "subject_name": self.subject_name,
            "chapter_name": self.chapter_name,
            "is_custom": self.is_custom,
            "creator_id": self.creator_id,
            "material_count": self.material_count,
            "contributor_count": self.contributor_count,
            "learner_count": self.learner_count,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "class_level": self.class_level,
            "state_id": self.state_id,
            "city_id": self.city_id,
            "state_name": self.state_name,
            "city_name": self.city_name,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "CommunityCourseData":
        """Create from dictionary."""
        return cls(
            id=data.get("id", ""),
            title=data.get("title", ""),
            description=data.get("description"),
            board_id=data.get("board_id", ""),
            subject_id=data.get("subject_id", ""),
            chapter_id=data.get("chapter_id", ""),
            board_name=data.get("board_name"),
            subject_name=data.get("subject_name"),
            chapter_name=data.get("chapter_name"),
            is_custom=data.get("is_custom", False),
            creator_id=data.get("creator_id"),
            material_count=data.get("material_count", 0),
            contributor_count=data.get("contributor_count", 0),
            learner_count=data.get("learner_count", 0),
            status=data.get("status", "active"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            class_level=data.get("class_level"),
            state_id=data.get("state_id"),
            city_id=data.get("city_id"),
            state_name=data.get("state_name"),
            city_name=data.get("city_name"),
        )


@dataclass
class CreateCourseRequest:
    """Request to create a community course."""

    title: str
    board_id: str
    subject_id: str
    chapter_id: str
    description: Optional[str] = None
    board_name: Optional[str] = None
    subject_name: Optional[str] = None
    chapter_name: Optional[str] = None
    is_custom: bool = False
    # Classification fields
    class_level: Optional[int] = None
    state_id: Optional[str] = None
    city_id: Optional[str] = None
    state_name: Optional[str] = None
    city_name: Optional[str] = None


@dataclass
class CourseFilters:
    """Filters for listing courses."""

    board_id: Optional[str] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    status: str = "active"
    limit: int = 50
    offset: int = 0
    # Classification filters
    class_level: Optional[int] = None
    state_id: Optional[str] = None
    city_id: Optional[str] = None
    search: Optional[str] = None


@dataclass
class ContributionData:
    """Course contribution data structure."""

    id: str
    course_id: str
    contributor_id: str
    filename: str
    file_size: Optional[int]
    s3_key: str
    status: str = "pending"
    validation_score: Optional[float] = None
    validation_result: Optional[dict] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    submitted_at: Optional[str] = None
    # Contribution type fields
    contribution_type: str = "pdf"  # pdf, image, youtube, link, text
    contribution_metadata: Optional[dict] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "course_id": self.course_id,
            "contributor_id": self.contributor_id,
            "filename": self.filename,
            "file_size": self.file_size,
            "s3_key": self.s3_key,
            "status": self.status,
            "validation_score": self.validation_score,
            "validation_result": self.validation_result,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at,
            "rejection_reason": self.rejection_reason,
            "submitted_at": self.submitted_at,
            "contribution_type": self.contribution_type,
            "contribution_metadata": self.contribution_metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ContributionData":
        """Create from dictionary."""
        return cls(
            id=data.get("id", ""),
            course_id=data.get("course_id", ""),
            contributor_id=data.get("contributor_id", ""),
            filename=data.get("filename", ""),
            file_size=data.get("file_size"),
            s3_key=data.get("s3_key", ""),
            status=data.get("status", "pending"),
            validation_score=data.get("validation_score"),
            validation_result=data.get("validation_result"),
            reviewed_by=data.get("reviewed_by"),
            reviewed_at=data.get("reviewed_at"),
            rejection_reason=data.get("rejection_reason"),
            submitted_at=data.get("submitted_at"),
            contribution_type=data.get("contribution_type", "pdf"),
            contribution_metadata=data.get("contribution_metadata"),
        )


@dataclass
class SubmitContributionRequest:
    """Request to submit a contribution."""

    course_id: str
    filename: str
    file_content: bytes
    file_size: int
    contribution_type: str = "pdf"  # pdf, image, youtube, link, text
    contribution_metadata: Optional[dict] = None  # For youtube URLs, external links, etc.


@dataclass
class MaterialData:
    """Course material data structure."""

    id: str
    course_id: str
    contribution_id: Optional[str]
    filename: str
    file_size: Optional[int]
    s3_key: str
    added_at: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "course_id": self.course_id,
            "contribution_id": self.contribution_id,
            "filename": self.filename,
            "file_size": self.file_size,
            "s3_key": self.s3_key,
            "added_at": self.added_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "MaterialData":
        """Create from dictionary."""
        return cls(
            id=data.get("id", ""),
            course_id=data.get("course_id", ""),
            contribution_id=data.get("contribution_id"),
            filename=data.get("filename", ""),
            file_size=data.get("file_size"),
            s3_key=data.get("s3_key", ""),
            added_at=data.get("added_at"),
        )


@dataclass
class MembershipData:
    """Course membership data structure."""

    id: str
    course_id: str
    user_id: str
    role: str
    progress_pct: float = 0.0
    time_spent_mins: int = 0
    joined_at: Optional[str] = None
    last_accessed_at: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "course_id": self.course_id,
            "user_id": self.user_id,
            "role": self.role,
            "progress_pct": self.progress_pct,
            "time_spent_mins": self.time_spent_mins,
            "joined_at": self.joined_at,
            "last_accessed_at": self.last_accessed_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "MembershipData":
        """Create from dictionary."""
        return cls(
            id=data.get("id", ""),
            course_id=data.get("course_id", ""),
            user_id=data.get("user_id", ""),
            role=data.get("role", "learner"),
            progress_pct=float(data.get("progress_pct", 0)),
            time_spent_mins=data.get("time_spent_mins", 0),
            joined_at=data.get("joined_at"),
            last_accessed_at=data.get("last_accessed_at"),
        )


@dataclass
class UserProgressData:
    """User progress across courses."""

    course_id: str
    title: str
    board_name: Optional[str]
    subject_name: Optional[str]
    chapter_name: Optional[str]
    role: str
    progress_pct: float
    time_spent_mins: int
    material_count: int
    last_accessed_at: Optional[str]

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "course_id": self.course_id,
            "title": self.title,
            "board_name": self.board_name,
            "subject_name": self.subject_name,
            "chapter_name": self.chapter_name,
            "role": self.role,
            "progress_pct": self.progress_pct,
            "time_spent_mins": self.time_spent_mins,
            "material_count": self.material_count,
            "last_accessed_at": self.last_accessed_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "UserProgressData":
        """Create from dictionary."""
        return cls(
            course_id=data.get("course_id", ""),
            title=data.get("title", ""),
            board_name=data.get("board_name"),
            subject_name=data.get("subject_name"),
            chapter_name=data.get("chapter_name"),
            role=data.get("role", "learner"),
            progress_pct=float(data.get("progress_pct", 0)),
            time_spent_mins=data.get("time_spent_mins", 0),
            material_count=data.get("material_count", 0),
            last_accessed_at=data.get("last_accessed_at"),
        )


@dataclass
class CourseDetailData:
    """Course detail with materials and contributors."""

    course: CommunityCourseData
    materials: list[MaterialData] = field(default_factory=list)
    contributors: list[dict] = field(default_factory=list)
    user_membership: Optional[MembershipData] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "course": self.course.to_dict(),
            "materials": [m.to_dict() for m in self.materials],
            "contributors": self.contributors,
            "user_membership": self.user_membership.to_dict() if self.user_membership else None,
        }


@dataclass
class CourseListResponse:
    """Response for listing courses."""

    courses: list[CommunityCourseData]
    total: int
    limit: int
    offset: int

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "courses": [c.to_dict() for c in self.courses],
            "total": self.total,
            "limit": self.limit,
            "offset": self.offset,
        }


@dataclass
class ContributionListResponse:
    """Response for listing contributions."""

    contributions: list[ContributionData]
    total: int

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "contributions": [c.to_dict() for c in self.contributions],
            "total": self.total,
        }
