---
name: backend-course-outline-and-agent-integration
overview: Analyze existing backend support for course outline/plan generation and identify gaps between generation services and tutoring agents, then outline how to unify them.
todos:
  - id: align-schema
    content: Define and document a canonical CoursePlan/outline schema shared by generators, S3 storage, and SessionContext.
    status: pending
  - id: course-manager-integration
    content: Update CourseManager and FastAPI routes to use real AI outline generation (Gemini/Brave) instead of mock syllabus data, and read/write a single canonical syllabus file in S3.
    status: pending
  - id: migrate-course-generation-to-fastapi
    content: Port the Flask-based course_generation endpoints to FastAPI routers using Supabase auth dependencies.
    status: pending
  - id: tutor-session-wiring
    content: Wire ProactiveTutor session initialization to load the stored CoursePlan for a given course_id and populate SessionContext.outline.
    status: pending
---

### Goals

- **Understand existing backend capabilities** for generating course outlines/plans and how they are exposed via APIs.
- **Identify available agents** that work with course structure and how they expect outlines to be shaped.
- **Highlight gaps** between outline generation, storage, and agent consumption, and outline how to close them.

### What exists today

- **Curriculum-based outline generator (search + LLM)**
  - Implemented in [`backend/services/outline_generator.py`](backend/services/outline_generator.py) as `OutlineGenerator`.
  - Uses `BraveSearchClient` plus `get_llm_provider()` to create a **structured `CourseOutline`** with:
    - `sections` → each with `learning_objectives`, `subtopics`, and `estimated_minutes`.
    - `subtopics` → each with `title`, `description`, `key_points`, `estimated_minutes`.
  - Provides both **synchronous** (`generate_outline`) and **streaming** (`stream_outline`) APIs, but is not currently wired to a FastAPI route.

- **PDF-based outline generator (Gemini)**
  - Implemented in [`backend/course_content_generation/gemini_course_outline_generator.py`](backend/course_content_generation/gemini_course_outline_generator.py) as `CourseOutlineGenerator`.
  - Consumes a **PDF on disk**, calls Gemini, and returns a JSON object with `course_outline: [ { title, description, subtopics[] } ]`.
  - Wrapped by **Flask blueprints** in:
    - [`backend/api/course_generation.py`](backend/api/course_generation.py) and
    - [`backend/routes/course_generation_routes.py`](backend/routes/course_generation_routes.py)
  - These endpoints read PDFs from S3 (`user_data/{username}/{course_id}/course_materials/`), generate the outline, and write `course_outline.json` back to S3.

- **Course metadata and syllabus/outline access**
  - Managed via [`backend/utils/course_manager.py`](backend/utils/course_manager.py) with `CourseManager`:
    - Stores `course_info.json` and uploaded file metadata in S3.
    - Has **stubbed/placeholder methods**:
      - `generate_syllabus(...)` → currently returns **hard-coded/mock outline data** (Zhong County example) and writes `syllabus.json`.
      - `generate_slides(...)` → currently writes a **mock slides list** to `slides.json`.
    - Exposes `get_course_outline(course_id)` to read `syllabus.json` (not `course_outline.json`), so it is not yet wired to the Gemini/Brave outline pipeline.
  - FastAPI routes in [`backend/routers/course.py`](backend/routers/course.py) expose high-level course endpoints:
    - `/api/course/create-course`, `/api/course/courses`, `/api/course/fetch-course/{course_id}`.
    - `/api/course/generate-course-syllabus` → calls `CourseManager.generate_syllabus` (mock implementation).
    - `/api/course/generate-course-slides` and `/api/course/process-content/{course_id}` → call the **mock** `generate_slides` implementation.

- **Tutor agent that consumes a course outline**
  - Implemented under [`backend/agent`](backend/agent):
    - `ProactiveTutor` in [`backend/agent/tutor.py`](backend/agent/tutor.py) drives a state machine-based tutoring session.
    - `SessionContext` in [`backend/agent/states.py`](backend/agent/states.py) contains an `outline` field and helpers like `get_current_topic()` and `advance_to_next_topic()` which expect an outline shaped as:
      - `outline["sections"][i]["subtopics"][j] `with `title`, optional `key_points`, etc.
  - The tutor **assumes an outline already exists in memory** on `SessionContext.outline`; there is no direct call here to `OutlineGenerator` or the Gemini PDF generator.

### Current architecture (high level)

```mermaid
flowchart TD
  userUploads[UserUploadsPDF] --> s3Materials[S3_course_materials]
  s3Materials --> flaskCourseGen[Flask_course_generation_blueprints]
  flaskCourseGen --> geminiOutline[GeminiCourseOutlineGenerator]
  geminiOutline --> s3Outline[S3_course_outline.json]

  courseManager[CourseManager] --> syllabusStub[Mock_generate_syllabus]
  syllabusStub --> syllabusJson[syllabus.json]

  outlineService[OutlineGenerator_search+LLM] --> outlineInMemory[CourseOutline_object]

  s3Outline -->/unused_by_manager/ courseManager
  outlineInMemory --> sessionContext[SessionContext.outline]
  syllabusJson -->/manual_or_future/ sessionContext
```

### Direct answers to your questions

- **Does the backend have a method to create a course outline/plan?**
  - **Yes.** There are **two separate outline generators**:
    - `OutlineGenerator` (search + LLM) for curriculum-based outlines.
    - `CourseOutlineGenerator` (Gemini) for PDF-based outlines persisted to S3.
  - Additionally, `CourseManager.generate_syllabus` is a **placeholder** that currently uses a fixed mock outline, not real AI generation.

- **Is there an agent that can handle this?**
  - There is a **Proactive Tutor agent** (`ProactiveTutor`) that **consumes** an outline (via `SessionContext.outline`) and turns it into an interactive lesson with assessments, explanations, examples, etc.
  - This tutor **does not itself generate the outline**; it assumes some other service has already produced a structured outline object in the expected `sections/subtopics` format.

### Key gaps

- **Duplication and split between Flask and FastAPI**
  - Course-generation endpoints (`/generate-outline`, `/generate-slides`, `/get-course-outline`, `/get-course-slides`) currently live in Flask blueprints (`backend/api/course_generation.py`, `backend/routes/course_generation_routes.py`).
  - The rest of the backend is being migrated to **FastAPI** (`backend/routers/course.py`, `AGENTS.md`), so these features are **not yet exposed via the canonical FastAPI `/api/*` surface** or Supabase-auth dependencies.

- **Inconsistent outline storage and access paths**
  - PDF-based outline is saved as `course_outline.json` under `user_data/{user}/{course_id}/`.
  - `CourseManager` and the FastAPI routes work with a separate `syllabus.json` via `generate_syllabus` and `get_course_outline`, which currently uses **mock data** and does not read from `course_outline.json`.
  - Result: the "official" course APIs the frontend uses are **not wired** to the real AI outline generation pipeline.

- **No unified course plan model across services**
  - `OutlineGenerator` (search-based) produces a `CourseOutline` object with `sections`, `learning_objectives`, `subtopics`, and timing fields.
  - `CourseOutlineGenerator` (Gemini) returns a different JSON schema (`course_outline: [...] `with `title`/`description`/`subtopics` only).
  - `SessionContext` expects `outline["sections"][...]["subtopics"] `with fields like `key_points` and is time-aware.
  - There is **no single canonical "course plan" schema** enforced across generators, storage (S3), and the tutor agent.

- **No automated glue from generated outline → stored course → tutor session**
  - There is no backend flow that:
    - Takes uploaded course materials (or curriculum metadata),
    - Generates an outline using one of the generators,
    - Stores it in a consistent place (e.g., `syllabus.json` or `course_outline.json`), **and**
    - Hydrates `SessionContext.outline` for the `ProactiveTutor` when a tutoring session starts.
  - Today, any such wiring would have to be done manually or in code paths that are not yet implemented.

- **Course customization and configuration are stubs**
  - `CourseManager.customize_course(...)` is explicitly marked `TODO`.
  - There is no persisted `course_config.json` that would hold system prompts, pacing preferences, or tutor settings derived from the outline.

### Proposed direction to close the gaps (high level)

- **1) Define a single canonical `CoursePlan` schema**
  - Align:
    - `CourseOutline.to_dict()` from `outline_generator.py`,
    - Gemini `course_outline` output, and
    - `SessionContext.outline` expectations.
  - Introduce a normalizing function that converts any raw generator output into this canonical `CoursePlan` shape before persisting.

- **2) Wire AI outline generation into `CourseManager` and FastAPI**
  - Add methods to `CourseManager` that:
    - Trigger the Gemini PDF-based outline generator when course materials exist.
    - Optionally call the Brave-search `OutlineGenerator` when the user provides board/subject/chapter/topic metadata.
    - Persist the normalized `CoursePlan` to a single file (e.g., `syllabus.json`) and expose it via `get_course_outline`.
  - Update `/api/course/generate-course-syllabus` to call these real generators instead of returning mock data.

- **3) Migrate course-generation endpoints fully to FastAPI**
  - Recreate `/generate-outline`, `/generate-slides`, `/get-course-outline`, `/get-course-slides` under a FastAPI router (e.g. [`backend/routers/course_generation.py`](backend/routers/course_generation.py)), using `Depends(get_current_user)` and shared utilities.
  - Retire or clearly deprecate the Flask blueprints under `backend/api` and `backend/routes` once the migration is complete.

- **4) Integrate tutor agent with stored course plans**
  - When a tutoring session is created, load the canonical `CoursePlan` (from S3 via `CourseManager`) and assign it into `SessionContext.outline`.
  - Optionally add an endpoint like `/api/tutor/start-session` that:
    - Validates a `course_id`,
    - Loads its plan, and
    - Initializes a `SessionContext` pre-populated with the outline so `ProactiveTutor` can immediately run.

- **5) Implement real syllabus and slides pipelines**
  - Replace hard-coded mock outline and slides in `CourseManager.generate_syllabus` and `generate_slides` with:
    - Reading the canonical `CoursePlan` from S3.
    - Re-using `gemini_slide_speech_generator.process_course_outline` (or similar) to generate slides based on that plan.

These steps will make it clear that: **(a)** the backend absolutely can generate course outlines/plans, **(b)** the tutor agent can operate on them, and **(c)** the main work remaining is unifying schemas, storage, and API exposure so the pieces work together end-to-end.