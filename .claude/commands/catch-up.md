description: Generate podcast-ready summaries of codebase changes for NotebookLM
allowed-tools: Bash, Read, Glob, Grep, Write, Edit, Task, LS

# Codebase Catch-Up: {{ current_date }}

Generate a comprehensive, podcast-friendly summary of code changes for NotebookLM.

## Configuration
- **Output Directory:** `C:\Users\aadx3d\codes\anantra\anantra-catchup\{{ current_date }}\`
- **Focus:** {{ $ARGUMENTS | default: "all recent changes not yet caught up" }}

---

## Phase 1: Establish Baseline

### 1.1 Current Git State
```
Branch: !`git branch --show-current`
Recent Activity: !`git log --oneline -n 20`
```

### 1.2 Check Previous Catch-Ups
Read the most recent catch-up to understand what's already been covered:
```bash
# List existing catch-up folders
ls -la C:\Users\aadx3d\codes\anantra\anantra-catchup\ 2>/dev/null || echo "No previous catch-ups"
```

If previous catch-ups exist, read the latest summary to identify the last commit covered.

### 1.3 Determine Delta
Identify changes since last catch-up:
- If previous catch-up exists: changes since that commit
- If no previous: changes from last 7 days or 50 commits

---

## Phase 2: Gather Changes

### 2.1 Files Changed
```bash
# Get changed files (adjust range based on Phase 1)
git diff --stat HEAD~20
git diff --name-only HEAD~20
```

### 2.2 Detailed Diffs
{{# if $ARGUMENTS }}
**Focused Analysis on:** {{ $ARGUMENTS }}
```bash
git log --oneline -n 20 -- {{ $ARGUMENTS }}
git diff HEAD~20 -- {{ $ARGUMENTS }}
```
{{else}}
**Full Codebase Changes:**
```bash
git diff HEAD~20
```
{{/if}}

### 2.3 Commit Messages & Context
```bash
git log --pretty=format:"## %s%n%nCommit: %h%nAuthor: %an%nDate: %ad%n%n%b%n---" --date=short -n 20
```

---

## Phase 3: Deep Analysis

For each significant change area, investigate:

1. **What Changed**: File-by-file breakdown
2. **Why It Changed**: Infer from commit messages and code context
3. **Impact**: What features/systems are affected
4. **Technical Details**: Key code patterns, new dependencies, architectural shifts

Use `Task` with `Explore` agents to investigate complex changes if needed.

---

## Phase 4: Generate Outputs

Create the following files in `C:\Users\aadx3d\codes\anantra\anantra-catchup\{{ current_date }}\`:

### 4.1 `podcast-script.md` (Primary NotebookLM Input)
Write in a conversational, podcast-friendly format:

```markdown
# Anantra AI Development Update - {{ current_date }}

## Episode Overview
[2-3 sentence hook about the most interesting changes]

## Key Developments

### [Feature/Change Area 1]
**The Story:** [Narrative explanation of what changed and why]

**Technical Deep Dive:**
[Code examples with explanation - make it understandable for audio]

**Why It Matters:** [Impact and significance]

---

### [Feature/Change Area 2]
...

## Code Highlights

### Notable Implementation: [Name]
Here's an interesting piece of code from this update:

\`\`\`typescript
// [Filename]
[Actual code with inline comments explaining each section]
\`\`\`

**What's happening here:** [Plain English explanation]

---

## Architecture Notes
[Any structural changes, new patterns introduced, or design decisions]

## What's Next
[Based on TODOs, open issues, or logical next steps]

## Wrap-Up
[Summary of the most important takeaways]
```

### 4.2 `changes-detailed.md` (Reference Document)
```markdown
# Detailed Change Log - {{ current_date }}

## Summary Statistics
- Files Changed: X
- Lines Added: X
- Lines Removed: X
- Commits Covered: X

## Changes by Area

### [Area 1: e.g., "Frontend/UI"]
| File | Changes | Description |
|------|---------|-------------|
| path/to/file.tsx | +50/-20 | Brief description |

#### Code Changes
\`\`\`diff
[Actual diff snippets with context]
\`\`\`

### [Area 2: e.g., "Backend/API"]
...

## Full Commit History
[Formatted commit log]
```

### 4.3 `quick-summary.md` (Executive Summary)
```markdown
# Quick Summary - {{ current_date }}

## TL;DR
[3-5 bullet points of the most important changes]

## New Features
- [Feature]: [One-liner description]

## Bug Fixes
- [Fix]: [What was broken, now fixed]

## Refactoring
- [Change]: [What was improved]

## Breaking Changes
- [None / List any]

## Dependencies
- [New/Updated/Removed dependencies]
```

### 4.4 `catchup-metadata.json`
```json
{
  "date": "{{ current_date }}",
  "lastCommitCovered": "[commit hash]",
  "commitRange": "[start]...[end]",
  "filesAnalyzed": [],
  "focusAreas": "{{ $ARGUMENTS | default: 'full codebase' }}",
  "previousCatchup": "[date or null]"
}
```

---

## Phase 5: Finalize

1. Ensure output directory exists
2. Write all files
3. Confirm what was covered vs. skipped
4. Provide command to open in NotebookLM:
   ```
   Files ready for NotebookLM upload:
   - podcast-script.md (primary - upload this first)
   - changes-detailed.md (reference)
   - quick-summary.md (overview)
   ```

---

**Remember:** Write for audio consumption. Use analogies, explain acronyms, and make technical concepts accessible. The goal is someone listening to a podcast should understand what changed and why it matters.
