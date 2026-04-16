# GitHub for Governance, Claude for Context Mechanics

**Module**: M07 · Surface Strategy and Open Limits
**Type**: applied
**Estimated time**: 30 minutes
**Claim**: C7 - GitHub Copilot and Claude Code emphasize different parts of the agentic workflow problem, so a cross-tool operating model should not assume one vendor's strongest documentation generalizes cleanly to the other

---

## The core idea

The source set suggests a useful operating split. GitHub documentation is stronger on cloud execution boundaries, review responsibility, repository governance, traceability, and admin policy. Claude documentation is stronger on local execution mechanics, memory loading, context pressure, autonomy modes, and subagent isolation. This does not mean either platform can only do one kind of work. It means their clearest documented strengths are different. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md`, `S011-github-responsible-use-cloud-agent.md`, `S013-claude-memory.md`, `S014-claude-permission-modes.md`, `S015-claude-context-window.md`, `S020-claude-custom-subagents.md`.

## Why it matters

Cross-tool workflow design gets easier when you stop asking "which platform is better?" and start asking "which platform documents the control I need most clearly?" If you are solving a governance-heavy problem, GitHub's model may be the better anchor. If you are solving a context-heavy local orchestration problem, Claude's documentation gives you more direct mechanics to reason from.

## A concrete example

Suppose you need to build a workflow that both edits code safely and stays efficient under context pressure.

Use GitHub-oriented strengths for:

- admin access and enablement
- repository and branch constraints
- PR-centric review and traceability
- hooks and governance visibility

Use Claude-oriented strengths for:

- deciding what belongs in always-on memory versus task-local context
- choosing permission modes for local autonomy
- isolating noisy work into subagents
- reasoning about compaction and context-window pressure

This is a strategic synthesis, not a product limit. The research supports using each vendor's strongest documentation to reason about the part of the workflow it explains best. Source trail: `S011-github-responsible-use-cloud-agent.md`, `S014-claude-permission-modes.md`, `S015-claude-context-window.md`.

## Key points

- GitHub's documented strength is governance and repository-centric execution; Claude's documented strength is local context and autonomy mechanics
- A cross-tool operating model should borrow the strongest reasoning surface for each problem, not force one platform's documentation onto all cases
- Surface selection is a workflow design decision, not a vendor loyalty choice

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md`
- `vault/research/github-copilot-agentic-workflows-governance/03-synthesis/narrative.md`

---

*[<- Previous: Repairing Cross-Tool Convention Drift](./L12-repairing-cross-tool-convention-drift.md)* · *[Next lesson: Working Safely Through Documentation Gaps ->](./L14-working-safely-through-documentation-gaps.md)*