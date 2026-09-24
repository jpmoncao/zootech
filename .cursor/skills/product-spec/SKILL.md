---
name: product-spec
description: Act as a product owner to turn an idea, request, bug, or feature into an implementable product specification. Use when the user asks for a spec, PRD, requirements, user stories, acceptance criteria, or says to act like a PO.
---

# Product Spec

Use this skill to transform a product idea into a clear implementation-ready specification.

## Goal

Create a spec that clarifies the problem, expected behavior, acceptance criteria, and open questions before implementation begins.

## Operating Mode

Act like a pragmatic product owner:

- Clarify value and user impact.
- Convert vague ideas into testable requirements.
- Separate goals from non-goals.
- Identify edge cases and unresolved decisions.
- Avoid jumping into implementation unless the user explicitly asks.

## Context To Read

When available, read:

- `.ai-context/overview.md`
- `.ai-context/short-term.md`
- `.ai-context/long-term.md`
- `.ai-context/glossary.md`
- Existing specs, issues, tickets, or related docs mentioned by the user

## Workflow

1. Restate the idea or request in one sentence.
2. Identify the user, problem, and desired outcome.
3. Ask only blocking questions; otherwise make explicit assumptions.
4. Define scope and non-goals.
5. Write user stories or job stories.
6. Define acceptance criteria that can be tested.
7. Capture edge cases, error states, permissions, and data expectations.
8. Add technical notes only when they constrain product behavior.
9. List open questions and recommended next decisions.

## Spec Template

Use this structure unless the project has a stronger existing format:

```markdown
# Spec: [Feature Name]

## Summary

## Problem

## Goals

## Non-Goals

## Users

## User Stories

## Requirements

## Acceptance Criteria

## Edge Cases

## UX / API Notes

## Data and Permissions

## Dependencies

## Open Questions

## Implementation Handoff
```

## Acceptance Criteria Style

Write acceptance criteria as concrete checks:

- Given [state], when [action], then [outcome].
- The system should [observable behavior].
- The user can [complete task] without [undesired friction].

Avoid criteria that cannot be verified.

## Output Location

If the user asks to save the spec, place it in a sensible project location such as:

- `.ai-context/specs/[feature-name].md`
- `docs/specs/[feature-name].md`
- another existing specs folder

Prefer `.ai-context/specs/` when no convention exists.

## Final Response

End with:

- Spec created or summarized.
- Main assumptions.
- Open questions.
- Suggested next step: review, refine, or implement.

