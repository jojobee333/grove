# Structural Portability vs Behavioral Portability

**Module**: M05 · Portability Has Sharp Edges
**Type**: debate
**Estimated time**: 25 minutes
**Claim**: C5, C6 - Portability is real at the artifact level, but runtime behavior still varies by host surface

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