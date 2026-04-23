# Course Outline: TypeScript & JavaScript for Developers

**Audience**: Developers with experience in Python, Java, or C#  
**Goal**: Practical, production-ready proficiency in JavaScript and TypeScript  
**Total modules**: 11 | **Total lessons**: ~27  
**Date generated**: 2026-04-19

---

## Module 01 — The JavaScript Landscape

*1 lesson | Prerequisite: none*

**Learning objective**: Understand what JavaScript is, where it runs, and how TypeScript relates to it.

### Lesson 1.1 — Runtimes, Engines, and Host Environments
- The three layers: ECMAScript language spec, V8 engine, host APIs
- Browser vs Node.js vs Deno/Bun: what changes and what stays the same
- What TypeScript is: a compile-time type checker, not a runtime
- The `tsc` compile step; types are erased; no runtime cost

---

## Module 02 — Variables, Types & Coercion

*3 lessons | Prerequisite: M01*

**Learning objective**: Confidently declare variables, understand JS's 8 primitive types, and avoid the coercion traps that catch experienced developers.

### Lesson 2.1 — var, let, and const
- `var`: function-scoped, hoisted to `undefined` — the footgun
- `let`/`const`: block-scoped, Temporal Dead Zone
- Java/C# mental model: `let` ≈ local variable, `const` ≈ `final`/`readonly`
- Rule: never use `var` in new code

### Lesson 2.2 — Primitive Types and typeof
- The 8 primitives: `string`, `number`, `bigint`, `boolean`, `null`, `undefined`, `symbol`, `object`
- `typeof` quirks: `typeof null === "object"` (historical bug)
- `undefined` vs `null`: different intentions, both mean "no value"

### Lesson 2.3 — Equality and Type Coercion
- `==` (type coercion) vs `===` (strict equality): always use `===`
- The `+` operator: numeric addition OR string concatenation
- Common gotcha: `"3" + 4 === "34"` but `"3" - 4 === -1`
- Why Python devs are surprised: Python's `+` never coerces types

---

## Module 03 — Collections & Iteration

*2 lessons | Prerequisite: M02*

**Learning objective**: Work effectively with arrays and objects using idiomatic modern JS.

### Lesson 3.1 — Arrays and Array Methods
- Array literals, typed access, `.length`
- Functional methods: `.map()`, `.filter()`, `.reduce()`, `.find()`, `.some()`, `.every()`
- Spread operator: `[...arr]`, `[...arr, newItem]`
- `for...of` vs `for...in` — and why `for...in` on arrays is a footgun

### Lesson 3.2 — Objects and Destructuring
- Object literals, property shorthand, computed keys
- Object spread: `{ ...obj, overrideKey: value }`
- Destructuring: objects `const { a, b } = obj` and arrays `const [x, y] = arr`
- Nested destructuring with defaults

---

## Module 04 — Functions, Scope & Closures

*3 lessons | Prerequisite: M03*

**Learning objective**: Understand JS function forms, lexical scoping, and how closures enable powerful patterns.

### Lesson 4.1 — Function Forms
- Function declarations vs function expressions vs arrow functions
- Key difference: `function` declarations are hoisted; expressions are not
- Arrow functions: concise syntax + no own `this` binding (preview of M05)
- Default parameters, rest parameters (`...args`), destructured parameters

### Lesson 4.2 — Lexical Scope
- Scope is determined at write-time, not call-time
- Scope chain: inner functions access outer variables
- Why this is different from Python's LEGB rule and Java's block scope

### Lesson 4.3 — Closures
- Definition: a function that retains access to its lexical environment after the outer function returns
- The classic loop-var bug: `for (var i...)` closures capture the *same* binding
- Fix: `let` creates a new binding per iteration
- Factory function pattern: `makeAdder(x)` returns a function that closes over `x`
- Practical use: data encapsulation, memoization, event handler factories

---

## Module 05 — `this` Binding

*2 lessons | Prerequisite: M04*

**Learning objective**: Predict the value of `this` in any context and apply the correct fix when it's wrong.

### Lesson 5.1 — The Five Call-Site Rules
- Mental model: "the caller decides `this`"
- Rule 1 — Method call (`obj.method()`): `this` = `obj`
- Rule 2 — Plain call (`func()`): `this` = `globalThis` (non-strict) / `undefined` (strict)
- Rule 3 — Arrow function: `this` inherited from enclosing scope at definition; ignores `call`/`apply`/`bind`
- Rule 4 — Explicit binding: `fn.call(obj)`, `fn.apply(obj, args)`, `fn.bind(obj)` (returns new function)
- Rule 5 — Constructor call (`new Func()`): `this` = new object
- Contrast: Python `self` is always the instance; Java `this` is always the instance

### Lesson 5.2 — Common Traps and Fixes
- Trap 1: Passing a method as a callback loses `this` — `setTimeout(obj.method, 100)`
- Trap 2: Destructuring a method — `const { method } = obj; method()`
- Trap 3: Class method as DOM event handler without binding
- Fix 1: `.bind(this)` in constructor
- Fix 2: Arrow class field — `method = () => { ... }` (per-instance copy, use sparingly)
- Fix 3: Arrow wrapper — `() => obj.method()`
- DOM handler context: `this` = element the listener is on (regular function only)

---

## Module 06 — Async JavaScript

*3 lessons | Prerequisite: M04, M05*

**Learning objective**: Understand the event loop model and write async code confidently with `async/await` and `Promise.all()`.

### Lesson 6.1 — The Event Loop
- The call stack: synchronous execution, run-to-completion
- A long sync function blocks everything — no preemption
- The task queue and microtask queue
- Microtasks (Promise callbacks) drain before the next task (setTimeout, I/O)
- Visualization: call stack → microtasks → tasks
- Hands-on: compare `setTimeout(fn, 0)` vs `Promise.resolve().then(fn)` execution order

### Lesson 6.2 — Promises
- Callback hell: the problem Promises solve
- Promise states: pending, fulfilled, rejected — never both settled states
- `.then()` chaining: each `.then()` returns a new Promise
- `.catch()` at end of chain handles any rejection above it
- `Promise.all([p1, p2])`: wait for all, fail-fast
- `Promise.any([p1, p2])`: succeed when any succeeds
- `Promise.allSettled()`: wait for all, never rejects

### Lesson 6.3 — async/await
- `async` keyword: function always returns a Promise
- `await` keyword: pause execution of the async function until Promise settles
- `await` only valid inside `async` functions (and ES module top-level)
- `try/catch` for error handling in async functions
- Sequential vs parallel: `await a(); await b()` runs serially; `await Promise.all([a(), b()])` runs in parallel
- Gotcha: async function always returns a Promise — you cannot synchronously extract its value

---

## Module 07 — Modules & Tooling

*2 lessons | Prerequisite: M06*

**Learning objective**: Use ES modules in browser and Node.js, configure TypeScript, and understand the compilation pipeline.

### Lesson 7.1 — Module Systems
- Why modules exist: encapsulation, dependency management
- ES modules (`import`/`export`): named exports, default exports, re-exports
- CommonJS (`require`/`module.exports`): how it works, where you'll still see it
- Interop gotchas: CJS default import in ESM, `__dirname` in ESM

### Lesson 7.2 — TypeScript Configuration
- `tsc --init`: generating `tsconfig.json`
- Key options: `strict`, `target`, `module`, `outDir`, `rootDir`, `paths`
- `strict: true` enables: `strictNullChecks`, `strictFunctionTypes`, `noImplicitAny`
- `tsc --noEmit`: type-check only, no output (useful in CI)
- `.d.ts` declaration files: what they are and when you need `@types/`

---

## Module 08 — TypeScript Foundations

*3 lessons | Prerequisite: M07*

**Learning objective**: Write TypeScript with confidence: type inference, everyday type annotations, and the structural type system.

### Lesson 8.1 — Why TypeScript and How It Works
- What TS catches that JS doesn't: accessing undefined property, calling non-function
- Type inference: TS often knows the type without annotations
- Erased types: zero runtime cost; pure compile-time feature
- `any` as an escape hatch — and why to avoid it with `noImplicitAny`

### Lesson 8.2 — Everyday Types
- Primitives: `string`, `number`, `boolean` (lowercase only; not `String`/`Number`)
- Arrays: `string[]` or `Array<string>`
- Tuples: `[number, string]`
- Objects: inline shapes and `interface`
- Optional properties: `name?: string`
- Union types: `string | number`
- `null` and `undefined` under `strictNullChecks`
- Literal types: `"left" | "right"` and `as const`

### Lesson 8.3 — Interfaces, Type Aliases & Structural Typing
- `interface` for object shapes; `type` for unions, primitives, tuples
- Structural typing: TS checks shape, not name — no `implements` required for compatibility
- Extending interfaces; intersecting types
- Type assertions: `value as Type` — when and how to use safely
- Non-null assertion: `value!` — use sparingly with explanation of risk

---

## Module 09 — TypeScript Advanced

*3 lessons | Prerequisite: M08*

**Learning objective**: Use generics, utility types, and discriminated unions to write reusable, type-safe code.

### Lesson 9.1 — Generics
- The identity function: the simplest generic
- Type parameters as variables: `<T>` is a placeholder filled at call time
- Generic functions, generic interfaces
- Constraints: `<T extends string>`, `<T extends object>`
- `keyof`: the type of all keys of an object type
- Generic constraint with `keyof`: `<T, K extends keyof T>`

### Lesson 9.2 — Utility Types
- **Immediately practical tier**:
  - `Partial<T>`: all properties optional — use for update functions
  - `Required<T>`: opposite of Partial
  - `Readonly<T>`: prevent mutation — mirrors `Object.freeze()` at type level
  - `Record<K, V>`: typed dictionary
  - `Pick<T, K>`: keep only specified keys
  - `Omit<T, K>`: remove specified keys
  - `NonNullable<T>`: remove null/undefined
- **Introspection tier** (after generics):
  - `ReturnType<typeof fn>`: extract return type
  - `Parameters<typeof fn>`: extract parameter tuple
  - `Awaited<T>`: unwrap Promise recursively
- Bridge: show the definition of `Partial<T>` as `{ [P in keyof T]?: T[P] }` to preview mapped types

### Lesson 9.3 — Narrowing and Discriminated Unions
- Type narrowing with `typeof`, `in`, `instanceof`
- Discriminated unions: objects with a shared `kind` or `type` field
- Exhaustiveness checking with `never`
- Type predicates: `value is Type` return type for user-defined type guards
- When to use discriminated unions vs class hierarchies

---

## Module 10 — DOM & Browser APIs

*2 lessons | Prerequisite: M08 (for typed DOM work)*

**Learning objective**: Manipulate the DOM and respond to events without a framework.

### Lesson 10.1 — The DOM Tree
- DOM ≠ JavaScript: the DOM is a browser Web API; Node.js has none
- `document` and `window` as entry points
- `querySelector` / `querySelectorAll` (prefer over `getElementById`)
- `createElement`, `appendChild`, `removeChild`, `remove()`
- `textContent` vs `innerHTML` (security note: `innerHTML` with user input = XSS)
- `classList.add()`, `.remove()`, `.toggle()`

### Lesson 10.2 — Events
- `addEventListener(type, handler)` — modern event binding
- The event object: `event.target`, `event.currentTarget`, `event.type`
- `preventDefault()` — stop default browser behavior
- `stopPropagation()` — stop bubbling
- Event bubbling: events travel up the DOM tree
- Event delegation: attach one listener to a parent to handle dynamic children (performance pattern)
- `this` in event handlers: regular function = the element; arrow function = enclosing scope

---

## Module 11 — Node.js Foundations

*2 lessons | Prerequisite: M08*

**Learning objective**: Write Node.js scripts and HTTP servers using built-in modules and modern ESM syntax.

### Lesson 11.1 — Node.js as a Runtime
- V8 outside the browser: same event loop model, different host APIs
- The `process` object: `process.env`, `process.argv`, `process.exit()`
- ESM in Node.js: `"type": "module"` in `package.json`
- Built-in modules: `node:fs` (Promises API), `node:path`, `node:os`
- Async file I/O with `fs.promises.readFile`/`writeFile`

### Lesson 11.2 — HTTP and the Server Model
- Non-blocking I/O: Node suspends on I/O, resumes via event loop
- Simple HTTP server with `node:http`
- Reading environment variables for port and config
- Using TypeScript with Node.js: `tsx` for development, `tsc` for build
- What belongs in the base curriculum vs what is framework-specific (Express, Fastify)

---

## Appendix: Grove Coding Challenge Scope

Suitable for in-browser coding challenges (pure JS/TS, no host APIs):
- Array manipulation: `.map()`, `.filter()`, `.reduce()`
- String processing
- Closure factories and higher-order functions
- Promise chaining and `async/await`
- TypeScript generics and utility type exercises
- Discriminated union pattern matching

Not suitable (require Node.js or browser APIs):
- `fs`, `http`, `path` operations
- DOM manipulation
- Fetch API (use mock in tests instead)
