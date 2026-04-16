# AGENTS.md Is Not One Thing Everywhere

**Module**: M06 · Shared Names, Different Meanings
**Type**: debate
**Estimated time**: 25 minutes
**Claim**: C6 - Shared artifact names such as AGENTS.md do not provide reliable cross-tool semantic portability, so teams must validate how each host interprets the same file

---

## The core idea

One of the most important findings in the research is also one of the easiest to miss: shared filenames do not guarantee shared meaning. `AGENTS.md` is the clearest example. The source set shows overlapping conventions across VS Code, GitHub, and Claude, but not one canonical semantic model. That is why the contradiction remains unresolved at the filename level even though the broader portability question can be partially resolved. Source trail: `vault/research/github-copilot-agentic-workflows-governance/02-analysis/contradictions.md`, `01-sources/web/S005-vscode-custom-instructions.md`, `S010-github-repository-custom-instructions.md`, `S013-claude-memory.md`.

## Why it matters

Filename reuse creates false confidence because it feels standardized. A team may assume that because multiple tools recognize or mention a file called `AGENTS.md`, they can rely on one meaning. The research says otherwise. The same filename can participate in different precedence rules, different loading scopes, and different native behaviors.

## A concrete example

The simplified picture looks like this:

| Surface | What the file does in the documented model |
|---|---|
| VS Code | Can act as always-on instruction input depending on workspace structure and scope |
| GitHub | Participates in repository custom instruction behavior with nearest-file precedence |
| Claude Code | `CLAUDE.md` is the native instruction file; `AGENTS.md` is not equivalent unless explicitly imported |

That is enough to prove a workflow risk. Even if the text inside the file is identical, the host may read it at different times or with different priority. Source trail: `S005-vscode-custom-instructions.md`, `S010-github-repository-custom-instructions.md`, `S013-claude-memory.md`.

The right response is not to ban shared filenames. It is to stop assuming shared semantics.

## Key points

- `AGENTS.md` is a shared convention, not a shared semantic contract
- Host-specific precedence and loading behavior can change what the same file actually means in practice
- Teams should document interpretation per host before treating a filename as standardized

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/02-analysis/contradictions.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S005-vscode-custom-instructions.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S010-github-repository-custom-instructions.md`

---

*[<- Previous: Structural Portability vs Behavioral Portability](./L10-structural-portability-vs-behavioral-portability.md)* · *[Next lesson: Repairing Cross-Tool Convention Drift ->](./L12-repairing-cross-tool-convention-drift.md)*