# Grove Lesson Authoring Reference

## Scope

Use this reference when writing lesson markdown files under `curriculum/[slug]/lessons/`.

## Required inputs

- Lesson metadata from `curriculum/[slug]/course.json`
- Claim text from `research/[slug]/03-synthesis/claims.md`
- Narrative context from `research/[slug]/03-synthesis/narrative.md`
- Supporting sources from `research/[slug]/01-sources/`
- Learner calibration from `curriculum/[slug]/learner.json`

## Lesson template

- Title line
- Module, type, estimated time, and claim header block
- One lesson-type-appropriate opening section such as `The core idea`, `The situation`, `The debate`, or `What we know`
- `Why it matters`
- `A concrete example`
- `Recognition cues`, `Common mistakes`, or `Decision rules` when the lesson type supports it
- `Key points`
- Optional `Quick check` or `Go deeper`
- Previous and next lesson navigation

## Lesson type rules

- Core: explain, exemplify, reinforce.
- Applied: situation, approach, worked example, when to use.
- Frontier: open with uncertainty and say what would settle it.
- Debate: present both sides fairly and do not force resolution.
- Gap: what we know, what we do not know, and why that matters.

## Calibration rules

- Beginner: define terms, use analogies, shorter sentences.
- Intermediate: assume vocabulary, focus on nuance.
- Expert: skip basics, focus on implications and edge cases.
- Match word count and example count to learner session time.
- Match word count and example count to the lesson's `estimated_minutes`, not just the learner's full session budget.
- Use these default timing bands:
	- `8-10 min`: about `700-900` words, one main example, minimal branching.
	- `10-15 min`: about `900-1300` words, one substantial worked example plus a pitfall, cue, or decision rule.
	- `15-18 min`: about `1300-1700` words, two meaningful examples or a comparison with tradeoffs.
	- `20-25 min`: about `1700-2300` words, only when the lesson genuinely carries multi-part synthesis or multiple substantial examples.
- If the draft is materially shorter than its estimate, lower the estimate instead of padding with filler.
- If the estimate is `20+` minutes, the lesson should feel correspondingly substantial; otherwise split the content or reduce the estimate.

## Traceability rules

- Every factual claim traces to Strata research.
- Cite inline with source paths.
- Illustrative examples must be clearly framed as examples, not new facts.

## Validation checklist

- One lesson teaches one main thing well.
- Key points stay within 3 to 5 bullets.
- Sections match the lesson type.
- Claims are traceable.
- Estimated length matches learner calibration and the actual reading burden.