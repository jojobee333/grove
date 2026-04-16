# Repairing Cross-Tool Convention Drift

**Module**: M06 · Shared Names, Different Meanings
**Type**: applied
**Estimated time**: 30 minutes
**Claim**: C6, C7 - Shared artifacts are still usable, but teams need explicit compatibility notes and host-specific validation instead of assuming one unified interpretation

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