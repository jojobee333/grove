# Repairing Cross-Tool Convention Drift

**Module**: M06 · Shared Names, Different Meanings
**Type**: applied
**Estimated time**: 30 minutes
**Claims**: C6, C7 — Shared artifacts are still usable across tools, but teams need explicit compatibility validation and per-host documentation rather than assuming one unified interpretation

---

## The situation

Convention drift is the accumulated cost of shared artifacts being interpreted differently across tools. It does not announce itself. It accumulates quietly: an instruction that applies always in VS Code but only on-demand in GitHub; a tool restriction that is honored in Claude but silently ignored in the cloud agent; a skill that loads correctly on one surface but references a path that does not exist in another environment. None of these produce error messages. They produce inconsistent behavior that is hard to trace back to a root cause.

This lesson is about diagnosing and repairing that drift. The research supports C6 (shared filenames do not provide reliable behavioral portability) and C7 (GitHub and Claude emphasize different parts of the agentic workflow problem) [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md) [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md) [S018](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md) [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md) [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md) [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md) [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md). The combined picture is clear: GitHub and Claude have different documentation emphases, different control surfaces, and different native artifact conventions. A cross-tool team that does not explicitly manage that difference will eventually discover it through failures.

> **Caveat (C7)**: Both ecosystems are broad and evolving. There is real overlap through shared standards like MCP and Agent Skills. The claim is not that the ecosystems are incompatible — they can work together well. It is that they should not be assumed to generalize cleanly to each other in the absence of explicit validation.

## The repair framework

Convention drift can be repaired systematically using a five-step audit:

**Step 1: Inventory all shared artifacts.**
List every file that is used on more than one host surface. Include instruction files, agent definitions, skills, and hook or configuration files. For each, record which hosts are expected to use it.

**Step 2: Identify the intended responsibility.**
For each artifact, write one sentence: "This artifact's job is to \_\_\_." If you cannot write that sentence in one sentence, the artifact owns too many jobs and should be split first.

**Step 3: Record the loading model per host.**
For each host that uses the artifact, answer:
- When does this file load? (Always, on activation, on-demand)
- What priority does it have relative to other instructions?
- What scope does it apply to? (All files, path-scoped, agent-only)
- Which fields or properties are recognized? Which are silently ignored?

**Step 4: Identify the behavioral gaps.**
Compare the loading models. If an artifact loads always-on in one host and on-demand in another, content designed for on-demand use will over-apply in the always-on host. If a property is recognized in one host and ignored in another, any rule that depends on that property is only partially applied.

**Step 5: Document and either repair or accept the gap.**
Add a compatibility note to the artifact or adjacent to it. For significant behavioral gaps (a security-critical rule that does not apply on one surface), either repair the gap (add a host-specific equivalent) or accept it explicitly and document the risk.

## A concrete example

**Example 1 — auditing a shared instruction file**

You have a repository with the following shared instruction file:

```markdown
# .github/copilot-instructions.md

Use TypeScript strict mode. No `any`.
Use Drizzle ORM for all database access.
All external inputs must be validated with Zod before touching the database.
Always include workspace_id in WHERE clauses for workspace-scoped tables.

When reviewing code changes, run through the security checklist in
.github/skills/security-review/SKILL.md before approving.
```

Audit results:

| Host | Loads this file? | When? | Notes |
|---|---|---|---|
| GitHub cloud agent | Yes | When relevant to the request | Loaded as repository-wide instruction |
| VS Code | Yes | Always (for files matching applyTo) | Applied to all requests without user action |
| Claude Code | No (wrong filename) | N/A | Claude needs `CLAUDE.md` at project root |

Repair actions:
1. Add `CLAUDE.md` at project root mirroring the same content, or add a note in `CLAUDE.md` pointing to this file.
2. Note in the file header: "This file is active for VS Code and GitHub. Claude Code requires a corresponding CLAUDE.md entry."
3. The security checklist reference to `SKILL.md` works across all surfaces if the skill is placed in a location all surfaces recognize (`.github/skills/` works for GitHub and VS Code; `.claude/skills/` for Claude).

**Example 2 — auditing a custom agent for cross-tool use**

You have a `backend-engineer.agent.md` file in `.github/agents/`:

```yaml
---
description: "Backend engineering specialist with database and API access"
tools:
  - readFile
  - writeFile
  - runTerminalCommand
  - openDiff
disable-model-invocation: false
user-invocable: true
---

You are a senior backend engineer specializing in TypeScript APIs and PostgreSQL.
Maintain strict type safety and always validate inputs with Zod.
```

Audit results:

| Host | Recognizes this file? | Which fields honored? |
|---|---|---|
| VS Code | Yes (`.github/agents/`) | All documented fields |
| GitHub cloud agent | Partial — agent instructions via AGENTS.md or custom agents spec | Tools, description; not all frontmatter fields may apply |
| Claude Code | No (expects `.claude/agents/*.md`) | File not discovered unless VS Code maps it |

Compatibility note to add at top of file:

```markdown
<!--
COMPATIBILITY:
- VS Code: fully supported at .github/agents/ with all frontmatter properties
- GitHub cloud agent: use AGENTS.md or configure via GitHub custom agents spec
- Claude Code: this file is detected by VS Code when VS Code maps .claude/agents/;
  Claude Code natively reads .claude/agents/ — consider maintaining a copy there
  if Claude-native subagent behavior is needed
-->
```

## Building a cross-tool compatibility checklist

Use this checklist when introducing any new shared artifact:

```markdown
## Cross-Tool Compatibility Checklist for [artifact name]

### Structural portability
- [ ] Does the file location work on all intended surfaces?
- [ ] Are there alternative locations needed for some surfaces?
- [ ] Is the file naming convention recognized on all surfaces?

### Behavioral portability
- [ ] Load timing: always-on, on-demand, or agent-scoped on each host?
- [ ] Priority: does precedence work as expected on each host?
- [ ] Scope: does path targeting (if any) work correctly on each host?
- [ ] Properties: which frontmatter fields are honored on each host?
- [ ] Tools: are referenced tools available in each host execution environment?

### Validation steps
- [ ] Added a distinctive test instruction and confirmed it appeared in each host's output
- [ ] Removed the test instruction after validation
- [ ] Added a compatibility note to the artifact or adjacent documentation
- [ ] Recorded the per-host loading behavior in team documentation
```

This checklist should be completed once per new shared artifact and updated when a host platform's documentation changes significantly.

## The GitHub vs Claude documentation gap as a practical consideration

C7 documents that GitHub and Claude emphasize different parts of the agentic workflow problem. GitHub's documentation is strongest on repository governance, access management, PR traceability, and branch constraints [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md) [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md) [S018](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md). Claude's documentation is strongest on context mechanics, permission modes, memory loading, and subagent isolation [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md) [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md) [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md) [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md).

For convention drift repair, this matters because the documentation you consult to understand how a control works may not be authoritative for the other surface. A governance pattern you found documented in GitHub's hooks guide does not have a direct documented equivalent in Claude Code — Claude's closest analog is permission modes, which work differently. A context budget optimization you found in Claude's context-window guide does not have a documented numerical equivalent in GitHub's cloud agent documentation. Cross-surface design requires consulting both documentation sources rather than assuming the clearest available documentation generalizes.

## Key points

- Convention drift is the accumulated mismatch between shared artifact structure and per-host behavioral semantics; it fails silently through inconsistent behavior rather than explicit errors
- Repair requires inventory, purpose statement, per-host loading model documentation, gap identification, and either remediation or explicit acceptance
- Compatibility notes adjacent to shared artifacts prevent the drift from accumulating invisibly
- The GitHub vs Claude documentation gap means per-surface consulting is required \u2014 one vendor's documentation does not fully describe the other vendor's control surface
- The cross-tool compatibility checklist should be completed once per new shared artifact and maintained as documentation evolves

## Go deeper

- [S010](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S010-github-repository-custom-instructions.md) — GitHub repository custom instructions: the three instruction types, nearest-file precedence for agent instructions, and how multiple instruction files combine
- [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md) — Claude memory: startup loading model, the CLAUDE.md vs. managed settings distinction, and what path-scoped rules do and do not survive compaction
- [S009](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S009-github-agent-skills.md) — GitHub agent skills: the three supported skill directory locations that work across cloud agent, CLI, and VS Code agent mode, and why skills are the most structurally portable artifact type

---

*[← Previous: AGENTS.md Is Not One Thing Everywhere](./L11-agents-md-is-not-one-thing-everywhere.md)* · *[Next lesson: GitHub for Governance, Claude for Context Mechanics →](./L13-github-for-governance-claude-for-context-mechanics.md)*

---

## The core idea

Once you accept that shared artifacts can drift semantically, the next task is operational: how do you still work productively across tools? The research answer is not to abandon reuse. It is to pair reuse with explicit validation. In practice that means maintaining compatibility notes, checking precedence rules, and testing how each host handles the artifact before treating it as production-ready. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S008-github-custom-agents.md`, `S010-github-repository-custom-instructions.md`, `S013-claude-memory.md`, `S016-mcp-introduction.md`.

## Why it matters

Convention drift is expensive because it usually fails quietly. An artifact does not have to crash to be dangerous. It only has to be interpreted differently enough that governance, context loading, or role behavior changes without the team noticing.

## A concrete example

Use this repair checklist when sharing artifacts across hosts:

1. Identify the artifact's intended responsibility.
2. Record which host loads it natively and which host only partially supports it.
3. Record precedence and scope rules for each host.
4. Validate whether any fields or semantics are ignored.
5. Add a short compatibility note next to the artifact or in adjacent docs.

For example, if a shared instruction file is used by both GitHub and VS Code, the note should say:

- what the file is meant to control
- where it is always-on versus opt-in
- what the fallback file is in Claude if the semantics differ

This turns portability from hopeful reuse into governed reuse. Source trail: `S010-github-repository-custom-instructions.md`, `S013-claude-memory.md`, `S016-mcp-introduction.md`.

The deeper lesson is that cross-tool workflows need a thin layer of operational documentation, even when the artifacts themselves are shared.

## Key points

- Convention drift is best repaired with explicit compatibility notes and validation steps
- Shared artifacts remain valuable, but they should be treated as reusable inputs, not proof of identical behavior
- A small amount of host-specific documentation prevents subtle governance and context bugs later

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S016-mcp-introduction.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md`
- `vault/research/github-copilot-agentic-workflows-governance/02-analysis/gaps.md`

---

*[<- Previous: AGENTS.md Is Not One Thing Everywhere](./L11-agents-md-is-not-one-thing-everywhere.md)* · *[Next lesson: GitHub for Governance, Claude for Context Mechanics ->](./L13-github-for-governance-claude-for-context-mechanics.md)*