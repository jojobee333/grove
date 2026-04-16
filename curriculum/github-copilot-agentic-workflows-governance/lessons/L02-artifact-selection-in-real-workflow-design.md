# Artifact Selection in Real Workflow Design

**Module**: M01 · The Agentic Stack: Five Layers, Five Jobs
**Type**: applied
**Estimated time**: 25 minutes
**Claim**: C1, C3 - Effective workflow design depends on assigning prompts, instructions, skills, agents, and subagents to different jobs and then staging work through them deliberately

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