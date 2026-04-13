# The Nine Flags: What strict:true Actually Enables

**Module**: M01 · TypeScript Strict Mode: The Stack's Foundation
**Type**: core
**Estimated time**: 15 minutes
**Claim**: C1 — TypeScript strict mode is a non-negotiable prerequisite for the Meridian stack

---

## The core idea

`"strict": true` in your `tsconfig.json` is not one setting — it is nine compiler flags activated simultaneously. Each flag closes a different hole in the type system. When you enable strict mode, you're not adding strictness on top of TypeScript; you're enabling the type system that TypeScript's documentation assumes you're using.

For the Meridian stack specifically, strict mode is a hard technical requirement. Several libraries — Zod, Zustand, Drizzle — produce silently incorrect types without it. They won't throw errors. They'll just give you types that don't match runtime behaviour. This is worse than a compile error.

## Why it matters

When you're building with a stack where a Zod schema derives a TypeScript type, a Drizzle table definition becomes a query result type, and an Anthropic SDK streaming event has a specific shape — the accuracy of those derived types is load-bearing. If the derivation is wrong because strict mode isn't enabled, you get false confidence: the code compiles, but the types lie to you. For an "apply practically" goal, understanding exactly what you're turning on — and why — prevents hours of debugging type mismatches in production.

## A concrete example

Here are the nine flags `strict: true` activates, with the ones that matter most to the Meridian stack called out:

```json
{
  "compilerOptions": {
    "strict": true
    // Equivalent to all of these being true:
    // "noImplicitAny": true          ← CRITICAL: no untyped values
    // "strictNullChecks": true       ← CRITICAL: null/undefined are distinct types
    // "strictFunctionTypes": true    ← prevents unsafe function assignments
    // "strictBindCallApply": true    ← checks .bind(), .call(), .apply() args
    // "strictPropertyInitialization": true ← class props must be initialised
    // "noImplicitThis": true         ← no untyped `this` in functions
    // "alwaysStrict": true           ← emits "use strict" in JS output
    // "useUnknownInCatchVariables": true ← catch (e) → e is unknown, not any
    // "exactOptionalPropertyTypes": true ← {a?: string} ≠ {a: string|undefined}
  }
}
```

The two flags that matter most for Meridian are `noImplicitAny` and `strictNullChecks`. Without `noImplicitAny`, TypeScript allows values of type `any` to propagate silently — Zod's `z.infer<>` will return `any` instead of the derived type. Without `strictNullChecks`, `null` and `undefined` are assignable to every type, which means the Anthropic SDK's optional response fields don't produce errors when you access them unsafely.

One additional flag that Meridian's `tsconfig.json` sets separately: `"isolatedModules": true`. This is required by Vite's esbuild transpiler, which processes files individually without type information. It ensures every TypeScript file can be transpiled in isolation — meaning no `const enum` declarations and all type imports use `import type`. [S001](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S001-typescript-strict-mode.md)

## Key points

- `strict: true` activates nine flags at once; you can't get the benefit by enabling them individually only when convenient
- `noImplicitAny` and `strictNullChecks` are the two flags that libraries in the Meridian stack directly depend on
- `isolatedModules: true` is a separate, Vite-specific requirement — not part of `strict`, but equally non-optional

## Go deeper

- [S001](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S001-typescript-strict-mode.md) — Full TypeScript strict sub-flag reference with examples of each

---

*[Next lesson: Strict Mode Through Libraries →](./L02-strict-mode-through-libraries.md)*
