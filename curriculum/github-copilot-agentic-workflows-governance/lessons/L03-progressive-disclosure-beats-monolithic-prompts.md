# Progressive Disclosure Beats Monolithic Prompts

**Module**: M02 · Context Economics and Token Pressure
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C2 - Token-efficient workflows are built through progressive disclosure, context compaction, and delegated side work rather than ever-larger monolithic prompts

---

## The core idea

The strongest shared design rule in the research is simple: context is scarce, so do not keep everything loaded all the time. Skills, context management docs, and Claude's context-window guidance all point toward the same pattern: discover lightweight metadata first, load detailed instructions only when the task needs them, and avoid carrying heavy reference material in every session. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S003-vscode-agent-skills.md`, `S013-claude-memory.md`, `S015-claude-context-window.md`, `S019-agentskills-specification.md`, `S022-vscode-manage-context.md`.

Progressive disclosure is therefore a workflow design principle, not just a UI idea. You expose a little context broadly, then reveal more as relevance increases. That lets a system stay responsive without losing specialized capability.

## Why it matters

Large prompts often feel safer because they appear comprehensive. In practice they create three problems:

- the model spends tokens rereading material that is irrelevant to the current step
- important instructions compete with background detail for attention
- later edits become harder because one prompt now tries to act as memory, workflow, policy, and reference library

Intermediate builders should treat context like budget allocation. If you can move rarely used detail into a skill resource or a focused subtask, do it. If a workflow requires a long checklist every time, consider whether the checklist belongs in a reusable skill instead of the parent session.

## A concrete example

Compare two ways to run the same workflow.

Monolithic design:

- one master prompt includes role definition, coding standards, repo history, security policy, style guide, build commands, test strategy, and troubleshooting notes
- the same prompt is reused for planning, implementation, and review

Progressive design:

- instructions hold only durable rules
- the active task description stays short
- a skill loads a planning rubric only when planning is requested
- a subagent performs broad code search and returns a summary instead of dumping raw findings into the parent context

The second design matches the documented loading model for skills and the context-isolation model for subagents. It also reduces prompt drift because fewer artifacts are pretending to be universal. Source trail: `S003-vscode-agent-skills.md`, `S004-vscode-subagents.md`, `S015-claude-context-window.md`.

An easy heuristic is: if a block of instructions is only useful for one phase, it should probably load only in that phase.

## Key points

- Progressive disclosure keeps always-on context small and phase-specific context targeted
- Context should be treated as a workflow budget, not an invisible implementation detail
- Heavy instructions, checklists, and references belong in on-demand artifacts whenever possible

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S022-vscode-manage-context.md`

---

*[<- Previous: Artifact Selection in Real Workflow Design](./L02-artifact-selection-in-real-workflow-design.md)* · *[Next lesson: Compaction, Reinjection, and Subagent Isolation ->](./L04-compaction-reinjection-and-subagent-isolation.md)*