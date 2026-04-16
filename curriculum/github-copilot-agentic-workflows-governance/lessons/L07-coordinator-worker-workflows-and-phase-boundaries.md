# Coordinator-Worker Workflows and Phase Boundaries

**Module**: M04 · Stage Work, Then Delegate
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C3 - The recommended workflow shape across GitHub Copilot, VS Code, and Claude Code is staged and delegated: plan, explore, implement, review, and hand off in controlled phases

---

## The core idea

The research does not support the workflow pattern "write one giant request and let the model improvise." It supports staged execution. Plan first. Delegate focused exploration. Implement in a bounded phase. Review from a distinct perspective. Then hand off or finalize. The coordinator-worker model makes that sequence explicit: one actor keeps the overall thread coherent while other actors do narrower jobs. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md`, `S006-vscode-agents-overview.md`, `S007-github-copilot-cloud-agent.md`, `S021-claude-common-workflows.md`.

## Why it matters

Phase boundaries protect quality. Planning needs breadth. Implementation needs precision. Review needs distance from the implementation assumptions. When those modes collapse into one uninterrupted run, the workflow loses both specialization and auditability. A staged design makes it easier to see where decisions were made, what evidence supported them, and which phase owns the next action.

## A concrete example

Use this simple five-phase template for a nontrivial build task:

1. **Plan**: define the task, constraints, success criteria, and likely files.
2. **Explore**: launch a focused worker to inspect code, dependencies, or docs.
3. **Implement**: edit only after the likely impact area is understood.
4. **Review**: run a separate pass to look for regression, security, or testing gaps.
5. **Hand off**: summarize what changed, what remains uncertain, and what evidence supports the result.

Notice what this avoids: the same actor does not search broadly, code impulsively, and certify its own work without a boundary. That is why staged workflows are more defensible than monolithic ones. Source trail: `S004-vscode-subagents.md`, `S007-github-copilot-cloud-agent.md`, `S021-claude-common-workflows.md`.

One useful design rule is that each phase should have a different definition of success. Planning succeeds when the task is decomposed. Exploration succeeds when uncertainty is reduced. Implementation succeeds when behavior changes correctly. Review succeeds when risk is surfaced, not when it agrees.

## Key points

- Staged workflows are recommended across the source set because different phases need different kinds of reasoning and control
- Coordinator-worker structure keeps sequence and synthesis centralized while allowing focused side work
- Clear handoff boundaries improve both quality and auditability

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md`
- `vault/research/github-copilot-agentic-workflows-governance/03-synthesis/narrative.md`

---

*[<- Previous: Hooks, Permissions, and Audit Trails by Surface](./L06-hooks-permissions-and-audit-trails-by-surface.md)* · *[Next lesson: Parallel Review Without Role Contamination ->](./L08-parallel-review-without-role-contamination.md)*