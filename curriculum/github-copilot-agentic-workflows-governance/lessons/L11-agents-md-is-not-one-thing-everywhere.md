# AGENTS.md Is Not One Thing Everywhere

**Module**: M06 · Shared Names, Different Meanings
**Type**: debate
**Estimated time**: 25 minutes
**Claim**: C6 — Shared artifact names such as AGENTS.md do not provide reliable cross-tool semantic portability, so teams must validate how each host interprets the same file

---

## The core idea

One of the most practically important findings in the research is also one of the easiest to overlook: shared filenames do not imply shared semantics. `AGENTS.md` is the clearest example because it is used in multiple ecosystems that have overlapping but non-identical interpretations. The same filename, with the same content, can load at different times, with different priority, into different scopes, depending on which tool is reading it.

Here is what the documentation actually says about each surface:

**VS Code:** VS Code treats `AGENTS.md` as an always-on instruction input, similar to `CLAUDE.md` [S005](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S005-vscode-custom-instructions.md). It is loaded as part of the repository instruction set and applies without user action. VS Code explicitly lists `AGENTS.md` alongside `CLAUDE.md` as files that are recognized and applied as instructions.

**GitHub:** GitHub documents agent instructions that can be placed in `AGENTS.md` files anywhere in the repository, using nearest-file precedence \u2014 the `AGENTS.md` closest to the directory being worked on takes priority [S010](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S010-github-repository-custom-instructions.md). GitHub distinguishes this from repository-wide `copilot-instructions.md` and from path-specific `.instructions.md`. The `AGENTS.md` is the per-agent instruction surface; it is not treated as an always-on global instruction file in the way VS Code treats it.

**Claude Code:** Claude Code's native instruction file is `CLAUDE.md`, not `AGENTS.md` [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md). Claude does not natively read `AGENTS.md` unless it is explicitly imported through `CLAUDE.md` (e.g., with an `@import` directive or equivalent). An `AGENTS.md` file in a repository that is also used with Claude Code is, by default, invisible to Claude unless the team explicitly configures Claude to read it.

> **There is a real disagreement here.** C6 is partially contradicted by S001, which documents that VS Code can read Claude-format agent files in `.claude/agents/` and map them as custom agents [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md). This cross-detection means VS Code's interoperability with Claude-format files is explicitly documented and intentional \u2014 not accidental. The disagreement is not about whether cross-tool file recognition exists. It exists. The disagreement is about whether recognition at the file level implies semantic equivalence at the behavior level. C6 says it does not. S001 shows a concrete case where significant cross-tool compatibility is real and first-party documented. Both can be true simultaneously: VS Code recognizes Claude-format agents (structural portability), and the full set of agent properties may still behave differently on each host (behavioral gap). Teams should treat cross-detection as a head start, not as a guarantee.

## Why this matters operationally

The practical failure mode is not dramatic. It looks like this: a team writes `AGENTS.md` for their GitHub Copilot workflow because GitHub's documentation explains agent instructions through `AGENTS.md`. A developer working locally in Claude Code wonders why the agent instructions do not seem to be applying. They search for the issue, do not find it, and eventually add the same content to `CLAUDE.md` by hand. Now the instructions are duplicated and must be maintained in sync.

Or the opposite: a team writes extensive `AGENTS.md` instructions for Claude Code, then discovers that VS Code is treating the entire file as always-on global instructions rather than agent-specific instructions \u2014 which inflates context on every session, not just agent-mode sessions.

Neither failure is obvious from the filename. Both are consequences of treating shared filenames as shared semantic contracts.

## A concrete per-host breakdown

| Question | VS Code | GitHub | Claude Code |
|---|---|---|---|
| Does it read `AGENTS.md` natively? | Yes, as always-on instructions | Yes, as agent instructions (nearest-file precedence) | No — requires explicit import via `CLAUDE.md` |
| Is it always-on or on-demand? | Always-on (loaded with instructions) | Attached when relevant to the request | Not loaded unless explicitly imported |
| Does it support multiple `AGENTS.md` files in subdirectories? | Yes, with applyTo scoping | Yes, with nearest-file precedence | N/A (not natively read) |
| Priority relative to other instruction files? | Personal > repository > organization | Personal > repository > organization | N/A |
| What should you use instead for Claude? | `CLAUDE.md` at project root | n/a | `CLAUDE.md` at project root |

## What this means for cross-tool workflow design

The practical resolution to the `AGENTS.md` cross-tool problem is not to stop using shared filenames. It is to maintain an explicit per-host documentation record for any shared instruction file, and to design instruction content for the most restrictive interpretation.

**Design for the most restrictive load model.** If the same file will be treated as always-on by VS Code and as agent-scoped by GitHub, write its content assuming it will always be active. That means keeping it focused on genuinely universal standards rather than agent-specific workflow steps. Agent-specific workflow steps should either go in per-host files or in skills that load only when invoked.

**Maintain a compatibility note adjacent to the file.** A one-page `INSTRUCTIONS_COMPAT.md` or a comment block at the top of the file that says "VS Code: always-on, GitHub: nearest-file agent instructions, Claude: requires import via CLAUDE.md" costs nothing to maintain and prevents hours of debugging. This is the explicit documentation approach that L12 builds on.

**Test the loading behavior on each host during setup.** The fastest way to validate is to add a distinctive instruction in the file \u2014 something like "always prepend your responses with [AGENT_INSTRUCTIONS_ACTIVE]" \u2014 and check whether it appears in sessions on each host. That confirms the file is being read. Remove the test instruction once you have confirmed loading.

## A concrete example

**Scenario: a shared `AGENTS.md` breaks Claude Code silently**

You have a repository used by both GitHub cloud agent and Claude Code. You write `AGENTS.md` at the repository root with 80 lines of agent behavior instructions including task workflow steps, output format requirements, and tool use restrictions.

On GitHub: the file is picked up as agent instructions. Tool use restrictions are applied. The workflow steps are available as guidance. The setup works as designed.

On Claude Code: the file is not loaded. None of the instructions apply. Claude operates from `CLAUDE.md` only, which does not contain these instructions. A developer runs a complex task expecting the agent workflow steps to apply, and the output does not follow them. The failure is silent — no error, no warning, just different behavior.

The repair:

```markdown
# CLAUDE.md (project root)

# Core coding standards
Use TypeScript strict mode. No `any` types. Test with Vitest.

# Agent instructions (mirrored from AGENTS.md — keep in sync)
@import .github/AGENTS.md

# OR: explicitly copy the relevant sections here, with a maintenance note
## Agent Workflow Instructions
<!-- Mirrored from .github/AGENTS.md - update both files when workflow changes -->
When starting a new task:
1. Identify the relevant files before writing any code.
...
```

The import approach (if supported by the Claude Code version in use) keeps a single source of truth. The explicit copy approach is more portable but creates a maintenance obligation. Both are better than hoping `AGENTS.md` is loaded automatically.

## Key points

- `AGENTS.md` is treated differently across VS Code (always-on instructions), GitHub (nearest-file agent instructions), and Claude Code (not natively read \u2014 requires explicit import)
- The semantic gap between "VS Code treats this file as always-on" and "GitHub treats this as agent-scoped with nearest-file precedence" is not visible from the filename alone
- VS Code reads Claude-format agent files in `.claude/agents/` (S001 \u2014 this is real, first-party documented cross-compatibility); the question is whether the behavioral semantics fully match, not whether recognition occurs
- The safe default is to document loading behavior per host for any shared instruction file, and to design instruction content for the most restrictive load model
- Validate file loading on each host during initial setup; do not rely on shared filenames as proof of identical treatment

## Go deeper

- [S005](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S005-vscode-custom-instructions.md) — VS Code custom instructions: how VS Code loads `AGENTS.md` as always-on instructions, priority order, and the list of recognized instruction file names
- [S010](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S010-github-repository-custom-instructions.md) — GitHub repository instructions: the three instruction types GitHub supports and how `AGENTS.md` functions as an agent instruction surface with nearest-file precedence
- [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md) — Claude memory: what Claude loads natively (`CLAUDE.md`), what requires explicit import, and the startup loading model that determines what is active before the first prompt

---

*[← Previous: Structural Portability vs Behavioral Portability](./L10-structural-portability-vs-behavioral-portability.md)* · *[Next lesson: Repairing Cross-Tool Convention Drift →](./L12-repairing-cross-tool-convention-drift.md)*

---

## The core idea

One of the most important findings in the research is also one of the easiest to miss: shared filenames do not guarantee shared meaning. `AGENTS.md` is the clearest example. The source set shows overlapping conventions across VS Code, GitHub, and Claude, but not one canonical semantic model. That is why the contradiction remains unresolved at the filename level even though the broader portability question can be partially resolved. Source trail: `vault/research/github-copilot-agentic-workflows-governance/02-analysis/contradictions.md`, `01-sources/web/S005-vscode-custom-instructions.md`, `S010-github-repository-custom-instructions.md`, `S013-claude-memory.md`.

## Why it matters

Filename reuse creates false confidence because it feels standardized. A team may assume that because multiple tools recognize or mention a file called `AGENTS.md`, they can rely on one meaning. The research says otherwise. The same filename can participate in different precedence rules, different loading scopes, and different native behaviors.

## A concrete example

The simplified picture looks like this:

| Surface | What the file does in the documented model |
|---|---|
| VS Code | Can act as always-on instruction input depending on workspace structure and scope |
| GitHub | Participates in repository custom instruction behavior with nearest-file precedence |
| Claude Code | `CLAUDE.md` is the native instruction file; `AGENTS.md` is not equivalent unless explicitly imported |

That is enough to prove a workflow risk. Even if the text inside the file is identical, the host may read it at different times or with different priority. Source trail: `S005-vscode-custom-instructions.md`, `S010-github-repository-custom-instructions.md`, `S013-claude-memory.md`.

The right response is not to ban shared filenames. It is to stop assuming shared semantics.

## Key points

- `AGENTS.md` is a shared convention, not a shared semantic contract
- Host-specific precedence and loading behavior can change what the same file actually means in practice
- Teams should document interpretation per host before treating a filename as standardized

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/02-analysis/contradictions.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S005-vscode-custom-instructions.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S010-github-repository-custom-instructions.md`

---

*[<- Previous: Structural Portability vs Behavioral Portability](./L10-structural-portability-vs-behavioral-portability.md)* · *[Next lesson: Repairing Cross-Tool Convention Drift ->](./L12-repairing-cross-tool-convention-drift.md)*