# S005 — TypeScript Handbook: The Basics

**ID**: S005  
**URL**: https://www.typescriptlang.org/docs/handbook/2/basic-types.html  
**Retrieved**: 2025 (current session)  
**Addresses**: Q4 (TypeScript motivation and fundamentals)

## Key Points

### What TypeScript Does
- TypeScript is a **static type checker** — it catches bugs before code runs
- Detects: wrong argument counts, accessing nonexistent properties, typos in method names, impossible comparisons
- The type-checker enables rich tooling: autocomplete, quick-fixes, refactoring, go-to-definition

### Key Concepts

#### Type Annotations
```ts
function greet(person: string, date: Date): void {
  console.log(`Hello ${person}, today is ${date.toDateString()}`);
}
```
- Annotations go **after** the variable/parameter name (unlike Java/C#)
- TypeScript **infers** types where it can — you don't always need explicit annotations

#### Erased Types
- TypeScript compiles to plain JavaScript — all type annotations are **erased** at runtime
- Type annotations have **zero runtime cost** and do not change behavior

#### Downleveling
- TypeScript can compile modern JS (ES2020+) down to older targets (ES5, ES2015, etc.)
- Template literals may be compiled to string concatenation for older targets

#### Strictness Flags
- `strict: true` enables all strictness flags at once (recommended for new projects)
- **`noImplicitAny`**: forbids variables implicitly typed as `any`
- **`strictNullChecks`**: `null` and `undefined` are not assignable to every type; must be checked explicitly

### tsc Workflow
- `npm install -g typescript` → `tsc hello.ts`
- Emits JS even on type errors (by default) — use `--noEmitOnError` to change this

## Teaching Relevance
- Coming from Java/C#: TypeScript types are structural, not nominal — interfaces match by shape, not name
- `strictNullChecks` is the single biggest source of TS errors for JS-converting devs
- The key insight: "types are erased, they only exist at compile time"
