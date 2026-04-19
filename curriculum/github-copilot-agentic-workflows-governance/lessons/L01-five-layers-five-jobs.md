# Five Layers, Five Jobs

**Module**: M01 · The Agentic Stack: Five Layers, Five Jobs
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C1 — Effective agentic workflow design depends on treating prompts, instructions, skills, agents, and subagents as separate layers with different responsibilities

---

## The core idea

When you work across VS Code, GitHub Copilot, and Claude Code, you encounter five kinds of artifacts that the documentation treats as categorically distinct — not as interchangeable labels for a single "AI customization" feature. Each layer solves a specific problem, carries a defined scope of authority, and incurs a different cost in context tokens and governance complexity. The recurring mistake is to treat them as stylistic synonyms: stuffing everything into one large instruction file, calling every reusable thing an "agent," or blurring the line between a skill and a subagent. That collapse degrades workflow quality in ways that are slow to surface but expensive to repair.

**Prompt files** are manually invoked, task-scoped entry points. In VS Code they live in `.github/prompts/` as `.prompt.md` files and appear as slash commands in the chat input [S002](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S002-vscode-prompt-files.md). Their frontmatter can specify the agent, model, and available tools for a single run, but nothing about a prompt file persists to the next invocation. The VS Code docs are explicit: prompt files are for lightweight, single-task prompting. They are not for encoding durable standards, and they are not agents.

**Instruction files** are the always-on layer. In VS Code they include `.github/copilot-instructions.md` for repository-wide defaults and `.instructions.md` files with `applyTo:` path globs for folder-scoped rules [S005](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S005-vscode-custom-instructions.md). Instructions are injected into every relevant request without user action — that is their strength. It is also their cost: every line of an always-on instruction file is a context-budget line on every request it matches. Anthropic recommends keeping `CLAUDE.md` under 200 lines for exactly this reason [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md).

**Skills** package reusable, task-specific workflow capabilities. A skill is a directory containing at minimum a `SKILL.md` file, optionally accompanied by scripts, reference documents, and supporting resources [S003](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S003-vscode-agent-skills.md). The Agent Skills specification formalizes three loading stages: the runtime discovers the skill from frontmatter metadata (cheap), loads the `SKILL.md` body when the skill is activated (bounded), and fetches referenced resources only when they are needed during execution (on demand) [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md). This progressive loading model means a large library of skills imposes minimal context cost when no skill is active. That is exactly why skills are the right layer for complex, reusable workflows: they scale in capability without inflating always-on context.

**Agents** (custom agents in VS Code, `.agent.md` files) are persistent role configurations that define a persona, tool restrictions, model preferences, and optionally handoff rules to other agents [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md). The distinguishing characteristic is persistence: an agent retains its configuration across invocations and can be referenced by name in prompt files or by other agents through handoffs. VS Code's documentation explicitly describes custom agents as the right choice when you need a persistent persona, not when you need to package a reusable workflow.

**Subagents** are isolated worker runs with their own context windows. Both VS Code and Claude Code document subagents as running separately from the parent session, performing a bounded subtask, and returning only a summary [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md) [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md). Anthropic frames the use case clearly: use a subagent when a side task would flood the main conversation with search results, log output, or large file dumps. The subagent handles the noisy work and returns a clean summary; the parent session stays focused.

> **Caveat**: The exact file names, directory locations, and frontmatter fields differ between VS Code, GitHub Copilot's cloud agent, and Claude Code. A `.agent.md` file works in VS Code; Claude stores agents under `.claude/agents/`. The repository-wide instruction convention on GitHub and VS Code is `copilot-instructions.md` under `.github/`; Claude uses `CLAUDE.md` at project root. These naming differences are real and matter for implementation — always validate file conventions per host before relying on them. The role separation itself, however — prompt as entry point, instructions as always-on guidance, skills as on-demand capability, agents as role definition, subagents as isolated workers — is documented consistently across all three surfaces [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md).

## Why it matters

An intermediate builder most often fails not by lacking the right tools, but by assigning the wrong responsibility to the wrong layer. The failure modes are predictable:

**The bloated instruction file** grows to hold testing procedures, security checklists, role definitions, and project-specific constants — all of which are now context cost on every session, including sessions where those rules are irrelevant. A developer asking a documentation question now silently pays the token cost of the full security review checklist.

**The procedural agent** embeds multi-step workflow logic inside a persona definition. When the workflow changes, the agent definition must be edited, but it is not clear which part is the persona and which is the procedure. Reusing the agent in a different project means dragging along every embedded assumption.

**The monolithic prompt** tries to be the entry point, the instruction set, the procedure, and the role definition simultaneously. It grows until it cannot be reused anywhere, cannot be understood at a glance, and can only be edited by whoever wrote it originally.

**The overloaded parent session** performs broad exploration, code editing, and self-review in a single uninterrupted context, accumulating noise that increasingly influences later judgments even when it should not.

Each of these failures is a layer-mixing problem. The practical habit that prevents them: before creating any new artifact, ask *what single persistent responsibility should this object own?* The answer maps to one layer.

## A concrete example

**Example 1 — collapsing layers: the failure pattern**

Here is an instruction file trying to own multiple jobs at once:

```markdown
---
# .github/copilot-instructions.md
---

You are a senior backend engineer on the payments team.
Always use TypeScript strict mode. No `any` types.

When reviewing pull requests, apply this security checklist:
1. Verify no secrets are hardcoded
2. Check for SQL injection risks in any raw queries
3. Confirm all external inputs are validated with Zod
4. Check for OWASP Top 10 violations
... [30 more checklist items]

When implementing a new API endpoint:
1. Start by reading the OpenAPI spec
2. Draft the Zod schema before writing the handler
3. Write the database query using Drizzle ORM, always including workspace_id
... [25 more steps]

When writing tests, use Vitest. Each test file must:
1. Import from vitest, not jest
2. Use describe blocks matching the function name
... [15 more rules]
```

This applies to every file in the workspace (`applyTo: "**"` is implied when no glob is set). The security checklist, implementation procedure, and test rules are all in context on every request — including requests to format a README or write a comment. The file also defines a role persona (`senior backend engineer`) that belongs in an agent, not instructions. This design is paying context cost for specialization you are not using.

**Example 2 — separating layers: the structured pattern**

```
.github/
  copilot-instructions.md         # ← 8-10 lines of durable coding standards only
  prompts/
    review-security.prompt.md     # ← slash command to invoke the review workflow
  skills/
    security-review/
      SKILL.md                    # ← review procedure, loads on activation only
      checklist.md                # ← rubric referenced from SKILL.md body
agents/
  backend-engineer.agent.md       # ← persona: tools, model, handoffs
```

With this layout:

- `copilot-instructions.md` holds only genuinely universal rules: TypeScript strict mode, test runner, commit format. These are worth paying context for on every session because they apply broadly.
- The security review procedure is a skill. Its `SKILL.md` describes the steps; the rubric details live in `checklist.md`, which is only fetched when the review is underway. Zero tokens on all non-review sessions.
- The persona lives in `backend-engineer.agent.md`, where it can declare tool access and model preferences. The agent definition is clean and inspectable.
- The entry point is `review-security.prompt.md`. A developer types `/review-security` to start the workflow. The prompt's frontmatter references the agent and invokes the skill, meaning the tool priority chain is: prompt tools → agent tools → default tools [S002](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S002-vscode-prompt-files.md).

If the security review procedure changes, only `SKILL.md` is edited. If the team changes the role persona, only the agent file changes. If the coding standards change, only the instruction file changes. Each artifact owns its job cleanly.

## Understanding the tool priority chain

VS Code's tool resolution follows a specific three-level priority when a prompt file is active: the prompt file's own declared tools win first, then the tools declared by any referenced custom agent, then the tools available in the default selected agent [S002](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S002-vscode-prompt-files.md). This priority chain has governance implications that are worth internalizing.

Suppose your `backend-engineer.agent.md` grants file-system write access and terminal execution. That is appropriate when the agent is doing implementation work. But your `review-security.prompt.md` invokes this agent to run a security review — a task that should be read-only. You have two options:

1. Declare a restricted tool set in the prompt file's frontmatter. The prompt-level tools win and override the agent's broader access for this invocation only.
2. Create a separate `security-reviewer.agent.md` with read-only tools, and reference that agent from the prompt instead.

Option 1 is lighter weight. Option 2 creates a fully separable agent role that other prompts could also use. Both are valid; the point is that layer separation makes the decision visible. Without the layered model, you cannot reason about per-invocation tool scope at all.

## Subagent depth limits and recursion control

VS Code documents that subagents are disabled from spawning further subagents by default — nested delegation must be explicitly enabled and is capped at a maximum nesting depth of five [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md). This matters for workflow architecture: an unbounded delegation chain creates context and cost that compound rapidly. The depth limit is a governance control on orchestration complexity. When designing coordinator-worker patterns, the standard approach is one coordinator plus one layer of workers, not recursive hierarchies.

Claude documents a similar structural distinction: subagents work within a single session, while agent teams coordinate across separate sessions [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md). Teams coordinating across sessions need their own memory and handoff mechanisms — they are not simply deeper subagent nesting.

## Key points

- Prompts are task-scoped entry points; instructions are always-on guidance; skills are on-demand capabilities; agents define persistent roles; subagents isolate side work in separate context windows
- Mixing layers inflates always-on context, hides governance decisions, and makes artifacts brittle — when one thing changes, you have to understand the entire mixed artifact to know what is safe to edit
- The five-layer model is documented consistently across VS Code, GitHub Copilot, and Claude Code; the file naming conventions differ by host, but the structural logic does not
- Before creating any artifact, ask what single persistent responsibility it should own; that answer maps to exactly one layer
- Prompt files carry tool priority over agent tools, which carry priority over default tools — this separation enables least-privilege scoping at the individual invocation level

## Go deeper

- [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md) — VS Code custom agents: the clearest first-party statement of when agents, prompt files, and skills are each appropriate, and documents cross-compatibility with Claude-format `.agent.md` files
- [S003](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S003-vscode-agent-skills.md) — VS Code agent skills: defines the three-stage progressive loading model and explains why skills are designed for on-demand capability rather than always-on context
- [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md) — Agent Skills specification: the non-vendor-specific standard that defines the skill directory structure, frontmatter schema, and progressive disclosure loading model across VS Code, CLI, and cloud agent

---

*← [Next lesson](./L02-artifact-selection-in-real-workflow-design.md) →*

---

## The core idea

The public documentation across VS Code, GitHub Copilot, and Claude Code does not describe one generic "agent feature." It describes several layers that solve different problems. Prompt files are short reusable entry points for a task. Instructions are always-on or path-scoped guidance. Skills package reusable workflows and resources that load when relevant. Agents define a role, tool policy, and sometimes handoff behavior. Subagents isolate focused side work in a separate context window. That separation is the stable pattern in the source set, not an implementation detail. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md`, `S002-vscode-prompt-files.md`, `S003-vscode-agent-skills.md`, `S005-vscode-custom-instructions.md`, `S020-claude-custom-subagents.md`.

The practical mistake is to treat these as interchangeable labels. If you put governance policy, workflow instructions, and role definition into one artifact, the result becomes hard to reuse, hard to audit, and expensive to carry in context. The research theme and claim set argue for a cleaner rule: each artifact should do one job well. `claims.md` ties this directly to workflow quality, not just neatness.

## Why it matters

An intermediate builder usually does not fail because they lack features. They fail because they put the wrong responsibility in the wrong place. A reusable slash command becomes an always-on instruction dump. A skill becomes a pseudo-agent. A role definition becomes a pile of project standards. Once that happens, the workflow gets brittle: context grows, portability drops, and later edits become risky because nobody can tell what is policy versus procedure.

If your goal is to apply this practically, the highest-leverage habit is to ask one question before creating any artifact: *what persistent responsibility should this object own?* If the answer is "start a task quickly," that is prompt territory. If the answer is "shape default behavior across many tasks," that belongs in instructions. If the answer is "teach the system how to do a repeatable workflow on demand," that is a skill. If the answer is "define a specialist worker with a narrow operating model," that is an agent or subagent.

## A concrete example

Suppose a team wants a workflow for reviewing pull requests against a security rubric.

Bad packaging:

- Put the security rubric in an always-on instruction file
- Add review steps to a custom agent definition
- Add project-specific exceptions inside the same artifact
- Tell the main agent to also do dependency scanning and architectural review in one pass

That design mixes three concerns:

- baseline behavior
- reusable workflow steps
- specialized execution roles

Better packaging:

- Instructions: hold the durable rule that security findings must include severity and exploit path
- Prompt file: give the user a short command like `/review-security`
- Skill: package the review checklist, rubric, and any supporting references
- Agent: define the reviewer persona and tool boundaries
- Subagent: run a separate focused pass for dependency or auth review when independent judgment matters

This maps directly to the documented product model: prompt files for reusable entry points, instructions for persistent guidance, skills for task-specific capabilities, and subagents for isolated work. Source trail: `S002-vscode-prompt-files.md`, `S003-vscode-agent-skills.md`, `S004-vscode-subagents.md`, `S021-claude-common-workflows.md`.

## Key points

- Prompts, instructions, skills, agents, and subagents are separate workflow layers, not stylistic synonyms
- The right artifact is determined by responsibility: entry point, guidance, capability, role, or isolated side work
- Mixing those responsibilities increases context cost and makes governance harder to inspect

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/03-synthesis/claims.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S003-vscode-agent-skills.md`

---

*[Next lesson: Artifact Selection in Real Workflow Design ->](./L02-artifact-selection-in-real-workflow-design.md)*