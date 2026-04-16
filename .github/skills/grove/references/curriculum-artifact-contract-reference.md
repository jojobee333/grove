# Grove Curriculum Artifact Contract

## Scope and intended use

Use this reference when Grove needs to create, validate, resume, regenerate, or bundle a course under `curriculum/[topic-slug]/`.

This reference is the canonical contract for Grove output files. The entry-point skill should point here instead of repeating full file descriptions inline.

## Required artifact set

Base project files:
- `curriculum/[topic-slug]/state.json` - workflow state for resume and completion.
- `curriculum/[topic-slug]/learner.json` - learner goal, background, and time-per-session answers.
- `curriculum/[topic-slug]/course.json` - master outline and lesson metadata.

Generated content files:
- `curriculum/[topic-slug]/lessons/L01-[slug].md` through `L0N-[slug].md`.
- `curriculum/[topic-slug]/cards.json`.
- `curriculum/[topic-slug]/assessments/quiz-M01.json` through `quiz-M0N.json`.
- `curriculum/[topic-slug]/assessments/modcheck-M01.json` through `modcheck-M0N.json`.

Adaptive v3 files:
- `curriculum/[topic-slug]/concepts.json`.
- `curriculum/[topic-slug]/learning-paths.json`.
- `curriculum/[topic-slug]/adaptive-rules.json`.

Bundle output:
- `curriculum/[topic-slug]/bundle.json`.
- `curriculum/index.json`.

## Execution flow

1. Validate the Strata source project before writing anything.
2. Resolve whether the Grove project is new, resumable, or already complete.
3. Capture learner profile answers before generating curriculum artifacts.
4. Generate `course.json` first.
5. Wait for user confirmation after showing the module list.
6. Generate lesson markdown files.
7. After lessons exist, flashcards and quizzes may run in parallel.
8. Generate module retention checks after quizzes exist.
9. Ensure `course.json` includes the required v3 lesson fields before adaptive artifact generation.
10. Generate any missing adaptive v3 files.
11. Run the bundler.
12. Mark `state.json` complete and return the completion summary.

## Validation checklist

- The Strata project contains non-empty `03-synthesis/claims.md`, `03-synthesis/narrative.md`, `02-analysis/themes.md`, and `state.json` with `phase: complete`.
- `learner.json` stores all three learner-profile answers.
- `course.json` exists before lesson generation starts.
- Every lesson in `course.json` includes `prerequisites`, `teaches_concepts`, `reinforces_concepts`, `mastery_threshold`, `difficulty`, `unlock_rule`, and `review_after_days`.
- `cards.json` exists before bundling.
- There is one quiz file and one modcheck file per module.
- `bundle.json` exists after the bundler runs.
- `curriculum/index.json` is updated by the bundler.

## Failure modes and guardrails

- Incomplete Strata source: stop and name the missing or incomplete files.
- Complete existing Grove project: summarize the current project and ask whether to regenerate.
- In-progress Grove project: resume from the last completed step instead of restarting.
- Missing v3 lesson fields: run `node scripts/migrate-course-v2-to-v3.mjs [topic-slug]` before generating adaptive artifacts or bundling.
- Partial output set: do not mark the project complete until all required artifacts exist.

## Anti-patterns

- Generating lessons before learner answers are collected.
- Generating quizzes or flashcards before lessons exist.
- Running the bundler before missing adaptive files are created.
- Marking the course complete before the bundle exists.

## Update triggers

Update this reference when Grove adds, removes, renames, or reorders any curriculum artifact under `curriculum/[topic-slug]/`.