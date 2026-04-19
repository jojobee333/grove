# Parallel Review Without Role Contamination

**Module**: M04 · Stage Work, Then Delegate
**Type**: debate
**Estimated time**: 30 minutes
**Claims**: C8, C9 — Separation of concerns reduces role contamination and premature convergence, and agent bias should be treated as a practical orchestration risk even when vendor documentation does not name it explicitly

---

## The core idea

This is an area of ongoing development in the research. The sources strongly recommend isolated workers, independent review passes, and human validation \u2014 but they do not consistently use terms like "role contamination" or "agent bias" to name the risk. The pattern is visible in the documentation, but the explicit theoretical framing is an inference from the evidence rather than a first-party vendor claim.

What the sources do document directly: VS Code recommends parallel subagents for independent review perspectives [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md). Claude recommends subagents when side tasks would contaminate the main session [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md). Claude's workflow guidance consistently favors broad-to-narrow exploration before implementation commitment [S021](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md). GitHub documents human review as a required step, not an optional quality improvement [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md). These documented recommendations collectively suggest that independence between phases is a design goal \u2014 the products are built around it. What C9 adds is a name for why that independence matters: when context, roles, and assumptions accumulate and are shared across exploration, implementation, and review, the quality of later judgments is degraded by the framing of earlier ones.

> **Caveat (C8)**: The sources document independence, isolation, and review separation directly but do not always name this problem as "separation of concerns." The claim is defensible from the documented patterns; the specific terminology is an analytical inference.

> **Caveat (C9)**: This claim is speculative \u2014 it is a reasoned inference from documented independence and review patterns, not a first-party claim that explicitly names "agent bias" as a product concept. The vendors describe and build around the risk; they do not name it as "agent bias" in their documentation. Treat this as a useful diagnostic frame, not an established vendor-documented mechanism.

## The debate: how much independence is worth the coordination cost?

This lesson is typed as a debate because there is a genuine tradeoff between independence and coordination overhead that the research does not fully resolve. Both sides have merit, and the right choice depends on context.

**The case for sequential single-actor workflows:**

- Fewer handoffs means less coordination overhead and faster execution
- A single context carries full task history, reducing risk of re-working already-explored territory
- Complex multi-agent orchestration introduces its own failure modes: miscommunication between actors, incorrect assumptions in handoff artifacts, and nested delegation complexity
- For low-risk or low-complexity tasks, the quality benefit of independent review may not justify the overhead of parallel workers
- Sequential review by the same session can work well when the reviewer is explicitly prompted to adopt an adversarial perspective before beginning

**The case for independent parallel review:**

- An actor that just wrote code is anchored to the implementation's assumptions. Even if prompted to "be critical," it will apply that criticism through the lens of the decisions it already made.
- Separate context windows eliminate the possibility of the reviewer accessing the implementation's reasoning history, which forces the review to evaluate outputs rather than intentions
- Parallel review scales: when multiple perspectives are needed (security, performance, test coverage), parallel workers can evaluate simultaneously rather than sequentially
- VS Code's documentation explicitly describes parallel multi-perspective review as a recommended subagent pattern, which is strong product endorsement [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md)
- GitHub's requirement for human review before merge, even for agent-produced PRs, is a real-world application of the independence principle at the highest-stakes boundary [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md)

**The evidence-grounded synthesis**: the research supports independent review when the task is high-risk, high-ambiguity, or governance-sensitive. It does not support universal parallelization as a default, and it explicitly documents the coordination costs of nested delegation (depth limits, model selection overhead, summary-based information loss) [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md). The defensible position is: separate roles when independence matters; use the simplest structure that achieves the quality level the task requires.

## What role contamination looks like in practice

Role contamination does not produce obvious errors. It produces systematically biased outputs that are hard to detect because they are locally coherent. The implementation looks reasonable. The review finds no major issues. The PR is merged. Three weeks later a subtle regression surfaces that the review should have caught.

Common contamination patterns:

**Confirmation anchoring**: the explorer forms a hypothesis early ("this bug is in the auth handler"). The implementer builds a fix around that hypothesis. The reviewer checks whether the fix addresses the auth handler issue \u2014 it does. Nobody checks whether the hypothesis was correct in the first place, because the review inherited the hypothesis as established context.

**Scope narrowing**: the implementation phase narrows its focus to the task as originally described. The review phase inherits that scope and checks the narrow implementation. Broader concerns (what else changed? what are the second-order effects?) are not in scope because they were not in scope during implementation.

**Effort justification**: after completing a complex implementation, the same session is less likely to recommend starting over or taking a fundamentally different approach in review, because it just spent significant context building the current one.

These are not failures of model capability. They are structural failures of workflow design. The same patterns occur in human teams when the same person is asked to spec, build, and review their own work without external input.

## A concrete example

**Example 1 — implementing parallel review in VS Code**

```markdown
# review-parallel.prompt.md
---
description: "Parallel security and test coverage review"
---

The implementation under review is described in [IMPLEMENTATION_SUMMARY].
Run two independent review passes in parallel.

Review A - Security:
  Focus exclusively on: injection risks, auth boundary enforcement, secret handling,
  OWASP Top 10 violations, and input validation.
  Do NOT consider test coverage or performance.
  Start fresh; do not read the implementation planning history.

Review B - Test Coverage:
  Focus exclusively on: test completeness, edge case coverage, regression risk,
  and whether behavior changes are verified rather than assumed.
  Do NOT consider security issues or performance.
  Start fresh; do not read Review A findings.

After both reviews complete, synthesize: list only the blocking issues,
with one sentence per issue explaining the risk.
```

The key design choice: each review worker is explicitly told to start fresh and to ignore the other review's domain. This prevents the reviews from anchoring to each other's framing.

**Example 2 — handling the "was the hypothesis correct?" gap**

When a workflow has a planning phase that forms a hypothesis and an implementation phase that executes against it, the review phase is structurally likely to check whether the implementation is correct \u2014 not whether the hypothesis was valid. To address this:

```markdown
# Phase 4 review instructions (added to the review prompt)

Before reviewing the implementation, answer this question independently:
"Given only the original task description and the test results, is the behavior
now correct? Do NOT assume the implementation approach was correct because
it was already chosen."

Then review the implementation against your independent answer, not against
the planning document.
```

This prompt pattern forces the review to evaluate outcomes rather than implementation choices. It does not completely eliminate anchoring (the reviewer can still read the implementation), but it creates an explicit context reset that makes independent evaluation more likely.

## Key points

- The products document independence, isolation, and separate review passes \u2014 the design intent is clear even though vendor documentation does not use terms like "role contamination" or "agent bias"
- Sequential single-actor workflows are faster and simpler; parallel independent review workflows are slower but produce better results for high-risk, high-ambiguity, or governance-sensitive tasks
- Role contamination is not an obvious failure \u2014 it produces locally coherent but globally biased outputs that are hard to detect without independent verification
- C9 (agent bias as an explicit orchestration risk) is an inference, not a first-party vendor concept; use it as a diagnostic frame, not as a documented product behavior
- The right design choice is to separate roles when independence matters, not to parallelize everything by default

## Go deeper

- [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md) — VS Code subagents: the most direct product documentation of parallel multi-perspective review as a recommended pattern
- [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md) — Claude custom subagents: context isolation as a first-class design goal, and the distinction between subagents (single session) and agent teams (cross-session coordination)
- [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md) — GitHub responsible use: the strongest product statement that human review is a governance requirement, not an optimization, for agent-produced code

---

*[← Previous: Coordinator-Worker Workflows and Phase Boundaries](./L07-coordinator-worker-workflows-and-phase-boundaries.md)* · *[Next lesson: Why Skills Travel Better Than Agents →](./L09-why-skills-travel-better-than-agents.md)*

---

## The core idea

The sources strongly recommend isolated workers, independent review passes, and human validation. They do not consistently use the label "role contamination," but the pattern is visible: when one context explores, decides, implements, and reviews without separation, later judgments inherit the framing of earlier ones. The research treats this as a practical orchestration risk rather than a fully formalized product concept. Source trail: `vault/research/github-copilot-agentic-workflows-governance/03-synthesis/claims.md`, `01-sources/web/S004-vscode-subagents.md`, `S011-github-responsible-use-cloud-agent.md`, `S020-claude-custom-subagents.md`, `S021-claude-common-workflows.md`.

## Why it matters

This matters because many workflow failures are not obvious tool failures. They are judgment failures. A builder searches broadly, forms a hypothesis too early, writes code around it, then reviews the result using the same assumptions. Nothing crashes. But the workflow has lost independence.

For an intermediate practitioner, the key lesson is not that sequential work is always wrong. It is that some judgments need fresh context or at least a fresh role. Security review, regression review, and architectural criticism are common examples.

## A concrete example

There are two defensible views here.

**View 1: One well-instructed agent can do the whole job**

- fewer handoffs
- less coordination overhead
- better continuity of local detail

This can work for low-risk tasks where speed matters more than independent judgment.

**View 2: Parallel or separate reviewers are worth the extra coordination**

- independent perspective catches anchoring and blind spots
- specialized workers can stay narrower and sharper
- review output becomes easier to audit because the reviewer did not author the implementation context

This is the view most strongly supported by the workflow sources when the task has risk, ambiguity, or governance implications.

The safest interpretation of the evidence is not "always parallelize." It is "separate roles when independence matters." That keeps the course aligned with the research, because the sources recommend independent passes but stop short of claiming a universal rule. Source trail: `S004-vscode-subagents.md`, `S021-claude-common-workflows.md`, `S011-github-responsible-use-cloud-agent.md`.

## Key points

- The product docs imply a real risk of role contamination even when they do not name it directly
- Separate review is most valuable when the task is risky, ambiguous, or governance-sensitive
- Independence should be used intentionally, not as a reflex for every tiny task

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/02-analysis/themes.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md`

---

*[<- Previous: Coordinator-Worker Workflows and Phase Boundaries](./L07-coordinator-worker-workflows-and-phase-boundaries.md)* · *[Next lesson: Why Skills Travel Better Than Agents ->](./L09-why-skills-travel-better-than-agents.md)*