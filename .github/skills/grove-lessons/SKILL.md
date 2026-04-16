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

# Grove Lessons

## Purpose

Grove Lessons writes lesson markdown that teaches one main idea clearly and stays
traceable to Strata research. It expands an approved course outline into lesson files.

## Non-Negotiable Rules

- Use [references/lesson-authoring-reference.md](references/lesson-authoring-reference.md) as the canonical lesson template, lesson-type guide, calibration guide, and traceability contract.
- Each lesson must be readable without an LLM.
- Every factual claim must trace to Strata research.
- Do not introduce new unsupported facts.
- Respect the lesson type from `course.json`.
- Match lesson depth and length to `learner.json`.
- Slightly favor comprehensive teaching over terse summaries: explain the why, include at least one substantial worked example or counterexample, and surface recognition cues, failure modes, or decision rules when the lesson type allows.
- Keep the lesson's actual scope aligned with `estimated_minutes`; if the draft lands much shorter than the estimate, lower the estimate or deepen the lesson before finalizing.
- Keep `Key points` to 3 to 5 bullets.
- When multiple lessons are requested, only write them **[PARALLEL]** after the outline and source context for each target lesson are resolved.

## Workflow

### Phase 1 - Resolve target lessons

**Entry:** The caller provides a topic slug and optionally a lesson ID.
**Exit:** A concrete lesson target list exists.

1. Read `curriculum/[slug]/course.json`.
2. If a lesson ID was provided, target only that lesson.
3. Otherwise target all lessons that still need content.

### Phase 2 - Load source context

**Entry:** Target lesson list exists.
**Exit:** Each target lesson has claim, narrative, source, and learner context.

1. **[PARALLEL]** Load lesson metadata from `course.json`, the matching claim from `claims.md`, narrative context, cited sources, and `learner.json`.
2. If a required claim or source trail is missing, stop and report the gap.

### Phase 3 - Build lesson outlines

**Entry:** Source context exists for each target lesson.
**Exit:** Each lesson has a structure aligned to its type and learner calibration.

1. Use the lesson template from the lesson authoring reference.
2. Match section emphasis to the lesson type.
3. Size the lesson to the learner background and the lesson's own estimated-minute band, not the full session-time budget.

### Phase 4 - Draft lesson files

**Entry:** Lesson outlines are complete.
**Exit:** Markdown lesson files exist for each target lesson.

1. **[PARALLEL]** Draft each target lesson once its outline and sources are resolved.
2. Keep examples concrete and clearly illustrative.
3. For core and applied lessons, include at least one worked example and at least one recognition cue, common mistake, or decision rule unless the source material genuinely does not support it.
4. Add previous and next navigation links.

### Phase 5 - Validate the lessons

**Entry:** Draft lesson files exist.
**Exit:** Lessons are traceable, calibrated, and ready for downstream cards and assessments.

1. Confirm every factual claim is source-backed.
2. Confirm the lesson length matches the learner calibration.
3. Confirm the file follows the lesson template.
4. Confirm the estimated time is believable for the actual prose and examples; reconcile `course.json` if needed.
5. Trim sections that add no value.

## Output Contract

Required deliverable:

1. One markdown lesson file per target lesson under `curriculum/[slug]/lessons/`.

Completion criteria:

- The file includes the standard lesson header and core sections.
- The structure matches the lesson type.
- Facts are traceable to Strata sources.
- The lesson is calibrated to `learner.json`.
- Navigation links are present.

## Failure Mode Handling

| Failure | Prevention / Recovery |
| --- | --- |
| `course.json` is missing or incomplete | Stop and require Grove Map output before writing lessons. |
| Claim or source context is missing | Stop and report the missing claim or source rather than inventing content. |
| Lesson type structure is wrong | Rebuild the section order using the lesson authoring reference before saving. |
| Lesson is too long or too shallow for the learner profile | Recalibrate length, examples, and depth before finalizing the file. |
| Lesson estimate is inflated relative to the actual draft | Lower the estimate or expand the lesson with additional substance before finalizing. |
| Examples introduce new factual claims | Reframe them as illustrative examples or remove them. |
| Lesson covers too many ideas | Narrow the lesson to one main concept and move overflow to another lesson if needed. |

## Anti-Patterns

- Using jargon without defining it for beginners.
- Listing everything instead of selecting the most important takeaways.
- Ending with filler summaries that add no teaching value.
- Treating unresolved research contradictions as settled facts.

## Examples

### Example 1 - Single lesson rewrite

Input: `ai-regulation L03`

1. Resolve lesson `L03` from `course.json`.
2. Load its claim, narrative context, sources, and learner profile.
3. Draft the markdown file with the correct lesson type structure.
4. Verify traceability and calibration before returning completion.

### Example 2 - Batch lesson generation

If the user requests all remaining lessons, resolve the target list first, then draft
independent lesson files in parallel once each lesson has complete source context.
