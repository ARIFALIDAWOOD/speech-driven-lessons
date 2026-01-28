"""User Classification Router.

API endpoints for user classification (State/City/Board/Class).
"""

import logging

from robyn import Request, SubRouter

from models.exceptions import NotFoundError, StorageError, ValidationError
from models.user_classification import (
    BOARDS,
    CITIES,
    CLASS_LEVELS,
    STATES,
    SetClassificationRequest,
)
from services.user_classification_service import UserClassificationService

from .auth import get_auth_handler, require_auth

router = SubRouter(__file__, prefix="/api/user")
logger = logging.getLogger(__name__)

# Configure authentication
router.configure_authentication(get_auth_handler())


def _handle_service_error(e: Exception) -> tuple[dict, dict, int]:
    """Convert service exceptions to HTTP responses."""
    if isinstance(e, NotFoundError):
        return {"detail": str(e)}, {}, 404
    elif isinstance(e, ValidationError):
        return {"detail": str(e)}, {}, 400
    elif isinstance(e, StorageError):
        logger.error(f"Storage error: {e}")
        return {"detail": str(e)}, {}, 500
    else:
        logger.error(f"Unexpected error: {e}")
        return {"detail": "An unexpected error occurred"}, {}, 500


def _get_service(request: Request) -> UserClassificationService:
    """Create service instance from request auth."""
    user = require_auth(request)
    return UserClassificationService(
        user_id=user["id"],
        user_email=user["email"],
    )


@router.get("/classification", auth_required=True)
async def get_classification(request: Request):
    """Get user's classification.

    Returns:
        UserClassification data or null if not set.
    """
    try:
        service = _get_service(request)
        classification = service.get_classification()

        if not classification:
            return {"classification": None}

        return {"classification": classification.to_dict()}
    except Exception as e:
        return _handle_service_error(e)


@router.put("/classification", auth_required=True)
async def set_classification(request: Request):
    """Create or update user classification.

    Body:
        state_id: str
        city_id: str
        board_id: str
        class_level: int (6-12)
        state_name: str (optional)
        city_name: str (optional)
        board_name: str (optional)

    Returns:
        Updated classification data.
    """
    try:
        service = _get_service(request)
        body = request.json()

        req = SetClassificationRequest(
            state_id=body.get("state_id", ""),
            city_id=body.get("city_id", ""),
            board_id=body.get("board_id", ""),
            class_level=body.get("class_level", 0),
            state_name=body.get("state_name"),
            city_name=body.get("city_name"),
            board_name=body.get("board_name"),
        )

        classification = service.set_classification(req)

        return {
            "message": "Classification saved successfully",
            "classification": classification.to_dict(),
        }
    except ValidationError as e:
        return {"detail": str(e)}, {}, 400
    except Exception as e:
        return _handle_service_error(e)


@router.get("/classification/check", auth_required=True)
async def check_classification(request: Request):
    """Check if user has completed classification.

    Returns:
        is_complete: bool
        classification: UserClassification | null
    """
    try:
        service = _get_service(request)
        response = service.is_classification_complete()

        return response.to_dict()
    except Exception as e:
        return _handle_service_error(e)


@router.post("/classification/promote", auth_required=True)
async def promote_class(request: Request):
    """Promote user to next class level.

    Returns:
        Updated classification with incremented class_level.
    """
    try:
        service = _get_service(request)
        classification = service.promote_class()

        return {
            "message": f"Promoted to Class {classification.class_level}",
            "classification": classification.to_dict(),
        }
    except NotFoundError:
        return {"detail": "Please set up your classification first"}, {}, 404
    except ValidationError as e:
        return {"detail": str(e)}, {}, 400
    except Exception as e:
        return _handle_service_error(e)


# Static data endpoints (no auth required)
@router.get("/classification/options")
async def get_classification_options(request: Request):
    """Get all classification options (states, boards, class levels).

    Returns:
        states: list of {id, name}
        boards: list of {id, name}
        class_levels: list of integers
    """
    return {
        "states": STATES,
        "boards": BOARDS,
        "class_levels": CLASS_LEVELS,
    }


@router.get("/classification/cities/:state_id")
async def get_cities_by_state(request: Request):
    """Get cities for a given state.

    Path params:
        state_id: State ID

    Returns:
        cities: list of {id, name}
    """
    state_id = request.path_params.get("state_id", "")
    cities = CITIES.get(state_id, [])

    return {"cities": cities}
