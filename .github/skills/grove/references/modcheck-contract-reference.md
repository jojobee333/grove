# Grove Module Retention Check Contract

## Scope and intended use

Use this reference when Grove generates `curriculum/[topic-slug]/assessments/modcheck-[MID].json` after quiz generation.

Each module gets one short retention check that complements, rather than duplicates, the module quiz.

## Required file shape

Each file must contain:
- `id` using `modcheck-Mxx`.
- `module` using `Mxx`.
- `title` in the form `[Module Title] - Quick Check`.
- `generated` as `YYYY-MM-DD`.
- `questions` as an array of exactly 5 items.

Each question must contain:
- Open-ended question: `id`, `type: open`, `question`, `answer`.
- MCQ question: `id`, `type: mcq`, `question`, `options`, `correct`, `explanation`.

## Generation rules

- Create exactly 5 questions per module.
- Target a 3 open-ended / 2 MCQ split when possible.
- Always include at least 1 open-ended question and at least 1 MCQ.
- Use IDs in the form `MC[module-num]-[question-num]`, such as `MC01-2`.
- Keep open-ended answers to 1-3 sentences.
- Use exactly 4 MCQ options: `A`, `B`, `C`, `D`.
- Provide exactly 1 correct option for each MCQ.
- Include a one-sentence explanation for each MCQ.
- Target module learning objectives from `course.json`.
- Avoid any question already used in the module quiz.
- Prefer reasoning and recall over rote schedule memorization.
- Use plausible distractors based on common misconceptions.

## Validation checklist

- One modcheck file exists per module.
- Every file has exactly 5 questions.
- Every file includes both question types.
- Every MCQ has four options, one correct answer, and one explanation.
- No question duplicates the paired module quiz.

## Failure modes and guardrails

- Missing quiz output: do not generate modchecks yet.
- Missing module objectives in `course.json`: repair the course map first.
- Weak distractors: replace obvious filler with plausible misconceptions.
- Duplicate quiz question: rewrite it before saving the file.

## Anti-patterns

- Treating the modcheck as a second full quiz.
- Writing all five questions as the same type.
- Testing study-plan order or arbitrary list positions.
- Padding open-ended answers with unnecessary prose.

## Update triggers

Update this reference when Grove changes the modcheck schema, question mix, ID pattern, or quiz deduplication rules.