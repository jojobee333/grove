# Artifact Selection in Real Workflow Design

**Module**: M01 · The Agentic Stack: Five Layers, Five Jobs
**Type**: applied
**Estimated time**: 25 minutes
**Claims**: C1, C3 — Effective workflow design depends on assigning prompts, instructions, skills, agents, and subagents to different jobs and then staging work through them deliberately

---

## The situation

Knowing the five-layer model in the abstract is insufficient. The harder skill is applying it under delivery pressure, when the path of least resistance is to stuff everything into one file and move on. This lesson is about that decision process: how to choose the right artifact for a given workflow requirement, how to detect when you have chosen wrong, and how to stage work across layers so the whole system stays coherent.

The claims driving this lesson are C1 (the five layers have different jobs) and C3 (the recommended workflow shape across GitHub Copilot, VS Code, and Claude Code is staged and delegated) [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md) [S006](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md) [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md) [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md) [S021](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md). The combination means artifact selection is not just a design nicety — it directly shapes whether staged orchestration is even possible.

> **Caveat (C3)**: Prompt files can invoke agents and tools, and agents can reference skills, which means the layers can interact in complex ways. When teams over-pack behavior into a single artifact \u2014 embedding workflow logic inside an agent definition, or putting a multi-step procedure inside a prompt file \u2014 the stage boundaries blur and the workflow becomes an undifferentiated single-actor run. The staged model only works when each artifact genuinely owns its layer [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md).

## The approach: lightest artifact that matches the responsibility

The most reliable decision rule is to use the lightest artifact that still fully owns the responsibility you are assigning. Heavier artifacts carry more hidden complexity, more context cost, and more entanglement with other concerns. A skill that could have been a prompt file now has to be discovered, activated, and managed. An agent that could have been a skill drags a persistent persona into every invocation. An always-on instruction file that could have been a skill pays context cost continuously.

Here is the decision matrix applied to common workflow requirements:

| Requirement | Best artifact | Why |
|---|---|---|
| Reusable task entry point for a user to invoke manually | Prompt file | Lightweight, user-controlled, task-scoped; no persistence overhead |
| Durable coding standards applying to all requests | Instruction file | Genuinely always-relevant; worth paying context cost universally |
| Path-scoped conventions (e.g., different rules for `tests/`) | Path-scoped instruction | Same mechanism, narrower scope; reduces context waste |
| Multi-step repeatable workflow with checklists and references | Skill | Progressive loading means full cost only when active |
| Specialist role with fixed tool access and model preferences | Custom agent | Persistent role that can be referenced by name across multiple prompt files |
| Focused side work that would pollute parent context with noise | Subagent | Isolated context window returns only a summary |

Two selection errors are worth naming explicitly because they are the most common:

**Instructions masquerading as workflows.** A team writes a detailed implementation procedure into `copilot-instructions.md` because it applies broadly and they want it always available. The result is heavy always-on context for a procedure that is relevant on maybe 20% of sessions. The correct move is to put the procedure in a skill, and write one line in instructions that points developers to the skill.\n\n**Agents masquerading as skills.** A team creates a custom agent for every specialized task — a `security-reviewer.agent.md`, a `test-generator.agent.md`, a `doc-writer.agent.md`. Each agent embeds its instructions directly rather than referencing a skill. Now the instructions exist only in the agent, cannot be invoked from a prompt file without also adopting the full persona, and cannot be shared with another agent that does the same work in a different role. The correct move is to put the procedure in a skill, and have each agent reference that skill.

## A concrete example

**Example 1 — feature planning and implementation workflow**

You want a repeatable workflow: a developer opens a planning command, the system researches the relevant code, proposes an implementation plan, writes the implementation with tests, then hands off a summary ready for PR review.

Naive design: one agent that plans, researches, implements, and reviews.

Staged design:

```
.github/
  prompts/
    feature-plan.prompt.md      # entry point: /feature-plan
    implement-feature.prompt.md # entry point: /implement-feature
  skills/
    feature-planning/
      SKILL.md                  # planning procedure, acceptance criteria template
    implementation-review/
      SKILL.md                  # review checklist, test coverage rubric
agents/
  planner.agent.md              # research tools, read-only access
  implementer.agent.md          # code editing tools, test runner
```

The planning workflow:
1. Developer runs `/feature-plan`. The prompt file loads the `feature-planning` skill and uses the `planner.agent.md` role.
2. A subagent performs a broad codebase exploration to find relevant touch points. It returns a file list and brief summary — not the raw file contents.
3. The planner proposes an implementation plan, guided by the skill's acceptance criteria template.

The implementation workflow:
1. Developer runs `/implement-feature` with the plan as input. The prompt file loads the `implementer.agent.md` role.
2. Implementation proceeds. The `implementation-review` skill loads for the review phase.

What you gain from staging this: the research phase cannot pollute the implementation context with noisy file dumps [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md). The review is done with the review skill, not by the same context that wrote the code. Each phase has its own tool scope — the planner cannot accidentally commit while planning; the implementer cannot read-explore widely while writing.

**Example 2 — cross-surface governance workflow**

You are using GitHub Copilot cloud agent for PR-based work and Claude Code locally for research and exploration. You want consistent behavior across both.

What travels between them:
- Skills: the Agent Skills specification is recognized by both GitHub and VS Code [S009](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S009-github-agent-skills.md). Place them under `.github/skills/` or `.claude/skills/` and both tools can discover them.
- Coding standards in instructions: both GitHub's `copilot-instructions.md` and Claude's `CLAUDE.md` can carry the same durable rules. Keep these short and non-task-specific.

What does not automatically travel:
- Custom agent files: VS Code uses `.agent.md`; Claude uses `.claude/agents/`. Semantics overlap but are not guaranteed identical.
- Permission modes: Claude's `plan`/`acceptEdits`/`auto` mode system [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md) has no direct equivalent in GitHub cloud agent's controls.

The artifact selection rule for cross-surface workflows: prioritize skills and instruction files for shared logic; accept that agent definitions and permission modes need per-host implementation.

## Diagnosing a bad selection

The clearest diagnostic question is: *if I removed this artifact, what responsibility would disappear from the system?* A well-designed artifact owns exactly one responsibility, and removing it removes that responsibility cleanly. If removing an artifact also destroys five unrelated things, the artifact owns too many jobs.

Secondary diagnostics:
- Is this instruction relevant to more than 80% of sessions? If not, it belongs in a skill.
- Is this agent definition longer than 50 lines? It probably has an embedded procedure that belongs in a skill.
- Is this prompt file doing anything beyond entry point and parameter passing? It is starting to become an orchestrator.
- Is the parent session accumulating raw search output, file dumps, or exploration logs? Work that belongs in a subagent is leaking into the parent.

## Key points

- Choose the lightest artifact that fully owns the responsibility: prompt files for entry points, instructions for always-relevant standards, skills for repeatable workflows, agents for specialist roles, subagents for isolated side work
- The staged workflow model only functions when each artifact genuinely owns its layer; over-packing one artifact collapses the phases and turns staged orchestration into a single monolithic run
- Skills are the strongest cross-surface portability target; agent definitions and permission modes need host-specific implementation
- When an instruction file carries workflow logic, convert it to a skill with a pointer; when an agent embeds a procedure, extract the procedure to a skill the agent references

## Go deeper

- [S002](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S002-vscode-prompt-files.md) — VS Code prompt files: documents the lightest layer in the hierarchy, including frontmatter options and tool priority resolution
- [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md) — VS Code subagents: coordinator-worker and parallel review patterns, including recursion depth limits and model selection priority
- [S021](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md) — Claude common workflows: shows how Anthropic's own workflow guidance is staged, narrow, and exploration-first rather than monolithic

---

*[← Previous: Five Layers, Five Jobs](./L01-five-layers-five-jobs.md)* · *[Next lesson: Progressive Disclosure Beats Monolithic Prompts →](./L03-progressive-disclosure-beats-monolithic-prompts.md)*

---

## The core idea

Knowing the definitions is not enough. The practical skill is choosing the right artifact under delivery pressure. The research supports a consistent pattern: use the lightest artifact that still matches the responsibility. That keeps context smaller and reuse cleaner. When teams choose a heavier artifact than necessary, they usually hide accidental complexity inside it. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md`, `S002-vscode-prompt-files.md`, `S003-vscode-agent-skills.md`, `S021-claude-common-workflows.md`.

## Why it matters

Artifact selection controls both maintenance cost and orchestration quality. If you encode workflow steps inside an agent persona, every role change risks breaking the procedure. If you encode long-lived project policy inside a prompt file, users must remember to invoke it manually. If you use a subagent where a skill would work, you pay unnecessary coordination overhead. Good workflow design is therefore partly a decomposition problem: the better you separate responsibility, the less often one change ripples through every artifact.

## A concrete example

Imagine you want a repeatable workflow for "plan a feature, research code impact, then implement with tests."

Use this decision table:

| Need | Best artifact | Why |
|---|---|---|
| Quick reusable entry point | Prompt file | The user can invoke it directly without carrying long instructions all the time |
| Team coding standards | Instructions | Standards should apply broadly and persist across tasks |
| Multi-step planning recipe | Skill | A skill can package steps, references, and resources and load when relevant |
| Specialist implementation role | Agent | The role can own tool access, model choice, and handoff policy |
| Independent code search or second opinion | Subagent | Separate context protects the parent session from noisy exploration |

Now apply it to one concrete workflow:

1. A prompt file starts the feature-planning command.
2. Instructions ensure all code changes must preserve tests and strict typing.
3. A skill provides the planning rubric, checklist, and required output format.
4. An implementation agent owns coding tools and edits.
5. A subagent performs a focused impact scan before code changes begin.

That sequence matches the staged patterns in the research: plan first, delegate focused work, then hand off to the next phase. Source trail: `S004-vscode-subagents.md`, `S006-vscode-agents-overview.md`, `S007-github-copilot-cloud-agent.md`, `S021-claude-common-workflows.md`.

One useful test is this: *if I removed this artifact, what responsibility would disappear?* If the answer is unclear, the artifact probably owns too many jobs.

## Key points

- Choose the lightest artifact that still matches the responsibility
- Skills usually own repeatable workflows; agents own specialist roles; subagents own isolated side work
- Clear artifact boundaries make staged orchestration easier to audit and evolve

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S002-vscode-prompt-files.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md`

---

*[<- Previous: Five Layers, Five Jobs](./L01-five-layers-five-jobs.md)* · *[Next lesson: Progressive Disclosure Beats Monolithic Prompts ->](./L03-progressive-disclosure-beats-monolithic-prompts.md)*