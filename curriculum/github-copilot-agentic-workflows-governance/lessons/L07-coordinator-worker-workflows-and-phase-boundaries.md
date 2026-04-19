# Coordinator-Worker Workflows and Phase Boundaries

**Module**: M04 · Stage Work, Then Delegate
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C3 — The recommended workflow shape across GitHub Copilot, VS Code, and Claude Code is staged and delegated: plan, explore, implement, review, and hand off in controlled phases

---

## The core idea

The strongest consistent recommendation across the research is to stage work rather than run it monolithically. The evidence comes from VS Code's subagent documentation, GitHub's cloud agent workflow model, and Claude's common workflows guidance: none of them recommend issuing one large instruction and trusting a single uninterrupted reasoning chain to produce a reviewed, validated result. All of them recommend some form of phase separation, with plan-before-act being the most explicit and universal pattern [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md) [S006](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md) [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md) [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md) [S021](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md).

The coordinator-worker model is the practical structure that implements staged work. A coordinator actor maintains the overall thread: it defines the task, sequences the phases, launches workers for bounded subtasks, and synthesizes results into a coherent output. Workers handle narrower jobs with their own tool scope and context. The coordinator knows where the workflow is; the workers know how to do their specific piece.

This design is documented from multiple angles:

- VS Code documents coordinator-worker and parallel multi-perspective review as distinct subagent patterns [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md)
- GitHub's cloud agent is explicitly described as running a staged workflow: research, plan, iterate on a branch, then optionally open a pull request [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md)
- VS Code's built-in agent roles — `Agent`, `Plan`, and `Ask` — are distinct phases with different capabilities and appropriate use cases [S006](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md)
- Claude's common workflows documentation consistently structures guidance as step sequences, favoring broad-to-narrow exploration before implementation [S021](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md)
- VS Code's custom agent documentation explicitly documents handoffs between agents as a first-class feature [S001](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S001-vscode-custom-agents.md)

> **Caveat**: Prompt files can invoke agents and tools, and those agents can reference skills with their own multi-step logic. This means the layer boundaries can blur in practice when teams over-pack behavior into one artifact. The staged model only provides its quality and auditability benefits when each phase has a distinct actor or at minimum a distinct context checkpoint \u2014 not when a single large prompt sequentially plays all the roles in one unbroken reasoning chain.

## Why it matters

Phase boundaries protect two things that an uninterrupted single-actor run cannot easily provide: specialization and independence.

**Specialization** means each phase can have the tools, permissions, and context appropriate to its job. A planning phase that runs in `plan` mode with read-only tools cannot accidentally edit files during planning. An implementation phase that runs with write access cannot perform broad codebase exploration without surfacing the noise to the implementation context. A review phase with a narrower context focused on the implementation diff is more likely to catch regressions than a review performed by the same session that just wrote the code while still holding the full implementation history.

**Independence** means review findings are not anchored to the implementation's own framing. When the same session that wrote the code immediately pivots to review it, the review often confirms the implementation's assumptions rather than challenging them. A separate review context \u2014 whether a different agent, a different permission mode, or simply a checkpoint prompt that resets attention \u2014 has a better chance of catching what the implementation phase missed.

The governance benefit is also real: staged workflows create natural audit points. When planning produces a plan artifact, implementation produces code, and review produces findings, each is inspectable independently. A single uninterrupted run produces one output that conflates planning assumptions, implementation decisions, and review conclusions \u2014 hard to audit and harder to trace.

## The five-phase template

Across the source set, the most commonly recommended workflow shape is a five-phase sequence. This is not prescriptive \u2014 simpler tasks need fewer phases \u2014 but it provides a reference model:

**Phase 1: Plan**
- Define the task scope, constraints, and success criteria
- Identify likely touch points without reading large code volumes
- Tool access: read-only, targeted
- Output: a structured plan artifact (not a partially written implementation)

**Phase 2: Explore**
- Launch a focused worker (subagent) to investigate relevant code areas
- Research dependency chains, identify risk areas, surface unknowns
- Tool access: read-only, broad
- Output: a scoped summary (not raw file contents)
- Key design rule: exploration output is a summary that returns to the coordinator; the raw exploration stays in the worker's isolated context

**Phase 3: Implement**
- Execute the plan against the code, informed by the exploration summary
- Tool access: write-enabled, targeted to the identified scope
- Output: code changes and test results

**Phase 4: Review**
- Evaluate the implementation against the original success criteria
- Preferably done with fresh context that has not inherited the implementation framing
- Tool access: read-only, targeted to the changed files
- Output: review findings, pass/fail, remaining risks

**Phase 5: Hand off**
- Summarize what changed, what remains uncertain, and what evidence supports the result
- Produce the artifact that moves forward: PR, summary document, deployment artifact
- Output: a clean handoff package that does not require recipients to read session history

## A concrete example

**Example 1 — VS Code coordinator-worker pattern**

```markdown
# feature-build.prompt.md
---
description: "Build a new API endpoint from spec"
---

You are coordinating a feature build. Work through these phases in order.
Do not start a new phase until the current phase's output artifact is complete.

Phase 1 - Plan:
  Read the OpenAPI spec at docs/api-spec.yaml.
  Identify which existing handlers are most similar to the new endpoint.
  Produce a plan: handler file path, DB schema changes, validation schema, test cases.

Phase 2 - Explore (delegate to subagent):
  Launch a focused worker to answer: "What files does the auth middleware
  touch that could affect this endpoint? Return a file list and brief summary."
  Do not load file contents into this session.

Phase 3 - Implement:
  Apply the plan. Write the handler, schema, and at least 3 tests.
  The implementation must pass strict TypeScript check before this phase is complete.

Phase 4 - Review:
  Check the implementation against the original spec.
  Verify: auth middleware integration, error handling coverage, test completeness.
  Output: pass/fail per criterion plus any blocking issues.
```

The prompt file is the coordinator. The exploration work goes to a subagent. Implementation and review happen in the same session but as explicit, sequenced phases with distinct output criteria. Each phase's definition of success is different, which creates the natural boundary.

**Example 2 — GitHub cloud agent staged workflow**

GitHub's cloud agent documentation describes the agent as working on a branch: it can research, plan, iterate on code changes, and optionally open a pull request [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md). The built-in workflow is already staged \u2014 the agent does not directly commit to main. The PR is the handoff artifact, and the review requirement is the phase boundary before merge.

Custom agent instructions for the cloud agent can strengthen the staged model:

```markdown
# .github/copilot-instructions.md (cloud agent guidance)

When starting a task:
1. Research first. Do not edit any files until you have identified the impact area.
2. Summarize your research findings in a comment on the issue before proceeding.
3. Implement in the smallest possible change set that achieves the goal.
4. If the change touches auth, database, or deployment code, note it explicitly
   in the PR description and request review from the security team.

Never open a PR without a test coverage statement.
```

The instructions add behavioral guidance on top of the cloud agent's built-in staged execution model. The PR review gate \u2014 a product-native control \u2014 is the enforcement layer for the review phase.

## Understanding VS Code's built-in roles

VS Code's agents overview distinguishes three built-in role types [S006](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S006-vscode-agents-overview.md):

- **Ask**: conversational, read-only, no code edits \u2014 appropriate for planning and research phases
- **Plan**: proposes changes and a plan but waits for explicit approval before executing \u2014 appropriate for the transition from planning to implementation
- **Agent**: full execution with approval prompts (in Default Approvals mode) or autonomous execution \u2014 appropriate for implementation and hand-off phases

This built-in role system is a product-native implementation of the phase model. Using the right role for each phase is not just a best-practice preference; it is a product-supported design that the documentation explicitly recommends.

## Key points

- Staged, delegated workflows are recommended across GitHub Copilot, VS Code, and Claude Code because different phases require different tools, permissions, and reasoning postures
- The coordinator maintains sequence and synthesis; workers handle bounded subtasks in isolated contexts with narrower tool scope
- Phase boundaries protect both specialization (each phase has appropriate permissions) and independence (review is not anchored to implementation framing)
- VS Code's built-in Ask/Plan/Agent roles are a product-native implementation of the three most common workflow phases
- Each phase should have a distinct definition of success and a distinct output artifact; phases without clear completion criteria tend to collapse into each other

## Go deeper

- [S004](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md) — VS Code subagents: coordinator-worker and parallel review patterns, model selection priority, and how the coordinator delegates while maintaining orchestration control
- [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md) — GitHub cloud agent: the staged research-plan-implement-PR workflow built into the cloud execution model, and the limits that enforce single-branch, single-PR task scope
- [S021](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md) — Claude common workflows: Anthropic's own step-by-step workflow patterns, which consistently favor broad-to-narrow investigation before narrowing to implementation

---

*[← Previous: Hooks, Permissions, and Audit Trails by Surface](./L06-hooks-permissions-and-audit-trails-by-surface.md)* · *[Next lesson: Parallel Review Without Role Contamination →](./L08-parallel-review-without-role-contamination.md)*

---

## The core idea

The research does not support the workflow pattern "write one giant request and let the model improvise." It supports staged execution. Plan first. Delegate focused exploration. Implement in a bounded phase. Review from a distinct perspective. Then hand off or finalize. The coordinator-worker model makes that sequence explicit: one actor keeps the overall thread coherent while other actors do narrower jobs. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S004-vscode-subagents.md`, `S006-vscode-agents-overview.md`, `S007-github-copilot-cloud-agent.md`, `S021-claude-common-workflows.md`.

## Why it matters

Phase boundaries protect quality. Planning needs breadth. Implementation needs precision. Review needs distance from the implementation assumptions. When those modes collapse into one uninterrupted run, the workflow loses both specialization and auditability. A staged design makes it easier to see where decisions were made, what evidence supported them, and which phase owns the next action.

## A concrete example

Use this simple five-phase template for a nontrivial build task:

1. **Plan**: define the task, constraints, success criteria, and likely files.
2. **Explore**: launch a focused worker to inspect code, dependencies, or docs.
3. **Implement**: edit only after the likely impact area is understood.
4. **Review**: run a separate pass to look for regression, security, or testing gaps.
5. **Hand off**: summarize what changed, what remains uncertain, and what evidence supports the result.

Notice what this avoids: the same actor does not search broadly, code impulsively, and certify its own work without a boundary. That is why staged workflows are more defensible than monolithic ones. Source trail: `S004-vscode-subagents.md`, `S007-github-copilot-cloud-agent.md`, `S021-claude-common-workflows.md`.

One useful design rule is that each phase should have a different definition of success. Planning succeeds when the task is decomposed. Exploration succeeds when uncertainty is reduced. Implementation succeeds when behavior changes correctly. Review succeeds when risk is surfaced, not when it agrees.

## Key points

- Staged workflows are recommended across the source set because different phases need different kinds of reasoning and control
- Coordinator-worker structure keeps sequence and synthesis centralized while allowing focused side work
- Clear handoff boundaries improve both quality and auditability

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S021-claude-common-workflows.md`
- `vault/research/github-copilot-agentic-workflows-governance/03-synthesis/narrative.md`

---

*[<- Previous: Hooks, Permissions, and Audit Trails by Surface](./L06-hooks-permissions-and-audit-trails-by-surface.md)* · *[Next lesson: Parallel Review Without Role Contamination ->](./L08-parallel-review-without-role-contamination.md)*