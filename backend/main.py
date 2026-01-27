"""Robyn application entry point.

This is a high-performance web framework powered by Rust.
Migrated from FastAPI for improved performance.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from robyn import ALLOW_CORS, Robyn

# Load environment variables FIRST before any other imports
# Check for .env.local first (preferred), then .env
_env_local = Path(__file__).parent / ".env.local"
_env_file = Path(__file__).parent / ".env"
if _env_local.exists():
    load_dotenv(_env_local)
else:
    load_dotenv(_env_file)

# Validate required environment variables
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable must be set.")

# Initialize Robyn app
app = Robyn(__file__)

# Configure CORS for local UI
ALLOW_CORS(
    app,
    origins=[
        "http://localhost:3391",
        "http://127.0.0.1:3391",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
)

# Import and include routers
from robyn_routers import assistant, course, tutor_session, websocket_router

app.include_router(course.router)
app.include_router(tutor_session.router)
app.include_router(assistant.router)

# Register WebSocket routes on main app (not via SubRouter)
websocket_router.register_websocket(app)

# Initialize WebSocket utilities
from utils import socket_utils

socket_utils.set_websocket_broadcast_func(websocket_router.broadcast_to_room)


@app.get("/")
async def root(request):
    """Root endpoint."""
    return {"message": "Anantra LMS Backend API", "status": "running"}


@app.get("/health")
async def health(request):
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    app.start(host="0.0.0.0", port=5000)
