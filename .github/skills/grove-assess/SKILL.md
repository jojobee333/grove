---
name: grove-assess
description: >-
  Generates module assessments and a cumulative final assessment from lesson content
  and Strata claims. Produces JSON quiz files compatible with the Grove learning app.
  Each quiz includes MCQ, short answer with answer key, and optional essay prompts.
  Use when: creating quizzes, assessments, tests, or evaluation checkpoints.
argument-hint: "Topic slug and optional module ID (e.g. 'ai-regulation' or 'ai-regulation M02')"
user-invokable: true
allowed-tools:
  - editFiles
---

# Grove Assess

## Purpose

Grove Assess writes module quizzes and final assessments that test real understanding
with answers traceable to Strata research.

## Non-Negotiable Rules

- Use [references/assessment-authoring-reference.md](references/assessment-authoring-reference.md) as the canonical schema, MCQ, calibration, and traceability reference.
- Every correct answer must be supported by Strata research.
- Every MCQ must include `lesson_ref`.
- Difficulty mix must align with `learner.json`.
- Avoid trivia questions that only test source recall.
- When generating multiple module quizzes, write them **[PARALLEL]** only after the lesson and claim context for each module is loaded.
- Generate the final assessment only after module coverage is understood.

## Workflow

### Phase 1 - Resolve assessment scope

**Entry:** The caller provides a topic slug and optionally a module ID.
**Exit:** The target assessment set is defined.

1. If a module ID is provided, target that module quiz only.
2. Otherwise target all module quizzes and the final assessment.

### Phase 2 - Load assessment context

**Entry:** The target assessment set is defined.
**Exit:** Lesson, claim, and learner context exists for each target.

1. **[PARALLEL]** Load `course.json`, lesson content, relevant Strata claims, and `learner.json`.
2. If lessons are missing, stop and require Grove Lessons output first.

### Phase 3 - Build assessment blueprints

**Entry:** Assessment context is loaded.
**Exit:** Each target assessment has question counts, difficulty ratios, and traceability anchors.

1. Set the question mix for module and final assessments.
2. Allocate Bloom-style difficulty by learner goal.
3. Map each planned question to a `claim_ref` and, for MCQs, a `lesson_ref`.

### Phase 4 - Draft assessment files

**Entry:** Blueprints are complete.
**Exit:** Quiz JSON files exist for each target.

1. **[PARALLEL]** Draft module quiz files after module context is complete.
2. Draft the final assessment after sampling coverage across modules.
3. Add explanations and answer keys with clear grading guidance.

### Phase 5 - Validate traceability and structure

**Entry:** Assessment files are drafted.
**Exit:** Files are ready for bundling.

1. Confirm every MCQ includes `lesson_ref`.
2. Confirm every question has defensible Strata support.
3. Confirm difficulty ratios align with the learner goal.
4. Remove any question that tests document trivia instead of understanding.

## Output Contract

Required deliverables:

1. One `quiz-Mxx.json` file per targeted module.
2. One final assessment file when full-course generation is requested.

Completion criteria:

- Every file uses the required quiz schema.
- Every MCQ has `lesson_ref`.
- Every question is traceable to the research.
- Difficulty distribution matches learner calibration.
- Module and final assessments use the intended question mix.

## Failure Mode Handling

| Failure | Prevention / Recovery |
| --- | --- |
| Lesson content is missing | Stop and wait for Grove Lessons output instead of fabricating questions. |
| MCQ is missing `lesson_ref` | Add the correct lesson reference before returning the file. |
| Correct answer is not traceable to Strata | Remove or rewrite the question using supported evidence. |
| Difficulty mix does not match learner goal | Rebalance the blueprint and replace the mismatched questions. |
| Distractors are obviously wrong | Rewrite them as plausible misconceptions. |
| Final assessment overweights one module | Re-sample questions for broader module coverage. |

## Anti-Patterns

- Asking what a specific source document said instead of what the learner should understand.
- Using `all of the above` or `none of the above`.
- Treating non-MCQ questions as though they need `lesson_ref` for adaptive enrichment.
- Returning a quiz without answer explanations.

## Examples

### Example 1 - Single module quiz

Input: `ai-regulation M02`

1. Resolve module `M02`.
2. Load its lessons, claims, and learner profile.
3. Draft the quiz with the correct difficulty mix.
4. Validate `lesson_ref` and traceability before completion.

### Example 2 - Full-course assessment pass

When the user requests all assessments, generate module quizzes in parallel after
their module context is ready, then draft the final assessment from cross-module coverage.
