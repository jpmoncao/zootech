# Agentic Development Workflow

This is a reusable workflow for AI-assisted software development across projects.

## Goal

Turn a development request into a verified, reviewable change with minimal hand-holding and clear checkpoints.

## Default Flow

1. Understand the request.
2. Explore the existing code.
3. Plan the smallest useful change.
4. Implement in focused steps.
5. Verify with the best available checks.
6. Review the diff for risks.
7. Update project context when the change affects project knowledge.
8. Report the result clearly.

### Scale The Process To The Task

- For a localized, low-risk change with clear requirements, inspect the relevant area, make the change, run a proportionate check, and review the diff. A formal plan or separate spec is not needed.
- Write a short plan when a change spans multiple areas, requires meaningful design choices, or carries notable risk.
- Use `product-spec` when desired user-facing behavior or scope is unclear; use `implementation-plan` when the technical path needs decisions; use `implementation-tasks` when multiple steps need independent tracking. These are optional tools, not a mandatory sequence.
- If a choice is reversible and within the user's request, make a reasonable assumption and state it. Ask only for unresolved material decisions or work beyond the authorized scope.

## Supporting Skills

Use these project skills when the task calls for them:

- `create-project-context`: Analyze a repository and create or refresh `.ai-context/`.
- `product-spec`: Act as a product owner and turn an idea into an implementation-ready spec.
- `implementation-plan`: Act as a technical lead and turn a spec into a focused execution plan.
- `implementation-tasks`: Break a plan into ordered, actionable engineering tasks.

Choose only the supporting skill(s) that address a real need:

1. Run `create-project-context` when the project lacks useful context or its context is stale.
2. Run `product-spec` when the desired behavior or product scope is unclear.
3. Run `implementation-plan` when the technical path needs clarification.
4. Run `implementation-tasks` when work has multiple independently trackable steps.
5. Use the default development workflow to implement, verify, review, and report.

## Step Contracts

### 1. Understand

The agent should produce:

- A one-sentence restatement of the task.
- Any unclear requirements.
- Assumptions being made.
- The expected final outcome.

### 2. Explore

The agent should inspect the project before editing and identify:

- Relevant files and modules.
- Existing architecture and naming patterns.
- Available tests, build commands, and tooling.
- Constraints from docs, config files, or project rules.

### 3. Plan

For work spanning multiple areas, requiring meaningful design choices, or carrying notable risk, the agent should produce:

- A short implementation plan.
- Files or modules likely to change.
- Tests or checks to run.
- Known risks or decision points.

### 4. Implement

The agent should:

- Make small, focused changes.
- Follow local code style.
- Reuse existing helpers and libraries.
- Avoid unrelated refactors.
- Preserve user changes.

### 5. Verify

The agent should run the most relevant available checks:

- Tests.
- Lint.
- Typecheck.
- Build.
- Manual validation when automated checks are unavailable.
- Add or update tests when behavior changes and the project has a relevant test setup. If tests are unavailable or impractical, state what validation was performed instead.

### 6. Review

Before finishing, the agent should review the change for:

- Regressions.
- Edge cases.
- Missing tests.
- Security issues.
- Confusing behavior or API changes.

### 7. Update Context

After implementation, the agent should update `.ai-context/` when the change affects project knowledge:

- `short-term.md` for priorities, active work, blockers, or next steps.
- `architecture.md` for system structure, modules, integrations, data flow, testing, or deployment.
- `decisions.md` for meaningful product or technical decisions.
- `glossary.md` for important project-specific terms.

Skip this step when the change does not affect durable or active project knowledge.

### 8. Report

The final response should include:

- What changed.
- How it was verified.
- Concrete examples of how to test the change.
- Risks, limitations, or suggested follow-ups.

## Copy-Paste Rule

Use this shorter version in project-level AI instruction files such as `AGENTS.md` or `.cursor/rules/agentic-development-workflow.mdc`:

```md
For every development task:

1. Understand the request and expected outcome.
2. Inspect relevant files before editing.
3. Plan changes that span multiple areas, require meaningful design choices, or carry notable risk; skip the formal plan for localized, low-risk changes.
4. Make focused changes that follow existing project patterns.
5. Run the most relevant checks available.
6. Review the diff for regressions, edge cases, missing tests, and security issues.
7. Update `.ai-context/` if project knowledge changed.
8. Report what changed, how it was verified, how to test it, and any remaining risks.
```
