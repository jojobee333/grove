# Grove

A spaced-repetition learning app with adaptive curriculum support. Load a course bundle and Grove tracks your mastery across flashcards, quizzes, and lessons — surfacing what to study next based on what you actually know.

---

## Quick start

### Prerequisites

- Node.js 18+
- Any static file server (`npx serve`, VS Code Live Server, etc.)

### 1. Open the app

```sh
cd grove
npx serve .
# open http://localhost:3000/app
```

Or open `app/index.html` directly in a browser (file:// works for everything except bundle fetching).

### 2. Build a bundle

The app loads a single `bundle.json` file. Build one from a curriculum folder:

```sh
node build-bundle.mjs python-scripting-best-practices
node build-bundle.mjs meridian-tech-stack-mastery
```

This writes `curriculum/<slug>/bundle.json`.

### 3. Load the bundle in the app

1. Click **"Load bundle.json"** in the app header
2. Navigate to `curriculum/<slug>/bundle.json`
3. The app unlocks the adaptive views: **My progress**, **Learning paths**, **What's next?**

> You can also load a plain `course.json` — the app works in basic mode without adaptive features.

---

## Available courses

| Slug | Lessons | Cards | Concepts |
|---|---|---|---|
| `python-scripting-best-practices` | 13 | 69 | 23 |
| `meridian-tech-stack-mastery` | 16 | 97 | 26 |

---

## App views

| View | What it does |
|---|---|
| **Course** | Module + lesson list; click a lesson to read it |
| **Cards** | Spaced-repetition flashcard review (SM-2 scheduler) |
| **Quiz** | Module assessments with MCQ + short answer |
| **My progress** | Concept mastery heatmap; per-module coverage stats |
| **Learning paths** | Pick a guided path (e.g. "Fast track", "Deep dive") |
| **What's next?** | Adaptive planner — next lessons, weak concepts, review queue |

---

## Scripts

```sh
# Validate a course against the v3 schema
node scripts/validate-curriculum.mjs <slug>

# Migrate an existing v2 course.json to v3 (idempotent)
node scripts/migrate-course-v2-to-v3.mjs <slug>

# Run tests (Node built-in test runner, no install needed)
node --test tests/build-bundle.test.mjs
node --test tests/planner.test.mjs
```

---

## Curriculum folder structure

```
curriculum/
  <slug>/
    course.json          # Module + lesson map (v3 schema)
    concepts.json        # Concept graph
    learning-paths.json  # Guided learning paths
    adaptive-rules.json  # Mastery thresholds and unlock logic
    bundle.json          # Built artifact — load this in the app
    lessons/             # Lesson markdown files (L01-slug.md …)
    assessments/         # Quiz JSON files (quiz-M01.json …)
    cards.json           # Flashcard deck
    learner.json         # Learner profile (goal, background, session time)
```

---

## Adding a new course

Use the `/grove` Copilot skill (requires Strata research artifacts) or follow the checklist in [.github/ISSUE_TEMPLATE/new-course.md](.github/ISSUE_TEMPLATE/new-course.md).
