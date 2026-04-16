# Working Safely Through Documentation Gaps

**Module**: M07 · Surface Strategy and Open Limits
**Type**: frontier
**Estimated time**: 25 minutes
**Claim**: C7, C9 - Some workflow decisions remain evidence-limited, so teams should design explicit fallbacks rather than pretending missing documentation does not matter

---

## The core idea

This lesson begins with uncertainty because the research does. Some important workflow questions remain only partially answered by the public documentation. The clearest open gaps are: no explicit GitHub cloud-agent token or context budget equivalent to Claude's context-window detail, no single compatibility matrix for shared artifacts across hosts, and thinner GitHub-native documentation for subagent semantics outside the VS Code surface. Source trail: `vault/research/github-copilot-agentic-workflows-governance/02-analysis/gaps.md`, `01-sources/web/S007-github-copilot-cloud-agent.md`, `S015-claude-context-window.md`, `S018-github-cloud-agent-access-management.md`, `S020-claude-custom-subagents.md`.

## Why it matters

Evidence limits are not a reason to stop building workflows. They are a reason to build with explicit fallback assumptions. A weak workflow hides its uncertainty and overstates confidence. A stronger workflow says, "Here is what we know, here is what we do not know, and here is how we will operate safely until better evidence appears."

## A concrete example

Here is a good frontier-style response to the open gaps.

**What we know**

- GitHub documents repository, branch, and task-scope constraints for cloud agent
- Claude documents more explicit context and memory mechanics
- Skills and MCP provide real but incomplete portability support

**What we do not know fully**

- the hard numeric context ceilings for GitHub cloud agent
- a field-by-field compatibility matrix for shared artifacts across all surfaces
- whether GitHub will expose a richer subagent model outside current local surfaces

**What would settle it**

- first-party GitHub documentation publishing token or compaction behavior
- an authoritative compatibility matrix across GitHub.com, VS Code, CLI, and Claude
- stronger GitHub-native subagent documentation at the cloud-agent level

**Safe operating response**

- validate artifact behavior per host instead of assuming equivalence
- design for small always-on context even where numeric budgets are unknown
- isolate risky exploratory work and rely on explicit governance controls rather than undocumented assumptions

That last point is the frontier lesson in one sentence: when documentation is incomplete, design for reversibility and validation.

## Key points

- Open documentation gaps should be named explicitly, not hand-waved away
- Safe workflow design under uncertainty depends on validation, conservative assumptions, and reversible decisions
- Frontier lessons are about what would settle the uncertainty, not about pretending the uncertainty is already resolved

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/02-analysis/gaps.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md`

---

*[<- Previous: GitHub for Governance, Claude for Context Mechanics](./L13-github-for-governance-claude-for-context-mechanics.md)*