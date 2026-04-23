# Runtimes, Engines, and Host Environments

**Module**: M01 · The JavaScript Landscape  
**Type**: core  
**Estimated time**: 30 minutes  
**Claim**: C6 — JavaScript is a language spec; the environment it runs in determines what APIs are available

---

## The core idea

JavaScript is not one thing — it is three things stacked on top of each other, and conflating them causes real confusion.

The **ECMAScript specification** defines the language: syntax, data types, operators, the event loop model, `Array.prototype.map`, `Promise`, and so on. This is the part that is identical whether you run JavaScript in Chrome, Firefox, Node.js, Deno, or Bun.

The **JavaScript engine** (V8 in Chrome and Node.js, SpiderMonkey in Firefox) reads your code and executes it. The engine implements the spec and compiles your JS to native machine code via JIT compilation. You almost never interact with the engine directly.

The **host environment** is the runtime that embeds the engine and provides APIs beyond the language itself. In a browser, the host provides `window`, `document`, `fetch`, `setTimeout`, `localStorage`, and the entire DOM. In Node.js, the host provides `process`, `require`, `Buffer`, `fs`, `http`, and operating-system-level I/O. These APIs are **not part of JavaScript** — they are gifts from the host.

This distinction explains why `document.querySelector` works in a browser but throws `ReferenceError: document is not defined` in Node.js. `document` is a browser API, not a JS language feature. The same explains why `process.env.PORT` works in Node.js but is undefined in a browser.

## Why it matters

Practically, this model tells you what you can depend on being available and what you cannot. When you write a utility function that does pure string manipulation, it will run identically in a browser, in Node.js, and in a test runner. When you write code that calls `fetch` or `localStorage`, you need to either be in a browser or use a polyfill/mock.

For TypeScript in particular, this matters because the TypeScript compiler lets you configure which host environment's types to include. Setting `"lib": ["ES2022", "DOM"]` in `tsconfig.json` adds DOM types; setting `"lib": ["ES2022"]` without DOM tells TypeScript that `document` does not exist in your environment.

## A concrete example

**Example 1 — the same JS, different host**

```js
// This works in any JS environment (pure language feature)
const doubled = [1, 2, 3].map(x => x * 2);
console.log(doubled); // [2, 4, 6]

// This works ONLY in a browser
document.title = "Hello"; // ReferenceError in Node.js

// This works ONLY in Node.js
import { readFileSync } from 'node:fs';
const data = readFileSync('./data.json', 'utf8'); // ReferenceError in browser
```

**Example 2 — TypeScript and the erased type model**

```ts
// TypeScript annotation — exists ONLY at compile time
function greet(name: string): string {
  return `Hello, ${name}`;
}

// After tsc compiles this, the output is:
function greet(name) {
  return `Hello, ${name}`;
}
```

TypeScript's type annotations are fully erased during compilation. There is no `string` check at runtime. What you get is documentation, IDE autocomplete, and compile-time errors — at zero runtime cost.

```bash
# Compile and emit JS:
npx tsc

# Type-check only (no output files, great for CI):
npx tsc --noEmit
```

## Key points

- ECMAScript is the language; the engine runs it; the host provides extra APIs
- `document`, `window`, `fetch`, `localStorage` are browser host APIs, not JavaScript
- `process`, `fs`, `http`, `Buffer` are Node.js host APIs, not JavaScript
- TypeScript types are erased at compile time — there is no type checking at runtime
- `tsc --noEmit` type-checks your code without emitting output files

## Go deeper

- [TypeScript Handbook: The Basics](../../research/typescript-javascript-course/01-sources/web/S005-ts-basics.md) — explains tsc, the compile pipeline, and why erased types work the way they do
- [Node.js Introduction](../../research/typescript-javascript-course/01-sources/web/S009-nodejs-introduction.md) — covers V8, the process object, and Node's host API surface

---

*[Next lesson: var, let, and const →](./L02-var-let-const.md)*
