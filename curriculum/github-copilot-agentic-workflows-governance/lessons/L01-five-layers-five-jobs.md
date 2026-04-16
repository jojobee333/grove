# Five Layers, Five Jobs

**Module**: M01 · The Agentic Stack: Five Layers, Five Jobs
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C1 - Effective agentic workflow design depends on treating prompts, instructions, skills, agents, and subagents as separate layers with different responsibilities

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