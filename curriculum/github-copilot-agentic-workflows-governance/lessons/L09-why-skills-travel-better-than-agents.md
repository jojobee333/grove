# Why Skills Travel Better Than Agents

**Module**: M05 · Portability Has Sharp Edges
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C5 - Skills are the strongest portability mechanism in the current ecosystem because they are backed by an open specification, while custom agents and instruction files are only partially portable across hosts

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