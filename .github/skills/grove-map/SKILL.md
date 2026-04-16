---
name: grove-map
description: >-
  Converts Strata themes and claims into a structured course outline and learning
  plan. Use when: building a course structure from research, creating a module
  outline, mapping learning objectives, or designing a curriculum skeleton.
  Typically called by /grove but can be invoked alone to just regenerate the outline.
argument-hint: "Strata topic slug (e.g. 'ai-regulation')"
user-invokable: true
allowed-tools:
  - editFiles
---

# Grove Map

## Purpose

Grove Map converts Strata analysis plus learner profile inputs into a structured
`curriculum/[slug]/course.json` outline. It designs course architecture only; it does
not write lesson prose.

## Non-Negotiable Rules

- Read the full required input set before mapping modules or lessons.
- Use [references/outline-generation-reference.md](references/outline-generation-reference.md) as the canonical input, calibration, and `course.json` contract.
- Each theme becomes one module.
- Sequence modules from foundations to applications, then contradictions, then gaps.
- Use measurable Bloom-style verbs in objectives; do not use `understand` or `know`.
- Every lesson must include the full v3 adaptive field set.
- `teaches_concepts` must be populated for lessons that introduce concepts.
- If `learner.json` is missing, stop rather than guessing calibration.
- Treat learner session time as a cap for grouping lessons into sessions, not a reason to inflate every lesson into a 25- to 40-minute block.
- Run `node scripts/validate-curriculum.mjs [slug]` after writing `course.json`.

## Workflow

### Phase 1 - Resolve inputs

**Entry:** The caller provides a Strata topic slug.
**Exit:** All required Strata artifacts and `learner.json` are loaded.

1. **[PARALLEL]** Load `themes.md`, `claims.md`, `narrative.md`, `contradictions.md`, `gaps.md`, and `learner.json`.
2. If any required file is missing or empty, stop and report the exact blocker.

### Phase 2 - Build the module skeleton

**Entry:** Inputs are loaded.
**Exit:** Every module has an ID, title, theme, sequence position, and assessment flag.

1. Convert each theme into one module.
2. Order modules so foundational context appears before applied material.
3. Push contradiction-heavy modules near the end.
4. Place gap or limitation modules last.

### Phase 3 - Build the lesson skeleton

**Entry:** Module skeleton exists.
**Exit:** Every lesson has type, ordering, description, estimated minutes, and adaptive fields.

1. Map strong claims to core lessons.
2. Map moderate claims to standard or applied lessons.
3. Map weak or speculative claims to frontier or debated lessons.
4. Add contradiction and gap lessons where the Strata analysis requires them.
5. Fill the v3 lesson fields from the outline generation reference.

### Phase 4 - Calibrate to the learner profile

**Entry:** Modules and lesson skeletons exist.
**Exit:** Lesson count, pacing, and difficulty reflect `learner.json`.

1. Adjust module and lesson density by learner goal.
2. Add or remove foundational scaffolding by learner background.
3. Scale lesson count and estimated minutes by session-time target without trying to fill the entire session budget with every lesson.
4. Prefer multiple focused lessons per session when the material is narrow; reserve 20+ minute lessons for genuinely dense synthesis or multi-example material.

### Phase 5 - Assemble and validate the output

**Entry:** The calibrated outline is complete.
**Exit:** `course.json` is written and validated.

1. Write `curriculum/[slug]/course.json`.
2. Ensure totals and learning-plan fields are populated from summed lesson minutes and the learner's session budget, not raw lesson count alone.
3. Run `node scripts/validate-curriculum.mjs [slug]`.
4. If validation fails, repair the invalid fields before returning completion.

## Output Contract

Required deliverable:

1. `curriculum/[slug]/course.json` with course metadata, module metadata, lesson metadata, totals, and learning plan.

Completion criteria:

- Every theme is represented as one module.
- Every lesson has a valid type and the full v3 adaptive field set.
- Objectives use measurable verbs.
- The outline matches the learner profile.
- Validation passes after writing the file.

## Failure Mode Handling

| Failure | Prevention / Recovery |
| --- | --- |
| Missing Strata inputs | Stop and name the missing file instead of inferring content. |
| Missing `learner.json` | Stop and require Grove to collect the learner profile first. |
| Modules are sequenced without prerequisites in mind | Reorder modules from foundations to applications before finalizing the file. |
| Lessons are missing v3 fields | Repair the missing fields before validation or return. |
| Concept IDs do not align with adaptive metadata needs | Add or correct `teaches_concepts` and `reinforces_concepts` before saving. |
| Lesson estimates cluster around 25 to 30 minutes without enough planned depth | Recalibrate the lesson minutes downward or split / expand the lesson before saving. |
| Validation script fails | Fix the reported schema issues and rerun validation. |

## Anti-Patterns

- Writing lesson prose inside `course.json`.
- Copying claims into objectives without converting them into measurable outcomes.
- Treating contradictions or gaps as beginner-first material.
- Returning a course outline without validation.

## Examples

### Example 1 - Standard outline generation

Input: `ai-regulation`

1. Load Strata artifacts and `learner.json`.
2. Convert themes into modules.
3. Map claims to lessons and calibrate density.
4. Write `course.json` and validate it.

### Example 2 - Beginner learner profile

If `learner.json` says beginner with 15-minute sessions, add a foundations module,
keep lessons short, and avoid overloading each module with too many lessons.
