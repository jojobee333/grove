# Research Brief — TypeScript & JavaScript for Developers

## Main Research Question
What concepts, mental models, and practical skills does a developer with prior
programming experience need to become productive in JavaScript and TypeScript,
and how should a Grove learning curriculum be structured to teach them effectively?

## Output
A Grove course bundle (`course.json`, lessons, cards, quizzes, modchecks, code
challenges) for the slug `typescript-javascript-course`.

**Target learner:** Developer already comfortable in at least one other language
(Python, Java, C#, Go, etc.) — understands variables, functions, loops, OOP, and
basic data structures. Zero JS/TS experience.

## Scope
The curriculum must cover all six topic areas at comprehensive depth:

1. **JavaScript fundamentals** — variables (var/let/const), functions (declarations,
   expressions, arrow functions), arrays & array methods, objects & destructuring,
   loops (for/for...of/for...in), template literals, type coercion, equality.

2. **JavaScript advanced** — closures, scope chain, the event loop, call stack,
   microtask queue, Promises, async/await, error handling in async code, modules
   (ESM & CommonJS), iterators & generators.

3. **TypeScript basics** — type annotations, primitive & object types, interfaces
   vs type aliases, union & intersection types, generics (functions & classes),
   enums, `readonly` & `optional` fields, tsconfig essentials.

4. **TypeScript advanced** — utility types (Partial, Required, Pick, Omit, Record,
   ReturnType, etc.), conditional types, mapped types, template literal types,
   type narrowing & guards, declaration merging, decorators.

5. **DOM and browser APIs** — selecting & manipulating elements, events & event
   delegation, forms, Fetch API, localStorage/sessionStorage, browser console
   debugging.

6. **Node.js / server-side JS** — Node module system, fs/path/os built-ins,
   HTTP server basics, working with npm/package.json, environment variables,
   streams (overview), building a simple CLI tool.

## Constraints
- Comprehensive depth — no deliberate topic simplification or omissions
- Content must be grounded in official MDN, TC39, and TypeScript Handbook sources
- Code examples must run in a modern browser (ESNext) or Node 20 LTS
- Each module teachable in ≤90 minutes of active learning
- Every lesson ends with a runnable mini-project or challenge
- Mini-projects build on each other within a module where practical
- TypeScript content assumes the learner has already completed the JS modules

## Success Criteria
A learner who completes the course can:
1. Write idiomatic modern JavaScript (ES2020+) from scratch
2. Explain closures, the event loop, and the async execution model
3. Add TypeScript to an existing JS project and annotate it correctly
4. Use generics and utility types to express complex type constraints
5. Build a small DOM-interactive web app without a framework
6. Write a basic Node.js CLI tool or HTTP server
