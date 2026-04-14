# Grove: Offline Coding Challenges Implementation

## Status: MVP Complete ✓

This document summarizes the implementation of offline coding challenge support in Grove.

## What's Been Implemented

### Phase 1: Schema & Data Format ✓

- **Schema Update**: `schemas/bundle.schema.json` updated to define `code-challenge` assessment type
  - Includes fields for `language`, `starter_code`, `test_cases`, `concepts`, `weight`, `pass_criteria`
  - Test cases support visibility (visible/hidden) for progressive disclosure

- **Example Challenges**: Created `curriculum/python-scripting-best-practices/assessments/code-challenge-M02.json`
  - Two Python challenges testing script structure and logging concepts
  - Each includes starter code + 4 test cases (mix of visible and hidden)

- **Documentation**: Updated `.github/ISSUE_TEMPLATE/new-course.md` with code-challenge authoring checklist

### Phase 2: Build Pipeline ✓

- **Bundle Builder** (`build-bundle.mjs`):
  - Discovers `code-challenge-*.json` files in assessments folder
  - Auto-enriches challenges with derived fields (cognitive_level, weight, pass_criteria, concepts)
  - Includes challenges in final `bundle.json` under `codeChallenges` key

- **Validation** (`scripts/validate-curriculum.mjs`):
  - Validates code-challenge structure, test cases, language, and concept references
  - Detects missing starter code or empty test suites
  - Reports comprehensive errors if validation fails

- **Tests** (`tests/build-bundle.test.mjs`):
  - Added test for code-challenge enrichment and bundling
  - Verifies all required fields present in enriched challenges
  - Tests pass: ✓ 32 tests passing

### Phase 3: App UI & UX ✓

- **CSS Styling**: Added `.code-challenge-card`, `.code-editor`, `.test-results` styles
  - Matches Grove's existing design system (colors, spacing, typography)
  - Includes monospace font for code editor
  - Test result visualization with pass/fail indicators

- **Quiz View Integration**: Code challenges display alongside traditional quiz questions
  - Shows language and pass threshold for each challenge
  - Displays visible test cases to learner
  - Indicates # of hidden tests
  - Starter code pre-populates textarea

- **Run Tests Stubs**: `runCodeTests(challengeId)` function
  - For MVP: Shows placeholder message directing learner to use online interpreters
  - Saves code submission to `quizState` for later validation
  - Extensible for future server-based execution

- **Progress Tracking**: 
  - Extended `progress` object with `codeChallenges` tracking
  - `updateConceptMasteryFromCodeChallenge()` function calculates mastery:
    - +20% for full pass (≥pass_criteria)
    - +5% for partial pass (>50% tests)
    - -15% for failure
  - Mastery persists in localStorage

### What Works Today

1. **Load a course with code challenges**:
   ```bash
   cd grove
   node build-bundle.mjs python-scripting-best-practices
   npx serve .
   # Open http://localhost:3000/app
   # Load curriculum/python-scripting-best-practices/bundle.json
   ```

2. **Take a quiz with code challenges**:
   - Navigate to Module M02
   - See quiz questions + 2 code challenges
   - Edit starter code, click "Run Tests"
   - See test case descriptions
   - Submit quiz (code challenge saved but not yet evaluated)

3. **Create new code challenges**:
   - Write `curriculum/<slug>/assessments/code-challenge-*.json`
   - Include language, prompt, starter_code, test_cases (≥1)
   - Run `node build-bundle.mjs <slug>`
   - Load bundle in app

## What Remains for Production

### Code Execution Engine (High Priority)

**Option A: Server-Based (Recommended)**
- Implement `/api/evaluate-code` endpoint
- Accept: `{ code, language, test_cases }`
- Return: `{ passed, testsPassed, testsTotal, output }`
- Security: Sandbox code execution (Docker, seccomp)
- Supports full language features, imports, file I/O

**Option B: Browser WASM (JavaScript only)**
- Use JavaScript eval() in sandbox
- Supports basic JavaScript code testing
- Python requires Pyodide (heavier, slower)

### Test Evaluation Logic

In `submitQuiz()`, add code-challenge evaluation:
```javascript
const codeChallenges = bundle.codeChallenges[moduleId]?.challenges || [];
for (const challenge of codeChallenges) {
  const code = document.getElementById(`code-${challenge.id}`).value;
  const result = await evaluateCode(code, challenge.test_cases, challenge.language);
  updateConceptMasteryFromCodeChallenge(moduleId, challenge.id, result.testsPassed, result.testsTotal);
}
```

### Authoring Workflow (Phase 4)

**Create `/grove-code-challenges` Copilot skill** to guide users through:
1. Problem description → starter code generation
2. Test case design (visible + hidden)
3. Concept mapping
4. Validation checklist

### Strata Integration (Phase 5)

**Enhance Strata research agent** to:
1. Extract coding concepts from research artifacts
2. Generate practical exercises testing those concepts
3. Auto-create test cases (visible + hidden) with expected outputs
4. Populate correct concepts for mastery tracking

## Files Modified

| File | Changes |
|------|---------|
| `schemas/bundle.schema.json` | Added `codeChallenges` type with fields |
| `build-bundle.mjs` | Discovery + enrichment for code challenges |
| `scripts/validate-curriculum.mjs` | Validation for challenge structure |
| `tests/build-bundle.test.mjs` | Test for enrichment + bundling |
| `.github/ISSUE_TEMPLATE/new-course.md` | Added authoring checklist item |
| `app/index.html` | CSS + quiz UI + mastery tracking |
| `curriculum/python-scripting-best-practices/assessments/code-challenge-M02.json` | Example challenges |

## Concept Mastery Integration

Code challenges integrate with Grove's adaptive learning:

- **Mastery boost higher than quizzes**: +20% (vs +15% for MCQ correct)
  - Reflects practical ability > knowledge recall
- **Partial credit for partial passes**: +5% if >50% tests pass
- **Higher penalty for failure**: -15% (vs -10% for quiz wrong)
  - Encourages quality attempts
- **Concept mapping**: Each challenge teaches 2-4 concepts
  - Integrated into "What's next?" adaptive planner
  - Weak concept detection includes code-challenge results

## Verification

**Build validation**:
```bash
node scripts/validate-curriculum.mjs python-scripting-best-practices
# ✓ 79 questions and 2 code challenges ... checked
```

**Bundle verification**:
```bash
node --test tests/build-bundle.test.mjs
# ✓ 32 tests passing (includes code-challenge enrichment)
```

**App verification**:
1. Load bundle.json in Grove app
2. Navigate to Module M02 → Quiz
3. See 2 code challenges with starter code + visible tests
4. Click "Run Tests" → see stub message (ready for execution engine)
5. Submit quiz → code saved to localStorage

## Next Steps

1. Implement code execution engine (server or WASM)
2. Modify `submitQuiz()` to evaluate code and update mastery
3. Create `/grove-code-challenges` authoring skill
4. Enhance Strata agent for code challenge generation
5. Add real-time feedback in code editor (linting, hints)

## Technical Notes

- Code challenges are lightweight JSON, suitable for offline first
- Test cases stored as I/O pairs (no logic evaluation engine needed yet)
- Mastery model treats code same as other assessments (uniform tracking)
- Extensible: easy to add more languages, test case formats, execution methods
