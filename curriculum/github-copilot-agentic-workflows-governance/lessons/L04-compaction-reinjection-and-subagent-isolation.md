# Compaction, Reinjection, and Subagent Isolation

**Module**: M02 · Context Economics and Token Pressure
**Type**: applied
**Estimated time**: 30 minutes
**Claim**: C2, C8 - Context mechanics become practical workflow structure when you isolate noisy work and control what returns to the parent session

---

## The core idea

Once context pressure becomes real, the workflow question changes from "what do I want the model to know?" to "what must this session continue carrying?" The sources on context windows, memory loading, and subagents all imply the same answer: not much. Keep the parent session focused on direction and decisions. Push exploratory or high-volume work into isolated workers that return only the result that matters. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md`, `S013-claude-memory.md`, `S015-claude-context-window.md`, `S020-claude-custom-subagents.md`, `S022-vscode-manage-context.md`.

## Why it matters

Compaction is not magic. It is a tradeoff. When a session is compacted, some earlier detail is dropped or summarized. Reinjection brings back selected context, not everything. That means workflow design must decide ahead of time what deserves to survive compaction. Durable decisions, constraints, and accepted outputs usually belong in the parent thread. Raw exploration, dead ends, and exhaustive search results usually do not.

## A concrete example

Suppose you are designing a new multi-agent workflow.

Bad pattern:

- the parent session performs broad repo search
- it reads every matching file directly
- it pastes large output blocks into the same thread
- it then tries to plan and review in that now-polluted context

Better pattern:

1. Parent session defines the question: "What files and architectural seams matter for this feature?"
2. A subagent performs the broad search in isolation.
3. The subagent returns a short summary: key files, probable touch points, and open unknowns.
4. The parent session uses that summary to plan.
5. If another perspective is needed, launch a separate review-oriented worker instead of reusing the same exploratory context.

This workflow protects the parent from low-signal detail while preserving the high-signal output. It also reduces contamination between exploration and later judgment, which supports the research claim about separation of concerns. Source trail: `S004-vscode-subagents.md`, `S020-claude-custom-subagents.md`, `S021-claude-common-workflows.md`.

When deciding what to reinject, keep only:

- final decisions
- accepted constraints
- critical risks
- compact summaries of evidence

Leave behind:

- long raw logs
- duplicate search results
- abandoned branches of reasoning

## Key points

- Subagent isolation is a practical way to prevent context flooding in the parent session
- Compaction and reinjection force you to separate durable decisions from disposable exploration
- Parent threads should carry conclusions and constraints, not every intermediate artifact

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md`

---

*[<- Previous: Progressive Disclosure Beats Monolithic Prompts](./L03-progressive-disclosure-beats-monolithic-prompts.md)* · *[Next lesson: Why Prompts Cannot Enforce Policy ->](./L05-why-prompts-cannot-enforce-policy.md)*