# Why Prompts Cannot Enforce Policy

**Module**: M03 · Governance Is a Control Plane
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C4 — Governance must be designed as a layered enforcement system, because prompts and instructions influence behavior but do not replace permissions, hooks, admin policy, or auditability

---

## The core idea

Prompts and instruction files change how an agent behaves. They do not enforce behavior. That distinction is fundamental to secure agentic workflow design, and the research supports it with evidence from all three primary host environments.

GitHub's responsible-use documentation is the clearest statement of this: the cloud agent can research, plan, edit code, and open pull requests, but users retain responsibility for review and validation [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md). GitHub's governance surface includes access management, branch permissions, signed commits, session-log links in commits, CodeQL scanning, secret scanning, dependency analysis, GitHub Actions review gates, and hooks that can approve or deny tool executions [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md). These controls sit outside the prompt body. A policy written inside a prompt file that says "never push directly to main" is behavioral guidance. A branch protection rule that prevents direct pushes is enforcement.

Claude Code's documentation draws the same line from the other direction. Anthropic distinguishes between `CLAUDE.md` (behavioral guidance) and managed settings (enforcement mechanisms) [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md). Permission modes — `plan`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions` — are product-native controls that change what the agent can do, not what it is told to do [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md). Protected paths are always enforced regardless of instructions. Auto-mode uses a classifier with documented block and fallback thresholds. These are enforcement mechanisms; `CLAUDE.md` is not.

VS Code surfaces this distinction through its permission level model: `Default Approvals`, `Bypass Approvals`, and `Autopilot (Preview)` are product-native permission configurations [S006](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md). The cloud-agent access management documentation makes the enforcement layer even more explicit: for Business and Enterprise plans, cloud agent is disabled by default and must be explicitly enabled by an administrator [S018](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md). No amount of prompt wording makes the feature available to a user in an organization where an admin has not enabled it.

> **Caveat**: The exact control set differs by host environment. GitHub offers the most explicit documentation around access management and review requirements; Claude offers the most granular permission mode configuration; VS Code exposes the most visible session-level permission controls. The consistent finding across all three is that controls outside the prompt body are necessary \u2014 the specific mechanisms are host-dependent and should be designed per surface.

## Why it matters

The practical risk of treating prompts as the primary governance mechanism is not that prompts are useless \u2014 they genuinely improve behavior. The risk is that prompt-only governance creates a false sense of security that leads teams to skip implementing real controls. When something goes wrong, the failure looks like model noncompliance: the agent did something the prompt said not to do. But the real failure is design: the team relied on compliance instead of constraint.

Consider what an instruction like "never modify production deployment files" actually does in different governance designs:

**Prompt-only governance:**
- The instruction is in `CLAUDE.md` or a custom agent definition.
- Whether the agent honors it depends on whether the instruction is still in context (has it been compacted away?), whether the model interprets the instruction as applying to the current situation, and whether there is any conflict with another instruction.
- The failure mode is silent: the agent modifies the deployment file, the action completes, the developer does not immediately notice.

**Layered governance:**
- The instruction is in the behavioral layer (as above).
- Protected paths are configured to prevent write access to deployment files regardless of instruction state.
- A `preToolUse` hook inspects any tool calls that would affect deployment paths and denies them.
- A session log or PR record captures the attempt.
- The failure mode is auditable: the deny event is recorded, the action fails visibly, and the team can inspect why.

The layered design is strictly more reliable. The behavioral instruction contributes to quality. The product-native controls provide enforcement. Neither replaces the other.

## Understanding the control categories

The research identifies four distinct categories of governance control that sit outside the prompt body:

**Access and enablement controls.** These determine whether a feature or agent capability is available at all. GitHub's cloud-agent access management is admin-level and org-scoped [S018](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md). Claude's permission modes determine what actions a session can take autonomously. VS Code's permission levels control whether the agent requests approval before acting. These controls operate before any prompt is evaluated.

**Action-level hooks.** GitHub documents hooks that can run at session, prompt, tool, and stop events [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md). The `preToolUse` hook is the highest-control point because it can inspect and deny individual tool calls before they execute. A `postToolUse` hook can log completed actions. These run synchronously (which has latency cost) but provide the most granular interception capability. Claude's permission modes provide an analogous mechanism at the model level: `plan` mode requires explicit approval before any edit is made; `auto` mode uses a classifier with explicit block and fallback thresholds [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md).

**Protected resources.** Claude's protected paths are never freely writable regardless of instruction content or permission mode [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md). GitHub's branch protection rules create a similar hard boundary: even an agent with write access cannot push directly to a protected branch. These are declarative constraints that do not depend on prompt state or model interpretation.

**Audit and traceability.** GitHub documents signed commits, session-log links embedded in commit messages, CodeQL scanning, secret scanning, and dependency analysis as security measures [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md). Traceability is governance, not just convenience: when you can see exactly what the agent did and when, you can detect policy violations after the fact and investigate how they happened.

## A concrete example

**Scenario: a workflow that edits sensitive infrastructure files**

You are designing a workflow that allows an agent to update Kubernetes deployment configurations based on approved change requests. The policy requirements are:

1. Only users with repository write access may trigger the workflow.
2. Deployment file edits must be made on a feature branch, not on main.
3. All deployment file modifications must be reviewed by a human before merge.
4. An audit trail of every attempted and completed action must exist.
5. Secret values must never appear in generated output.

Governance design that meets these requirements:

```yaml
# GitHub cloud agent configuration (illustrative)
access:
  # Requirement 1: handled by GitHub access management - admin-enabled only
  # Requirement 5: handled by GitHub's built-in secret scanning

branch_policy:
  # Requirement 2: branch protection rule on main, not a prompt instruction
  protected_branches: [main, production]
  require_feature_branch: true

hooks:
  preToolUse:
    # Requirement 3 partial: deny tool calls that would write to deployment files
    # without a PR review requirement in place
    shell: |
      if echo "$TOOL_CALL" | grep -q "k8s/deployments"; then
        exit 1  # deny; force PR flow
      fi

  postToolUse:
    # Requirement 4: log every tool execution to audit trail
    shell: |
      echo "$(date) TOOL: $TOOL_NAME INPUT: $TOOL_INPUT" >> audit.log
```

The corresponding `CLAUDE.md` or agent instruction:

```markdown
When modifying deployment files, always create a feature branch named
`agent/deploy-[ticket-id]`. Never propose changes to `main` directly.
Deployment files are under `k8s/deployments/`. Treat them as high-risk.
```

The instruction adds clarity and helps the agent make good decisions. The hooks, branch rules, and access controls enforce the actual policy. If the instruction is absent, the governance still holds. If only the instruction is present, the governance is entirely dependent on the model honoring it consistently \u2014 which is not a sound foundation for a sensitive workflow.

## Key points

- Prompts and instructions improve behavior; they do not enforce it \u2014 enforcement requires permissions, hooks, protected paths, admin controls, and audit mechanisms
- The distinction between behavioral guidance (in the prompt body) and enforcement (in product-native controls) is explicitly drawn in GitHub's, Claude's, and VS Code's documentation
- Four governance categories sit outside the prompt: access and enablement controls, action-level hooks, protected resources, and audit and traceability mechanisms
- Prompt-only governance creates silent failures when the model deviates; layered governance creates auditable, visible failures that can be inspected and remediated
- The specific enforcement mechanisms differ by host \u2014 GitHub is strongest on access management and branch governance; Claude is strongest on permission modes and protected paths; VS Code exposes the clearest session-level permission controls

## Go deeper

- [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md) — GitHub hooks: `preToolUse`, `postToolUse`, session and stop events; the strongest per-action control surface documented in the research
- [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md) — Claude permission modes: product-native controls from plan-and-approve through full automation, including protected paths and auto-mode classifier thresholds
- [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md) — GitHub responsible use: the strongest single-source statement of where governance responsibility lies and the full set of security measures GitHub documents for cloud agent

---

*[← Previous: Compaction, Reinjection, and Subagent Isolation](./L04-compaction-reinjection-and-subagent-isolation.md)* · *[Next lesson: Hooks, Permissions, and Audit Trails by Surface →](./L06-hooks-permissions-and-audit-trails-by-surface.md)*

---

## The core idea

Prompts and instructions shape behavior. They do not enforce it. This distinction is one of the clearest governance findings in the research. GitHub docs emphasize review responsibility, scanning, branch constraints, and access management. Claude docs distinguish behavior guidance from permission modes and managed settings. VS Code surfaces permission levels and session visibility. Across all three, the control plane lives outside the prose you give the model. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md`, `S011-github-responsible-use-cloud-agent.md`, `S013-claude-memory.md`, `S014-claude-permission-modes.md`, `S018-github-cloud-agent-access-management.md`.

## Why it matters

If a team relies on prompts alone for safety, they are depending on compliance instead of constraint. That is fragile. A well-written instruction can reduce mistakes, but it cannot block a tool, protect a path, require approval, or create a durable audit trail by itself. Governance therefore has to be layered: guidance in text, enforcement in product controls.

This is especially important in workflows that edit code, handle credentials, or run across repositories. The more consequential the action, the less acceptable it is to treat prompt wording as the only guardrail.

## A concrete example

Consider the policy: "Never modify production deployment files without approval."

Weak implementation:

- write the rule in instructions
- hope the agent remembers and obeys it

Layered implementation:

- instructions explain the rule and why it exists
- protected paths or permission modes restrict direct edits
- hooks or review gates require approval before the action proceeds
- session logs or PR records preserve traceability afterward

The second design matches the product-native controls documented in the source set. It also makes failure visible: if the guardrail triggers, you can inspect the event. If the rule existed only in a prompt, the failure often looks like silent noncompliance.

One operational rule follows from this: write prompts for clarity, but design governance as if the prompt will eventually be ignored.

## Key points

- Prompts and instructions influence behavior; they do not create enforceable control boundaries on their own
- Governance should combine textual guidance with permissions, approvals, hooks, and audit mechanisms
- High-risk workflows should be designed around constraint, not hopeful compliance

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md`

---

*[<- Previous: Compaction, Reinjection, and Subagent Isolation](./L04-compaction-reinjection-and-subagent-isolation.md)* · *[Next lesson: Hooks, Permissions, and Audit Trails by Surface ->](./L06-hooks-permissions-and-audit-trails-by-surface.md)*