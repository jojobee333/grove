# Hooks, Permissions, and Audit Trails by Surface

**Module**: M03 · Governance Is a Control Plane
**Type**: applied
**Estimated time**: 30 minutes
**Claim**: C4 — Governance should be implemented with product-native controls, and those controls differ materially by host surface

---

## The situation

L05 established that prompts cannot replace enforcement. This lesson is about where to find the enforcement levers on each host, what they actually do, and how to map your governance requirements to the controls that genuinely exist rather than the ones you wish existed. The practical challenge is that GitHub, VS Code, and Claude Code expose materially different control surfaces \u2014 same policy goal, different implementation primitives.

The evidence strongly supports C4 [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md) [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md) [S018](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md) [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md) [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md) [S006](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md) but the evidence also shows the control surfaces are non-uniform. A governance design that works perfectly on GitHub may have no direct equivalent on Claude Code, and vice versa. Building a cross-surface workflow requires explicit mapping of which controls are available where, not assuming the same levers exist everywhere.

> **Caveat**: The exact control set differs by host environment. GitHub has the most explicit documentation around access management, branch governance, and PR-centric traceability. Claude has the most granular permission mode configuration. VS Code exposes the clearest real-time session-level permission controls. None is a superset of the others.

## GitHub: repository-centric governance controls

GitHub's governance model is built around the repository and the pull-request workflow. The cloud-agent documentation and responsible-use page together document a layered set of controls [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md) [S018](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md):

**Access management.** Cloud agent is disabled by default for Business and Enterprise plans. An administrator must explicitly enable it at the organization or enterprise level. Individual repositories can be opted out even when the feature is enabled for the user's account. This means the first layer of governance is organizational: the feature does not exist for a user until an admin decides it does.

**Action-level hooks.** GitHub documents hooks that run synchronously at four event points: session start, prompt received, tool use (before and after), and session stop [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md). The `preToolUse` hook is the most powerful: it can inspect the tool name and parameters, run custom validation logic, and return a non-zero exit code to deny the action. The hook configuration is a JSON file that specifies shell commands, platform-specific variants (bash vs. powershell), environment variables, and timeout settings.

A minimal hook configuration that logs all tool calls and denies writes to a sensitive path:

```json
{
  "hooks": {
    "preToolUse": {
      "commands": [
        {
          "bash": "echo \"TOOL: $TOOL_NAME\" >> /tmp/agent-audit.log && [[ \"$TOOL_NAME\" =~ write ]] && [[ \"$TOOL_INPUT\" =~ infra/ ]] && exit 1 || exit 0",
          "powershell": "Add-Content -Path audit.log -Value \"TOOL: $env:TOOL_NAME\"; if ($env:TOOL_NAME -match 'write' -and $env:TOOL_INPUT -match 'infra/') { exit 1 } else { exit 0 }",
          "timeout": 5
        }
      ]
    }
  }
}
```

GitHub warns that hooks run synchronously and should generally complete in under five seconds to avoid blocking agent execution [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md). Expensive validation logic that calls external APIs or runs long checks should be designed with this latency constraint in mind.

**PR-based traceability.** The cloud agent runs in a GitHub Actions-powered environment and is limited to one branch and one pull request per task [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md). Session-log links are embedded in commits, making it possible to trace any agent-produced commit back to the specific session that produced it. This is audit by design: the session is recorded even if no explicit logging hook is configured. GitHub also documents signed commits, hidden-character filtering, CodeQL scanning, secret scanning, and dependency analysis as security measures for cloud-agent output [S011](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S011-github-responsible-use-cloud-agent.md).

## Claude Code: local autonomy controls

Claude's governance surface is oriented around local execution, not repository-level policy. The primary mechanism is the permission mode system [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md).

**Permission modes** control how much autonomy the agent has during a session:

| Mode | What it allows | When to use |
|---|---|---|
| `plan` | Research and propose; no edits without approval | High-stakes sessions where every change needs review |
| `acceptEdits` | Apply edits automatically; prompt for shell commands | Standard development sessions |
| `auto` | Full autonomous operation within a classifier | CI pipelines and well-scoped automation |
| `dontAsk` | Suppress confirmations for specific tool categories | Isolated environments with no sensitive resources |
| `bypassPermissions` | Full access without permission prompts | Locked-down automation or trusted sandboxes |

The `auto` mode is important to understand precisely: it uses a classifier to decide whether an action requires approval. If a session in `auto` mode has three consecutive actions denied or twenty total denials, Claude pauses and asks the user how to proceed. These are explicit documented thresholds, not approximate behaviors [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md).

**Protected paths** are always enforced regardless of permission mode and regardless of what `CLAUDE.md` says. A file added to Claude's protected-paths configuration cannot be written freely by any agent session in any permission mode. This is the strongest local enforcement control: it is declarative, unconditional, and completely outside the prompt body.

**Managed settings vs. behavioral guidance.** Anthropic explicitly distinguishes between managed settings (enforcement) and `CLAUDE.md` (guidance) [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md). Managed settings are the enforcement layer. A `CLAUDE.md` file that says "treat this file as read-only" is guidance, not enforcement. The managed setting that adds the file to the protected-paths list is enforcement.

## VS Code: session-level permission visibility

VS Code's governance surface is oriented around real-time session control [S006](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md). The three permission levels map to different degrees of human oversight:

- **Default Approvals**: the agent requests approval before executing actions. This is the most observable mode \u2014 the developer sees each action before it happens.
- **Bypass Approvals**: the agent acts without per-action approval prompts. Useful for well-understood workflows but reduces oversight.
- **Autopilot (Preview)**: full autonomous execution. Appropriate only for tasks and environments where the risk of unsupervised action is acceptable.

VS Code also provides session visibility through context monitoring [S022](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S022-vscode-manage-context.md). The live token display shows what is in the current context, which is relevant for governance: an auditor reviewing a session can see what instructions and skills were active during a decision, not just what output was produced.

## Mapping governance requirements to controls

Use this table to map a governance requirement to the right enforcement surface:

| Governance requirement | Best GitHub control | Best Claude control | Best VS Code control |
|---|---|---|---|
| Restrict who can use the agent at all | Admin access management (S018) | Managed settings at enterprise level | Workspace or product permissions |
| Require human approval before risky actions | PR review requirement + hooks | `plan` mode or `acceptEdits` mode | Default Approvals permission level |
| Prevent writes to sensitive files/paths | Branch protection + `preToolUse` hook | Protected paths configuration | Default Approvals + custom agent tool restrictions |
| Log all agent actions for audit | `postToolUse` hook + session log in commits | Explicit logging hook | Session visibility + context log |
| Enforce security scanning on output | CodeQL + secret scanning (automatic) | Not directly documented | Not directly documented |
| Limit agent to one branch per task | Cloud agent built-in constraint | n/a (local; no branch model) | Per-session scope |

## A concrete example

**Scenario: multi-surface governance for a sensitive refactoring workflow**

The workflow: an agent refactors authentication code across a production codebase. It runs locally in Claude Code during development and produces commits that are reviewed and merged via GitHub cloud agent.

**Local phase (Claude Code):**
```bash
# Use plan mode during exploration to require approval before any edit
claude --permission-mode plan

# Protected paths: never allow writes to .env, config/secrets/, or deployment/
# (configured in managed settings, not in CLAUDE.md)
```

```markdown
# CLAUDE.md (behavioral guidance only, not enforcement)
When working in the auth subsystem, treat all token-related functions as high-risk.
Always propose changes as a diff before applying them.
Flag any change that touches session expiry or JWT signing.
```

**Cloud phase (GitHub):**
```json
{
  "hooks": {
    "preToolUse": {
      "commands": [{
        "bash": "if [[ \"$TOOL_INPUT\" =~ \"(auth|jwt|session|token)\" ]] && [[ \"$TOOL_NAME\" == \"write_file\" ]]; then echo 'AUTH_WRITE_INTERCEPTED' >> audit.log; fi",
        "timeout": 3
      }]
    }
  }
}
```

The local phase relies on `plan` mode (enforcement) plus `CLAUDE.md` guidance. The cloud phase relies on hooks (enforcement) plus PR review requirements. Both phases carry the same policy intent: treat auth changes as high-risk and require human review. The enforcement mechanisms are host-appropriate.

## Key points

- GitHub's governance surface centers on access management, PR-centric traceability, and synchronous hooks that can approve or deny individual tool calls
- Claude's governance surface centers on permission modes (plan → auto → bypass) and protected paths \u2014 product-native controls that operate independently of `CLAUDE.md` content
- VS Code's governance surface centers on session-level permission levels and real-time context visibility
- The same policy goal requires different enforcement primitives on each surface \u2014 design governance per host, not as a single cross-tool prompt
- A `preToolUse` hook is the highest-control GitHub enforcement point; a protected-path configuration is the highest-control Claude enforcement point; both are completely outside the prompt body

## Go deeper

- [S017](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md) — GitHub hooks: the full event model, configuration schema, platform variants, and the 5-second latency guidance
- [S014](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S014-claude-permission-modes.md) — Claude permission modes: the five modes, their behavioral thresholds, protected-path enforcement, and auto-mode classifier behavior
- [S018](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md) — GitHub access management: admin-level enablement, repository opt-out, and the default-disabled behavior for Business and Enterprise plans

---

*[← Previous: Why Prompts Cannot Enforce Policy](./L05-why-prompts-cannot-enforce-policy.md)* · *[Next lesson: Coordinator-Worker Workflows and Phase Boundaries →](./L07-coordinator-worker-workflows-and-phase-boundaries.md)*

---

## The core idea

The workflow question is not only "what policies do we want?" It is also "where can this platform enforce them?" The source set shows that GitHub, VS Code, and Claude each expose different control surfaces. GitHub is strongest on repository governance, traceability, hooks, and admin enablement. Claude is strongest on permission modes and protected paths. VS Code exposes session-level permissions and debugging visibility. Practical governance means mapping your risk to the surface that can actually constrain it. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md`, `S011-github-responsible-use-cloud-agent.md`, `S014-claude-permission-modes.md`, `S017-github-hooks.md`, `S018-github-cloud-agent-access-management.md`.

## Why it matters

Teams often standardize policy language first and only later discover that the platforms do not expose the same enforcement levers. That creates false symmetry. A rule that is easy to enforce in one host may only be advisory in another. If you know the surfaces up front, you can design the workflow realistically instead of pretending every environment can do the same thing.

## A concrete example

Use this comparison when planning a governed build or review workflow:

| Need | GitHub-oriented control | VS Code-oriented control | Claude-oriented control |
|---|---|---|---|
| Restrict who can use agent features | Admin access management | Workspace or product permissions | Managed settings and permission modes |
| Gate risky actions | Hooks, PR review, branch rules | Permission prompts, human review in session | Permission mode approval and protected paths |
| Preserve auditability | PRs, session history, repository artifacts | Session logs and IDE visibility | Session logs and explicit permission prompts |
| Keep behavior aligned | Repo instructions, custom agents, skills | Instructions, prompts, agents, skills | CLAUDE.md, subagents, local settings |

Now imagine a workflow that changes infrastructure files.

On GitHub, the safest route is branch-bound execution plus review and hooks. In a local assistant, the safer route is permission prompts and protected paths. The policy may read the same in both places, but the enforcement mechanism changes. Source trail: `S017-github-hooks.md`, `S018-github-cloud-agent-access-management.md`, `S014-claude-permission-modes.md`.

The operational takeaway is straightforward: define policy once, but implement it per host.

## Key points

- Governance controls differ materially by surface even when the policy goal is the same
- GitHub emphasizes repository-level governance and traceability; Claude emphasizes local action control; VS Code exposes session-level permissions and visibility
- Cross-tool workflows should share policy intent, not assume identical enforcement primitives

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S017-github-hooks.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S018-github-cloud-agent-access-management.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md`

---

*[<- Previous: Why Prompts Cannot Enforce Policy](./L05-why-prompts-cannot-enforce-policy.md)* · *[Next lesson: Coordinator-Worker Workflows and Phase Boundaries ->](./L07-coordinator-worker-workflows-and-phase-boundaries.md)*