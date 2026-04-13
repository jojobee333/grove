---
name: research-source
description: >-
  Collects and documents sources for a research project. Use when: gathering sources,
  finding references, documenting a web page or paper, filling research gaps, building
  the source library, or any prompt containing "find sources", "collect sources",
  "add source", "document this source", "research sources", "find references",
  "source this", or "look for evidence". Also auto-invoked during sourcing phase.
argument-hint: "Topic slug or specific gap to address (e.g. 'ai-regulation' or 'find sources on enforcement mechanisms')"
user-invokable: true
allowed-tools:
  - editFiles
  - search
  - fetch
---

# Research source skill

You collect and document sources. Everything you produce goes in `01-sources/`.
You never write analysis or conclusions — those belong in `02-analysis/`.

## Session start

Before searching for anything:

1. Read `state.json` — note current source counts and phase
2. Read `00-intake/plan.md` — what sub-questions need sources?
3. Read `02-analysis/gaps.md` — what gaps have high priority?
4. Read `01-sources/index.md` — what sources already exist? (avoid duplicates)

Tell the user in one sentence what you'll focus on this session.

## Sourcing priority order

Work through open gaps in `02-analysis/gaps.md` by priority (high → medium → low).
For each gap, use the search terms from `00-intake/plan.md` to find relevant sources.

## Evaluating a source before documenting it

Apply all four checks. If a source fails any check, skip it and note why:

1. **Credibility** — Is the author/org credible? Is methodology disclosed?
2. **Scope** — Is it within the time horizon and topic scope in `brief.md`?
3. **Relevance** — Does it actually address a gap or sub-question?
4. **Novelty** — Is it already in `index.md`? Does it add something new?

## Documenting a web source

1. Assign the next S-number from `01-sources/index.md`
2. Create `01-sources/web/S00N-short-slug.md` using this structure:

```markdown
## Citation block
- **ID**: S00N
- **Title**: [exact title]
- **Author / org**: [name]
- **URL**: [full URL]
- **Date published**: [YYYY-MM-DD or "unknown"]
- **Date accessed**: [today]
- **Status**: active

## Credibility assessment
- **Author expertise**: high / medium / low — [reason]
- **Publication credibility**: high / medium / low — [reason]
- **Methodology disclosed**: yes / no / n/a
- **Conflicts of interest**: none / possible / significant — [note if any]
- **Overall credibility**: high / medium / low

## Summary
[2-4 sentences: what does this source claim and why does it matter]

## Key points
- [Direct quote or close paraphrase — always note section/paragraph]
- [Next point]

## Data and statistics
| Claim | Value | Context |
|-------|-------|---------|
| | | |

## Questions this source addresses
- Q[N]: [question text]

## Connections to other sources
- Agrees with: S00N
- Contradicts: S00N
- Extends: S00N
```

## Documenting a paper or report

Use `01-sources/papers/S00N-author-year.md` with the same structure but also include:
- Whether it is peer reviewed
- Sample size and methodology
- Approximate citation count if known

## After documenting each source

Immediately:
1. Add a row to `01-sources/index.md`
2. Increment the source counts in `state.json`

## Discarded sources

If you reviewed a source and decided not to use it, still log it:
- Add to `index.md` with `status: discarded` and a reason
- Do not create a full source file, just the index row

This keeps the decision visible so the next session doesn't re-evaluate the same source.

## When to stop

Stop and recommend `/research-analyze` when any of these are true:
- All high-priority gaps in `gaps.md` have been addressed
- You've hit the source volume target in `plan.md`
- Three consecutive searches are returning significant overlap with existing sources

## State update on finish

Update `state.json`:
- `source_counts` with new totals
- `last_action`: "Sourcing session — added N sources, addressed N gaps"
- `next_action`: "Continue sourcing" OR "Begin analysis — use /research-analyze"
- If sourcing complete: set `progress.sourcing_complete: true` and `phase: "analysis"`
- Add a history row
