# GitHub for Governance, Claude for Context Mechanics

**Module**: M07 · Surface Strategy and Open Limits
**Type**: applied
**Estimated time**: 30 minutes
**Claim**: C7 — GitHub Copilot and Claude Code emphasize different parts of the agentic workflow problem, so a cross-tool operating model should not assume that one vendor's strongest documentation generalizes cleanly to the other

---

## The situation

C7 is a moderate-confidence claim supported by seven sources, making this one of the best-evidenced lessons in the course despite the confidence qualifier [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md) [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md) [S018](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md) [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md) [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md) [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md) [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md). The "moderate" confidence reflects that both ecosystems are evolving and have more overlap than their documentation emphases suggest \u2014 not that the claim is speculative.

The key insight: GitHub's documentation is most thorough where the workflow involves organizational policy, repository governance, and PR-centric collaboration. Claude's documentation is most thorough where the workflow involves local context management, autonomous execution control, and session-level mechanics. This is not a claim that GitHub cannot manage context or that Claude cannot support governance \u2014 it is a claim about where each vendor's documentation gives you the most useful reasoning tools.

> **Caveat**: Both ecosystems are broad and continue to evolve. There is real overlap through shared standards (Agent Skills, MCP) and compatible file conventions. GitHub supports skills, MCP, and custom agents, all of which have cross-surface implications. Claude supports hooks, permission modes, and subagents, which have governance implications. The division described here is about documentation emphasis and analytical strength, not about hard product limits.

## GitHub's documented strengths

**Access and enablement policy.** GitHub's cloud-agent access management is the most explicitly documented administrative control in the research [S018](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md). The ability to disable the feature entirely for Business and Enterprise organizations by default, enable it at the organization level, and opt individual repositories out provides a genuine policy layer that exists before any agent session begins. No equivalent to this organization-level enable/disable control is documented for Claude Code in the research.

**Repository and branch governance.** GitHub's cloud agent is explicitly scoped to one repository per run and one branch per task, with exactly one pull request possible per task [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md). These are product-level constraints that enforce workflow boundaries without requiring prompt instruction. Branch protection rules, required reviews, and CI requirements then add additional policy at the merge gate. This is a governance model that is native to Git collaboration workflows.

**PR-centric traceability.** GitHub's responsible-use documentation describes session-log links embedded in commits, signed commits, and a set of security scanning capabilities (CodeQL, secret scanning, dependency analysis) that apply to agent-produced code automatically [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md). The PR is both the work product and the audit artifact — reviewers can trace any agent-produced change back to the session that produced it, inspect the session log, and make an informed review decision.

**Synchronous hooks as enforcement points.** The hooks system is GitHub's highest-granularity governance control: `preToolUse` hooks can deny individual tool calls before execution, `postToolUse` hooks can log and validate after execution, and session events can enforce entry and exit policies [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md). This is more granular than access management and more auditable than prompt instructions.

## Claude's documented strengths

**Explicit context-window mechanics.** Claude's context-window documentation is the most numerically specific in the research [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md). It documents what loads before the first prompt, what survives compaction, skill reinjection caps (5,000 tokens per skill, 25,000 tokens total), and how path-scoped rules reload after compaction. This makes it possible to design token-efficient workflows with precision: calculate expected startup context size, design skills to stay under the reinjection cap, and plan for what happens after compaction. GitHub's cloud agent documentation does not publish equivalent numerical context mechanics.

**Granular permission mode control.** Claude's five-mode permission system (plan, acceptEdits, auto, dontAsk, bypassPermissions) provides the most granular local autonomy control documented in the research [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md). The ability to switch between plan-and-approve and full autonomy on a per-session basis, combined with auto mode's documented classifier behavior and explicit fallback thresholds, supports sophisticated local governance without requiring centralized administrative policy.

**Subagent context isolation mechanics.** Claude's subagent documentation is explicit about context isolation as a design principle: subagents run in separate context windows, return only summaries to the parent, and are explicitly distinguished from agent teams that coordinate across sessions [S020](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S020-claude-custom-subagents.md). The built-in Explore and Plan subagents formalize phases of the workflow as named roles. This level of subagent-specific documentation gives Claude workflows precise tools for designing isolation boundaries.

**Instruction loading mechanics.** Anthropic's memory documentation distinguishes `CLAUDE.md` (behavioral guidance), auto memory (first 200 lines or 25 KB), managed settings (enforcement), and path-scoped rules with explicit reload behavior [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md). This makes it possible to reason precisely about what instructions are active at any point in a session, which is particularly important for governance: a rule you cannot verify is in context is a rule you cannot rely on.

## A concrete example

**Scenario: building a cross-surface workflow for a production database migration**

This is the kind of workflow where surface selection matters most: high-risk, governance-sensitive, and involving both collaborative review and local execution.

**Phase 1: Planning and assessment (local, Claude Code)**

Use Claude here because:
- Context budget is critical: the migration assessment will involve reading schema files, analyzing query patterns, and building a risk profile. Claude's explicit context-window mechanics let you design for this: use a subagent for schema exploration, keep the parent session focused on risk analysis.
- Permission mode: use `plan` mode during assessment so no migration scripts are generated without explicit approval.
- Instruction loading: `CLAUDE.md` holds migration risk assessment criteria (active from session start); schema-specific rules are path-scoped (load only when migration files are read).

```bash
# Start assessment session in plan mode
claude --permission-mode plan

# Subagent prompt for schema exploration
"Explore the database schema under db/schema/. 
Return: table names, foreign key dependencies, and estimated row counts.
Do NOT return full column definitions. Summary only."
```

**Phase 2: Implementation (local, Claude Code)**

Switch to `acceptEdits` mode: migration scripts are generated, each edit is reviewed before application. Protected paths ensure `db/seeds/` and `db/migrations/archived/` cannot be touched.

**Phase 3: Review and merge (GitHub cloud agent)**

Use GitHub here because:
- The migration script as a PR artifact gets CodeQL scanning and secret scanning automatically.
- A `preToolUse` hook can intercept any attempted direct database mutation and require it to go through the migration file.
- The PR review requirement ensures at least one human reviews the migration SQL before merge.
- The session log in the commit provides full traceability: who triggered the agent, what it did, what review was applied.

```json
{
  "hooks": {
    "preToolUse": {
      "commands": [{
        "bash": "if [[ \"$TOOL_NAME\" == 'execute_sql' ]]; then echo 'BLOCKED: Direct SQL requires migration file' && exit 1; fi",
        "timeout": 3
      }]
    }
  }
}
```

The same workflow, using each surface for what its documentation supports best. Local context management and permission control: Claude. Repository governance, traceability, and PR-based review: GitHub.

## The surface selection decision matrix

| Workflow requirement | Recommended surface | Primary reason |
|---|---|---|
| Organization-wide feature enablement policy | GitHub | Admin access management is explicitly documented and org-scoped |
| Per-session action approval and risk control | Claude | Permission modes provide granular, session-level control |
| PR-centric code review with full traceability | GitHub | Session logs, signed commits, scanning are native to the PR workflow |
| Context-sensitive long-session work | Claude | Explicit compaction and reinjection mechanics enable precise design |
| Multi-perspective parallel review | Either (VS Code subagents best documented) | VS Code's parallel-review pattern is the clearest documented precedent |
| Cross-surface reusable workflow library | Skills + MCP | Open specifications work on both surfaces |
| Per-action deny/log enforcement | GitHub (hooks) or Claude (plan mode + protected paths) | Different mechanisms, equivalent governance value |

## Key points

- GitHub's documented strength is organizational access policy, PR-centric traceability, and synchronous action hooks; Claude's documented strength is explicit context mechanics, granular permission modes, and subagent isolation control
- Surface selection is a workflow design decision, not a vendor loyalty choice \u2014 the right question is "which surface has the clearest documented controls for this requirement?"
- Cross-tool workflows should use GitHub-native controls for governance-heavy collaborative phases and Claude-native controls for context-heavy local orchestration phases
- Neither surface is a superset of the other; designing for both means accepting that some governance mechanisms are per-surface rather than unified
- C7 is moderate confidence because both ecosystems overlap and evolve; treat this as a practical heuristic for leveraging documented strengths, not as a permanent capability map

## Go deeper

- [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md) — GitHub cloud agent: the clearest single-source description of GitHub's cloud execution model, workflow limits, and governance surface
- [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md) — Claude context window: the most numerically specific context mechanics documentation in the research, including startup loading, compaction behavior, and skill reinjection caps
- [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md) — Claude permission modes: the full autonomy spectrum from plan-and-approve through bypass, with documented classifier thresholds and protected-path enforcement

---

*[← Previous: Repairing Cross-Tool Convention Drift](./L12-repairing-cross-tool-convention-drift.md)* · *[Next lesson: Working Safely Through Documentation Gaps →](./L14-working-safely-through-documentation-gaps.md)*

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