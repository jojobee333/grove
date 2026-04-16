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

# Grove — Curriculum generation from Strata

Grove reads Strata research artifacts and produces a complete, structured
curriculum that can be studied with or without an LLM.

```
/grove [topic-slug]

  Strata artifacts  →  course map  →  lessons  →  flashcards  →  assessments
  (your research)      (outline)      (content)    (recall)       (testing)
```

## Step 1 — Validate Strata input

Look for the Strata project at `research/[topic-slug]/`.

Required files (all must exist and be non-empty):
- `03-synthesis/claims.md` — the conclusions to teach
- `03-synthesis/narrative.md` — the explanatory prose
- `02-analysis/themes.md` — the module structure
- `state.json` — phase must be `complete`

If any are missing or incomplete: tell the user which files need to be finished
in Strata first. Do not proceed with incomplete research.

Check for an existing Grove project at `curriculum/[topic-slug]/state.json`:
- **Found, complete** → show summary, ask if they want to regenerate anything
- **Found, in-progress** → resume from last completed step
- **Not found** → new project, proceed to Step 2

## Step 2 — Ask learner profile questions

Before generating anything, ask these three questions together:

1. **Goal**: What do you want to be able to do after completing this course?
   (understand broadly / apply practically / teach others / pass an exam)

2. **Background**: How familiar are you with this topic already?
   (complete beginner / some exposure / intermediate / deep expert in adjacent area)

3. **Time**: How much time can you commit per session?
   (15 min / 30 min / 1 hour / flexible)

Store answers in `curriculum/[topic-slug]/learner.json`. These drive:
- Lesson depth and length
- Flashcard density
- Assessment difficulty
- Pacing in the learning plan

## Step 3 — Generate course map (invoke /grove-map)

Load `.github/skills/grove-map/SKILL.md` and follow its instructions.

This produces `curriculum/[topic-slug]/course.json` — the master outline.

Tell the user: "Course map created — N modules, N lessons. Review before continuing?"
Show the module list and wait for confirmation.

## Step 4 — Generate lessons (invoke /grove-lessons)

Load `.github/skills/grove-lessons/SKILL.md` and follow its instructions.

Generate lessons one module at a time. After each module, checkpoint state.

## Step 5 — Generate flashcards (invoke /grove-cards)

Load `.github/skills/grove-cards/SKILL.md` and follow its instructions.

Produces `curriculum/[topic-slug]/cards.json`.

## Step 6 — Generate assessments (invoke /grove-assess)

Load `.github/skills/grove-assess/SKILL.md` and follow its instructions.

Produces `curriculum/[topic-slug]/assessments/` with one quiz per module.

### Step 6b — Generate module retention checks

After generating quizzes, create a short retention check for every module.
Write one file per module: `curriculum/[topic-slug]/assessments/modcheck-[MID].json`.

Each file must follow this schema:

```json
{
  "module": "M01",
  "title": "[Module Title] — Quick Check",
  "questions": [
    { "id": "MC01-1", "q": "...", "a": "..." },
    { "id": "MC01-2", "q": "...", "a": "..." },
    { "id": "MC01-3", "q": "...", "a": "..." }
  ]
}
```

Rules:
- 3–5 questions per module — no more, no less
- Questions must be recall-level (not recognition): no multiple-choice, just open-ended prompts
- Answers should be 1–3 sentences — concise, no padding
- IDs use the pattern `MC[module-num]-[question-num]`, e.g. `MC01-2`
- Questions should target the module’s stated learning objectives from `course.json`
- Do NOT duplicate questions already present in the module’s `quiz-*.json`

## Step 7 — Build the bundle

After all content is generated, run the bundler to produce a single v3 bundle:

```
node build-bundle.mjs [topic-slug]
```

The bundler reads `course.json`, all lesson `.md` files, `cards.json`,
`assessments/`, and the three v3 adaptive artifacts (if present), then writes
`curriculum/[topic-slug]/bundle.json`.

The v3 bundle shape:

```json
{
  "version": "3.0",
  "slug":    "[topic-slug]",
  "bundled": "<ISO timestamp>",
  "course":  { /* course.json contents */ },
  "learner": { /* learner.json contents */ },
  "lessons": {
    "L01": "# full markdown content of L01",
    "L02": "# full markdown content of L02"
  },
  "cards": [ /* enriched cards (concepts, cognitive_level, weight, reviewable added) */ ],
  "quizzes": {
    "M01": { /* quiz-M01.json with enriched questions */ }
  },
  "modchecks": {
    "M01": { /* modcheck-M01.json */ }
  },
  "concepts":      { /* concepts.json contents  — empty shell if file missing */ },
  "adaptiveRules": { /* adaptive-rules.json      — empty object if file missing */ },
  "learningPaths": { /* learning-paths.json      — {paths:[]} if file missing */ }
}
```

Also update (or create) `curriculum/index.json` — the bundler handles this automatically.

**If the v3 adaptive artifacts are missing**, generate them before running the bundler:

### Step 7a — Generate `concepts.json`

Create `curriculum/[topic-slug]/concepts.json`:

```json
{
  "slug": "[topic-slug]",
  "concepts": [
    {
      "id": "concept-id",
      "title": "Human-readable title",
      "depends_on": ["other-concept-id"],
      "introduced_in": ["L01"],
      "reinforced_in": ["L03", "L05"],
      "assessment_sources": ["M01"]
    }
  ]
}
```

Derive one concept per distinct `teaches_concepts` entry across all lessons.
Use the `concepts.schema.json` in `schemas/` for reference.

### Step 7b — Generate `learning-paths.json`

Create `curriculum/[topic-slug]/learning-paths.json`:

```json
{
  "slug": "[topic-slug]",
  "generated": "YYYY-MM-DD",
  "paths": [
    {
      "id": "default-path",
      "title": "Complete Course",
      "description": "All lessons in recommended order.",
      "lessons": ["L01", "L02", "..."],
      "focus_areas": []
    }
  ]
}
```

Always include a `default-path` with all lessons. Add 1–3 tailored paths based on
the learner's stated goal (e.g. fast-track, teach-others, security-focus).

### Step 7c — Generate `adaptive-rules.json`

Create `curriculum/[topic-slug]/adaptive-rules.json`:

```json
{
  "slug": "[topic-slug]",
  "progression_rules": {
    "unlock_threshold": 0.75,
    "remediation_trigger": { "consecutive_failures": 2 }
  },
  "review_policy": {
    "intervals_days": [1, 3, 7, 14],
    "max_daily_reviews": 20,
    "decay_after_days": 21
  },
  "mastery_defaults": {
    "core": 0.80,
    "applied": 0.80,
    "debate": 0.75,
    "gap": 0.75
  },
  "remediation_policy": {
    "suggest_lessons":        true,
    "suggest_flashcard_review": true
  }
}
```

### Step 7d — Ensure course.json has v3 lesson fields

Every lesson in `course.json` must have:
`prerequisites`, `teaches_concepts`, `reinforces_concepts`, `mastery_threshold`,
`difficulty` (1–5), `unlock_rule`, `review_after_days`.

If any are missing, run the migration script first:
```
node scripts/migrate-course-v2-to-v3.mjs [topic-slug]
```

## Step 8 — Final output

Update `curriculum/[topic-slug]/state.json` to `phase: complete`.

Show the completion summary:

```
Grove curriculum complete
────────────────────────────────────────
Topic:       [topic]
Source:      Strata project research/[slug]/
Learner:     [goal] · [background] · [time/session]

Curriculum:
  Modules:     N
  Lessons:     N (avg N min each)
  Flashcards:  N cards
  Assessments: N quizzes (N questions total)
  Mod checks:  N retention checks (3–5 questions each)
  Concepts:    N adaptive concepts
  Paths:       N learning paths

Files:
  → curriculum/[slug]/course.json
  → curriculum/[slug]/lessons/L01.md … L0N.md
  → curriculum/[slug]/cards.json
  → curriculum/[slug]/assessments/quiz-*.json
  → curriculum/[slug]/assessments/modcheck-*.json
  → curriculum/[slug]/learner.json
  → curriculum/[slug]/concepts.json       ← adaptive concept graph
  → curriculum/[slug]/learning-paths.json ← learner paths
  → curriculum/[slug]/adaptive-rules.json ← progression rules
  → curriculum/[slug]/bundle.json         ← single-file v3 app bundle
  → curriculum/index.json                 ← course registry

To study:
  1. cd grove/
  2. npx serve .
  3. Open http://localhost:3000
  4. Click "Load bundle.json" and select curriculum/[slug]/bundle.json
────────────────────────────────────────
```

## Curriculum folder structure

```
curriculum/
├── index.json              ← course registry (all courses)
└── [topic-slug]/
    ├── state.json          ← Grove session state
    ├── learner.json        ← learner profile
    ├── course.json         ← master outline + learning plan (v3 lesson fields)
    ├── bundle.json         ← single-file v3 bundle for the app
    ├── concepts.json       ← adaptive concept graph (v3)
    ├── learning-paths.json ← learner path definitions (v3)
    ├── adaptive-rules.json ← progression + review rules (v3)
    ├── lessons/
    │   ├── L01-[slug].md   ← source markdown (also embedded in bundle)
    │   └── L0N-[slug].md
    ├── cards.json          ← full flashcard deck (also embedded in bundle)
    └── assessments/
        ├── quiz-M01.json       ← one full quiz per module (also embedded in bundle)
        ├── quiz-M0N.json
        ├── modcheck-M01.json   ← 3–5 short retention Qs per module
        └── modcheck-M0N.json
```
