# Phase 0 & 1 Acceptance Tests

Automated tests for **Phase 0** (summary acceptance matrix) and **Phase 1** (orchestration infrastructure) from the Anantra LMS Suite plan.

## What’s covered

| ID | Criteria | Test file | Type |
|----|----------|-----------|------|
| P0 | Create session → orchestrator routes to tutor | `test_phase0_acceptance.py` | integration |
| P1-1 | OrchestratorState serialize/deserialize | `test_phase1_state.py` | unit |
| P1-2 | CoursePlan valid/invalid | `test_phase1_course_plan.py` | unit |
| P1-3 | LangGraph workflow compiles | `test_phase1_workflow.py` | unit |
| P1-4 | Tutor adapter wraps ProactiveTutor | `test_phase1_tutor_adapter.py` | unit |
| P1-5 | Orchestrator routes to tutor (ACTIVE_TUTORING) | `test_phase1_workflow.py` | integration |
| P1-6 | Session state persists (MemorySaver / Redis) | `test_phase1_checkpointing.py` | integration |
| P1-7 | UI shows agent indicator | **Manual** (see below) | manual |
| P1-8 | WebSocket receives orchestration updates | `test_phase1_websocket.py` | integration |

## How to run

From the **backend** root (`speech-driven-lessons/backend/`), using **uv**:

```bash
uv run pytest tests/phase01/ -v
uv run pytest tests/phase01/ -v -m unit
uv run pytest tests/phase01/ -v -m integration
```

## Environment

- **MemorySaver**: used by default; no extra config.
- **Redis** (optional, for P1-6): set `LANGGRAPH_REDIS_URL` (e.g. in `.env.test`). Redis-dependent tests are skipped if Redis is not configured or unreachable.

## P1-7 Manual checklist

**“UI shows agent indicator”**

1. Start the app and open the **learn** page for a course (with an active orchestration session).
2. Confirm the **agent indicator** (avatar/label for the active agent) is visible in the header when orchestration is active.
3. Verify the displayed agent updates when the active agent changes (e.g. tutor vs assessor).

No automated test for P1-7; this checklist is the acceptance verification.
