---
name: implementation-tasks
description: Break an implementation plan, spec, issue, or feature request into ordered, actionable engineering tasks. Use before coding when the user asks for tasks, a checklist, task breakdown, execution steps, or work items.
---

# Implementation Tasks

Use this skill to turn an implementation plan into a practical task list for execution.

## Goal

Create ordered, concrete engineering tasks that can be completed, verified, and reviewed one by one.

## Operating Mode

Act like an engineering lead preparing work for implementation:

- Break work into small, independently understandable tasks.
- Keep tasks ordered by dependency and risk.
- Include verification work, documentation updates, and cleanup when relevant.
- Avoid vague tasks such as "improve code" or "handle edge cases" without specifics.
- Do not implement unless the user explicitly asks to continue.

## Context To Read

When available, read:

- `.ai-context/overview.md`
- `.ai-context/short-term.md`
- `.ai-context/architecture.md`
- The product spec
- The implementation plan
- Relevant source files and tests when needed to make tasks concrete

## Workflow

1. Restate the execution objective in one sentence.
2. Read the spec or implementation plan.
3. Inspect relevant code only when needed to avoid vague or incorrect tasks.
4. Identify dependencies between tasks.
5. Break the work into ordered implementation tasks.
6. Add verification tasks for tests, lint, typecheck, build, or manual validation.
7. Add documentation or context updates when the change affects project knowledge.
8. Call out blockers, assumptions, and tasks that need user decisions.

## Task Template

Use this structure unless the project has a stronger existing format:

```markdown
# Implementation Tasks: [Feature Name]

## Objective

## Assumptions

## Tasks

- [ ] 1. Task title
  - Goal:
  - Files:
  - Notes:
  - Verification:

- [ ] 2. Task title
  - Goal:
  - Files:
  - Notes:
  - Verification:

## Validation Checklist

- [ ] Tests pass
- [ ] Lint/typecheck/build pass where applicable
- [ ] User-facing behavior matches acceptance criteria
- [ ] Relevant `.ai-context/` files are updated if project knowledge changed
- [ ] Final summary includes verification and concrete examples of how to test

## Blockers / Decisions Needed
```

## Task Quality Rules

- Each task should have a clear done state.
- Prefer 5-12 tasks for normal feature work.
- Split tasks that touch unrelated modules.
- Keep cross-cutting refactors separate from feature behavior.
- Include file paths when known.
- Mark unknown file paths as `Needs inspection`.
- Include at least one verification or validation task.
- Do not convert unresolved product questions into coding tasks.

## Output Location

If the user asks to save the task list, place it in a sensible project location such as:

- `.ai-context/tasks/[feature-name].md`
- `docs/tasks/[feature-name].md`
- next to the related spec or plan if a convention already exists

Prefer `.ai-context/tasks/` when no convention exists.

## Final Response

End with:

- Task list created or summarized.
- Main assumptions.
- Blockers or decisions needed.
- Suggested next step: approve, refine, or implement.
