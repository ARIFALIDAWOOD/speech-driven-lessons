## syntax=docker/dockerfile:1.9
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

# Configure uv for optimal Docker usage
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# First, install dependencies only (for better caching)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --locked --no-install-project --no-dev

# Then copy and install the project
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# Add virtual environment to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Expose the Robyn service port (Render will map this)
EXPOSE 8000

# Health check for the service
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default host/port; allow Render's PORT env to override
ENV HOST=0.0.0.0
ENV PORT=8000

# Run the Robyn app using uv
CMD ["uv", "run", "python", "main.py"]

