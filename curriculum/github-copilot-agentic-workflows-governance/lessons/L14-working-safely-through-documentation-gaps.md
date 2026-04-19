# Working Safely Through Documentation Gaps

**Module**: M07 · Surface Strategy and Open Limits
**Type**: frontier
**Estimated time**: 25 minutes
**Claims**: C7, C9 — There are real gaps in the current documentation landscape; operating safely through those gaps requires making the gaps explicit, building provisional safe-state defaults, and not treating absence of documentation as permission

---

This is an area of ongoing debate and active development. The recommendations here are based on the research available at the time of writing and on the evidence-supported patterns from earlier modules. They will require re-evaluation as documentation matures.

---

## Why documentation gaps matter for governance

A complete documentation gap — where you cannot determine from first-party vendor sources what a control does or whether it applies — is not a neutral state. It is a risk state. A team that assumes "no documentation of a limit" means "no limit" is operating on an unsound inference. A team that assumes "no documentation of a cross-tool behavior" means "the behavior is consistent with what I know about the other tool" has conflated two different systems.

The research identifies several specific gaps that are not resolved by available documentation:

**Gap 1: No numerical context ceiling for GitHub cloud agent.**
Claude Code's context-window mechanics are documented with specific numbers: skill reinjection caps, startup load sizes, and compaction behavior [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md). GitHub's cloud agent documentation does not publish equivalent numerical context ceilings [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md). This means you cannot do the same kind of explicit context budget design for GitHub cloud agent tasks that you can for Claude Code sessions. The safe response is to design GitHub cloud agent task prompts as though there is a restrictive context ceiling — keep instruction files short, skills focused, and task scope tight — rather than assuming generous context availability.

**Gap 2: No cross-tool compatibility matrix.**
There is no first-party document in the research that says: "here is what happens when you place this artifact in this location and use it on each of these tools." The cross-tool behaviors documented in this course are derived from reading each tool's documentation independently and inferring the interaction. Inferences can be wrong, especially as platforms evolve. The safe response is to validate cross-tool artifact behavior empirically (as described in L12) and not rely solely on documentation-based inference.

**Gap 3: Thin documentation of GitHub subagent semantics outside VS Code.**
The GitHub cloud agent documentation [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md) describes a workflow model where the agent works through research, plan, iterate, and PR stages. The VS Code documentation describes subagent roles more explicitly through built-in agents (Explore, Plan, general) and the coordinator-worker model [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md). What is less explicit is how the GitHub cloud agent's phases map to explicit subagent invocations, whether custom agent files in a repository affect the cloud agent's phase behavior, and what the isolation boundaries are between phases in the cloud agent workflow. The safe response is to treat each cloud agent task as a single-context unit and not assume that subagent isolation patterns from VS Code documentation carry over to cloud agent behavior.

**Gap 4: The open question about deliberate cross-tool incompatibility (C9 — speculative).**
C9 proposes that some of the cross-tool behavioral differences between GitHub and Claude are intentional product differentiation rather than accidental divergence [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md) [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md) [S021](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-broad-to-narrow.md) [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md).

> **This claim is speculative.** C9 is the most uncertain claim in the course. It is a reasoned inference from the observation that both Anthropic and GitHub have had time to converge their tool conventions and have not done so in several specific areas. This could mean intentional differentiation, independent development timelines, or simply different priorities. No vendor has published a statement confirming intentional incompatibility as a strategy. Do not treat C9 as a documented fact; treat it as a plausible hypothesis that, if true, would imply that waiting for convergence is a poor strategy.

## What would settle it

Some of these gaps could be resolved by future documentation or product decisions. Here is what to watch for:

- **A GitHub-published context window specification for the cloud agent** would allow context budget design on the same level as Claude Code. Watch for numerical limits in GitHub's cloud agent technical documentation.
- **An official cross-tool compatibility matrix** from any major vendor would significantly reduce the inference burden for teams maintaining artifacts across surfaces. This may come through Agent Skills specification evolution [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md) or through MCP's continued expansion [S016](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S016-mcp-open-standard.md).
- **GitHub cloud agent documentation of explicit subagent phases** would clarify how the research-plan-iterate-PR stages map to agent architectural concepts and whether custom agents affect those phases.
- **Vendor convergence on shared instruction file semantics** (particularly for `AGENTS.md`) would reduce the per-surface validation burden described in L11.

## Safe operating defaults through gaps

Until the gaps close, these operating defaults reduce risk:

**Default 1: Treat absence of documentation as a risk flag, not permission.**
If you cannot find a first-party source documenting how a control works on a given surface, note the gap explicitly in your team's compatibility documentation. Do not infer that a control works the same way on that surface as it does on a documented surface.

**Default 2: Design for conservative assumptions about context availability.**
For any surface without explicit context window documentation, design as though context is limited. Keep instruction files short (under 200 lines), skills focused (under 500 lines or 5,000 tokens), and task prompts specific. This is safe for all surfaces and prevents context budget problems on surfaces where you do not know the ceiling.

**Default 3: Use the most restrictive documented permission model for governance-critical workflows.**
For workflows where policy enforcement is required, use the most conservative permission model available on the surface — plan mode in Claude, required-review PR branches in GitHub, preToolUse deny hooks where applicable. Do not rely on behavioral instructions in an instruction file as the primary enforcement mechanism; these can be lost to compaction or overridden by later instructions.

**Default 4: Validate, do not infer.**
For any cross-tool artifact behavior, validate empirically before relying on it for critical workflows. The validation technique from L12 — adding a distinctive test instruction and confirming it appears in outputs — is the safest approach until documentation resolves the cross-tool question.

**Default 5: Document your knowledge frontier explicitly.**
When you discover that a behavior is not documented, write it down. A `KNOWLEDGE_GAPS.md` in your team's agentic workflow documentation is a low-cost, high-value artifact. It makes the unknown knowable to teammates, prevents the same research from being repeated, and creates a maintenance target: when documentation improves, the gap closes and you update the file.

## A concrete example

**Scenario: a team designing a governance policy that must work on both GitHub and Claude**

A team wants to ensure all agent-produced database migrations go through a review checklist before merge. They want this policy to apply whether the developer is using GitHub cloud agent or Claude Code locally.

**Known documentation:**
- GitHub: `preToolUse` hook can intercept and deny tool calls [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md). PR required-review can gate merge. CodeQL scans PRs automatically [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md).
- Claude: Protected paths can prevent writes to specific directories [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md). Plan mode requires approval before execution. `postToolUse` hooks can log file writes and trigger checklist verification [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md).

**Documented gaps:**
- GitHub: No documented way to apply a preToolUse hook in the cloud agent that enforces a migration checklist during the iteration phase without also blocking all file writes.
- Claude: Protected paths prevent writes but do not enforce content review; the checklist must be surfaced through a different mechanism.
- Cross-surface: No published specification for cross-tool audit log format that works on both.

**Safe operating design:**

```markdown
# KNOWLEDGE_GAPS.md — Database Migration Governance

## What we know
- GitHub: preToolUse hook can block database tool calls; PR review gates merge
- Claude: protected path prevents accidental migration writes; plan mode requires approval

## What we don't know
- GitHub cloud agent: cannot confirm whether preToolUse hook applies specifically 
  during the agent's iteration phase vs. all tool calls (may block more than intended)
- Cross-surface: no shared audit log format; GitHub log is PR session link; 
  Claude log is hook output

## Current safe defaults
- GitHub: require-review on db/migrations/** branch protection (conservative)
- Claude: db/migrations/** is a protected path; all migration work in plan mode
- Both: migration review checklist added to copilot-instructions.md AND CLAUDE.md 
  (behavioral, not enforcement — backup only)
- Gap note: this checklist is advisory on both surfaces; the primary enforcement 
  is the PR review requirement on GitHub and plan-mode approval on Claude

## What would improve this
- GitHub publishing per-phase hook capability documentation
- A cross-tool audit log standard (may come through Agent Skills spec evolution)
```

This is governance designed around honest knowledge gaps. The primary controls are the strongest available documented controls per surface. The behavioral instruction is clearly labeled as advisory, not enforcement. The gaps are written down and will be updated when documentation improves.

## Key points

- Documentation gaps are risk states, not permission states; operating through them requires making the gaps explicit rather than assuming the best-case interpretation
- Known gaps in the research: GitHub cloud agent context ceiling is unpublished; no cross-tool compatibility matrix exists; GitHub subagent phase semantics outside VS Code are thin
- C9 (intentional incompatibility hypothesis) is speculative — treat it as a planning assumption about convergence timelines, not as a documented fact
- Safe operating defaults: conservative context assumptions, strongest available permission model, empirical validation over documented inference, explicit gap documentation
- `KNOWLEDGE_GAPS.md` is a low-cost, high-value team artifact that converts implicit uncertainty into a maintained, closeable record

## Go deeper

- [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md) — Agent Skills specification: the open standard most likely to close the cross-tool compatibility documentation gap as it matures
- [S016](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S016-mcp-open-standard.md) — MCP: the other open standard that may provide cross-tool protocol normalization, particularly for tool availability and action semantics across surfaces
- [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md) — Claude memory: the most explicit documentation of startup loading mechanics in the research; the basis for the conservative context design defaults recommended here

---

*[← Previous: GitHub for Governance, Claude for Context Mechanics](./L13-github-for-governance-claude-for-context-mechanics.md)*

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