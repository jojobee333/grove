---
name: grove-cards
description: >-
  Generates a spaced-repetition flashcard deck from Strata claims and lessons.
  Each card tests one atomic piece of knowledge. Produces cards.json compatible
  with the Grove learning app's built-in SM-2 spaced repetition scheduler.
  Use when: creating flashcards, building a recall deck, making study cards.
argument-hint: "Topic slug (e.g. 'ai-regulation')"
user-invokable: true
allowed-tools:
  - editFiles
---

# Grove Cards

## Purpose

Grove Cards generates a spaced-repetition flashcard deck from lessons and Strata
claims. It produces `cards.json` for the Grove app and focuses on atomic recall.

## Non-Negotiable Rules

- Use [references/cards-authoring-reference.md](references/cards-authoring-reference.md) as the canonical card-type, schema, calibration, and validation reference.
- One card tests one fact, distinction, or application.
- Every card must stay concise and sourced.
- `lesson` is required on every card because the bundler uses it for adaptive enrichment.
- Do not author adaptive fields that the bundler injects automatically.
- Match card density and card mix to `learner.json`.
- When generating across many lessons, write independent lesson card sets **[PARALLEL]** only after the source context for each lesson is resolved.

## Workflow

### Phase 1 - Resolve input scope

**Entry:** The caller provides a topic slug.
**Exit:** The course, lessons, claims, and learner profile are loaded.

1. **[PARALLEL]** Load `course.json`, `learner.json`, lesson files, relevant Strata claims, and contradiction notes when present.
2. If lessons are missing, stop and require Grove Lessons output first.

### Phase 2 - Build the card inventory

**Entry:** Input scope is loaded.
**Exit:** Each lesson has a planned card mix.

1. Decide card density by learner goal.
2. Select card types that fit the lesson and claim material.
3. Avoid duplicating prompts that test the same thing.

### Phase 3 - Draft card objects

**Entry:** Card inventory exists.
**Exit:** Card objects exist for all target lessons.

1. **[PARALLEL]** Draft card sets lesson by lesson once source context is complete.
2. Keep fronts narrow and backs concise.
3. Set the standard initial `sr` state for every card.

### Phase 4 - Assemble and validate `cards.json`

**Entry:** Card objects are drafted.
**Exit:** `curriculum/[slug]/cards.json` is complete and internally consistent.

1. Write the deck file.
2. Confirm `total_cards` matches the card count.
3. Confirm no forbidden adaptive fields were authored manually.
4. Confirm there are no near-duplicate cards.

## Output Contract

Required deliverable:

1. `curriculum/[slug]/cards.json` containing deck metadata and a `cards` array.

Completion criteria:

- Every card uses the required schema.
- Every card is atomic and sourced.
- The `lesson` field is present.
- `total_cards` matches the number of cards written.
- Card mix matches learner calibration.

## Failure Mode Handling

| Failure | Prevention / Recovery |
| --- | --- |
| Lessons do not exist yet | Stop and wait for Grove Lessons output instead of inventing card content. |
| Cards duplicate the same knowledge point | Merge or remove the weaker duplicate before saving. |
| A card front asks multiple things | Split it into multiple cards. |
| Adaptive fields are authored manually | Remove them and rely on bundler enrichment. |
| `lesson` or source traceability is missing | Add the missing reference before returning completion. |
| Card density ignores the learner goal | Rebalance the deck using the card calibration rules. |

## Anti-Patterns

- Yes or no cards.
- Trivia cards that do not reflect understanding.
- Answers longer than four sentences.
- Slightly reworded duplicates.
- One oversized card that should be several smaller cards.

## Examples

### Example 1 - Practical learner profile

If the learner goal is `apply practically`, increase application cards and keep the
deck centered on situations where the lesson content is used.

### Example 2 - Multi-lesson batch generation

For a full course deck, resolve the lesson set first, then draft lesson-specific card
sets in parallel once each lesson has complete claim and source context.
