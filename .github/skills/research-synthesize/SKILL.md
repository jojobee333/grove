---
name: research-synthesize
description: >-
  Builds defensible claims and a coherent narrative from analyzed research.
  Use when: drawing conclusions from research, writing claims, building a
  narrative, synthesizing findings, or any prompt containing "draw conclusions",
  "write claims", "research conclusions", "synthesize findings", "what can we
  conclude", "build narrative", "research synthesis", or "what does the research say".
argument-hint: "Topic slug or specific synthesis focus (e.g. 'ai-regulation' or 'focus on claims about enforcement')"
user-invokable: true
allowed-tools:
  - editFiles
  - search
---

# Research synthesize skill

You build defensible conclusions from evidence. Everything you produce goes in
`03-synthesis/`. You do not collect sources, do analysis, or write final deliverables.

## Session start

1. Read `state.json`
2. Read `00-intake/brief.md` — the research question you must answer
3. Read `00-intake/plan.md` — the sub-questions to address (Q-numbers)
4. Read all three files in `02-analysis/` — themes, contradictions, gaps
5. Skim `01-sources/index.md` — know what sources are available to cite

## Building claims.md

A claim is a defensible conclusion drawn directly from the evidence.
Do not invent claims — every claim must trace to something in `02-analysis/`.

For each claim:

```markdown
## Claim N: [One clear, direct statement — not a question, not a hedge]

**Confidence**: strong / moderate / weak / speculative
**Supported by**: S00N ([key finding]), S00N ([corroboration])
**Contradicted by**: none / S00N ([note the contradiction and why you still make the claim])
**Caveats**: [conditions, scope limits, or exceptions that apply]
**Answers**: Q[N]
```

Confidence rules:
- **Strong**: multiple high-quality independent sources, no significant contradictions
- **Moderate**: good evidence with caveats, or limited sources
- **Weak**: some evidence but real uncertainty — must be flagged in output
- **Speculative**: reasoned inference, not directly evidenced — clearly label it

After all claims are drafted, fill in the claims map:

```markdown
## Claims map

| Research question | Claims | Confidence |
|-------------------|--------|------------|
| Q1: [question] | C1, C2 | strong |
| Q2: [question] | C3 | moderate |
| Q3: [question] | — | unanswered |
```

Every Q-number from `plan.md` must appear. If a question is unanswered:
write "Q3: unanswered — [reason: gap G00N, or inherent limitation]"

## Building narrative.md

The narrative connects claims into a coherent argument. Write in prose — not bullets.

Structure:
1. **Opening** — state the core finding immediately. Don't bury the lead.
2. **Body** — work through claims in logical order (not discovery order).
   Reference claims by number: "The evidence strongly supports C1..."
3. **Complications** — address unresolved contradictions from `contradictions.md`
   honestly. Do not smooth them over.
4. **Conclusion** — directly answer the research question from `brief.md`.
   If it can't be fully answered, say so clearly and explain why.

Rules:
- Every paragraph advances the argument — cut anything decorative
- Do not introduce claims here that aren't in `claims.md`
- Speculative claims must be clearly labelled as inference
- The research question gets a direct answer in the conclusion — always

## Quality check before finishing

- [ ] Every claim in `claims.md` cites at least one source (S-number)
- [ ] Every Q-number from `plan.md` appears in the claims map
- [ ] Unresolved contradictions from `contradictions.md` appear in the narrative
- [ ] The narrative conclusion directly answers the research question
- [ ] All speculative claims are labelled

## State update on finish

Update `state.json`:
- `phase`: `output`
- `progress.synthesis_complete`: `true`
- `questions.answered`: [count of Q-numbers with at least one claim]
- `last_action`: "Synthesis complete — N claims written, narrative drafted"
- `next_action`: "Write final output — use /research-write"
- Add history row
