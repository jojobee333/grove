---
name: grove-code-challenges
description: >-
  Generates test-case based coding challenges for a Grove module. Produces a
  code-challenge-M*.json file compatible with the Grove offline coding engine.
  Each challenge includes a named function problem, starter code, and test cases
  (visible + hidden) that run in-browser via WASM (Python) or Function() (JS).
  Use when: adding coding practice to a module, creating hands-on exercises,
  or extending a course with practical programming challenges.
argument-hint: "Course slug and module ID (e.g. 'python-scripting-best-practices M02')"
user-invokable: true
allowed-tools:
  - editFiles
---

# Grove code-challenges skill

You write coding challenges that test practical ability, not trivia recall.
Every challenge must be solvable with only the skills taught in the referenced lesson.
Test cases must be deterministic — the same input always produces the same output.

## What this skill produces

One file per module: `assessments/code-challenge-M<NN>.json`

A module can have 1–4 challenges. More than 4 becomes fatiguing. Aim for 2–3.

## The execution model

The Grove offline coding engine works like this:

1. The learner writes a **named function** in a code editor (Python or JavaScript)
2. Each test case provides an **input expression** (e.g. `"'INFO:Server started'"`)
3. The engine calls `functionName(input)` and compares `String(result)` to `expected_output`
4. "Run Tests" runs visible tests only; "Submit" runs all tests including hidden ones

**This means every challenge must be solvable as a single named function.**

Functions may use only the standard library for the language. No file I/O, no network
calls, no imports of third-party packages. Python stdlib and JavaScript built-ins are fine.

## Output: `assessments/code-challenge-M<NN>.json`

```json
{
  "id": "code-challenge-M02",
  "type": "module",
  "module": "M02",
  "title": "Coding Challenge: [Short descriptive title]",
  "challenges": [
    {
      "id": "CC01",
      "type": "code-challenge",
      "language": "python",
      "prompt": "Write a function `parse_log_line(line)` that ...",
      "starter_code": "def parse_log_line(line):\n    \"\"\"\n    Docstring describing what to implement.\n    \"\"\"\n    pass\n",
      "test_cases": [
        {
          "name": "Handles basic case",
          "input": "'INFO:Server started'",
          "expected_output": "('INFO', 'Server started')",
          "visibility": "visible"
        },
        {
          "name": "Handles edge case",
          "input": "'not a valid log line'",
          "expected_output": "('UNKNOWN', 'not a valid log line')",
          "visibility": "hidden"
        }
      ],
      "concepts": ["structured-logging", "script-structure"],
      "cognitive_level": "application",
      "weight": 1.0,
      "difficulty": 2,
      "lesson_ref": "L03",
      "pass_criteria": 0.75,
      "remediation_lesson_ids": ["L03", "L04"]
    }
  ]
}
```

## Rules for valid challenges

### Function signature
- The `starter_code` must define exactly one top-level function (Python `def` or JS `function`/`const`)
- The function name must be unique across the file — the engine detects it by regex
- The docstring in starter code should describe what the function must do and what it should return
- Do **not** include a sample call or `print` in starter code — that confuses the engine

### Test cases
- Every challenge must have **at least 2 visible tests** and **at least 2 hidden tests**
- Visible tests anchor the learner's understanding; hidden tests prevent hardcoding
- `input` must be a valid expression the language can evaluate, passed as a function argument
  - Python: `"0"`, `"'INFO:Server started'"`, `"[1, 2, 3]"`, `"(3, 5)"`
  - JavaScript: `"0"`, `"'hello world'"`, `"[1, 2, 3]"`
- `expected_output` must exactly match `str(fn(input))` in Python or `String(fn(input))` in JS
  - Python tuples render as `"('ERROR', 'msg')"` — include the outer parens
  - Python booleans render as `"True"` / `"False"` (capital T/F)
  - JavaScript booleans render as `"true"` / `"false"` (lowercase)
- `name` should read as a description, not a test ID: "Handles empty string" not "test_4"

### Concepts
- List 2–4 concept IDs from `concepts.json` that this challenge directly exercises
- These are used by the adaptive engine to credit mastery when the challenge passes
- If unsure, use the lesson's `teaches_concepts` from `course.json` as a starting point

### `lesson_ref`
- Must be a valid lesson ID from `course.json`
- The learner can return to this lesson if they fail the challenge
- Choose the lesson that most directly teaches the skill being tested

### `pass_criteria`
- A number from 0 to 1 representing the fraction of tests that must pass
- `0.75` is recommended (3 out of 4, or 6 out of 8)
- Use `1.0` only for challenges with 2 tests where both must pass
- Use `0.6` for exploratory challenges where partial solutions are valuable

### `difficulty`
- 1–5 integer matching Grove's difficulty scale
- 1: trivial (define a function, return a constant)
- 2: easy (string parsing, simple arithmetic)
- 3: medium (loops, conditionals, recursion)
- 4: hard (data structures, algorithms)
- 5: expert (optimization, complex state)

## Designing good challenges

**The function must be testable with a single input argument.**
If the real-world function needs multiple parameters, wrap them in a tuple or dict:
```python
# Bad: def add(a, b) — needs two arguments
# Good: def add(pair) — takes (a, b) as a tuple
```
Or use multiple challenges for different aspects of the problem.

**Visible tests should demonstrate normal usage. Hidden tests should catch edge cases.**

| Visible tests (learner sees) | Hidden tests (run on Submit) |
|------------------------------|------------------------------|
| Typical, expected inputs     | Edge cases (empty, zero, None) |
| Clearly named scenarios      | Boundary values |
| Match examples in the prompt | Error/invalid input handling |

**Anchor the prompt to the lesson.**
The prompt should reference a concept or tool from `lesson_ref`. A learner who completed
the lesson should have all the knowledge needed to solve it.

**Write the solution before writing test cases.**
Always verify your `expected_output` values by running them yourself.
A wrong expected_output makes an unsolvable challenge and will frustrate learners.

## Example: Python challenge (good)

```json
{
  "id": "CC01",
  "type": "code-challenge",
  "language": "python",
  "prompt": "Write a function `count_errors(log)` that takes a list of log level strings (e.g. ['INFO', 'ERROR', 'WARNING', 'ERROR']) and returns the number of entries with level 'ERROR'.",
  "starter_code": "def count_errors(log):\n    \"\"\"\n    Count the number of ERROR entries in a list of log level strings.\n    Returns an integer.\n    \"\"\"\n    pass\n",
  "test_cases": [
    { "name": "Two errors", "input": "['INFO', 'ERROR', 'WARNING', 'ERROR']", "expected_output": "2", "visibility": "visible" },
    { "name": "No errors", "input": "['INFO', 'INFO', 'WARNING']", "expected_output": "0", "visibility": "visible" },
    { "name": "All errors", "input": "['ERROR', 'ERROR', 'ERROR']", "expected_output": "3", "visibility": "hidden" },
    { "name": "Empty log", "input": "[]", "expected_output": "0", "visibility": "hidden" }
  ],
  "concepts": ["structured-logging", "script-structure"],
  "cognitive_level": "application",
  "weight": 1.0,
  "difficulty": 2,
  "lesson_ref": "L04",
  "pass_criteria": 0.75,
  "remediation_lesson_ids": ["L04"]
}
```

## Example: JavaScript challenge (good)

```json
{
  "id": "CC01",
  "type": "code-challenge",  
  "language": "javascript",
  "prompt": "Write a function `camelToSnake(str)` that converts a camelCase string to snake_case.",
  "starter_code": "function camelToSnake(str) {\n  // Convert camelCase string to snake_case\n  // 'helloWorld' -> 'hello_world'\n}\n",
  "test_cases": [
    { "name": "Simple camelCase", "input": "'helloWorld'", "expected_output": "hello_world", "visibility": "visible" },
    { "name": "Single word", "input": "'hello'", "expected_output": "hello", "visibility": "visible" },
    { "name": "Multiple humps", "input": "'myVariableName'", "expected_output": "my_variable_name", "visibility": "hidden" },
    { "name": "Leading uppercase", "input": "'HelloWorld'", "expected_output": "hello_world", "visibility": "hidden" }
  ],
  "concepts": ["string-manipulation"],
  "cognitive_level": "application",
  "weight": 1.0,
  "difficulty": 2,
  "lesson_ref": "L02",
  "pass_criteria": 0.75,
  "remediation_lesson_ids": ["L02"]
}
```

## Authoring checklist

Before saving the file, verify:

- [ ] Each challenge has exactly one named top-level function in `starter_code`
- [ ] The function is solvable using only stdlib / built-ins (no third-party imports)
- [ ] Every `input` is a valid single-argument expression for the language
- [ ] You have verified each `expected_output` by running the solution yourself
- [ ] At least 2 visible + 2 hidden test cases per challenge
- [ ] `lesson_ref` exists in `course.json`
- [ ] `concepts` IDs exist in `concepts.json` (or are a subset of the lesson's `teaches_concepts`)
- [ ] The function name in `starter_code` matches (or is derivable from) the function name in `prompt`
- [ ] No file I/O, network calls, or third-party imports in the function

## After writing the file

Run validation and rebuild the bundle:

```bash
node scripts/validate-curriculum.mjs <slug>
node build-bundle.mjs <slug>
```

Then verify in the app:
1. `npx serve .` → open `http://localhost:3000/app`
2. Load the bundle
3. Click "Code challenges" in the sidebar → see the new challenges
4. Click a challenge → enter the solution → "Run visible tests" passes
5. Click "Submit all tests" → all tests pass
