---
name: Content generation and deprecation
overview: Content generation is disabled because the `course_content_generation` package is missing from the repo. The deprecation warning comes from LangChain’s use of Pydantic V1 on Python 3.14+, which is not supported.
todos: []
---

# Content generation disabled and deprecation warning

## 1. Why content generation is disabled

**Root cause:** The `course_content_generation` module does **not exist** in the repository.

- [backend/api/course_generation.py](backend/api/course_generation.py) (lines 12–19) imports:
- `course_content_generation.gemini_course_outline_generator.CourseOutlineGenerator`
- `course_content_generation.gemini_slide_speech_generator.process_course_outline`
- On `ImportError`, it sets `COURSE_GENERATION_AVAILABLE = False` and prints:  
`"Warning: course_content_generation module not found. Course generation features disabled."`
- The blueprint stays registered, but `/api/course_generation/generate-outline` and `/api/course_generation/generate-slides` return errors (SSE/503) when used.

The [README](README.md) describes `course_content_generation/` as an in-repo module (Gemini outline + slide/speech generators), but **no such package or directory exists** anywhere. There is no `course_content_generation` in [backend/pyproject.toml](backend/pyproject.toml), and [pwsh-runner/README.md](pwsh-runner/README.md) only says it “may need manual installation” without any install steps or reference to another repo.

**Conclusion:** The module was either never added, removed, or lives in another repo/package that is not wired up. To enable content generation, you need to **add** the `course_content_generation` package (e.g. under `backend/course_content_generation/` with `gemini_course_outline_generator.py` and `gemini_slide_speech_generator.py` as per the README) or integrate an equivalent implementation.

---

## 2. Deprecation warning

**Message:**
`UserWarning: Core Pydantic V1 functionality isn't compatible with Python 3.14 or greater.`
(from `langchain_core._api.deprecation` → `pydantic.v1.fields`)

**Cause:**

- You are running on **Python 3.14** (or newer).  
- **LangChain** ([langchain](https://pypi.org/project/langchain/) / [langchain-core](https://pypi.org/project/langchain-core/)) still uses **Pydantic V1** internally (`pydantic.v1`).  
- Pydantic V1 is **not** compatible with Python 3.14+; hence the warning.

**Where it’s triggered:**
LangChain is pulled in by [backend/routes/aiTutor_routes.py](backend/routes/aiTutor_routes.py) (`from langchain_core.messages import AIMessage, HumanMessage`) and by [langgraph](https://pypi.org/project/langgraph/) (which uses langchain-core). Loading the app registers these routes, which import langchain, which triggers the Pydantic V1 import and the warning.

**So yes — this is a deprecation/compatibility warning:** LangChain’s use of Pydantic V1 is deprecated and incompatible with Python 3.14+.

**Ways to address it:**

1. **Use Python 3.12 or 3.13** (e.g. `uv run --python 3.12 python app.py`) until LangChain fully moves off Pydantic V1. [pyproject.toml](backend/pyproject.toml) allows `>=3.10`.
2. **Upgrade LangChain** to a version that no longer relies on Pydantic V1 (once such a release exists) and stay on a supported Python.
3. **Suppress the warning** (e.g. `warnings.filterwarnings`) only if you accept potential breakage; it does not fix the underlying compatibility issue.

---

## 3. Other warning (vapi-python)

`"Warning: vapi-python not available (Windows not supported). Voice assistant features disabled."` comes from [backend/api/assistant.py](backend/api/assistant.py). This is **unrelated** to content generation. `vapi-python` depends on `daily-python`, which does not support Windows. It’s optional and documented in [pwsh-runner/README.md](pwsh-runner/README.md). No change needed unless you want voice assistant on Windows.

---

## 4. Summary

| Issue | Cause | Deprecation? |
|-------|--------|---------------|
| Content generation disabled | `course_content_generation` module **missing** from repo | No |
| Pydantic V1 warning | LangChain uses Pydantic V1 on **Python 3.14+** | **Yes** |
| vapi-python warning | Windows not supported by `daily-python` | No |

**Recommended next steps:**

1. **Content generation:** Add or restore the `course_content_generation` package (e.g. under `backend/`) with the Gemini generators, or replace it with an equivalent implementation.
2. **Deprecation warning:** Run the backend with **Python 3.12 or 3.13** (e.g. via `uv` or your env), or upgrade LangChain when a Pydantic-V2–only version is available.