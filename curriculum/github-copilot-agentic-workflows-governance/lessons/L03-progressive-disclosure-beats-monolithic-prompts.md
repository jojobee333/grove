# Progressive Disclosure Beats Monolithic Prompts

**Module**: M02 · Context Economics and Token Pressure
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C2 — Token-efficient workflows are built through progressive disclosure, context compaction, and delegated side work rather than ever-larger monolithic prompts

---

## The core idea

Context is not a passive background detail. It is a bounded budget that you allocate with every design decision you make about what loads into a session and when. The research supports a consistent design principle across VS Code, the Agent Skills specification, and Claude Code's memory and context-window documentation: keep always-on context small, load specialized content only when it is relevant, and push noisy exploration work into isolated workers. That principle \u2014 progressive disclosure \u2014 is not a UI pattern borrowed from product design; it is a workflow architecture strategy with direct token and quality consequences.

The monolithic approach to this problem is familiar: one large prompt, instruction file, or agent definition that contains the role, the standards, the workflow steps, the reference material, and the edge-case notes. That design feels comprehensive at first. In practice it creates compounding problems. The model reads and re-reads material irrelevant to the current step. Important instructions compete with background content for model attention. Edits become risky because the file has grown into an undifferentiated mass of concerns. And token cost scales linearly with document size whether or not any given line is needed for the current task.

Progressive disclosure solves this by structuring what information is visible at which stage. The Agent Skills specification formalizes this in three explicit loading stages [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md):

1. **Discovery**: the runtime reads frontmatter metadata — name, description, compatibility — to decide whether the skill is relevant. This is broad and cheap.
2. **Activation**: when a skill is invoked, the `SKILL.md` body loads. This is targeted and bounded.
3. **Resource access**: referenced files, scripts, and documents are fetched only when the skill needs them during execution. This is on-demand and lazy.

The three stages map directly to context cost: you pay discovery cost always (tiny), activation cost when relevant (bounded), and resource cost only when executing (on-demand). A library of twenty skills imposes minimal cost if only one is active in a session.

> **Caveat**: Claude Code's documentation on context mechanics is significantly more explicit than GitHub's equivalent documentation for cloud agent. Claude publishes specific numeric limits for startup memory loading, compaction behavior, and skill reinjection caps [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md). GitHub's cloud-agent documentation supports the same general design direction through scope and workflow limits, but does not publish equivalent numeric context mechanics [S007](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S007-github-copilot-cloud-agent.md). The qualitative principle is consistent across both; the quantitative reasoning is only directly supported on the Claude side.

## Why it matters

The most important framing shift for an intermediate practitioner is this: **always-on context is not free**. Every line in an instruction file that loads on every session is a line that either costs something useful or displaces something that would have been more useful. Anthropic recommends keeping `CLAUDE.md` under 200 lines because longer files make it harder for models to surface the most relevant guidance [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md). The spec's recommendation to keep `SKILL.md` under 500 lines for the same reason [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md).

The VS Code documentation makes context economics observable: the chat input displays a live token breakdown showing something like `15K/128K`, and manual compaction is available via `/compact` or the UI when a session starts approaching its ceiling [S022](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S022-vscode-manage-context.md). That visibility is useful because it shows developers what their design decisions actually cost in tokens, not just in abstract architecture terms.

Progressive disclosure also has a quality consequence beyond cost. A model that is given exactly the context relevant to the current step performs better on that step than a model whose attention is split across the full contents of a large monolithic instruction file. Focused context produces more precise outputs.

## A concrete example

**Example 1 — monolithic design: paying the full price on every session**

```markdown
# copilot-instructions.md  (applies to all files, all requests)

You are a senior TypeScript engineer on the payments platform.
Use strict mode. No `any`. 4-space indentation.

### Feature Planning Standards
When planning a feature, start with an impact analysis...
[45 lines of planning procedure]

### Security Review Checklist
For any code touching the auth subsystem:
1. Verify all tokens use signed JWTs...
[40 lines of security checklist]

### Database Guidelines
Always include workspace_id in WHERE clauses.
Run migrations through Drizzle, never raw SQL...
[25 lines of database procedure]

### API Design Reference
All endpoints must validate with Zod before touching the DB...
[30 lines of API standards]

### Testing Requirements
Each module must have a corresponding .test.ts file...
[20 lines of test standards]
```

Total: ~170 lines of always-on context. Sessions asking about documentation formatting, config file questions, or anything unrelated to the payments API pay the full 170-line context cost. The planning procedure is relevant once per feature. The security checklist is relevant for auth-adjacent code only. The database guidelines are relevant for query work only. But all of them load on every single request.

**Example 2 — progressive design: context scales with relevance**

```
.github/
  copilot-instructions.md          # 12 lines: language, typing, test runner, commit format
  skills/
    feature-planning/
      SKILL.md                     # planning procedure, ~80 lines, loads when /plan is called
    security-review/
      SKILL.md                     # security checklist, ~60 lines, loads when /security-review is called
      owasp-reference.md           # referenced from SKILL.md, fetched only during review execution
    database-patterns/
      SKILL.md                     # DB guidelines, loads when /db-help is called
```

On a session that asks about API endpoint design:
- `copilot-instructions.md`: 12 lines (always-on, genuinely universal)
- `feature-planning/SKILL.md`: 0 tokens (not activated)
- `security-review/SKILL.md`: 0 tokens (not activated)
- `owasp-reference.md`: 0 tokens (not activated)
- `database-patterns/SKILL.md`: 0 tokens (not activated)

On a session running a security review:
- `copilot-instructions.md`: 12 lines
- `security-review/SKILL.md`: ~60 lines (activated)
- `owasp-reference.md`: fetched when checklist references it during execution

The progressive design loads under 100 lines for the security review session vs. 170+ lines for every session in the monolithic design. That gap compounds over a team and over a month of usage.

## What loads at startup in Claude Code

Claude Code's context-window documentation is specific about what enters the session before the first prompt [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md):

- `CLAUDE.md` files (loaded in full)
- Auto memory (first 200 lines or 25 KB, whichever comes first)
- MCP tool names and descriptions
- Skill frontmatter descriptions (not full `SKILL.md` bodies)

This means the startup context budget is primarily consumed by `CLAUDE.md` and auto memory. Skill descriptions are cheap because they are frontmatter only — the full skill body loads only on activation. This is the direct mechanism behind the progressive disclosure claim: the spec was designed so that startup context stays lean regardless of library size, and full skill instructions pay in only when needed.

The practical implication: move task-specific or path-specific material out of `CLAUDE.md` and into skills or path-scoped rules. The startup context should contain genuinely session-wide guidance, not a complete procedure library [S013](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S013-claude-memory.md).

## What VS Code exposes about context state

VS Code's context management page documents that the chat input shows live token usage in the format `15K/128K` with a full breakdown visible on hover [S022](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S022-vscode-manage-context.md). This visibility matters because it makes the cost of design decisions observable during development rather than abstract. When you add an instruction file and the context counter jumps by 800 tokens, that is direct feedback on the cost of always-on content.

VS Code also automatically compacts conversations when the context window fills, summarizing earlier messages to make room. Manual compaction is available via `/compact` for local sessions, background agent sessions, and Claude agent sessions. This automatic behavior means that sessions are not blocked by context overflow — but it also means that earlier detail can be summarized away, which is a reason to design workflows where important decisions and constraints are in the instruction layer rather than accumulating mid-session.

## Key points

- Progressive disclosure keeps always-on context minimal and phase-specific context targeted: discovery metadata is always visible, skill bodies load on activation, resources load on demand
- Context should be treated as a workflow budget \u2014 every always-on instruction line is a recurring cost; skills convert that recurring cost to a one-time, on-demand cost
- Claude Code publishes explicit startup loading limits and skill reinjection caps; GitHub cloud agent supports the same qualitative direction without equivalent numeric documentation
- VS Code surfaces live token usage in the chat input, making context cost directly observable during development
- Move task-specific procedures, checklists, and reference material out of always-on instruction files and into skills that activate when relevant

## Go deeper

- [S019](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md) — Agent Skills specification: the formal progressive-disclosure loading model, frontmatter schema, and the 5,000-token and 500-line skill body size recommendations
- [S015](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md) — Claude context window: what loads before the first prompt, how compaction preserves selected content, and skill reinjection caps (5,000 tokens per skill, 25,000 tokens total)
- [S022](../../research/github-copilot-agentic-workflows-governance/01-sources/web/S022-vscode-manage-context.md) — VS Code manage context: live token display, automatic compaction behavior, and manual compact controls across session types

---

*[← Previous: Artifact Selection in Real Workflow Design](./L02-artifact-selection-in-real-workflow-design.md)* · *[Next lesson: Compaction, Reinjection, and Subagent Isolation →](./L04-compaction-reinjection-and-subagent-isolation.md)*

---

## The core idea

The strongest shared design rule in the research is simple: context is scarce, so do not keep everything loaded all the time. Skills, context management docs, and Claude's context-window guidance all point toward the same pattern: discover lightweight metadata first, load detailed instructions only when the task needs them, and avoid carrying heavy reference material in every session. Source trail: `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S003-vscode-agent-skills.md`, `S013-claude-memory.md`, `S015-claude-context-window.md`, `S019-agentskills-specification.md`, `S022-vscode-manage-context.md`.

Progressive disclosure is therefore a workflow design principle, not just a UI idea. You expose a little context broadly, then reveal more as relevance increases. That lets a system stay responsive without losing specialized capability.

## Why it matters

Large prompts often feel safer because they appear comprehensive. In practice they create three problems:

- the model spends tokens rereading material that is irrelevant to the current step
- important instructions compete with background detail for attention
- later edits become harder because one prompt now tries to act as memory, workflow, policy, and reference library

Intermediate builders should treat context like budget allocation. If you can move rarely used detail into a skill resource or a focused subtask, do it. If a workflow requires a long checklist every time, consider whether the checklist belongs in a reusable skill instead of the parent session.

## A concrete example

Compare two ways to run the same workflow.

Monolithic design:

- one master prompt includes role definition, coding standards, repo history, security policy, style guide, build commands, test strategy, and troubleshooting notes
- the same prompt is reused for planning, implementation, and review

Progressive design:

- instructions hold only durable rules
- the active task description stays short
- a skill loads a planning rubric only when planning is requested
- a subagent performs broad code search and returns a summary instead of dumping raw findings into the parent context

The second design matches the documented loading model for skills and the context-isolation model for subagents. It also reduces prompt drift because fewer artifacts are pretending to be universal. Source trail: `S003-vscode-agent-skills.md`, `S004-vscode-subagents.md`, `S015-claude-context-window.md`.

An easy heuristic is: if a block of instructions is only useful for one phase, it should probably load only in that phase.

## Key points

- Progressive disclosure keeps always-on context small and phase-specific context targeted
- Context should be treated as a workflow budget, not an invisible implementation detail
- Heavy instructions, checklists, and references belong in on-demand artifacts whenever possible

## Go deeper

- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S015-claude-context-window.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S019-agentskills-specification.md`
- `vault/research/github-copilot-agentic-workflows-governance/01-sources/web/S022-vscode-manage-context.md`

---

*[<- Previous: Artifact Selection in Real Workflow Design](./L02-artifact-selection-in-real-workflow-design.md)* · *[Next lesson: Compaction, Reinjection, and Subagent Isolation ->](./L04-compaction-reinjection-and-subagent-isolation.md)*