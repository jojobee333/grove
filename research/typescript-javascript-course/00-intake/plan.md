# Research Plan — TypeScript & JavaScript for Developers

## Research Question Breakdown

| ID | Sub-question | Priority | Status |
|----|-------------|----------|--------|
| Q1 | What JS fundamentals trip up developers coming from other languages (type coercion, hoisting, `this`, equality)? | High | open |
| Q2 | What mental models make closures, scope, and the event loop genuinely click for experienced programmers? | High | open |
| Q3 | What are the most common async pitfalls (callback hell, unhandled rejections, race conditions) and how are they taught most effectively? | High | open |
| Q4 | What is the correct pedagogical order for TypeScript concepts to avoid confusion (e.g. when to introduce generics vs. utility types)? | High | open |
| Q5 | What do expert JS/TS educators identify as the hardest concepts for new learners and what teaching strategies work best? | Medium | open |
| Q6 | How should DOM manipulation and browser APIs be scoped for a curriculum — what is essential vs. framework-dependent? | Medium | open |
| Q7 | What Node.js concepts are truly foundational vs. ecosystem-specific, and which are best suited for a Grove in-browser code challenge? | Medium | open |
| Q8 | What TypeScript advanced features (conditional types, mapped types, decorators) require the most scaffolding to teach well? | Medium | open |

## Source Strategy

**Primary authoritative sources (high-trust):**
- MDN Web Docs — JS reference, DOM APIs, Fetch, async
- The TypeScript Handbook (typescriptlang.org)
- TC39 proposals / ECMAScript spec summaries
- Node.js official docs (nodejs.org)

**Secondary pedagogical sources:**
- You Don't Know JS (YDKJS) book series — deep JS internals
- JavaScript.info — structured modern JS tutorial
- Total TypeScript (Matt Pocock) — TS teaching methodology
- Executing TypeScript — practical TS course structure
- Frontend Masters / Egghead course outlines (structure, not content)

**Tertiary / community:**
- Stack Overflow canonical Q&As for common beginner mistakes
- TypeScript GitHub issues / release notes for advanced feature rationale

## Estimated Source Volume
- 12–18 sources across all Q-numbers
- At minimum 2 sources per Q-number
- Q1–Q4 are highest priority; fill these before moving to Q5–Q8

## Module Sketch (preliminary — to be validated by research)

| Module | Focus | Estimated Lessons |
|--------|-------|-------------------|
| M01 | JS Orientation — how JS fits in the ecosystem | 3–4 |
| M02 | JS Fundamentals — types, operators, functions | 5–6 |
| M03 | JS Collections — arrays, objects, destructuring | 4–5 |
| M04 | JS Functions Deep Dive — closures, scope, `this` | 4–5 |
| M05 | Async JavaScript — event loop, Promises, async/await | 5–6 |
| M06 | JS Modules & Tooling — ESM, npm, tsconfig | 3–4 |
| M07 | TypeScript Foundations — types, interfaces, generics | 5–6 |
| M08 | TypeScript Advanced — utility types, narrowing, mapped/conditional | 5–6 |
| M09 | DOM & Browser APIs | 5–6 |
| M10 | Node.js Essentials — fs, HTTP, CLI | 5–6 |

## Open Gaps (initial)
- None yet — all Q-numbers have zero sources
