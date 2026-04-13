---
name: research-analyze
description: >-
  Analyzes collected research sources to identify themes, contradictions, and gaps.
  Use when: finding patterns across sources, identifying contradictions, updating
  gap analysis, doing cross-source analysis, or any prompt containing "analyze sources",
  "find patterns", "what do sources say", "identify themes", "research analysis",
  "contradictions", "compare sources", or "what's missing". Also auto-invoked after sourcing.
argument-hint: "Topic slug or specific analysis focus (e.g. 'ai-regulation' or 'focus on enforcement themes')"
user-invokable: true
allowed-tools:
  - editFiles
  - search
---

# Research analyze skill

You read sources and surface patterns. Everything you produce goes in `02-analysis/`.
You do not write conclusions or final deliverables — those belong in `03-synthesis/`.

## Session start

1. Read `state.json`
2. Read `00-intake/brief.md` and `plan.md` — keep the research question in mind
3. Read `01-sources/index.md` — know what sources are active
4. Read existing `02-analysis/` files — don't duplicate existing entries

Then: read every active source file in `01-sources/web/` and `01-sources/papers/`.

## Building themes.md

A theme belongs here only when it appears in 2+ independent sources.

For each theme:

```markdown
## Theme N: [Concise pattern name]

**Confidence**: high / medium / low
**Supported by**: S001 ([key claim]), S003 ([corroborating point])
**Complicated by**: S002 (note: [why it's not a clean agreement])

[2-3 sentences describing the pattern and its significance to the research question]
```

Confidence levels:
- **High**: 3+ strong independent sources, no significant contradictions
- **Medium**: 2 sources, or mixed quality, or minor contradictions
- **Low**: Suggestive but evidence is thin — flag this clearly

Single-source observations stay in the source note, not in themes.md.

## Building contradictions.md

A contradiction belongs here when two sources make meaningfully different claims
about the same thing in ways that matter to the research question.

For each contradiction:

```markdown
## Contradiction N: [Topic of disagreement]

**Source A**: S00N claims [X]
**Source B**: S00N claims [Y]

**Possible explanation**: [Different time periods? Different geographies?
Different definitions? Different methodologies?]

**Resolution**:
- [ ] Resolved — [explanation]
- [ ] Unresolved — will be disclosed as limitation

**Impact on research**: high / medium / low
```

Rules:
- Never resolve a contradiction by silently picking one source
- If unresolved, it must surface in the output as a limitation
- A contradiction that can be explained (e.g. different time periods) is resolved

## Updating gaps.md

After reading all sources, update the gaps file:

- **Close** gaps that sourcing has filled — move to "Closed gaps" section
- **Add** new gaps discovered during analysis — things sources implied but didn't answer
- **Reclassify** any `sourcing` type gaps that are actually `inherent` limitations
  (i.e. the question may not be answerable with available evidence)

Gap entry format:
```markdown
### G00N: [Description]
**Type**: sourcing / clarity / inherent / out-of-scope
**Priority**: high / medium / low
**Related question**: Q[N]
**What we have**: [what sources say so far]
**What's missing**: [what would actually answer the question]
**Status**: open / closed
```

## Deciding whether to stop or get more sources

If you find a **critical gap** — a main research question from `plan.md` has zero
sources addressing it — stop and tell the user:
> "Gap G00N is critical and unaddressed. Recommend using `/research-source`
> focused on [specific search strategy] before completing analysis."

If gaps are peripheral or the research question has adequate coverage → continue.

## Finishing analysis

When all active sources are read and all three analysis files updated:

Write a summary paragraph at the top of `themes.md`:
> "This analysis identified N themes across N active sources. The strongest
> finding is [X]. The most significant unresolved contradiction is [Y]."

Update `state.json`:
- `phase`: `synthesis`
- `progress.analysis_complete`: `true`
- `last_action`: "Analysis complete — N themes, N contradictions, N gaps identified"
- `next_action`: "Begin synthesis — use /research-synthesize"
- Add history row
