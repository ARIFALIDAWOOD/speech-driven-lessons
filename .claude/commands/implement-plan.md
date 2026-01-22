description: Start implementation of an enhanced plan with checklist tracking and risk awareness
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, TodoWrite, Task, AskUserQuestion

# Enhanced Plan Implementation

You are an implementation orchestrator executing a pre-analyzed, delegation-ready plan. Your job is to systematically implement changes while tracking progress and avoiding known pitfalls.

## Input Parsing

**Raw Arguments:** `{{ $ARGUMENTS }}`

Parse the arguments:
- **Enhanced Plan Path**: The file path ending in `-enhanced.md`
- **Implementation Mode**: Optional - `sequential` (default), `parallel`, or `task:<number>` to run specific task

## Phase 1: Load Implementation Context

### 1.1 Derive Associated Files

From the enhanced plan path, derive the sibling files:
```
{base}-enhanced.md   → The enhanced plan (primary input)
{base}-tasks.md      → Task delegation document
{base}-checklist.md  → Implementation checklist
{base}-risks.md      → Risk assessment and rollback plan
{base}-troubles.md   → Implementation troubles log (created during execution)
```

Read ALL four input files before starting. These were created by `/critique-plan` or `/ulw-plan` and contain:
- **Enhanced Plan**: Corrected steps with complete code blocks
- **Tasks**: Self-contained, delegation-ready task definitions
- **Checklist**: Step-by-step verification items
- **Risks**: Known pitfalls and rollback procedures

### 1.2 Extract Key Information

From the files, identify:
1. **Execution order** from the tasks document
2. **Pre-implementation checks** from the checklist
3. **High-risk items** that need extra care
4. **File dependencies** to understand impact

## Phase 2: Pre-Implementation Validation

Before writing ANY code, validate:

### 2.1 Environment Checks
- [ ] Verify you're on the correct branch (create feature branch if needed)
- [ ] Check that referenced files exist
- [ ] Confirm no uncommitted changes that might conflict

### 2.2 Risk Acknowledgment
Summarize the HIGH RISK items from the risks document and ask user to confirm they understand:
- What could go wrong
- What the rollback plan is
- Any production considerations

### 2.3 Dependency Verification
Check that dependencies between tasks are clear:
- Which tasks can run in parallel?
- Which tasks block others?
- Are there database migrations that must run first?

## Phase 3: Implementation Execution

### 3.1 Initialize Todo List
Create a TodoWrite todo list from the checklist, marking pre-implementation items first.

### 3.2 Initialize Troubles Log

Create the `{base}-troubles.md` file to track issues encountered during implementation:

```markdown
# Implementation Troubles Log

**Plan:** {plan name}
**Started:** {ISO timestamp}
**Status:** In Progress

## Trouble Entry Template

When you encounter an issue, add an entry using this format:

### [T{N}] {Brief title}
- **Task:** T{task_number} - {task_name}
- **Timestamp:** {ISO timestamp}
- **Severity:** blocker | major | minor | note
- **Status:** open | resolved | workaround | deferred

**Problem:**
{Description of what went wrong or what unexpected behavior occurred}

**Expected:**
{What should have happened according to the plan}

**Actual:**
{What actually happened}

**Root Cause:**
{Analysis of why this happened - fill in when understood}

**Resolution:**
{How it was fixed, or why it was deferred}

**Impact on Plan:**
{Did this require deviating from the plan? How?}

---

## Troubles

{Entries will be added here as issues are encountered}
```

### 3.3 Execute Tasks in Order

For each task from the `-tasks.md` file:

1. **Announce the task** - State what you're implementing
2. **Read the current file state** - Always read before editing
3. **Apply changes** - Use the code blocks from the enhanced plan
4. **Verify the change** - Run linters, type checkers as specified
5. **Log any troubles** - If something doesn't work as expected, add to troubles log
6. **Mark checklist item complete** - Update the todo list
7. **Commit checkpoint** (if requested) - Atomic commits per task

### 3.4 When to Log Troubles

**ALWAYS log an entry when:**
- A verification command fails unexpectedly
- Line numbers in the plan don't match the actual file
- Code from the plan causes syntax/type errors
- A dependency is missing or version mismatch
- The file structure has changed since planning
- You need to deviate from the planned approach
- An edge case wasn't considered in the plan
- Tests fail after implementation
- You discover the plan was incorrect or incomplete

**Severity Guide:**
- **blocker**: Cannot continue without resolution (stops implementation)
- **major**: Significant deviation from plan required, but can continue
- **minor**: Small adjustment needed, plan mostly correct
- **note**: Observation for future reference, no action needed

### 3.5 Pitfalls to Avoid

**CRITICAL - Read these before each task:**

1. **Don't skip reading files first**
   - The enhanced plan has code blocks, but files may have changed since the plan was created
   - Always `Read` the target file before applying changes
   - Verify line numbers and context still match

2. **Don't ignore the risks document**
   - If implementing a high-risk change, pause and confirm
   - Have the rollback commands ready before proceeding

3. **Don't parallelize dependent tasks**
   - Check the dependency graph in the tasks document
   - Database migrations MUST run before code that uses new columns
   - Service changes MUST complete before API changes that depend on them

4. **Don't skip verification steps**
   - Run `ruff check`, `mypy`, `npm run build` as specified
   - A passing lint check prevents runtime surprises

5. **Don't batch all commits**
   - Commit after each logical task
   - This makes rollback granular if something fails later

6. **Don't forget the frontend**
   - If the plan has frontend changes, verify API contract matches
   - Check that new backend fields are actually sent by frontend

7. **Don't ignore optional parameters**
   - New optional parameters (like `notes: str | None = None`) must have defaults
   - Existing callers should continue to work

8. **Don't skip logging troubles**
   - Every unexpected issue should be documented in the troubles log
   - Future planners learn from past troubles
   - Helps identify patterns in plan quality

## Phase 4: Progress Tracking

### 4.1 Checklist Management
Use the checklist file as your source of truth:
- Update TodoWrite as you complete items
- If a step fails, document WHY before moving on
- Mark blocked items explicitly

### 4.2 Incremental Commits
After completing each task section, offer to commit:
```
git add -A
git commit -m "feat(connectors): implement task N - <description>"
```

### 4.3 Verification Gates
At these points, STOP and verify before continuing:
- After database migrations (verify columns exist)
- After service layer changes (run unit tests)
- After API changes (verify endpoints respond)
- After frontend changes (verify build passes)

## Phase 5: Post-Implementation

### 5.1 Final Verification
Run all verification commands from the checklist:
- Backend: `uv run ruff check src/ && uv run mypy src/`
- Frontend: `npm run build`
- Tests: `uv run pytest tests/`

### 5.2 Finalize Troubles Log

Update the troubles log with final status:

```markdown
**Status:** Completed
**Finished:** {ISO timestamp}

## Summary
- **Total Troubles:** {count}
- **Blockers:** {count} (all resolved)
- **Major:** {count}
- **Minor:** {count}
- **Notes:** {count}

## Lessons Learned
{What should future plans account for based on these troubles?}
```

### 5.3 Summary Report
After all tasks complete, provide:
1. List of files modified
2. Any deviations from the plan (and why)
3. **Troubles encountered** (summary from troubles log)
4. Remaining manual steps (if any)
5. Suggested PR description

### 5.4 Cleanup
- [ ] Remove any debugging code added
- [ ] Verify no TODO comments left in code
- [ ] Check for any console.log or print statements to remove

---

## Quick Start Commands

```bash
# View the implementation order
cat {base}-tasks.md | grep "## Task"

# Check what's risky
cat {base}-risks.md | grep -A5 "## High Risk"

# See what's left to do
cat {base}-checklist.md | grep "\[ \]"

# View logged troubles
cat {base}-troubles.md | grep -A10 "### \[T"

# Count troubles by severity
cat {base}-troubles.md | grep -c "Severity: blocker"
cat {base}-troubles.md | grep -c "Severity: major"
```

---

## Example Usage

```
# Implement all tasks sequentially (recommended)
/implement-plan .cursor/plans/20260112/gaps-connector-warehouse/enterprise_connectors_gap_analysis_96fd08aa-enhanced.md

# Run only task 3
/implement-plan .cursor/plans/20260112/gaps-connector-warehouse/enterprise_connectors_gap_analysis_96fd08aa-enhanced.md task:3

# Run tasks in parallel where possible
/implement-plan .cursor/plans/20260112/gaps-connector-warehouse/enterprise_connectors_gap_analysis_96fd08aa-enhanced.md parallel
```

---

**Remember: The enhanced plan has already been analyzed. Trust the code blocks, but verify the current file state before applying.**
