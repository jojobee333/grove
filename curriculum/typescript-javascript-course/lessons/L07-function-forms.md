# Function Forms and Hoisting

**Module**: M04 · Functions, Scope & Closures  
**Type**: core  
**Estimated time**: 35 minutes  
**Claim**: C1 — JavaScript has multiple function syntaxes with different hoisting behaviors and this-binding semantics

---

## The core idea

JavaScript has three ways to create functions: **function declarations**, **function expressions**, and **arrow functions**. They look similar but behave differently in two critical ways: hoisting and `this` binding.

Function declarations are hoisted completely — you can call them before they appear in the source code. Function expressions and arrow functions are not (they use `let`/`const`-style TDZ). Arrow functions additionally do not have their own `this` — they inherit `this` from the surrounding lexical scope. This is one of the most important distinctions in the language.

## Why it matters

Choosing the wrong function form causes bugs that are hard to trace:
- Using an arrow function as a method will break `this` (covered fully in L10 and L11)
- Calling a function expression before its declaration gives you a TDZ error
- Function declarations work before their definition — which is sometimes intentional (mutual recursion), sometimes a sign of disorganized code

In TypeScript, all three forms are equally supported with the same syntax for type annotations.

## A concrete example

**Example 1 — the three forms compared**

```js
// 1. Function declaration — hoisted, has its own this
function add(a, b) {
  return a + b;
}

// 2. Function expression — not hoisted, has its own this
const add = function(a, b) {
  return a + b;
};

// Named function expression — useful for stack traces
const add = function addNumbers(a, b) {
  return a + b;
};

// 3. Arrow function — not hoisted, no own this
const add = (a, b) => a + b;

// Single-param arrows can omit parens (style preference — many teams require them)
const double = n => n * 2;

// Multi-line arrow functions need braces and explicit return
const process = (n) => {
  const doubled = n * 2;
  return doubled + 1;
};
```

**Example 2 — hoisting**

```js
// Function declaration is hoisted with its full implementation
greet("Alice"); // "Hello, Alice" — works before the declaration

function greet(name) {
  return `Hello, ${name}`;
}

// Function expression is NOT hoisted
greetExpr("Alice"); // ReferenceError: Cannot access 'greetExpr' before initialization

const greetExpr = function(name) {
  return `Hello, ${name}`;
};

// var-function expression: hoisted as undefined, but not callable
greetVar("Alice"); // TypeError: greetVar is not a function

var greetVar = function(name) {
  return `Hello, ${name}`;
};
```

**Example 3 — first-class functions**

Functions are values in JavaScript. They can be assigned to variables, passed as arguments, and returned from other functions.

```js
// Functions as arguments (callbacks)
const numbers = [3, 1, 4, 1, 5];
const sorted = numbers.slice().sort((a, b) => a - b); // comparator is a function

// Passing functions around
function applyTwice(fn, value) {
  return fn(fn(value));
}

const double = x => x * 2;
applyTwice(double, 5); // 20

// Returning functions (factory pattern)
function makeMultiplier(factor) {
  return (n) => n * factor;
}

const triple = makeMultiplier(3);
triple(7); // 21
```

**Example 4 — TypeScript function types**

```ts
// Parameter and return type annotations
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function with types
const add = (a: number, b: number): number => a + b;

// Optional parameter
function greet(name: string, greeting?: string): string {
  return `${greeting ?? "Hello"}, ${name}`;
}

// Rest parameters
function sum(...nums: number[]): number {
  return nums.reduce((acc, n) => acc + n, 0);
}

// Function type annotation
type Transformer = (input: string) => string;

const uppercase: Transformer = (s) => s.toUpperCase();

// Typing higher-order functions
function applyTwice<T>(fn: (val: T) => T, value: T): T {
  return fn(fn(value));
}
```

## Key points

- Function declarations are fully hoisted; expressions/arrows use TDZ (no access before declaration)
- Arrow functions have no own `this` — they capture it from the enclosing scope
- Functions are first-class values — assignable, passable, returnable
- Use arrow functions for callbacks and short transformations; use function declarations for named top-level logic
- TypeScript annotates parameters and return types with `: type` syntax; return type can usually be inferred

## Go deeper

- [MDN: Closures](../../research/typescript-javascript-course/01-sources/web/S002-mdn-closures.md) — how function scope enables closures
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — function type annotations and overloads

---

*← [Previous lesson](./L06-objects.md)* · *[Next lesson: Lexical Scope →](./L08-lexical-scope.md)*
