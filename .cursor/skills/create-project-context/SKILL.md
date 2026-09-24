---
name: create-project-context
description: Analyze a software project and create or update the `.ai-context/` project memory. Use when the user asks to create project context, initialize AI context, analyze a repository, document the project for AI agents, or refresh `.ai-context/`.
---

# Create Project Context

Use this skill to build or refresh the `.ai-context/` folder for a software project.

## Goal

Create concise, accurate project memory that helps future agents understand the project quickly.

## Inputs

Use the current repository as the source of truth. Prefer existing files over assumptions:

- README and docs
- package, dependency, and build files
- source tree structure
- tests and config files
- existing `.ai-context/` files
- git history only when it is directly useful and available

## Workflow

1. Inspect the repository structure with `rg --files` or equivalent.
2. Read top-level docs and configuration files.
3. Identify stack, project purpose, commands, modules, integrations, and test strategy.
4. Create `.ai-context/` if it does not exist.
5. Fill or update the relevant context files.
6. Ask about missing information only when it materially affects future work and cannot safely be marked unknown.
7. Mark remaining uncertain facts as `Unknown` or `Needs confirmation`; do not invent missing context.
8. Report what was inferred, what changed, and what needs user validation.

## Q&A Requirement

Ask the user only about missing information that materially affects future work and cannot be safely marked unknown. If context creation is already authorized, proceed with known facts and label remaining gaps `Needs confirmation`; do not block the task on optional product details.

Ask Q&A for missing or ambiguous information that would materially affect future work, such as:

- What the project is trying to achieve.
- Who the main users are.
- Current project stage.
- Active priorities or blockers.
- Product direction, non-goals, or constraints.
- Architecture choices that are not obvious from the code.
- External services, environments, credentials, or deployment flow.
- Domain terms that appear in code but are not defined.

Keep the Q&A short and actionable:

- Ask only questions that matter.
- Group related questions together.
- Prefer one concise round of up to 3-5 questions when answers are genuinely blocking.
- Continue with explicit assumptions only for low-risk gaps.
- Record unanswered important questions as `Needs confirmation` in the relevant `.ai-context/` file.

## Empty Or Context-Free Repository Behavior

If the repository has no meaningful source files, documentation, configuration, or existing `.ai-context/`, do not infer a project from the folder name alone.

Treat the task as project discovery:

1. Explain briefly that there is not enough project context to analyze yet.
2. Ask the user a structured set of questions before writing detailed context.
3. Use the user's answers as the primary source of truth.
4. Create `.ai-context/` from confirmed answers.
5. Mark anything still unknown as `Needs confirmation`.

Ask enough questions to build useful initial context. Include questions about:

- Project purpose and target users.
- Problem being solved.
- Current stage: idea, prototype, MVP, production, or maintenance.
- Desired stack or known technical constraints.
- Core features or first milestone.
- Product vision, non-goals, and success criteria.
- Integrations, external services, or deployment expectations.
- Domain terms the user already knows will matter.

Prefer one complete Q&A round over many tiny interruptions. If the user gives partial answers, create the context with what is known and clearly label gaps.

## Files To Maintain

Create or update only files that contain useful project knowledge. These are available templates, not a required checklist; omit empty sections and do not create a file solely to preserve this structure:

- `.ai-context/README.md`: How to use the context folder.
- `.ai-context/overview.md`: Stable project summary, users, problem, stage, capabilities, links.
- `.ai-context/short-term.md`: Current focus, active tasks, recent changes, blockers, next steps.
- `.ai-context/long-term.md`: Vision, principles, roadmap, non-goals, constraints.
- `.ai-context/architecture.md`: System summary, modules, data flow, integrations, storage, tests, local dev, deployment.
- `.ai-context/decisions.md`: Important product and architecture decisions with rationale.
- `.ai-context/glossary.md`: Domain terms and project-specific language.

## Writing Rules

- Be concise and factual.
- Preserve useful existing content unless it is clearly stale.
- Prefer bullets and short sections over long prose.
- Include file paths when they help future agents navigate.
- Separate stable knowledge from temporary working memory.
- Do not present guesses as facts.
- Put temporary or active work in `short-term.md`.
- Put durable direction and constraints in `long-term.md`.
- Put inferred architecture in `architecture.md`.
- Put assumptions and unresolved questions where future agents will see them.

## Final Response

End with:

- Files created or updated.
- Key project facts inferred.
- Unknowns or questions for the user.
- Suggested next context updates.
