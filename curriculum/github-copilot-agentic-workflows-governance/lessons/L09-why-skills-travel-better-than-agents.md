# Why Skills Travel Better Than Agents

**Module**: M05 · Portability Has Sharp Edges
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C5 — Skills are the strongest portability mechanism in the current ecosystem because they are backed by an open specification, while custom agents and instruction files are only partially portable across hosts

---

## The core idea

Portability across GitHub Copilot, VS Code, and Claude Code is real, but it is not uniform. Some artifact types travel well between hosts; others silently acquire different semantics when they cross a boundary. Understanding which is which prevents the mistake of treating a file that is recognized across tools as one that behaves identically across tools.

Skills are the strongest portability story in the current ecosystem for two concrete reasons: they are backed by an open standard, and their purpose is narrow enough that a clear contract can be specified and honored across runtimes.

**Open specification.** The Agent Skills specification at agentskills.io defines the skill directory structure, the required and optional frontmatter fields, and the progressive-disclosure loading model [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md). This specification exists independently of any single vendor's runtime. It defines `name` and `description` as required fields, `license`, `compatibility`, `metadata`, and experimental `allowed-tools` as optional fields, and makes progressive disclosure (metadata → `SKILL.md` → resources) the normative loading model. Any tool that implements this spec will discover and load skills the same way.

**Explicit multi-surface support.** GitHub's documentation explicitly states that skills work across cloud agent, Copilot CLI, and agent mode in VS Code [S009](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S009-github-agent-skills.md). It lists three supported project directory locations: `.github/skills/`, `.claude/skills/`, and `.agents/skills/`. VS Code's own documentation presents skills as "an open standard" intended for cross-surface reuse [S003](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S003-vscode-agent-skills.md). The portability claim is not an inference — both vendors document it directly.

> **Caveat**: Portability here means artifact reuse and broad compatibility, not guaranteed identical runtime semantics or tool behavior. A skill whose `SKILL.md` references a specific local script, assumes a particular tool is available, or invokes host-specific commands will behave differently across environments even if the file is discovered and loaded correctly. The skill directory structure and frontmatter travel well; tool and script dependencies need explicit validation per host.

## Why custom agents and instruction files are only partially portable

**Custom agents.** VS Code stores custom agents as `.agent.md` files in `.github/agents/` or `.agents/`. Claude stores its agents in `.claude/agents/`. VS Code's documentation notes that Claude-format agent files are detected and can be mapped across VS Code and Claude Code [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md). That cross-compatibility is real and useful — but "detected and mapped" is not the same as "fully semantically equivalent." Agent frontmatter fields like `disable-model-invocation`, `agents` (for subagent control), and `user-invocable` are VS Code-specific features documented for VS Code agents. Not all of them have documented equivalents in Claude's agent format. The persona and broad tool policy may travel; the specific property support does not.

**Instruction files.** Instruction files carry durable rules that often have value across tools: coding standards, commit format conventions, security requirements. But the mechanism and precedence differ significantly by host. VS Code's personal/repository/organization priority hierarchy, GitHub's nearest-file precedence for `AGENTS.md`, and Claude's `CLAUDE.md` loading model all handle instruction precedence differently [S005](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S005-vscode-custom-instructions.md). A rule embedded in a shared instruction file may be applied with different priority, scope, or frequency depending on the host. The content travels; the semantics of how and when it applies may not.

## MCP as a complementary portability mechanism

The Model Context Protocol provides an open standard for connecting AI systems to external data sources, tools, and workflows [S016](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S016-mcp-introduction.md). MCP's portability contribution is at a different layer from skills: where skills package workflow capability, MCP standardizes how tools and context are exposed to agents. Both contribute to a cross-tool operating model.

MCP is explicitly designed to reduce integration complexity — instead of writing host-specific connectors for each tool, a single MCP server definition can be consumed by any MCP-compatible client. GitHub, VS Code, and Claude Code are all documented as supporting MCP. This makes MCP a useful portability target for tool integration: if a workflow depends on a custom tool (a code linter, a schema validator, a documentation generator), exposing it as an MCP server means any MCP-compatible host can use it without host-specific integration code.

The combined portability model for a cross-surface workflow:
- **Skills** carry workflow procedure, checklists, and reference material
- **MCP servers** carry tool and data integrations
- **Instruction files** carry durable standards (with per-host semantics caveats)
- **Agent definitions** carry role concept and broad persona (with per-host property support caveats)

## A concrete example

**Example 1 — the same skill used across three surfaces**

Imagine you have built a `code-review` skill for consistent code review behavior. Its structure:

```
.github/skills/
  code-review/
    SKILL.md                  # review procedure, ~120 lines
    security-checklist.md     # referenced from SKILL.md
    performance-notes.md      # referenced from SKILL.md
```

The `SKILL.md` frontmatter:

```yaml
---
name: code-review
description: "Structured code review against security, performance, and test coverage criteria"
compatibility:
  - github-cloud-agent
  - vscode-agent-mode
  - copilot-cli
---
```

With this structure and frontmatter, the skill is discoverable by GitHub cloud agent (`.github/skills/`), VS Code agent mode (same location), and Copilot CLI (same location). The `SKILL.md` procedure, the security checklist, and the performance notes are all portable as content. The review procedure runs the same way regardless of which tool loads it, because the procedure is in Markdown and does not assume tool-specific capabilities.

What would break portability: if `SKILL.md` included a step like `Run the VS Code code lens to identify test coverage gaps`, that step is only meaningful in VS Code. Or if a resource file referenced `~/.copilot/templates/`, that path does not exist in a GitHub Actions environment. Portable skills write their procedures in terms of what the agent should do conceptually, not in terms of how a specific host UI surfaces the capability.

**Example 2 — comparing a skill and an agent for the same job**

You want both a reusable code review capability and a persistent "security reviewer" persona. The natural temptation is to build one artifact: a custom agent called `security-reviewer` that contains the code review procedure.

The portability consequence:

| | Custom agent | Skill |
|---|---|---|
| Specification | Host-specific `.agent.md` format | Open Agent Skills spec |
| Property support | Varies by host | Standardized frontmatter fields |
| Loading | On agent selection | On skill activation |
| Reuse across surfaces | Partial (VS Code can read Claude-format, not vice versa fully) | Full (same spec across GitHub, VS Code, CLI) |
| Can be invoked from a prompt file | Yes, as agent mode | Yes, as skill activation |
| Carries persistent persona | Yes | No |

The right design: put the code review procedure in a skill; put the "security reviewer" persona (tool restrictions, model preferences, role framing) in an agent that references the skill. The skill travels. The agent carries the role and delegates to the skill for the procedure [S003](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S003-vscode-agent-skills.md) [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md).

## Key points

- Skills are the strongest portability artifact because they are backed by the open Agent Skills specification and explicitly documented as cross-surface by both GitHub and Microsoft
- MCP complements skill portability at the tool and data integration layer — skills carry procedure; MCP carries tool access
- Custom agents and instruction files are partially portable: the content and broad concept travel, but specific property support, precedence rules, and loading semantics are host-dependent
- Portable skills are procedure-focused and tool-agnostic in their language — they describe what the agent should do, not how a specific host UI surfaces it
- The strongest portability strategy for a cross-surface workflow: skills + MCP for shared capability; per-host agent definitions and instruction files for role and policy

## Go deeper

- [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md) — Agent Skills specification: the non-vendor-specific standard defining directory structure, frontmatter schema, progressive disclosure, and the 5,000-token/500-line skill body size recommendations
- [S009](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S009-github-agent-skills.md) — GitHub agent skills: GitHub's explicit documentation that skills work across cloud agent, Copilot CLI, and VS Code agent mode with three supported directory locations
- [S016](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S016-mcp-introduction.md) — MCP introduction: how the open protocol standard for tool and context access complements skill portability at a different integration layer

---

*[← Previous: Parallel Review Without Role Contamination](./L08-parallel-review-without-role-contamination.md)* · *[Next lesson: Structural Portability vs Behavioral Portability →](./L10-structural-portability-vs-behavioral-portability.md)*

---

## The core idea

If you want reusable workflow artifacts across GitHub Copilot, VS Code, and related tooling, skills are the cleanest story in the evidence. They have an explicit specification, a progressive loading model, and a clearer contract around what the artifact is supposed to contain. Agents and instruction files can sometimes be reused too, but their runtime meaning depends more heavily on the host product. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S003-vscode-agent-skills.md`, `S009-github-agent-skills.md`, `S016-mcp-introduction.md`, `S019-agentskills-specification.md`, `S008-github-custom-agents.md`.

## Why it matters

Portability reduces duplicated maintenance, but only if the artifact is stable enough to carry across environments. Skills are well-suited to that because they package workflow capability, references, and structured instructions without pretending to define the whole runtime environment. That narrower job is exactly why they port better.

## A concrete example

Compare these three artifact types:

| Artifact | What ports well | What tends to drift |
|---|---|---|
| Skill | Instructions, resources, phased workflow logic | Invocation rules, host-specific tooling integration |
| Custom agent | Role idea and some metadata | Tool policy, model behavior, property support |
| Instruction file | High-level conventions | Precedence, scope, load order, file semantics |

This is the practical lesson: the narrower and more spec-backed the artifact, the safer it is to share.

MCP belongs in the same conversation. It is not the same thing as a skill, but it supports portability through an open protocol for tools and context access. The research supports treating skills plus MCP as the strongest common denominator across surfaces. Source trail: `S016-mcp-introduction.md`, `S019-agentskills-specification.md`.

That does not mean "portable" equals "identical." It means the artifact is worth sharing first and validating second.

## Key points

- Skills port better than agents because they are narrower in responsibility and stronger in specification
- MCP improves cross-tool interoperability at the tool and context layer, not by making all artifacts semantically identical
- Shared artifacts still need host-specific validation before teams rely on them in production workflows

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S009-github-agent-skills.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S016-mcp-introduction.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md`

---

*[<- Previous: Parallel Review Without Role Contamination](./L08-parallel-review-without-role-contamination.md)* · *[Next lesson: Structural Portability vs Behavioral Portability ->](./L10-structural-portability-vs-behavioral-portability.md)*