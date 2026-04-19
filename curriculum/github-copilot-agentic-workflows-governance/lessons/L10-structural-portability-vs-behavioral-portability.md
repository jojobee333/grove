# Structural Portability vs Behavioral Portability

**Module**: M05 · Portability Has Sharp Edges
**Type**: debate
**Estimated time**: 25 minutes
**Claims**: C5, C6 — Portability is real at the artifact structure level, but runtime behavior varies by host surface in ways that are not always visible from the file itself

---

## The core idea

Portability in the agentic ecosystem exists on two distinct levels, and conflating them produces a predictable class of bugs. **Structural portability** means an artifact can be placed in a repository and recognized by multiple tools. **Behavioral portability** means the tools that recognize the artifact interpret it with the same semantics.

The evidence strongly supports C5 (structural portability for skills) but qualifies it with C6 (behavioral portability for shared filenames is unreliable). Skills have open-specification structural portability: the directory format, frontmatter schema, and loading model are defined in a spec that multiple tools implement [S003](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S003-vscode-agent-skills.md) [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md). But even for skills, the behavioral layer — what tools are available when the skill runs, how skill reinjection works after compaction, whether path-scoped rules apply — is still host-dependent.

For instruction files and custom agents, the structural and behavioral gap is even wider. `AGENTS.md` can exist in the same repository and be read by multiple tools; VS Code, GitHub, and Claude Code all have documented relationships with this filename [S005](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S005-vscode-custom-instructions.md) [S010](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S010-github-repository-custom-instructions.md). But the semantic interpretation \u2014 when the file loads, what priority it has, what scope it applies to \u2014 differs across them [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md). The artifact is structurally portable; its behavior is not.

## The debate: is the portability story good enough?

**Optimistic view: structural portability is genuinely valuable**

Even if behavioral portability is incomplete, structural portability is not worthless. The fact that a skill directory in `.github/skills/` is recognized by GitHub cloud agent, VS Code, and Copilot CLI means it does not need to be duplicated for each tool [S009](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S009-github-agent-skills.md). The fact that VS Code can read Claude-format agent files in `.claude/agents/` means a team maintaining one agent definition in that directory does not need a separate VS Code definition [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md). These are real reductions in maintenance cost. The optimistic view says: lean into structural portability for shared workflow libraries, and accept that behavioral validation per host is a normal part of deployment.

**Cautious view: behavioral drift creates hidden failures**

The problem with stopping at structural portability is that it can create false confidence in a way that produces subtle failures. A team sees a skill loaded correctly in VS Code and assumes it will behave identically in the GitHub cloud agent. But the cloud agent runs in a GitHub Actions environment where some tools may not be available, where the skill reinjection behavior after compaction may differ, and where file access is scoped to a single repository. The skill loads; it does not do the same thing.

Similarly, an instruction file shared across GitHub and Claude Code may carry the same text, but GitHub uses nearest-file precedence for path-scoped instructions [S010](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S010-github-repository-custom-instructions.md) while Claude loads `CLAUDE.md` in full at startup [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md). A rule near the end of a long instruction file has a different effective weight in Claude (where it might be compacted away after the first session) than in GitHub (where the file is loaded per request).

**The evidence-grounded synthesis**: structural portability is worth pursuing and is the right first target for shared workflow investment. Behavioral portability is an additional, per-host validation step that cannot be skipped when a workflow has governance implications. The right sentence is not "this artifact is portable"; it is "this artifact is portable enough to share, and it needs host-specific validation before relying on it for governance or quality-critical decisions."

## **There is a real disagreement here.**

C6 is contradicted in part by S001: VS Code explicitly supports Claude-format agent files by detecting and mapping `.claude/agents/` agent definitions [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md). This is genuine partial interoperability across tools — a team can write Claude-format agents and have them recognized in VS Code without a separate definition.

C6 says this cross-recognition does not guarantee identical semantics [S005](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S005-vscode-custom-instructions.md) [S010](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S010-github-repository-custom-instructions.md). S001 shows the cross-recognition is real and first-party documented. The contradiction is not about file discoverability — it is about the gap between recognition and semantic equivalence. Both claims can be true simultaneously: VS Code recognizes Claude-format agents (S001), and the mapping produces partial rather than complete behavioral equivalence (C6). The disagreement is about how to weigh "partial" — is it good enough for production reliance, or does it require explicit validation before each deployment?

The research leaves this partially open. Neither position is unsupported; neither is fully resolved by the evidence available.

## What to validate per host

When sharing an artifact across tools, validate these specific behavioral dimensions:

**For skills:**
- Are the tools referenced in the skill available in this host environment?
- How does post-compaction reinjection work on this host, and does the skill content survive it?
- Are `user-invocable` and `disable-model-invocation` frontmatter fields recognized?
- Are scripts or referenced resources accessible from the execution environment?

**For instruction files:**
- What is the file's priority relative to other instructions on this host?
- Is path-scoped targeting via `applyTo:` or nearest-file precedence consistent with expectations?
- What is the effective token cost of this file on this host, given startup loading behavior?
- Does this host support the file naming convention you are using?

**For custom agents:**
- Are the frontmatter properties you are using documented for this host?
- Does the handoff model work the same way (does the target agent exist on this host)?
- Are tool restrictions honored or silently ignored?

## A concrete example

**Scenario: sharing a skill and an instruction file across GitHub and Claude**

You have a team that uses both GitHub cloud agent for PR-based workflow tasks and Claude Code locally for research and implementation. You want a shared code review skill and a shared set of coding standards.

```
# Repository structure
.github/
  copilot-instructions.md   # GitHub reads this natively
  skills/
    code-review/
      SKILL.md              # GitHub, VS Code, and CLI recognize this location
      checklist.md
.claude/
  CLAUDE.md                 # Claude reads this natively; VS Code also reads it
  skills/
    code-review/
      SKILL.md              # Claude recognizes this; also discoverable by VS Code
```

The strategy: maintain one skill definition under `.github/skills/` for the GitHub/VS Code surface, and optionally symlink or duplicate under `.claude/skills/` if Claude-specific execution behavior differs. For instruction files, maintain both `copilot-instructions.md` (GitHub/VS Code) and `CLAUDE.md` (Claude/VS Code) with the same content \u2014 but recognize that VS Code will load both, which means the content is effectively present twice in VS Code sessions.

This is not a clean one-artifact solution. It is the honest cross-surface design: structural portability where it exists, explicit duplication where semantics differ, and validation before relying on shared artifacts for critical behavior.

## Key points

- Structural portability (an artifact is recognized across tools) and behavioral portability (an artifact is interpreted identically across tools) are distinct properties, and the research supports the first more strongly than the second
- C6 is partially contradicted by S001's documentation of VS Code reading Claude-format agent files; the disagreement is about whether recognition implies semantic equivalence, not about whether recognition occurs
- Validating behavioral portability requires checking priority rules, loading mechanisms, tool availability, and property support per host \u2014 structural portability alone is not sufficient for governance-critical workflows
- The right operating sentence: "this artifact is portable enough to share as a starting point; host-specific validation is required before relying on it for policy or quality assurance"
- Skills have the strongest structural portability story; instruction file semantics and agent property support are the areas most likely to drift across hosts

## Go deeper

- [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md) — VS Code custom agents: the first-party source documenting cross-format agent detection; the contradiction to C6 about structural interoperability
- [S005](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S005-vscode-custom-instructions.md) — VS Code custom instructions: precedence model, `applyTo:` path scoping, and the multi-file loading behavior that creates behavioral drift
- [S010](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S010-github-repository-custom-instructions.md) — GitHub repository custom instructions: nearest-file precedence, the three instruction types, and how GitHub treats `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` as instruction inputs

---

*[← Previous: Why Skills Travel Better Than Agents](./L09-why-skills-travel-better-than-agents.md)* · *[Next lesson: AGENTS.md Is Not One Thing Everywhere →](./L11-agents-md-is-not-one-thing-everywhere.md)*

---

## The core idea

The research resolves a major contradiction by splitting portability into two kinds. Structural portability means a file or artifact can be reused across tools because the format is recognized or close enough to adapt. Behavioral portability means the host interprets that artifact the same way at runtime. The evidence supports the first much more strongly than the second. Source trail: `vault/research/github-copilot-agentic-workflows-governance/02-analysis/contradictions.md`, `01-sources/web/S003-vscode-agent-skills.md`, `S008-github-custom-agents.md`, `S010-github-repository-custom-instructions.md`, `S013-claude-memory.md`.

## Why it matters

This distinction prevents a subtle but expensive mistake: a team sees one file work in two tools and assumes the behavior is now standardized. That assumption is often wrong. The file may load, but precedence, permission interaction, and scope rules can still differ.

## A concrete example

There are again two views worth hearing fairly.

**Optimistic view**

- shared standards reduce duplication
- skills and some agent artifacts can be reused across products
- common filenames encourage a more unified workflow ecosystem

**Cautious view**

- host semantics still differ materially
- some agent properties may be ignored or handled differently
- instruction precedence and file loading can drift even when names match

The evidence supports a synthesis: share artifacts when standards justify it, but validate behavior per host. That is what the contradiction analysis actually resolves. Source trail: `S008-github-custom-agents.md`, `S010-github-repository-custom-instructions.md`, `S013-claude-memory.md`.

So the right operational sentence is not "this artifact is portable." It is "this artifact is portable enough to reuse, but not safe to trust untested across hosts."

## Key points

- Structural portability means the artifact can be shared; behavioral portability means the host treats it the same way
- The research supports structural portability more strongly than behavioral portability
- Cross-tool standardization should include validation, not just file reuse

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/02-analysis/contradictions.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S008-github-custom-agents.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md`

---

*[<- Previous: Why Skills Travel Better Than Agents](./L09-why-skills-travel-better-than-agents.md)* · *[Next lesson: AGENTS.md Is Not One Thing Everywhere ->](./L11-agents-md-is-not-one-thing-everywhere.md)*