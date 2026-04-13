---
name: research-write
description: >-
  Writes the final research deliverables: one-page summary and full report.
  Use when: writing the research output, producing the final report, creating
  a research summary, finalizing research, or any prompt containing "write report",
  "research report", "final output", "research summary", "write up findings",
  "produce deliverable", "finalize research", or "write the research".
argument-hint: "Topic slug and optional format override (e.g. 'ai-regulation' or 'ai-regulation executive-summary-only')"
user-invokable: true
allowed-tools:
  - editFiles
  - search
---

# Research write skill

You write final human-readable deliverables. Everything you produce goes in
`04-output/`. You do not do research, analysis, or synthesis.

## Session start

1. Read `state.json`
2. Read `00-intake/brief.md` — what format and depth is required?
3. Read `03-synthesis/claims.md` — the conclusions you will present
4. Read `03-synthesis/narrative.md` — the story you will tell
5. Read `02-analysis/gaps.md` — limitations you must disclose

Check `brief.md` for the output format needed before writing anything:
- "Executive summary only" → write `summary.md` only
- "Deep report" → write `report.md` fully, `summary.md` briefly
- "Both" → write both to full quality
- "Blog post" or "memo" → adapt the structure and voice accordingly

## Writing summary.md

Target: 300–500 words. Readable in under 3 minutes. For someone who won't
read the full report.

```markdown
# [Topic] — Summary

**Research question**: [from brief.md]
**Date completed**: [today]
**Confidence**: high / medium / low

---

## Bottom line
[2-3 sentences answering the research question directly.
Start with the answer — not the background.]

## Key findings
- [Finding — reference the claim it comes from, e.g. "(C1)"]
- [Finding]
- [Finding]

## What we don't know
- [Honest limitation from gaps.md]
- [Unresolved contradiction from contradictions.md if significant]

## Recommended next steps
- [What the reader should do with this information]

---
*Full report: [report.md](./report.md)*
*Sources: [index.md](../01-sources/index.md)*
```

Rules:
- Lead with the answer, not the context
- The "What we don't know" section is not optional
- Every finding traces to a claim in `claims.md`

## Writing report.md

```markdown
# [Topic] — Full Report

**Research question**: [from brief.md]
**Date**: [today]
**Sources**: N active (N web, N papers)
**Confidence**: high / medium / low

---

## Executive summary
[1 paragraph — same answer as summary.md, slightly expanded]

## Background and context
[Brief — this is context, not findings. 1-2 paragraphs max.]

## Findings

### [Theme 1 from themes.md]
[Prose expanding the theme. Cite sources inline: (S001) or (S001, S003).
Reference claims by number: "C1 is strongly supported..." ]

### [Theme 2]
...

## Contradictions and complications
[Honest account of unresolved contradictions. Reference contradictions.md entries.]

## What this research cannot answer
[From gaps.md inherent limitations. Be direct — don't bury this.]

## Conclusions
[Direct answer to the research question. No hedging unless the evidence genuinely
requires hedging — in which case say "the evidence is mixed because..."]

## Recommendations
[Only if brief.md called for them]

---

## Sources

| ID | Title | Author | Date | Type |
|----|-------|--------|------|------|
[Pull active rows from 01-sources/index.md]

## Methodology note
[How this research was conducted: search strategy, source selection criteria,
any limitations in the approach]
```

## Calibrating confidence

The confidence level in the header must reflect the actual evidence:
- **High**: strong consistent evidence, no significant unresolved contradictions
- **Medium**: good evidence with meaningful caveats or one unresolved contradiction
- **Low**: limited or mixed evidence — the report should explain why

Never inflate confidence to make the output sound more certain than it is.

## State update on finish

Update `state.json`:
- `phase`: `complete`
- `progress.output_complete`: `true`
- `last_action`: "Output complete — summary and report written"
- `next_action`: "Research complete — review output"
- Add history row

Then tell the user:
- Where to find the output files
- The overall confidence level and why
- Any limitations they should flag before using the findings
- Any questions that remain unanswered and what it would take to answer them
