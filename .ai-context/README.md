# Project Context

This folder stores project knowledge for AI-assisted development.

Use it to help agents understand what the project is, where it is going, and what is currently happening.

## Files

- `overview.md`: Stable project summary.
- `short-term.md`: Current work, active priorities, blockers, and next steps.
- `long-term.md`: Product direction, principles, roadmap, and long-lived constraints.
- `architecture.md`: System structure, important modules, integrations, and data flow.
- `decisions.md`: Architecture and product decisions with rationale.
- `glossary.md`: Domain terms, acronyms, and project-specific language.

## Maintenance

- Update `short-term.md` often.
- Update `overview.md`, `long-term.md`, and `architecture.md` when stable understanding changes.
- Record meaningful choices in `decisions.md`.
- Keep entries concise and useful for future work.
- Treat these files as optional memory, not a required form to fill out. Remove unused placeholder sections and add a file only when it captures durable, useful knowledge.
- Keep `short-term.md` only while there is active work worth carrying forward; date active notes and remove stale ones.

## Agent Usage

Before starting non-trivial work, agents should read:

1. `overview.md`
2. `short-term.md` if it contains active work
3. Only files relevant to the task (for example, architecture for a cross-module change or decisions for a related design choice)

For a small, localized task, read only directly relevant context. Do not load every context file by default.

## Related Skills

- `create-project-context`: Creates or refreshes this folder by analyzing the repository.
- `product-spec`: Creates implementation-ready specs from product ideas or feature requests.
- `implementation-plan`: Creates technical execution plans from specs, issues, or feature requests.
- `implementation-tasks`: Breaks plans into ordered, actionable engineering task lists.
