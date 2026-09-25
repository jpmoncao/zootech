# Development Agent Workflow

For every coding task in this project, follow this workflow.

## 1. Understand

- Restate the request in one sentence.
- Identify the expected outcome and acceptance criteria when they are not explicit.
- Make reasonable, reversible assumptions for small, low-risk tasks and state them briefly.
- Follow changes the user has explicitly authorized, including necessary architecture or behavior changes within that scope.
- Ask only when a material decision is unresolved, ambiguity could change the outcome, or the proposed work exceeds the authorized scope. Continue independent work while waiting.

## 2. Explore

- Read `.ai-context/overview.md` and `.ai-context/short-term.md` when they exist.
- Read other files in `.ai-context/` when they are relevant to the task.
- When changing `apps/web`, follow **Front-end in apps/web** below and the visual tokens in `DESIGN.md`.
- Inspect relevant files before editing.
- Prefer `rg` and `rg --files` for searching.
- Learn the existing architecture, naming, style, and test patterns.
- Prefer existing helpers, libraries, and conventions over new abstractions.

## 3. Plan

- For tasks spanning multiple areas, requiring meaningful design choices, or carrying notable risk, write a short plan before editing. Skip a formal plan for localized, low-risk changes; state the intended action briefly instead.
- Mention the files or modules likely to change.
- Keep the plan focused on the requested outcome.
- Avoid unrelated refactors.
- Use `product-spec` when user-facing behavior or scope is unclear; use `implementation-plan` when the technical path needs decisions; use `implementation-tasks` when multiple steps need independent tracking. Do not create all three by default.

## 4. Implement

- Make small, focused changes.
- Preserve the style of the surrounding code.
- Keep behavior changes explicit and intentional.
- Add comments only when they clarify non-obvious logic.
- Do not overwrite or revert user changes unless explicitly asked.
- In `apps/web`, use shadcn/ui for controls and Tailwind utilities for layout. Do not add feature CSS classes in `globals.css`.

## 5. Verify

- Run the most relevant available checks, such as:
  - tests
  - lint
  - typecheck
  - build
- If a check cannot run, explain why.
- If no automated checks exist, describe the manual validation path.
- Add or update tests when behavior changes and the project has a relevant test setup. If tests are unavailable or impractical, explain the verification used instead.

## 6. Review

- Review the diff before finishing.
- Look for regressions, edge cases, missing tests, and security issues.
- Keep fixes scoped to the original request unless a blocking issue is found.

## 7. Update Context

- Update `.ai-context/short-term.md` when priorities, active work, blockers, or next steps change.
- Update `.ai-context/architecture.md` when system structure, modules, integrations, data flow, testing, or deployment change.
- Update `.ai-context/decisions.md` when a meaningful product or technical decision is made.
- Update `.ai-context/glossary.md` when important project-specific terms are introduced.
- Skip context updates when the change does not affect durable or active project knowledge.

## 8. Report

- Summarize what changed.
- List how the work was verified.
- Provide concrete examples of how to test the change.
- Mention risks, limitations, or useful follow-ups.

## Front-end in apps/web

`apps/web` uses shadcn/ui and Tailwind. Ready-made controls live in `apps/web/src/components/ui`. Screens and shells stay outside that folder.

- Button, field, select, dialog, menu, tab, alert and equivalents come from shadcn. Do not rebuild those with a native element and a custom class.
- Screen layout, grids and visual states use Tailwind on `className`. Do not create feature classes in `globals.css`.
- Theme follows `DESIGN.md`: petroleum `#135E63`, mist `#F4F7F6`, Figtree in the UI, radii 6 (field), 8 (button) and 10 (panel). Amber `#E8A317` only on the provisional shield. Do not ship the default shadcn theme.
- Install a new piece with the shadcn CLI inside `apps/web`, then adjust the generated component to those tokens.
- Icons are SVG from the component or from a library already in the app. Do not use emoji as an icon.

```tsx
// bad — hand-drawn control and page CSS
<button className="btn btn-primary" type="submit">Entrar</button>

// good — shadcn, ZooTech theme, layout in Tailwind
import { Button } from "@/components/ui/button";

<Button type="submit">Entrar</Button>
```
