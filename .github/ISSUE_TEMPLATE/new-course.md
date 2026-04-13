---
name: New course
about: Request or track authoring a new Grove v3 course from a Strata research project
title: "course: [topic-slug]"
labels: ["curriculum", "grove"]
assignees: []
---

## Course details

| Field | Value |
|---|---|
| **Topic slug** | <!-- e.g. `distributed-systems` --> |
| **Strata project path** | <!-- e.g. `research/distributed-systems/` --> |
| **Strata state** | <!-- `complete` / `in-progress` — must be `complete` to proceed --> |

## Learner profile

| Field | Value |
|---|---|
| **Goal** | <!-- understand broadly / apply practically / teach others / pass an exam --> |
| **Background** | <!-- complete beginner / some exposure / intermediate / deep expert in adjacent area --> |
| **Time per session** | <!-- 15 min / 30 min / 1 hour / flexible --> |

## Authoring checklist

### Prerequisites
- [ ] Strata project at `research/[slug]/` with `state.json` phase = `complete`
- [ ] `03-synthesis/claims.md` — non-empty
- [ ] `03-synthesis/narrative.md` — non-empty
- [ ] `02-analysis/themes.md` — non-empty

### Grove generation steps
- [ ] **Step 1** — Strata input validated
- [ ] **Step 2** — Learner profile captured → `curriculum/[slug]/learner.json`
- [ ] **Step 3** — Course map generated → `curriculum/[slug]/course.json`
  - [ ] All lessons have v3 fields (`prerequisites`, `teaches_concepts`, `reinforces_concepts`, `mastery_threshold`, `difficulty`, `unlock_rule`, `review_after_days`)
  - [ ] `learning_plan.milestone_lessons` set (gate lessons identified)
- [ ] **Step 4** — Lessons generated → `curriculum/[slug]/lessons/L*.md`
- [ ] **Step 5** — Flashcards generated → `curriculum/[slug]/cards.json`
- [ ] **Step 6** — Assessments generated → `curriculum/[slug]/assessments/quiz-*.json`
  - [ ] Modchecks generated → `curriculum/[slug]/assessments/modcheck-*.json`
- [ ] **Step 6b** — Code challenges (optional) → `curriculum/[slug]/assessments/code-challenge-*.json`
  - [ ] Each challenge includes starter code + ≥2 test cases (visible + hidden)
  - [ ] Challenges map to module concepts for mastery tracking

### v3 adaptive artifacts
- [ ] **Step 7a** — `concepts.json` created (concept graph with `introduced_in`, `reinforced_in`, `depends_on`)
- [ ] **Step 7b** — `learning-paths.json` created (default-path + ≥1 tailored path)
- [ ] **Step 7c** — `adaptive-rules.json` created (progression, review, mastery, remediation rules)

### Build & validate
- [ ] Run `node scripts/migrate-course-v2-to-v3.mjs [slug]` if upgrading an existing course
- [ ] Run `node scripts/validate-curriculum.mjs [slug]` — zero errors
- [ ] Run `node build-bundle.mjs [slug]` — bundle writes successfully
- [ ] Bundle version = `"3.0"` confirmed
- [ ] `curriculum/index.json` updated with `adaptive: true`, `bundle_version: "3.0"`, `total_questions: N`
- [ ] Run `node tests/build-bundle.test.mjs` — all tests pass

### Completion
- [ ] `curriculum/[slug]/state.json` → `phase: complete`
- [ ] Course loads in Grove app (`npx serve .` → Load bundle.json) — all views functional
  - [ ] Learning plan loads with "What's next?" panel
  - [ ] Flashcard review works (SR initialized)
  - [ ] Quiz submits and updates concept mastery
  - [ ] My progress view shows concept heatmap
  - [ ] Learning paths view shows path options

## Notes

<!-- Any special considerations, content gaps from Strata, or path customizations -->
