# Hooks, Permissions, and Audit Trails by Surface

**Module**: M03 · Governance Is a Control Plane
**Type**: applied
**Estimated time**: 30 minutes
**Claim**: C4 - Governance should be implemented with product-native controls, and those controls differ by host surface

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