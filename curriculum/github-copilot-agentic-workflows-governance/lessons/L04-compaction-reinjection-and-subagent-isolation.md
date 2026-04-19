# Compaction, Reinjection, and Subagent Isolation

**Module**: M02 · Context Economics and Token Pressure
**Type**: applied
**Estimated time**: 30 minutes
**Claims**: C2, C8 — Context mechanics become practical workflow structure when you isolate noisy work, control what returns to the parent session, and keep independent stages from contaminating each other

---

## The core idea

Progressive disclosure (L03) addresses what loads at the start of a session. This lesson addresses what happens to a session as it runs: how context compacts when it fills, what gets reinjected after compaction, and why delegating noisy work to subagents is the most reliable way to protect the parent session from context sprawl. These are not three separate topics \u2014 they form a single design strategy for long-running workflows.

Context compaction is the mechanism that keeps long sessions functional. In VS Code, when a context window approaches capacity, the session is automatically compacted by summarizing earlier messages [S022](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S022-vscode-manage-context.md). In Claude Code, compaction is more precisely documented: after compaction, the project-root `CLAUDE.md`, auto memory, and any invoked skills are re-injected with their current content, but path-scoped rules and nested `CLAUDE.md` files reload only when matching files are read again [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md). The numerical constraint is specific: large invoked skills are re-injected with a cap of 5,000 tokens per skill and 25,000 tokens total across all skills. Content that exceeds these caps is truncated from the bottom of the skill, which is why the documentation advises placing the most critical instructions at the top of `SKILL.md`.

Subagent isolation operates on a different principle. Rather than compacting a long session, a subagent prevents context pollution by running in a completely separate context window from the start. VS Code documents subagents as agent-initiated workers that return only a summary plus small metadata to the parent conversation [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md). Claude frames this identically: use a subagent when a task would flood the main conversation with search results, logs, or file contents [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md). The parent never sees the noise; it only receives the signal.

The connection to C8 (separation of concerns as workflow quality control) is direct: subagent isolation is not just a context budget optimization. It also preserves the independence of later judgments from earlier exploratory noise. A review step that inherits all the implementation context \u2014 including the half-formed hypotheses, abandoned approaches, and raw exploration output \u2014 is not as clean a review as one that starts with a scoped context. The same isolation mechanism that saves tokens also reduces role contamination.

## Why it matters

The consequence of poor compaction management is subtle but real: a session that has been running for a while may no longer have access to the detailed instructions that governed its early steps. Those instructions were compacted away. If your workflow depends on skill re-injection (it should), but your `SKILL.md` files exceed 5,000 tokens each, the post-compaction context will be missing important content \u2014 truncated from the bottom of each skill file. Developers who hit this problem often see the model start producing output that ignores constraints it was honoring earlier in the session, with no obvious error.

The consequence of not using subagent isolation is that exploratory work contaminates the decision-making context. A broad codebase scan that dumps 50 relevant file snippets into the main session is not just expensive in tokens \u2014 it fills the session with detail that the planning phase has to reason around rather than through. When the implementation phase starts in that same context, the implementer has inherited the framing assumptions and attention load of the exploration phase.

## A concrete example

**Example 1 — designing for post-compaction survival**

You are building a multi-step implementation workflow in Claude Code. Your skills include a 3,000-token planning rubric skill and a 6,000-token security review skill. Here is what survives a compaction event:

| Content | Survives compaction? | Notes |
|---|---|---|
| `CLAUDE.md` (project root) | Yes, re-injected in full | Keep this short — it re-injects fully every time |
| Auto memory | Yes, first 200 lines / 25 KB | Keep the most important facts near the top |
| Planning rubric skill (3,000 tokens) | Yes, re-injected in full | Under the 5,000-token per-skill cap |
| Security review skill (6,000 tokens) | Partially — truncated at 5,000 tokens | Content below 5,000 tokens is dropped |
| Path-scoped `tests/.instructions.md` | No — must be re-triggered | Only reloads when a file under `tests/` is read |
| Nested `src/api/CLAUDE.md` | No — must be re-triggered | Only reloads when a file under `src/api/` is read |

The practical design rule: keep critical constraints near the top of skill files, not at the end. A checklist item at line 300 of a 400-line `SKILL.md` that translates to ~6,500 tokens will be silently dropped after compaction. An important constraint buried in a path-scoped instruction file will not survive the first compaction event unless the matching path files are re-read.

To verify your skill sizes in Claude Code, you can check the context-window display or use the `/compact` command to observe what persists [S022](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S022-vscode-manage-context.md).

**Example 2 — using subagents to isolate exploratory work**

You are building a feature that touches an unfamiliar part of the codebase. The naive approach: ask the main session to search broadly, read the relevant files, form a picture, then plan, then implement.

The problem: the main session has now ingested potentially hundreds of lines of code across multiple files. When planning and implementation begin, the session is carrying all of that exploration context. The model's attention is split across the code dump and the task at hand. Later, if you ask the same session to review the implementation for correctness, it is reviewing work that it did while surrounded by exploration noise.

The subagent approach:

```
Step 1: Parent session defines the research question precisely.
  "Which files and architectural boundaries does the user authentication flow cross?
   Return: a list of files, the main entry points, and any obvious coupling risks.
   Do NOT return full file contents."

Step 2: Launch a subagent with the research question and read-only tool access.
  The subagent searches broadly, reads files, follows call chains.
  It returns a 200-word summary: key files, entry points, coupling risks.

Step 3: Parent session reads the summary only.
  Planning begins from the summary, not from raw exploration output.
  Implementation context is clean.

Step 4: For review, optionally launch a separate review subagent.
  It receives the implementation output plus the original task description.
  It does not receive the planning session history or the exploration summary.
  Its review is independent.
```

The parent session never carries the exploration noise. The review is independent of the implementation context. Both the context budget and the judgment quality benefit from the same design decision [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md) [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md).

## What to pass back from a subagent

VS Code's documentation on subagents is explicit that they return a summary plus small metadata [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md). Claude's documentation distinguishes subagents from agent teams: subagents work within a single session; agent teams coordinate across separate sessions with their own memory and handoff mechanisms [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md). The subagent is designed for summarization, not for rich bidirectional information passing.

When designing what a subagent should return, apply this filter:

- **Return**: final decisions, accepted constraints, key file names, critical risks, a one-paragraph summary of findings
- **Leave in the subagent**: raw file contents, exhaustive search results, failed hypotheses, intermediate reasoning steps, long log output

The goal is that the parent session reads the subagent output and knows exactly what it needs to proceed, without carrying the exploration history that produced it. Claude's workflow guidance for broad-to-narrow exploration supports this pattern: investigate widely, then narrow [S021](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md). The subagent does the wide investigation; the parent session sees only the narrow result.

## Key points

- Compaction re-injects `CLAUDE.md`, auto memory, and invoked skills, but caps each skill at 5,000 tokens and all skills combined at 25,000 tokens \u2014 content at the end of long skill files is silently truncated
- Path-scoped rules and nested `CLAUDE.md` files do not survive compaction automatically; they only reload when matching files are read again in the new session segment
- Subagent isolation is both a context budget optimization and a judgment quality control: exploratory noise never enters the parent session, and later review steps are not contaminated by earlier implementation assumptions
- Design subagent return values to carry only decisions, constraints, and summaries; leave raw exploration output in the subagent's isolated context
- VS Code caps subagent nesting at depth 5 and disables sub-spawning by default, which bounds orchestration complexity and prevents runaway delegation chains

## Go deeper

- [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md) — Claude context window: the most specific documentation on compaction behavior, what re-injects, and skill token caps after compaction
- [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md) — VS Code subagents: coordinator-worker and parallel review patterns, model selection priority, and the nesting depth limit
- [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md) — Claude custom subagents: Anthropic's definition of when to use subagents vs. agent teams, and the built-in Explore, Plan, and general-purpose subagent types

---

*[← Previous: Progressive Disclosure Beats Monolithic Prompts](./L03-progressive-disclosure-beats-monolithic-prompts.md)* · *[Next lesson: Why Prompts Cannot Enforce Policy →](./L05-why-prompts-cannot-enforce-policy.md)*

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