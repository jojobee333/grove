# tsconfig.json — The TypeScript Compiler

**Module**: M07 · Modules & Tooling  
**Type**: applied  
**Estimated time**: 35 minutes  
**Claim**: C2 — tsconfig.json controls what TypeScript checks and what JavaScript it produces; understanding the key flags prevents configuration surprises

---

## The core idea

`tsconfig.json` is the configuration file that tells the TypeScript compiler (`tsc`) two things: **what to check** (type checking options) and **what to emit** (code generation options). Most developers use a framework (Vite, Next.js, ts-node) that runs `tsc` for them, but tsconfig still controls the behavior.

The most important setting is `strict: true`. It enables a bundle of checks that catch the most common type bugs. Without it, TypeScript is significantly less useful.

## Why it matters

Poor tsconfig configuration leads to:
- Types that look correct in your IDE but fail at runtime
- Missing null checks (`strictNullChecks: false` — the dangerous default before `strict`)
- Modules that compile fine but fail to import at runtime (wrong `module` setting)
- Using features that won't work in your target runtime (`target` too high)

You'll encounter tsconfig in every TypeScript project. Knowing the meaning of the ~15 most common flags means you can debug configuration problems without guessing.

## A concrete example

**Example 1 — minimal production tsconfig**

```json
{
  "compilerOptions": {
    // Strictness
    "strict": true,              // enables all strict checks below
    // "noUncheckedIndexedAccess": true, // arr[0] is T | undefined (very useful, not in strict)
    
    // Module system
    "module": "NodeNext",        // use "ESNext" + "Bundler" for Vite/Webpack projects
    "moduleResolution": "NodeNext",
    
    // Output target
    "target": "ES2022",          // what JavaScript features to use in output
    "lib": ["ES2022"],           // what global types to include
    
    // Output
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,         // emit .d.ts files
    "sourceMap": true,           // emit .js.map files
    
    // Quality
    "noEmit": false,             // true when using a bundler (bundler handles emit)
    "skipLibCheck": true,        // skip type checking of .d.ts files in node_modules
    "esModuleInterop": true,     // allows default imports from CJS modules
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Example 2 — what `strict: true` actually enables**

```json
// strict: true is equivalent to:
{
  "strictNullChecks": true,       // null and undefined are not assignable to other types
  "strictFunctionTypes": true,    // function parameter types are checked contravariantly
  "strictBindCallApply": true,    // bind/call/apply are type-checked
  "strictPropertyInitialization": true, // class properties must be initialized
  "noImplicitAny": true,          // variables without type annotations can't be inferred as any
  "noImplicitThis": true,         // this with implicit any is an error
  "alwaysStrict": true,           // emit "use strict" in every output file
  "useUnknownInCatchVariables": true // catch clause variables are unknown, not any
}
```

**Example 3 — strictNullChecks in practice**

```ts
// With strictNullChecks: false (DANGEROUS)
function getLength(s: string) {
  return s.length; // TypeScript allows this even if s could be null/undefined
}
getLength(null); // compiles fine — crashes at runtime

// With strictNullChecks: true (correct)
function getLength(s: string) {
  return s.length; // only accepts string — null/undefined would be a compile error
}

function getLengthOptional(s: string | null | undefined) {
  if (s == null) return 0;
  return s.length; // s is narrowed to string here — safe
}
```

**Example 4 — target vs lib**

```json
{
  "target": "ES2022",  // TypeScript compiles newer syntax down to ES2022 features
  "lib": ["ES2022", "DOM"] // TypeScript knows about ES2022 globals + browser DOM globals
}
```

```ts
// target: "ES5" — TypeScript would compile this arrow function to a regular function
const add = (a: number, b: number) => a + b;
// Emits: var add = function(a, b) { return a + b; };

// lib: ["ES2022"] without "DOM" — fetch, document, etc. are unknown
fetch("/api"); // Error: Cannot find name 'fetch'

// Fix: add "DOM" to lib, or use "lib": ["ES2022", "DOM", "DOM.Iterable"]
```

**Example 5 — noEmit for bundler projects**

When using Vite, Webpack, or similar bundlers, the bundler (not tsc) transforms TypeScript to JavaScript. In this case:

```json
{
  "compilerOptions": {
    "noEmit": true,      // TypeScript is only used for type checking, not output
    "strict": true,
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

Use `tsc --noEmit` in CI to type-check without building:

```bash
tsc --noEmit         # type-check entire project, produce no output
tsc --noEmit --watch # watch mode for development
```

## Key points

- `strict: true` enables all important checks — never ship a TypeScript project without it
- `strictNullChecks` (included in `strict`) is the most impactful: without it, TypeScript doesn't catch null/undefined bugs
- `module` + `moduleResolution` control the module format; use `NodeNext` for Node.js and `Bundler` for Vite/Webpack
- `target` is the JS version of output syntax; `lib` is the set of type definitions TypeScript is aware of
- Set `noEmit: true` when a bundler handles compilation — use `tsc --noEmit` only for type checking

## Go deeper

- [TypeScript: Handbook Basics](../../research/typescript-javascript-course/01-sources/web/S005-ts-handbook-basics.md) — tsconfig reference and explanation of each flag
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — how strict null checks change type behavior

---

*← [Previous lesson](./L15-modules.md)* · *[Next lesson: Why TypeScript →](./L17-why-typescript.md)*
