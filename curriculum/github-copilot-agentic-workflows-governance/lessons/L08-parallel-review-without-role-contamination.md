# Parallel Review Without Role Contamination

**Module**: M04 · Stage Work, Then Delegate
**Type**: debate
**Estimated time**: 30 minutes
**Claim**: C8, C9 - Separation of concerns and independent workers reduce role contamination and premature convergence, even though vendors do not always name this risk explicitly

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