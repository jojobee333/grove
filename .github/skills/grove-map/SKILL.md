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

# Grove map skill

You turn Strata analysis into a structured course outline. You do not write
lesson content — that is /grove-lessons. You design the architecture of the course.

## Input: read these Strata files

- `research/[slug]/02-analysis/themes.md` → modules (one theme = one module)
- `research/[slug]/03-synthesis/claims.md` → learning objectives (one strong claim = one objective)
- `research/[slug]/03-synthesis/narrative.md` → narrative arc for sequencing
- `research/[slug]/02-analysis/contradictions.md` → discussion/debate lessons
- `research/[slug]/02-analysis/gaps.md` → "what we don't know" lessons
- `curriculum/[slug]/learner.json` → depth, time, and goal calibration

## Mapping themes to modules

Each theme in `themes.md` becomes one module. Sequence them so:
1. Foundational concepts come before applied ones
2. Each module builds on the previous (no orphan modules)
3. Contradictions cluster near the end (after learner has context to evaluate them)
4. Gaps and limitations come last (intellectual humility as a closing lesson)

## Mapping claims to lessons within modules

Within each module, each claim that falls under that theme becomes a lesson.
Sequence lessons from concrete → abstract, or from "what" → "why" → "so what".

Strong claims (confidence: strong) → core lessons (required)
Moderate claims → standard lessons
Weak/speculative claims → clearly labelled "frontier" or "debated" lessons

## Calibrating for learner profile

Read `curriculum/[slug]/learner.json`:

- **Goal: understand broadly** → fewer lessons per module, more overview lessons
- **Goal: apply practically** → add "how to apply this" lessons, skip deep theory
- **Goal: teach others** → add explanation/analogy lessons
- **Goal: pass an exam** → add recall-focused lessons, increase flashcard density

- **Background: beginner** → add a "foundations" module at the start
- **Background: intermediate** → skip basics, go deeper faster
- **Background: expert** → focus on nuance, contradictions, gaps

- **Time: 15 min/session** → lessons ≤ 800 words, max 2 lessons per module
- **Time: 30 min/session** → lessons ≤ 1500 words, 3-4 lessons per module
- **Time: 1 hour** → lessons up to 2500 words, 5-6 lessons per module

## Output: course.json

```json
{
  "topic": "Topic Name",
  "slug": "topic-slug",
  "strata_source": "research/topic-slug/",
  "generated": "YYYY-MM-DD",
  "learner": {
    "goal": "understand broadly",
    "background": "beginner",
    "session_time_min": 30
  },
  "summary": "One sentence describing what this course teaches",
  "modules": [
    {
      "id": "M01",
      "title": "Module title",
      "strata_theme": "Theme N from themes.md",
      "description": "What the learner will understand after this module",
      "objectives": [
        "By the end of this module, you will be able to [verb] [thing]"
      ],
      "lessons": [
        {
          "id": "L01",
          "title": "Lesson title",
          "strata_claim": "C1",
          "type": "core | applied | frontier | debate | gap",
          "estimated_minutes": 20,
          "description": "One sentence: what this lesson covers"
        }
      ],
      "has_assessment": true
    }
  ],
  "total_lessons": 0,
  "total_estimated_hours": 0,
  "learning_plan": {
    "sessions_to_complete": 0,
    "suggested_schedule": "3 sessions per week",
    "milestone_lessons": ["L01", "L05", "L10"]
  }
}
```

## Learning objectives must be verbs

Use Bloom's taxonomy verbs appropriate to the goal:
- **Understand broadly**: define, explain, describe, identify, summarize
- **Apply practically**: use, implement, demonstrate, apply, solve
- **Teach others**: explain, compare, justify, critique, illustrate
- **Pass an exam**: recall, list, match, distinguish, calculate

Avoid "understand" and "know" as objectives — they are not measurable.
