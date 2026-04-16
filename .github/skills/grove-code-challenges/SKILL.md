---
name: grove-code-challenges
description: >-
  Generates test-case based coding challenges for a Grove module. Produces a
  code-challenge-M*.json file compatible with the Grove offline coding engine.
  Each challenge includes a named function problem, starter code, and test cases
  (visible + hidden) that run in-browser via WASM (Python) or Function() (JS).
  Use when: adding coding practice to a module, creating hands-on exercises,
  or extending a course with practical programming challenges.
argument-hint: "Course slug and module ID (e.g. 'python-scripting-best-practices M02')"
user-invokable: true
allowed-tools:
  - editFiles
---

# Grove Code Challenges

## Purpose

Grove Code Challenges writes module-scoped coding challenges that test practical
skills with deterministic visible and hidden tests.

## Non-Negotiable Rules

- Use [references/code-challenge-contract-reference.md](references/code-challenge-contract-reference.md) as the canonical execution, schema, and validation reference.
- Every challenge must be solvable as exactly one named top-level function.
- No file I/O, network calls, or third-party imports.
- Every challenge must have at least 2 visible tests and 2 hidden tests.
- Every `expected_output` must be verified against a real solution before saving.
- `lesson_ref` must exist in `course.json`.
- When drafting multiple challenges for one module, challenge drafts may run **[PARALLEL]** after scope, `lesson_ref`, and concept mapping are fixed.
- Rebuild validation should happen after the output file is written.

## Workflow

### Phase 1 - Resolve module context

**Entry:** The caller provides a course slug and module ID.
**Exit:** The target module, lesson context, concepts, and learner context are loaded.

1. **[PARALLEL]** Load `course.json`, relevant lesson content, `concepts.json`, and learner context.
2. If the target module or lesson references do not exist, stop and report the blocker.

### Phase 2 - Select challenge scope

**Entry:** Module context is loaded.
**Exit:** A challenge plan with 1 to 4 challenges exists.

1. Choose 1 to 4 challenges, aiming for 2 to 3.
2. Map each challenge to the lesson that most directly teaches the target skill.
3. Choose concept IDs and pass criteria.

### Phase 3 - Draft prompts, starter code, and tests

**Entry:** Challenge plan exists.
**Exit:** Each challenge has a prompt, starter code, and visible plus hidden tests.

1. **[PARALLEL]** Draft each challenge once its scope and `lesson_ref` are fixed.
2. Keep each challenge within the single-function execution model.
3. Write hidden tests to catch edge cases and hardcoding.

### Phase 4 - Verify expected outputs

**Entry:** Draft challenges exist.
**Exit:** Every test case has a verified expected output.

1. Write a real solution for each challenge.
2. Run or mentally verify each visible and hidden test against that solution.
3. Correct any invalid `expected_output` before assembling the file.

### Phase 5 - Write and validate the module file

**Entry:** Verified challenges exist.
**Exit:** `code-challenge-M<NN>.json` is written and ready for the app.

1. Write `assessments/code-challenge-M<NN>.json`.
2. Run `node scripts/validate-curriculum.mjs <slug>`.
3. Run `node build-bundle.mjs <slug>`.
4. If possible, verify the challenge flow in the app.

## Output Contract

Required deliverable:

1. One `assessments/code-challenge-M<NN>.json` file for the target module.

Completion criteria:

- Each challenge uses the required schema.
- Each challenge defines exactly one named top-level function.
- Each challenge has at least 2 visible and 2 hidden tests.
- Expected outputs are verified.
- Validation and bundling commands are run after writing.

## Failure Mode Handling

| Failure | Prevention / Recovery |
| --- | --- |
| Target module or `lesson_ref` does not exist | Stop and report the missing reference instead of guessing. |
| `expected_output` is wrong | Recompute it from a real solution before saving the challenge. |
| Challenge needs multiple parameters | Wrap inputs into a single tuple, list, object, or dict argument. |
| Starter code defines multiple top-level functions | Reduce it to one named function before returning the file. |
| Visible tests are too weak | Replace them with representative normal cases and move edge cases to hidden tests. |
| Concepts or remediation lesson IDs do not align with the lesson | Re-map them to valid course or concept metadata. |

## Anti-Patterns

- Using examples that require knowledge not taught in `lesson_ref`.
- Writing starter code with `print`, sample calls, or extra top-level functions.
- Depending on randomness, time, file I/O, or network access.
- Returning unverified `expected_output` values.

## Examples

### Example 1 - Single module challenge file

Input: `python-scripting-best-practices M02`

1. Resolve module `M02` and its teaching lessons.
2. Plan 2 to 3 challenges.
3. Draft prompt, starter code, and tests for each challenge.
4. Verify expected outputs, write the JSON file, validate, and rebuild the bundle.

### Example 2 - Parallel challenge drafting

Once the lesson references and concept mapping are fixed, independent challenge drafts
for the same module can be written in parallel before the final verification pass.
