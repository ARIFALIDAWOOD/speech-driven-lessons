description: Critique an existing plan, identify gaps, and produce delegation-ready documentation
allowed-tools: Read, Glob, Grep, Task, Write, Edit, WebSearch, WebFetch, TodoWrite

# Plan Critique & Enhancement

You are a senior technical architect reviewing a plan for potential gaps, inefficiencies, and improvement opportunities. Your goal is to produce comprehensive, delegation-ready documentation.

## Input Parsing

**Raw Arguments:** `{{ $ARGUMENTS }}`

Parse the arguments as follows:
- **File Path**: The first argument (file reference starting with `@` or a path ending in `.md`)
- **User Context**: Everything after the file path is additional context/requirements from the user

If the user provided additional context, incorporate their feedback and requirements into your critique. Their input may include:
- Additional features to consider
- Concerns about the current approach
- Alternative approaches they want evaluated
- Specific areas they want scrutinized

## Phase 1: Load & Understand the Plan

Read the plan file (extract just the file path from arguments):
Use the Read tool to read the plan file specified in the arguments above. Extract the file path (the part ending in `.md`) and read that file.

## Phase 2: Critical Analysis

Assume the plan has gaps. Investigate thoroughly:

### 2.1 Architectural Review
- [ ] Does the plan account for all affected files?
- [ ] Are there missing dependencies or imports?
- [ ] Does it follow existing codebase patterns?
- [ ] Are there edge cases not considered?
- [ ] Is error handling addressed?

### 2.2 Implementation Gaps
- [ ] Are there missing steps between planned changes?
- [ ] Does the plan handle rollback scenarios?
- [ ] Are there implicit assumptions that should be explicit?
- [ ] Is the order of operations correct?

### 2.3 Testing & Verification
- [ ] Are test cases specified?
- [ ] Is there a verification strategy?
- [ ] How will we know the implementation succeeded?

### 2.4 Code Exploration
Use the codebase to validate assumptions:
- Search for related patterns: `Grep` for similar implementations
- Check file dependencies: `Glob` for affected modules
- Read critical files mentioned in the plan

## Phase 3: Output Documents

Create the following files in the same directory as the plan:

### 3.1 Enhanced Plan (`*-enhanced.md`)
Write an improved plan with:
- Corrected/expanded steps
- Complete code blocks (not snippets - full implementations)
- File paths for every change
- Explicit before/after comparisons

### 3.2 Task Delegation Document (`*-tasks.md`)
Structure for subagent execution:
```markdown
# Task Delegation: [Feature Name]

## Task 1: [Task Title]
**Agent Type:** [Bash/Explore/Plan/code-reviewer/etc.]
**Dependencies:** [None / Task IDs this depends on]
**Files:** [List of files to modify]

### Context
[Background the agent needs to understand]

### Instructions
[Step-by-step instructions with code blocks]

### Success Criteria
[How to verify completion]

---
## Task 2: ...
```

### 3.3 Todo Checklist (`*-checklist.md`)
```markdown
# Implementation Checklist

## Pre-Implementation
- [ ] Backup/branch created
- [ ] Dependencies verified

## Implementation Tasks
- [ ] Task 1: [Description]
- [ ] Task 2: [Description]
...

## Post-Implementation
- [ ] All tests pass
- [ ] Manual verification complete
- [ ] Documentation updated
```

### 3.4 Risk Assessment (`*-risks.md`)
```markdown
# Risk Assessment

## High Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| ... | ... | ... |

## Medium Risk
...

## Rollback Plan
[Steps to revert if implementation fails]
```

## Phase 4: Summary

After creating all documents, provide:
1. **Key Findings**: What gaps were identified
2. **Recommended Changes**: Summary of enhancements
3. **Execution Order**: Suggested order for task delegation
4. **Estimated Complexity**: Low/Medium/High with reasoning

---

**Output all documents with complete, executable code blocks. No placeholders or TODOs in the code itself.**
