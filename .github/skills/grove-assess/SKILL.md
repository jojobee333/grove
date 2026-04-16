---
name: grove-assess
description: >-
  Generates module assessments and a cumulative final assessment from lesson content
  and Strata claims. Produces JSON quiz files compatible with the Grove learning app.
  Each quiz includes MCQ, short answer with answer key, and optional essay prompts.
  Use when: creating quizzes, assessments, tests, or evaluation checkpoints.
argument-hint: "Topic slug and optional module ID (e.g. 'ai-regulation' or 'ai-regulation M02')"
user-invokable: true
allowed-tools:
  - editFiles
---

# Grove assess skill

You write assessments that test genuine understanding, not trivia recall.
Every question must have a defensible correct answer traceable to Strata research.

## Assessment types

### Module quiz (one per module)
- 5-8 multiple choice questions
- 2-3 short answer questions (with answer key)
- 1 optional discussion/essay prompt

### Final assessment (one per course)
- 10-15 multiple choice questions (sampling all modules)
- 3-5 short answer questions
- 1-2 essay prompts

## Output: `assessments/quiz-M01.json`

```json
{
  "id": "quiz-M01",
  "type": "module | final",
  "module": "M01",
  "title": "Assessment: [Module name]",
  "generated": "YYYY-MM-DD",
  "passing_score": 70,
  "questions": [
    {
      "id": "Q01",
      "type": "mcq",
      "question": "Question text",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct": "B",
      "explanation": "Why B is correct and why the others are wrong",
      "lesson_ref": "L01",
      "claim_ref": "C1",
      "difficulty": "recall | comprehension | application | analysis"
    },    {
      "id": "Q02",
      "type": "short_answer",
      "question": "Question text",
      "answer_key": {
        "required_points": [
          "Must mention [specific point]",
          "Must address [aspect]"
        ],
        "acceptable_variations": "Note any acceptable phrasings",
        "full_credit": "What a complete answer looks like",
        "partial_credit": "What earns partial credit"
      },
      "lesson_ref": "L02",
      "claim_ref": "C2",
      "difficulty": "comprehension"
    },
    {
      "id": "Q03",
      "type": "essay",
      "prompt": "Essay prompt text",
      "guidance": "What a strong response addresses",
      "rubric": {
        "A": "Demonstrates X, Y, Z with specific evidence",
        "B": "Demonstrates X and Y, limited Z",
        "C": "Demonstrates X only"
      },
      "lesson_ref": "L01-L05",
      "difficulty": "analysis"
    }
  ]
}
```

## `lesson_ref` is required on every MCQ

`lesson_ref` is not just for traceability — it is the key the bundler (`build-bundle.mjs`) uses
to enrich each MCQ question at build time with adaptive metadata:

- `concepts` — derived from the lesson's `teaches_concepts` in `course.json`
- `cognitive_level` — derived from the question's Bloom's `difficulty`
- `weight` — calculated from cognitive level + lesson difficulty
- `remediation_lesson_ids` — filled from the lesson's `prerequisites` chain

**Every MCQ question must have `lesson_ref`. Short-answer and essay entries do not need it
(the bundler skips non-MCQ types for adaptive enrichment).**

If a MCQ question is missing `lesson_ref`, its adaptive metadata will be empty and the app
cannot direct the learner back to the relevant lesson when they answer incorrectly.

## Writing good MCQ questions
**The stem (question) must:**
- Be answerable without reading the options
- Test understanding, not word-spotting
- Avoid "all of the above" and "none of the above"
- Be positive phrasing where possible ("which of the following IS..." not "which is NOT...")

**Distractors (wrong options) must:**
- Be plausible — common misconceptions or related-but-wrong ideas
- Be clearly wrong to someone who understood the lesson
- Be similar in length and structure to the correct answer

**Bad MCQ**: "According to the Strata research, what did Source S001 conclude?"
(Tests recall of a document, not understanding)

**Good MCQ**: "A researcher observes [phenomenon X]. Based on the evidence in this
module, what is the most likely explanation?"
(Tests application of understanding)

## Difficulty calibration

Use Bloom's taxonomy levels:
- **Recall** (25% of questions): define, list, name, identify
- **Comprehension** (40%): explain, summarize, describe in own words
- **Application** (25%): apply, use, demonstrate in new context
- **Analysis** (10%): compare, contrast, evaluate, critique

Adjust ratio based on `learner.json`:
- "understand broadly" goal → 40% recall, 40% comprehension, 20% application
- "apply practically" goal → 15% recall, 30% comprehension, 40% application, 15% analysis
- "teach others" goal → 10% recall, 35% comprehension, 35% application, 20% analysis
- "pass an exam" goal → 35% recall, 35% comprehension, 20% application, 10% analysis

## Answer key traceability

Every question's correct answer must be traceable to a specific Strata artifact:
- `claim_ref`: the C-number from claims.md
- `lesson_ref`: the L-number from the course
- The explanation must cite why the answer is correct from the research

No question can have a correct answer that isn't supported by the Strata research.
If you find yourself writing a question without a Strata source, stop and check.
