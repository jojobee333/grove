# ES Modules and the CJS vs ESM Divide

**Module**: M07 · Modules & Tooling  
**Type**: core  
**Estimated time**: 35 minutes  
**Claim**: C1 — JavaScript has two module systems: CommonJS (Node.js original) and ES Modules (the standard); they are not directly interoperable

---

## The core idea

JavaScript has two module systems:

**CommonJS (CJS)**: Node.js's original module system. Uses `require()` and `module.exports`. Synchronous loading. The default in Node.js without configuration.

**ES Modules (ESM)**: The language standard since ES2015. Uses `import` and `export`. Static (analyzable at build time), supports tree-shaking, works in both browsers and Node.js. TypeScript compiles to ESM or CJS depending on your `tsconfig`.

The problem: CJS and ESM are not directly compatible. You can't `require()` an ESM module (unless it uses dynamic `import()`), and mixing them causes errors that are confusing to debug.

## Why it matters

You will encounter both module systems constantly:
- Node.js projects with `"type": "module"` in package.json use ESM
- Most npm packages have been shipped as CJS since 2010 and are migrating slowly
- TypeScript lets you write ESM-style imports/exports and compiles to either format
- Bundlers (Webpack, Vite, esbuild) understand both and handle the interop for you in client code

The key practical knowledge: what file extension and package.json fields signal which format, and what the error messages mean when you mix them.

## A concrete example

**Example 1 — ES Module syntax**

```js
// Named exports
export const PI = 3.14159;

export function add(a, b) {
  return a + b;
}

export class Vector {
  constructor(x, y) { this.x = x; this.y = y; }
}

// Default export (one per file)
export default class App { /* ... */ }

// Re-export from another module
export { formatDate } from "./utils.js";
export * from "./math.js";
```

```js
// Importing
import App from "./app.js";              // default import
import { PI, add } from "./math.js";    // named imports
import * as Math from "./math.js";      // namespace import
import { add as sum } from "./math.js"; // rename on import

// Dynamic import (returns a Promise)
const { add } = await import("./math.js");
```

**Example 2 — CommonJS syntax**

```js
// Exporting
const PI = 3.14159;

function add(a, b) {
  return a + b;
}

module.exports = { PI, add };
// or: module.exports.add = add;
// or single default: module.exports = add;
```

```js
// Importing
const { PI, add } = require("./math");    // destructured
const math = require("./math");           // whole object
const add = require("./math").add;        // direct access
```

**Example 3 — format signals**

| Signal | Format |
|---|---|
| `package.json` has `"type": "module"` | `.js` files are ESM |
| `package.json` has `"type": "commonjs"` or absent | `.js` files are CJS |
| File ends in `.mjs` | ESM regardless of package.json |
| File ends in `.cjs` | CJS regardless of package.json |
| TypeScript `.ts` | Compiled to whatever `module` in tsconfig.json says |

```json
// package.json — tells Node.js to treat .js as ESM
{
  "type": "module"
}
```

**Example 4 — interop gotchas**

```js
// ERROR: Cannot use import statement in a module (CJS trying to use ESM syntax)
// This happens when you write import/export in a .js file without "type": "module"

// ERROR: require() of ES Module is not supported
// This happens when a CJS file tries to require() a pure ESM package
const module = require("a-pure-esm-package"); // ❌

// WORKAROUND: Dynamic import in CJS
async function load() {
  const { default: module } = await import("a-pure-esm-package"); // ✓
}
```

**Example 5 — TypeScript module compilation**

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "NodeNext",     // modern Node.js ESM/CJS interop
    "moduleResolution": "NodeNext",
    // -- or for bundler (Vite/Webpack):
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

With `module: "NodeNext"`, TypeScript requires explicit `.js` extensions in imports (even for `.ts` files):

```ts
// WRONG with NodeNext:
import { add } from "./math"; // Error: Missing file extension

// CORRECT:
import { add } from "./math.js"; // TypeScript resolves this to math.ts
```

## Key points

- ESM uses `import`/`export` (static, tree-shakeable); CJS uses `require`/`module.exports` (dynamic, synchronous)
- `"type": "module"` in package.json makes `.js` files ESM; `.mjs` always ESM, `.cjs` always CJS
- ESM and CJS don't mix directly — CJS cannot `require()` an ESM module (use dynamic `import()`)
- TypeScript writes ESM syntax and compiles to CJS or ESM based on `module` in tsconfig
- Bundlers (Vite, Webpack) abstract away the CJS/ESM divide for browser code

## Go deeper

- [TypeScript: Handbook Basics](../../research/typescript-javascript-course/01-sources/web/S005-ts-handbook-basics.md) — TypeScript module compilation
- [Node.js Introduction](../../research/typescript-javascript-course/01-sources/web/S009-nodejs-intro.md) — Node.js module system in depth

---

*← [Previous lesson](./L14-async-await.md)* · *[Next lesson: tsconfig.json →](./L16-tsconfig.md)*
