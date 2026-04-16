---
name: grove
description: >-
  Grove turns Strata research artifacts into a complete learning curriculum:
  a structured course outline, lesson content, a flashcard deck, and assessments.
  Use when: converting research into a course, building lessons from a Strata project,
  creating a learning plan, making flashcards from research, or any prompt containing
  "make a course", "create lessons", "learning plan", "study this", "teach me",
  "flashcards for", "quiz me on", "curriculum", or "grove". The single entry point
  for all Grove curriculum generation.
argument-hint: "Strata topic slug to convert (e.g. 'ai-regulation') or 'resume' to continue"
user-invokable: true
allowed-tools:
  - editFiles
  - search
---

# Grove - Curriculum generation from Strata

## Purpose

Grove converts a completed Strata research project into a study-ready curriculum:
course map, lessons, flashcards, quizzes, retention checks, adaptive artifacts,
and a bundle.

Command shape:

```text
/grove [topic-slug]
```

Use this skill when the user wants to turn a Strata topic into a course, lesson
sequence, flashcard deck, quiz set, or full Grove bundle.

## Non-Negotiable Rules

- Only proceed when `research/[topic-slug]/` contains non-empty `03-synthesis/claims.md`, `03-synthesis/narrative.md`, `02-analysis/themes.md`, and `state.json` with `phase: complete`.
- If the Strata project is incomplete, stop and tell the user exactly which files must be finished first.
- Ask the three learner-profile questions together before generating any curriculum artifact.
- Save learner answers to `curriculum/[topic-slug]/learner.json` before course generation begins.
- Treat `time-per-session` as a session budget cap, not a target duration for every lesson; multiple short lessons can fit in one session.
- Generate `curriculum/[topic-slug]/course.json` before lessons, flashcards, quizzes, retention checks, adaptive artifacts, or bundling.
- After the course map is created, show the module list and wait for user confirmation before lesson generation.
- Generate lessons before flashcards or quizzes.
- Mark independent phases explicitly: Step 5 and Step 6 are [PARALLEL] once lessons exist; Step 7a, Step 7b, and Step 7c are [PARALLEL] after Step 7d confirms the v3 lesson fields.
- Generate retention checks only after quizzes exist.
- Use [references/curriculum-artifact-contract-reference.md](references/curriculum-artifact-contract-reference.md) as the canonical file-contract reference.
- Use [references/modcheck-contract-reference.md](references/modcheck-contract-reference.md) as the canonical retention-check contract.
- If any required v3 lesson fields are missing from `course.json`, run `node scripts/migrate-course-v2-to-v3.mjs [topic-slug]` before adaptive artifact generation or bundling.
- Do not mark the project complete until all required curriculum artifacts exist and `bundle.json` has been generated.

## Workflow

### Phase 1 - Resolve and validate source

**Entry:** The caller provides a `topic-slug`.
**Exit:** The Strata source is validated and the Grove project state is classified as new, in-progress, or complete.

1. Look for the Strata project at `research/[topic-slug]/`.
2. Confirm the required source files listed in the Non-Negotiable Rules exist and are non-empty.
3. If any required file is missing or incomplete, stop and report the exact blockers.
4. Check `curriculum/[topic-slug]/state.json`.
5. Branch explicitly:
   - Found and complete: show the current summary and ask whether to regenerate.
   - Found and in-progress: resume from the last completed step.
   - Not found: start a new Grove project.

### Phase 2 - Capture learner profile

**Entry:** Source validation passed and the project is either new, resuming, or approved for regeneration.
**Exit:** `curriculum/[topic-slug]/learner.json` exists with learner goal, background, and time-per-session.

Ask these questions together:

1. Goal: What should the learner be able to do after finishing the course? (`understand broadly` / `apply practically` / `teach others` / `pass an exam`)
2. Background: How familiar is the learner already? (`complete beginner` / `some exposure` / `intermediate` / `deep expert in adjacent area`)
3. Time: How much time is available per session? (`15 min` / `30 min` / `1 hour` / `flexible`)

Store the answers in `curriculum/[topic-slug]/learner.json`. These answers drive lesson depth, flashcard density, assessment difficulty, and pacing.
Use the time answer to decide how many lessons fit in a session and how the learning plan should be packed, not to inflate individual lesson estimates.

### Phase 3 - Generate course map

**Entry:** Learner profile exists.
**Exit:** `curriculum/[topic-slug]/course.json` exists and the user has approved the module list.

1. Load `.github/skills/grove-map/SKILL.md` and follow it.
2. Generate `curriculum/[topic-slug]/course.json`.
3. Tell the user: `Course map created - N modules, N lessons. Review before continuing?`
4. Show the module list.
5. Wait for confirmation before moving to Phase 4.

### Phase 4 - Generate lessons

**Entry:** The course map has been generated and approved.
**Exit:** Lesson markdown files exist for each module, realistic lesson timing remains aligned with the prose, and checkpoint state has been updated after each module.

1. Load `.github/skills/grove-lessons/SKILL.md` and follow it.
2. Generate lessons one module at a time.
3. If lesson drafts materially differ from the `course.json` timing assumptions, reconcile the estimates before continuing.
4. After each module, checkpoint state before continuing.

### Phase 5 - Generate recall and quiz artifacts

**Entry:** Lessons exist for the course.
**Exit:** `cards.json`, quiz files, and modcheck files exist for every module.

1. **[PARALLEL] Step 5 - Generate flashcards**
   - Load `.github/skills/grove-cards/SKILL.md` and follow it.
   - Write `curriculum/[topic-slug]/cards.json`.
2. **[PARALLEL] Step 6 - Generate assessments**
   - Load `.github/skills/grove-assess/SKILL.md` and follow it.
   - Write one quiz per module under `curriculum/[topic-slug]/assessments/`.
3. Step 6b - Generate module retention checks after Step 6 completes.
   - Use [references/modcheck-contract-reference.md](references/modcheck-contract-reference.md).
   - **[PARALLEL]** Generate one `modcheck-[MID].json` file per module after its quiz is available.

### Phase 6 - Generate adaptive artifacts and bundle

**Entry:** Lessons, flashcards, quizzes, and retention checks exist.
**Exit:** Adaptive v3 files exist, the bundle has been built, and `curriculum/index.json` has been updated.

1. Step 7d - Confirm `course.json` has `prerequisites`, `teaches_concepts`, `reinforces_concepts`, `mastery_threshold`, `difficulty`, `unlock_rule`, and `review_after_days` for every lesson.
2. If any field is missing, run:

```text
node scripts/migrate-course-v2-to-v3.mjs [topic-slug]
```

3. **[PARALLEL] Step 7a - Generate `concepts.json` if missing.**
   - Derive one concept per distinct `teaches_concepts` value across lessons.
   - Use `schemas/concepts.schema.json` for structure.
4. **[PARALLEL] Step 7b - Generate `learning-paths.json` if missing.**
   - Always include `default-path` with all lessons.
   - Add 1-3 additional paths aligned to the learner goal.
5. **[PARALLEL] Step 7c - Generate `adaptive-rules.json` if missing.**
   - Include progression, review, mastery, and remediation defaults.
6. Run the bundler:

```text
node build-bundle.mjs [topic-slug]
```

7. Treat [references/curriculum-artifact-contract-reference.md](references/curriculum-artifact-contract-reference.md) as the canonical file contract for the bundle inputs and outputs.

### Phase 7 - Finalize and hand off

**Entry:** Bundle generation succeeded.
**Exit:** `state.json` is complete and the user receives a completion summary plus study handoff.

1. Update `curriculum/[topic-slug]/state.json` to `phase: complete`.
2. Return a completion summary containing:
   - Topic and source project path.
   - Learner profile summary.
   - Counts for modules, lessons, flashcards, quizzes, modchecks, concepts, and learning paths.
   - Key output files from the curriculum artifact contract reference.
3. End with the study handoff:

```text
1. cd grove/
2. npx serve .
3. Open http://localhost:3000
4. Click "Load bundle.json" and select curriculum/[slug]/bundle.json
```

## Output Contract

Required deliverables:

1. `learner.json`, `course.json`, lesson markdown files, `cards.json`, quiz files, and modcheck files under `curriculum/[topic-slug]/`.
2. Missing adaptive v3 files before bundling: `concepts.json`, `learning-paths.json`, and `adaptive-rules.json`.
3. `bundle.json` and an updated `curriculum/index.json`.
4. A completion summary with counts and study instructions.

The skill is complete when all of the following are true:

- The Strata source project passed validation.
- `learner.json` exists before course generation.
- `course.json` was generated before lesson generation.
- Lessons exist before flashcards and assessments begin.
- Each module has both a quiz file and a modcheck file.
- Every lesson in `course.json` has the required v3 metadata fields.
- The bundle has been generated successfully.
- `curriculum/[topic-slug]/state.json` is marked complete.
- The user received the completion summary and study handoff.

## Failure Mode Handling

| Failure | Prevention / Recovery |
| --- | --- |
| Required Strata source files are missing or incomplete | Stop immediately and tell the user exactly which files in `research/[topic-slug]/` must be completed. |
| Existing Grove project is already complete | Show the current summary and ask whether to regenerate before writing new artifacts. |
| Existing Grove project is in progress | Resume from the last completed step instead of restarting from scratch. |
| Learner profile was not captured before generation | Ask the three learner questions together, write `learner.json`, then continue. |
| `course.json` is missing required v3 lesson fields | Run `node scripts/migrate-course-v2-to-v3.mjs [topic-slug]` before adaptive generation or bundling. |
| Quizzes are missing when modchecks are about to be generated | Finish Step 6 first, then generate modchecks using the modcheck contract reference. |
| Bundle generation fails or required artifacts are missing | Do not mark the project complete; repair the missing artifact set from the curriculum artifact contract reference, then rerun the bundler. |

## Anti-Patterns

- Starting curriculum generation from incomplete Strata research.
- Asking learner questions one at a time across multiple turns when all three can be collected together.
- Generating lessons before the course map is approved.
- Running flashcards, quizzes, or bundling before lesson generation is complete.
- Generating modchecks before quizzes exist.
- Marking the project complete before `bundle.json` is present.
- Repeating full file schemas inline when the contract already exists in the reference docs.

## Examples

### Example 1 - New course from a completed Strata project

Input: `/grove ai-regulation`

1. Validate `research/ai-regulation/`.
2. Ask the learner-profile questions and save `learner.json`.
3. Run Grove Map and wait for approval on the module list.
4. Generate lessons.
5. Run flashcards and quizzes in parallel, then generate one modcheck per module.
6. Repair missing v3 lesson fields if needed, generate missing adaptive files, bundle, and mark the project complete.

### Example 2 - Resume an interrupted Grove run

Input: `/grove resume`

1. Detect an in-progress `curriculum/[topic-slug]/state.json`.
2. Resume from the last completed phase instead of restarting.
3. Preserve completed outputs, generate the missing artifacts, rerun the bundler if needed, and return the completion summary.
