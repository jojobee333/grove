# Grove Code Challenge Contract

## Scope

Use this reference when generating `assessments/code-challenge-M<NN>.json` for a Grove module.

## Execution model

- The learner writes one named function.
- Each test provides one input expression.
- The engine calls `functionName(input)`.
- Visible tests run on `Run Tests`; all tests run on `Submit`.

## Required challenge fields

- `id`, `type`, `language`, `prompt`, `starter_code`, `test_cases`, `concepts`, `cognitive_level`, `weight`, `difficulty`, `lesson_ref`, `pass_criteria`, `remediation_lesson_ids`

## Test-case rules

- At least 2 visible tests and 2 hidden tests.
- `input` must be a valid single-argument expression.
- `expected_output` must match stringified runtime output exactly.
- Test names should describe behavior, not test IDs.

## Authoring rules

- One top-level named function only.
- No file I/O, network calls, or third-party imports.
- The prompt must be solvable with knowledge taught in `lesson_ref`.
- Concepts should align with `concepts.json` or the lesson's `teaches_concepts`.

## Validation checklist

- Expected outputs have been verified against a real solution.
- `lesson_ref` exists in `course.json`.
- Concept IDs exist or align with lesson concepts.
- The function name in `starter_code` matches the prompt.
- Pass criteria are appropriate for the test count.