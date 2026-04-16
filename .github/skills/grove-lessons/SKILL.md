---
name: grove-lessons
description: >-
  Writes lesson content from Strata claims and narrative. Produces structured
  markdown lesson files with explanations, examples, key points, and source
  references. Use when: writing lesson content, generating course material,
  expanding a course outline into readable lessons.
argument-hint: "Topic slug and optional lesson ID (e.g. 'ai-regulation' or 'ai-regulation L03')"
user-invokable: true
allowed-tools:
  - editFiles
  - search
---

# Grove lessons skill

You write lesson content. Each lesson is a standalone markdown file a learner
can read without an LLM. Quality over quantity — a lesson that teaches one
thing well is better than one that covers five things poorly.

## Input for each lesson

From `curriculum/[slug]/course.json`: lesson title, type, strata_claim, estimated_minutes
From `research/[slug]/03-synthesis/claims.md`: the claim being taught (C-number)
From `research/[slug]/03-synthesis/narrative.md`: prose context around that claim
From `research/[slug]/01-sources/`: specific sources cited in that claim
From `curriculum/[slug]/learner.json`: depth, goal, background

## Lesson file: `curriculum/[slug]/lessons/L01-slug.md`

```markdown
# [Lesson title]

**Module**: M01 · [Module name]
**Type**: core / applied / frontier / debate / gap
**Estimated time**: N minutes
**Claim**: [C-number] from Strata synthesis

---

## The core idea

[1-2 paragraphs. State the main point of this lesson clearly and directly.
Do not bury the lead. Write at the level appropriate for the learner's background.]

## Why it matters

[1 paragraph. Connect this lesson to the learner's goal.
For "apply" goal: practical implication. For "understand" goal: bigger picture.
For "teach" goal: why this is worth explaining to others.]

## A concrete example

[1-2 paragraphs or a worked example. Make it specific.
Vague examples teach nothing. Tie it to something the learner can picture.]

## Key points

- [The most important takeaway — one sentence]
- [Second most important — one sentence]
- [Third — one sentence]
Keep this to 3-5 bullets. If you have more, the lesson is covering too much.

## Go deeper

[Optional: 1-3 pointers to the most relevant source files for readers who want more]
- [Source S00N](../../research/[slug]/01-sources/web/S00N-slug.md) — [why it's relevant]

---

*← [Previous lesson](./L00-slug.md)* · *[Next lesson](./L02-slug.md) →*
```

## Lesson types — different structures

**Core lesson** (a strong claim): explain it, exemplify it, reinforce it.
Structure: core idea → why it matters → example → key points.

**Applied lesson** (a moderate claim with practical use): how-to focused.
Structure: the situation → the approach → worked example → when to use it.

**Frontier lesson** (weak/speculative claim): intellectual honesty required.
Structure: what the evidence suggests → why it's uncertain → what would settle it.
Always open with "This is an area of ongoing debate/research..."

**Debate lesson** (from contradictions.md): present both sides, let learner evaluate.
Structure: Position A (sources) → Position B (sources) → why they disagree → your take.
Do not resolve the contradiction artificially. If it's unresolved in the research, it's
unresolved in the lesson.

**Gap lesson** (from gaps.md): teach intellectual humility.
Structure: what the question is → what we know → what we don't → why that matters.

## Calibrating depth

Read `learner.json` before writing each lesson:

- **Beginner**: define every term when first used, use analogies, shorter sentences
- **Intermediate**: assume foundational vocabulary, focus on nuance
- **Expert**: skip basics entirely, focus on implications and edge cases

- **15 min target**: 600-800 words, 1 example, 3 key points max
- **30 min target**: 1000-1500 words, 2 examples, 4-5 key points
- **1 hour target**: 2000-2500 words, 3+ examples, deeper treatment

## Source traceability

Every factual claim in a lesson must trace to a Strata source.
Cite inline as: `[S00N](../../research/[slug]/01-sources/web/S00N-slug.md)`

Never introduce facts not in the Strata research. If you want to add an example,
make it clearly illustrative, not a new factual claim.

## What good lessons don't do

- Don't use jargon without defining it (first use only)
- Don't list everything — select the most important 3 things
- Don't end with "In conclusion, we have learned..." — trust the reader
- Don't add sections for their own sake — if you have nothing to say, cut the section
