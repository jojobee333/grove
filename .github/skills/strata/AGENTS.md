# Strata — Agent instructions

Strata is a structured research workflow. When you conduct research in this
workspace, follow this system exactly. It is designed so you can stop and
resume across sessions without losing context or traceability.

## The single entry point

```
/strata [topic]
```

This runs the full pipeline automatically. Use individual skills only when
you need to revisit a specific zone mid-project.

## Zone structure

```
research/
└── [topic-slug]/
    ├── state.json              ← READ THIS FIRST. Tells you exactly where you are.
    ├── 00-intake/
    │   ├── brief.md            ← what to research, why, constraints
    │   └── plan.md             ← sub-questions, source strategy
    ├── 01-sources/
    │   ├── index.md            ← master source list with status
    │   ├── web/                ← S00N-slug.md per web source
    │   └── papers/             ← S00N-author-year.md per paper
    ├── 02-analysis/
    │   ├── themes.md           ← patterns from 2+ sources
    │   ├── contradictions.md   ← where sources disagree
    │   └── gaps.md             ← what's missing
    ├── 03-synthesis/
    │   ├── claims.md           ← conclusions with source citations
    │   └── narrative.md        ← prose connecting all claims
    └── 04-output/
        ├── summary.md          ← 1-page TL;DR
        └── report.md           ← full report
```

## Five rules that are never optional

1. Read `state.json` before doing anything
2. Never mix zones — raw notes in 01-sources, patterns in 02-analysis,
   conclusions in 03-synthesis, deliverables in 04-output
3. Every claim in 03-synthesis cites at least one source from 01-sources
4. Never delete files — mark discarded with a reason and keep the record
5. Update `state.json` before finishing every session

## Skills

| Invoke | Zone | Purpose |
|--------|------|---------|
| `/strata` | All | Full workflow orchestrator |
| `/research-start` | 00-intake | Project intake and session start |
| `/research-source` | 01-sources | Source collection and documentation |
| `/research-analyze` | 02-analysis | Theme and contradiction analysis |
| `/research-synthesize` | 03-synthesis | Claims and narrative |
| `/research-write` | 04-output | Final deliverables |
| `/grove-code-challenges` | 05-grove (optional) | Generate Grove coding exercises from synthesis |

## Optional Grove integration

After output is written, Strata can generate test-case based coding challenges for Grove.
This step runs only when a matching Grove curriculum exists and the user requests it.

The generation reads `03-synthesis/claims.md` and converts programmable concepts into
`curriculum/<slug>/assessments/code-challenge-M*.json` files compatible with Grove's
offline WASM-based coding engine.

See `.github/skills/grove-code-challenges/SKILL.md` for the required output format and rules.
See Step 6b in `SKILL.md` for the full generation algorithm.
