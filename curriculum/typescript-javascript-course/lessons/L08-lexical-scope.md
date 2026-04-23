# Lexical Scope

**Module**: M04 · Functions, Scope & Closures  
**Type**: core  
**Estimated time**: 35 minutes  
**Claim**: C2 — JavaScript uses lexical (static) scoping: a function's scope is determined by where it is defined in source code, not where it is called

---

## The core idea

**Lexical scope** means that scope is determined by the physical position of code in the source file, not by the call stack at runtime. When a function references a variable, JavaScript looks up the scope chain starting from where the function was *written* — not where it was *called*.

This is how virtually all modern languages work (Python, Java, C#, Go all use lexical scope). JavaScript's original `var` scoping made lexical scope less obvious; `let` and `const` make it clearer because block scope boundaries are visible in the code.

Understanding lexical scope is the prerequisite for understanding closures — which are just functions that "remember" the variables in scope at the point they were defined.

## Why it matters

Two things break when you misunderstand lexical scope:
1. You expect a nested function to see a variable that isn't in its lexical chain
2. You expect a function to see a variable from the caller's scope (which would be dynamic scope — JavaScript doesn't do this)

Event handlers and callbacks are the most common source of confusion: you pass a callback to `setTimeout` or `Array.forEach`, and the callback sees the variables from where it was *written*, not from where it will *run*.

## A concrete example

**Example 1 — the scope chain**

```js
const globalVar = "global";

function outer() {
  const outerVar = "outer";

  function inner() {
    const innerVar = "inner";
    
    // inner can see: innerVar, outerVar, globalVar
    console.log(innerVar);   // "inner"
    console.log(outerVar);   // "outer"   ← via scope chain
    console.log(globalVar);  // "global"  ← via scope chain
  }

  inner();
  // outer cannot see innerVar
  console.log(innerVar); // ReferenceError
}

outer();
// global scope cannot see outerVar or innerVar
console.log(outerVar); // ReferenceError
```

The scope chain is a one-way street: inner functions look up to outer functions, but outer functions cannot look down into inner functions.

**Example 2 — lexical scope, not dynamic scope**

```js
const name = "global";

function greet() {
  // name is looked up in greet's lexical scope chain, not the caller's scope
  console.log(`Hello, ${name}`);
}

function callGreet() {
  const name = "local"; // shadows the outer name locally
  greet();              // What does greet see?
}

callGreet(); // "Hello, global"  ← greet uses its lexical scope, not callGreet's
```

If JavaScript used dynamic scope, `greet()` would print "Hello, local" because the calling context has `name = "local"`. It doesn't — lexical scope means `greet` was defined in global scope, so it sees `name = "global"`.

**Example 3 — block scope with let/const**

```js
function example() {
  let x = "outer";

  {
    let x = "inner"; // new binding in this block
    console.log(x);  // "inner"
  }

  console.log(x);    // "outer"

  if (true) {
    let y = "if-block";
    // y is only accessible in this if-block
  }

  console.log(y); // ReferenceError
}
```

Each set of `{}` braces creates a new block scope for `let`/`const` declarations.

**Example 4 — scope in callbacks: why lexical scope is useful**

```js
function makeCounter(start) {
  let count = start;

  // All three functions are defined in makeCounter's scope
  // They all see the same `count` variable
  return {
    increment: function() { count++; },
    decrement: function() { count--; },
    get: function() { return count; }
  };
}

const counter = makeCounter(0);
counter.increment();
counter.increment();
counter.increment();
console.log(counter.get()); // 3

const counter2 = makeCounter(10);
console.log(counter2.get()); // 10 — independent from counter
```

Each call to `makeCounter` creates a fresh scope with its own `count`. The returned functions close over *that specific* `count`. This is a closure — and it only works because of lexical scope.

**Example 5 — Module scope (the outermost non-global scope)**

```js
// file: utils.js
const TIMEOUT_MS = 5000; // module scope — not global

export function fetchWithTimeout(url) {
  // Can access TIMEOUT_MS via lexical scope
  return fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
}

// TIMEOUT_MS is NOT accessible from other modules directly
// (unless exported)
```

ES modules have their own scope. Variables declared at the top level of a module are not global — they're module-scoped.

## Key points

- Lexical scope means scope is determined by where code is written, not where it is called
- Inner functions can access variables in all outer scopes (scope chain); outer functions cannot see into inner ones
- `let`/`const` use block scope (any `{}`); `var` uses function scope
- ES module top-level is its own scope — not the global object
- Lexical scope is what makes closures work (see L09)

## Go deeper

- [MDN: Closures](../../research/typescript-javascript-course/01-sources/web/S002-mdn-closures.md) — closures are the practical application of lexical scope
- [MDN: JS Execution Model](../../research/typescript-javascript-course/01-sources/web/S003-mdn-execution-model.md) — how the call stack and scope chain interact

---

*← [Previous lesson](./L07-function-forms.md)* · *[Next lesson: Closures →](./L09-closures.md)*
