# Grove Assessment Authoring Reference

## Scope

Use this reference when generating module quizzes and the final assessment under
`curriculum/[slug]/assessments/`.

## Required question types

- MCQ
- Short answer
- Optional essay

## Required quiz fields

- `id`, `type`, `module`, `title`, `generated`, `passing_score`, `questions`

## MCQ rules

- `lesson_ref` is required on every MCQ.
- The stem must be answerable before reading the options.
- Distractors must be plausible misconceptions.
- Do not use `all of the above` or `none of the above`.

## Calibration rules

- Use Bloom-style difficulty tags.
- Match the recall/comprehension/application/analysis ratio to `learner.json`.
- Module quizzes and final assessments should test understanding, not document trivia.

## Traceability rules

- Every correct answer must map to Strata evidence.
- Use `claim_ref` and `lesson_ref` consistently.
- Explanations must justify why the answer is correct.

## Validation checklist

- Every MCQ has `lesson_ref`.
- Every question is traceable to Strata research.
- Difficulty distribution matches the learner goal.
- Module quizzes and final assessments use the required question mix.