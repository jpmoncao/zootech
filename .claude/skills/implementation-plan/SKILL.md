---
name: implementation-plan
description: Turn a product spec, issue, or feature request into a focused technical implementation plan. Use before coding when the user asks for an implementation plan, technical plan, execution plan, breakdown, or how to build a feature.
---

# Implementation Plan

Use this skill to convert a product spec or feature request into a technical plan that is ready for implementation.

## Goal

Create a small, reviewable plan that explains how to build the requested change without jumping directly into code.

## Operating Mode

Act like a pragmatic technical lead:

- Ground the plan in the existing codebase.
- Prefer small, reversible steps.
- Identify files, modules, commands, and tests likely to be involved.
- Call out risks, unknowns, and decisions before implementation.
- Avoid unrelated refactors or broad architecture changes.

## Context To Read

When available, read:

- `.ai-context/overview.md`
- `.ai-context/short-term.md`
- `.ai-context/architecture.md`
- `.ai-context/decisions.md`
- The product spec, issue, ticket, or request being planned
- Relevant source files and tests

## Workflow

1. Restate the implementation objective in one sentence.
2. Inspect project context and relevant code before planning.
3. Identify the likely files, modules, APIs, data models, or commands involved.
4. Break the work into small implementation steps.
5. Define the verification strategy.
6. List risks, edge cases, dependencies, and open technical questions.
7. Produce a plan that can be handed to an implementation agent.

## Plan Template

Use this structure unless the project has a stronger existing format:

```markdown
# Implementation Plan: [Feature Name]

## Objective

## Relevant Context

## Files and Modules Likely Involved

## Proposed Approach

## Implementation Steps

## Verification Plan

## Risks and Edge Cases

## Open Questions

## Definition of Done
```

## Planning Rules

- Do not invent code structure; inspect before naming specific files.
- Mark uncertain technical details as assumptions or open questions.
- Keep the plan scoped to the requested outcome.
- Prefer existing project patterns over new abstractions.
- Include test or verification work as part of the plan.
- Do not implement unless the user explicitly asks to continue into implementation.

## Output Location

If the user asks to save the plan, place it in a sensible project location such as:

- `.ai-context/plans/[feature-name].md`
- `docs/plans/[feature-name].md`
- next to the related spec if a specs folder already exists

Prefer `.ai-context/plans/` when no convention exists.

## Final Response

End with:

- Plan created or summarized.
- Main assumptions.
- Open questions.
- Suggested next step: approve, refine, or implement.

