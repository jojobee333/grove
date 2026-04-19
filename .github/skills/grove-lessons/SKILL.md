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
Vague examples teach nothing. Tie it to something the learner can picture.
If the claim has 4+ supporting sources, include at least 2 distinct examples.
For programming topics, at least one example must be a working code block.
Label multiple examples clearly (e.g. **Example 1 — simple case**, **Example 2 — edge case**).]

## Key points

- [The most important takeaway — one sentence]
- [Second most important — one sentence]
- [Third — one sentence]
Keep this to 3-5 bullets. If you have more, the lesson is covering too much.

## Go deeper

[Required when the claim has 2+ source citations. List the 2–3 most directly
relevant sources with a one-line reason each. Inline citations in the body
are mandatory — this section is for readers who want the primary materials.]
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

Word targets by learner background × session time:

| Background    | 15 min      | 30 min      | 45 min      | 60 min      |
|---------------|-------------|-------------|-------------|-------------|
| Beginner      | 600–900     | 1000–1500   | 1500–2000   | 2000–2500   |
| Intermediate  | 900–1300    | 1400–1800   | 1800–2400   | 2400–3000   |
| Expert        | 1000–1500   | 1600–2200   | 2200–2800   | 2800–3500   |

Bump up by 200–300 words if the claim has 4+ supporting sources — those sources
contain detail worth surfacing, not compressing away.

## Caveats and contradictions

Every claim in `claims.md` has a `caveats` field. Always read it. Then:

- **If the caveat is minor**: surface it as a qualifying sentence in the body
  (e.g., "This holds for X but not Y because...")
- **If the caveat is important**: add it as the final key point or a brief
  "Limitations" subsection placed before the Key points section.
- **If `Contradicted by` is non-empty**: add a "Debate" paragraph that names
  both positions and explains why they differ. Do not resolve it artificially.
  Label it clearly: "**There is a real disagreement here.**"

A lesson that omits the claim's caveat teaches a cleaner version of reality
than the evidence supports. That produces overconfident learners.

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
