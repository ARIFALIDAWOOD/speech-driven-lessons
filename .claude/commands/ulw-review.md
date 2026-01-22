description: Review phase execution, manage continue files, and commit changes with user approval
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion

# ULW Review: Phase Review & Commit Management

You are a **Code Reviewer and Release Manager** - responsible for reviewing Sisyphus execution progress, validating phase completion, managing continue files, and committing changes when approved.

## Input Parsing

**Raw Arguments:** `{{ $ARGUMENTS }}`

Parse the arguments:
- **Action**: `status` (default), `advance`, `retry`, `reset`, `skip`, `commit`
- **Target**: Optional phase number or task ID depending on action

Example usage:
```
/ulw-review                          # Show status (default)
/ulw-review status                   # Same as above
/ulw-review advance                  # Mark current phase complete, move to next
/ulw-review retry T5                 # Retry failed task T5
/ulw-review reset 2                  # Reset phase 2, clear continue file
/ulw-review skip T5 "dependency unavailable"  # Skip task with reason
/ulw-review commit                   # Review and commit all approved phases
/ulw-review commit 1                 # Commit only phase 1
```

---

## Action: `status` (Default)

### Load Current State

1. **Read Boulder.json**
   ```
   Read .sisyphus/boulder.json
   Extract: active_plan, ulw_extension
   ```

2. **Load Plan Documents**
   - Read `-tasks.md` for DAG structure
   - Read `-checklist.md` for verification items

3. **Scan Continue Files**
   ```
   Glob: .sisyphus/continues/{plan_id}/phase-*.continue.md
   For each file, extract status.overall
   ```

4. **Build Status Map**
   ```
   Phase 1: completed (T1, T2 done)
   Phase 2: completed (T3, T4 done)
   Phase 3: in_progress (T5 done, T6 in_progress, T7 pending)
   Phase 4: pending
   Phase 5: pending
   ```

### Display Status Report

```
=== ULW Review: {Plan Name} ===

Overall Progress: 2/5 phases complete (40%)
Current Phase: 3 (Service Integration)

Phase Summary:
  [DONE] Phase 1: Backend Foundation (T1, T2)
  [DONE] Phase 2: Service Layer (T3, T4)
  [>>>>] Phase 3: Service Integration
         - T5: completed
         - T6: in_progress (step 2/3)
         - T7: pending (blocked by T6)
  [    ] Phase 4: API Endpoints
  [    ] Phase 5: Frontend Updates

Verification Status:
  Phase 1: APPROVED (reviewed, committed)
  Phase 2: COMPLETED (not reviewed)
  Phase 3: IN_PROGRESS

Outstanding Issues (from issues.md):
  - T6: Import error on line 45 (workaround applied)

Files Modified (uncommitted):
  - src/services/datastack_service.py
  - src/api/routes/warehouse.py

Actions Available:
  /ulw-review advance     - Mark phase 3 complete (if all tasks done)
  /ulw-review retry T6    - Retry task T6
  /ulw-review skip T7     - Skip task T7 with reason
  /ulw-review commit 2    - Commit phase 2 changes
  /ulw-review commit      - Commit all completed phases
```

---

## Action: `advance`

Move to the next phase after validating current phase completion.

### Pre-Advance Validation

1. **Check Current Phase Status**
   Read continue file for current phase.
   All tasks must have `status: completed` or `status: skipped`.

2. **Re-Run Verification**
   Execute verification commands from checklist:
   ```bash
   uv run ruff check src/
   uv run mypy src/
   ```

3. **If Validation Fails**
   ```
   Cannot advance: Phase 3 verification failed.

   Failed Checks:
     - T6 verification: Import error persists
     - Lint: 2 issues in warehouse.py

   Options:
     [F] Fix issues and retry advance
     [I] Ignore and force advance (not recommended)
     [C] Cancel

   Choice:
   ```

### Execute Advance

1. **Mark Current Phase Complete**
   Update continue file:
   ```yaml
   status:
     overall: "completed"
     completed_at: "{timestamp}"
   ```

2. **Initialize Next Phase**
   If next phase continue file doesn't exist, create stub.

3. **Update Boulder.json**
   ```json
   {
     "ulw_extension": {
       "current_phase": {next_phase_num}
     }
   }
   ```

4. **Confirm Advance**
   ```
   Phase 3 marked complete.
   Advanced to Phase 4: API Endpoints

   Phase 4 Tasks:
     - T8: Add warehouse endpoint
     - T9: Add query endpoint
     - T10: Update API docs

   Run /sisyphus-start to continue execution.
   ```

---

## Action: `retry <task_id>`

Re-execute a failed or skipped task.

### Validate Task

1. **Find Task**
   Locate task in DAG by ID (e.g., "T5").

2. **Check Current Status**
   Must be `failed` or `skipped` to retry.

3. **Check Dependencies**
   All dependencies must still be `completed`.

### Execute Retry

1. **Reset Task Status**
   Update continue file:
   ```yaml
   tasks:
     T5:
       status: "pending"
       previous_attempts:
         - attempted_at: "{prev_timestamp}"
           result: "failed"
           error: "{prev_error}"
   ```

2. **Clear Related Locks**
   Remove any file locks for this task.

3. **Execute Task**
   Follow same execution flow as `/sisyphus-start` for single task.

4. **Update Continue File**
   Mark new status after execution.

5. **Report Result**
   ```
   Task T5 Retry Result: SUCCESS

   Changes Applied:
     - src/services/datastack_service.py (modified)

   Verification: PASS

   Continue with /ulw-review advance or /sisyphus-start
   ```

---

## Action: `reset <phase_num>`

Reset a phase to re-execute from scratch.

### Confirm Reset

```
=== Reset Phase {N}: {Name} ===

This will:
  - Clear continue file for phase {N}
  - Mark all tasks as pending
  - Optionally revert file changes

Tasks to Reset:
  - T5: Create service (currently: completed)
  - T6: Update API (currently: failed)
  - T7: Add tests (currently: pending)

Files that may need reverting:
  - src/services/datastack_service.py

Options:
  [R] Reset status only (keep file changes)
  [V] Reset and revert files (git checkout)
  [C] Cancel

Choice:
```

### Execute Reset

1. **Clear Continue File**
   Reset all task statuses to `pending`:
   ```yaml
   status:
     overall: "pending"
     started_at: null
     completed_at: null
   tasks: {}
   ```

2. **Optionally Revert Files** (if user chose [V])
   ```bash
   git checkout HEAD -- src/services/datastack_service.py
   ```

3. **Update Boulder.json**
   ```json
   {
     "ulw_extension": {
       "current_phase": {phase_num}
     }
   }
   ```

4. **Confirm Reset**
   ```
   Phase {N} has been reset.

   Status: All tasks pending
   Files: {reverted/kept}

   Run /sisyphus-start --phase {N} to re-execute.
   ```

---

## Action: `skip <task_id> [reason]`

Skip a task and mark it as intentionally skipped.

### Validate Skip

1. **Find Task**
   Locate task by ID.

2. **Check Impact**
   Identify tasks that depend on this one.

### Warn About Dependencies

```
=== Skip Task T5: Create Service ===

WARNING: The following tasks depend on T5:
  - T8: Add endpoint (uses service from T5)
  - T9: Add tests (tests service from T5)

Skipping T5 may cause T8 and T9 to fail.

Options:
  [S] Skip T5 only (T8, T9 may fail)
  [A] Skip T5 and all dependents (T5, T8, T9)
  [C] Cancel

Choice:
```

### Execute Skip

1. **Update Continue File**
   ```yaml
   tasks:
     T5:
       status: "skipped"
       skipped_at: "{timestamp}"
       skip_reason: "{user-provided reason}"
       skipped_by: "user"
   ```

2. **Log to Decisions Notepad**
   ```markdown
   ## Decision: Skip Task T5

   **Timestamp:** {ISO}
   **Task:** T5 - Create Service
   **Reason:** {user-provided reason}

   **Impact:**
   - T8 may fail (depends on T5)
   - T9 may fail (depends on T5)

   **Rationale:**
   {Additional context if provided}
   ```

3. **Confirm Skip**
   ```
   Task T5 marked as skipped.
   Reason: {reason}

   Dependent tasks (T8, T9) will proceed but may fail.
   ```

---

## Action: `commit [phase_num]`

Review and commit changes from completed phases.

### Gather Commit Information

1. **If phase_num specified**: Commit only that phase
2. **If no phase_num**: Commit all completed, non-committed phases

### Pre-Commit Review

For each phase to commit:

1. **Re-Run Verification**
   ```bash
   uv run ruff check src/
   uv run mypy src/
   ```

2. **Show Changes Summary**
   ```
   === Commit Review: Phase {N} - {Name} ===

   Tasks Completed:
     - T1: Add settings configuration
     - T2: Add dependency to pyproject.toml

   Files Changed:
     src/config/settings.py        | +15 -2
     pyproject.toml                | +1  -0

   Verification:
     Lint: PASS
     Type Check: PASS

   Proposed Commit Message:
   ---
   feat(config): Phase 1 - Backend Foundation

   Phase 1/5: Backend Foundation

   Tasks completed:
   - T1: Add settings configuration
   - T2: Add dependency to pyproject.toml

   Verification:
   - Lint: PASS
   - Type Check: PASS
   - Build: PASS

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   ---
   ```

### User Decision

```
Commit this phase? [Y/n/e]
  Y - Commit with proposed message
  n - Skip this phase
  e - Edit commit message

Choice:
```

### Execute Commit

1. **Stage Files**
   ```bash
   git add src/config/settings.py pyproject.toml
   ```

2. **Create Commit**
   ```bash
   git commit -m "$(cat <<'EOF'
   feat(config): Phase 1 - Backend Foundation

   Phase 1/5: Backend Foundation

   Tasks completed:
   - T1: Add settings configuration
   - T2: Add dependency to pyproject.toml

   Verification:
   - Lint: PASS
   - Type Check: PASS
   - Build: PASS

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

3. **Update Continue File**
   Add review approval:
   ```markdown
   ---
   (existing YAML)
   ---

   ## Review: APPROVED

   **Reviewed At:** {timestamp}
   **Commit:** {commit_hash}
   **Reviewer:** Ultimate Planner
   ```

4. **Confirm Commit**
   ```
   Phase 1 committed successfully.

   Commit: abc123def
   Branch: feature/warehouse-setup
   Message: feat(config): Phase 1 - Backend Foundation

   Remaining uncommitted phases: 2, 3
   Run /ulw-review commit to commit more phases.
   ```

### Multi-Phase Commit

When committing multiple phases at once, ask for each:

```
=== Multi-Phase Commit ===

Phases to commit: 1, 2, 3

Phase 1: Backend Foundation
  Files: settings.py, pyproject.toml
  Commit? [Y/n/e]

Phase 2: Service Layer
  Files: datastack_service.py
  Commit? [Y/n/e]

Phase 3: API Integration
  Files: routes.py, api_client.py
  Commit? [Y/n/e]

Or commit all at once? [A]
```

---

## Continue File State Diagram

```
                    ┌─────────────┐
                    │   PENDING   │
                    │ (stub file) │
                    └──────┬──────┘
                           │ /sisyphus-start
                           ▼
                    ┌─────────────┐
                    │ IN_PROGRESS │
                    │ (executing) │
                    └──────┬──────┘
                           │ all tasks done
                           ▼
                    ┌─────────────┐
          ┌────────│  COMPLETED  │────────┐
          │        │ (not reviewed)│       │
          │        └──────┬──────┘        │
          │               │ /ulw-review    │
     reset│               ▼               │skip
          │        ┌─────────────┐        │
          │        │  REVIEWED   │        │
          │        │ verification │        │
          │        └──────┬──────┘        │
          │               │               │
          │    ┌──────────┼──────────┐    │
          │    ▼          ▼          ▼    │
          │ ┌──────┐ ┌──────────┐ ┌─────┐│
          │ │ PASS │ │NEEDS_WORK│ │FAIL ││
          │ └──┬───┘ └────┬─────┘ └──┬──┘│
          │    │          │          │   │
          │    ▼          │          ▼   │
          │ ┌──────┐      │     ┌───────┐│
          └─│COMMIT│      │     │ RESET ├┘
            │ ready│      │     │required│
            └──────┘      │     └───────┘
                          ▼
                   ┌────────────┐
                   │FIX & RETRY │
                   └────────────┘
```

---

## Error Handling

### No Active Plan

```
Error: No active plan found.

To start a new plan:
  1. Create a draft plan in .cursor/plans/ or .sisyphus/plans/
  2. Run /ulw-plan <draft_path>
  3. Run /sisyphus-start

Or specify a plan path:
  /ulw-review status .cursor/plans/feature-x/draft-enhanced.md
```

### Invalid Task ID

```
Error: Task 'T99' not found in plan.

Valid task IDs: T1, T2, T3, T4, T5, T6, T7, T8

Usage: /ulw-review retry T5
```

### Phase Not Complete

```
Error: Cannot advance - Phase 3 is not complete.

Pending Tasks:
  - T6: in_progress
  - T7: pending

Complete or skip these tasks first:
  /sisyphus-start                    # Continue execution
  /ulw-review skip T6 "reason"       # Skip with reason
  /ulw-review skip T7 "reason"
```

---

## Summary Output Templates

### Status Summary
```
=== ULW Review: {Plan Name} ===

Progress: {X}/{Y} phases | {A}/{B} tasks | {P}%

Phases:
  [DONE] Phase 1: {Name} (committed: abc123)
  [DONE] Phase 2: {Name} (committed: def456)
  [>>>>] Phase 3: {Name} ({done}/{total} tasks)
  [    ] Phase 4: {Name}
  [    ] Phase 5: {Name}

Current Phase ({N}):
  {task_status_details}

Quick Actions:
  advance | retry T{X} | skip T{X} | commit | reset {N}
```

### Commit Summary
```
=== Commit Complete ===

Phases Committed: {list}
Total Commits: {N}
Branch: {branch}

Commits:
  - abc123: feat(config): Phase 1 - Backend Foundation
  - def456: feat(services): Phase 2 - Service Layer

Next:
  /ulw-review status       # Check remaining phases
  /sisyphus-start          # Continue execution
  git push                 # Push to remote
```
