# Strata — Structured research workflow

Strata is a five-zone research system that takes a question from intake to
a fully-sourced, traceable report. Every claim links to a source. Every
source is evaluated. Nothing gets skipped.

## Quick start

```
/strata [topic]        ← start here — runs the full workflow
```

## Individual zone skills (use for focused work)

| Skill | Zone | When to use directly |
|-------|------|----------------------|
| `/research-start` | 00-intake | Rewrite brief or plan only |
| `/research-source` | 01-sources | Add more sources mid-project |
| `/research-analyze` | 02-analysis | Re-analyze after adding sources |
| `/research-synthesize` | 03-synthesis | Revise claims or narrative |
| `/research-write` | 04-output | Rewrite or reformat output |

## The five zones

```
00-intake/     →  what to research and why
01-sources/    →  raw material, fully cited, never mixed with analysis
02-analysis/   →  themes, contradictions, gaps — no conclusions yet
03-synthesis/  →  defensible claims and narrative — traceable to sources
04-output/     →  summary and report for human readers
```

## Non-negotiable rules

- Read `state.json` at the start of every session
- Never write conclusions in source files
- Never write analysis in output files
- Every claim must cite at least one source by ID
- Never delete files — mark discarded, explain why, keep the record
- Update `state.json` before every session ends
