# Grove Map Outline Generation Reference

## Scope

Use this reference when generating `curriculum/[slug]/course.json` from Strata analysis
and learner profile inputs.

## Required inputs

- `research/[slug]/02-analysis/themes.md`
- `research/[slug]/03-synthesis/claims.md`
- `research/[slug]/03-synthesis/narrative.md`
- `research/[slug]/02-analysis/contradictions.md`
- `research/[slug]/02-analysis/gaps.md`
- `curriculum/[slug]/learner.json`

## Mapping rules

- Each theme becomes one module.
- Foundational modules come before applied modules.
- Contradictions belong near the end, after core context exists.
- Gaps and limitations come last.
- Strong claims become core lessons.
- Moderate claims become standard or applied lessons.
- Weak claims become frontier or debated lessons.

## Learner calibration rules

- Goal affects lesson emphasis and learning objective verbs.
- Background affects whether to add foundations or skip basics.
- Session time affects lesson count and estimated minutes.

## Estimated time rubric

- `estimated_minutes` means focused reading / study time for the lesson prose and inline examples only; do not include external drills, coding practice, or quiz time.
- Treat session time as a packing constraint for the learning plan, not a target duration for each lesson.
- Default to conservative estimates:
	- `8-10 min`: one narrow concept, one worked example, limited branching.
	- `10-15 min`: standard core or applied lesson with one substantial example plus recognition cues, pitfalls, or decision rules.
	- `15-18 min`: dense lesson with two worked examples, a comparison, or a more involved debate.
	- `20-25 min`: reserve for capstone-style synthesis, multi-angle debates, or lessons with multiple substantial examples.
- If the planned lesson is roughly `800-1200` words, start around `8-12` minutes unless the structure clearly demands more.
- If a lesson needs more than `25` minutes, split it unless there is a strong pedagogical reason not to.
- For `30 min` or `1 hour` learner sessions, usually fit multiple lessons into a session instead of stretching each lesson to match the session budget.

## Required `course.json` fields

- Course-level metadata: `topic`, `slug`, `strata_source`, `generated`, `learner`, `summary`.
- Module-level metadata: `id`, `title`, `strata_theme`, `description`, `objectives`, `lessons`, `has_assessment`.
- Lesson-level metadata: `id`, `title`, `strata_claim`, `type`, `estimated_minutes`, `description`, `difficulty`, `prerequisites`, `teaches_concepts`, `reinforces_concepts`, `mastery_threshold`, `unlock_rule`, `review_after_days`.
- Totals: `total_lessons`, `total_estimated_hours`.
- Learning plan: `sessions_to_complete`, `suggested_schedule`, `milestone_lessons`.

## Validation checklist

- Objectives use measurable verbs.
- Every lesson has the full v3 adaptive field set.
- `teaches_concepts` is populated for lessons that introduce concepts.
- Lesson ordering respects prerequisites.
- Estimated minutes are plausible for the planned lesson scope and do not default to a repeated `25` / `30` minute pattern without justification.
- `sessions_to_complete` reflects the summed lesson minutes divided by the learner session budget, with reasonable packing for prerequisites and checkpoints.
- `node scripts/validate-curriculum.mjs [slug]` passes after writing `course.json`.

## Failure guards

- Missing learner profile: stop until `learner.json` exists.
- Empty theme or claim set: stop and report the missing Strata artifact.
- Invalid v3 lesson fields: repair before returning the outline.