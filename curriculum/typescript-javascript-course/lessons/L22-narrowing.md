# Type Narrowing and Discriminated Unions

**Module**: M09 · TypeScript Advanced  
**Type**: applied  
**Estimated time**: 50 minutes  
**Claim**: C5 — TypeScript narrows a variable's type based on runtime checks, allowing safe access to type-specific properties

---

## The core idea

**Type narrowing** is TypeScript's ability to refine a variable's type within a block of code based on a runtime check. If you check `typeof x === "string"`, TypeScript knows `x` is a `string` inside that block — not the original broader type.

**Discriminated unions** are a pattern that extends this: a union type where every member has a common literal property (the "discriminant") that uniquely identifies which member it is. TypeScript uses the discriminant to narrow without any explicit type guards.

Together, these are the primary mechanism for handling union types safely — which is more ergonomic and correct than `as` type assertions.

## Why it matters

You will write discriminated unions for:
- Result types: `{ status: "success"; data: T } | { status: "error"; message: string }`
- Redux/Zustand action types
- API response variants
- WebSocket message routing

The alternative — using `as` to assert types — is incorrect because it doesn't actually validate the value. Narrowing is always preferable when a runtime check can confirm the type.

## A concrete example

**Example 1 — the built-in narrowing guards**

```ts
function format(value: string | number | boolean): string {
  if (typeof value === "string") {
    // TypeScript knows: value is string here
    return value.toUpperCase();
  } else if (typeof value === "number") {
    // TypeScript knows: value is number here
    return value.toFixed(2);
  } else {
    // TypeScript knows: value is boolean here (only option left)
    return value ? "yes" : "no";
  }
}

// instanceof narrowing
function formatDate(d: Date | string): string {
  if (d instanceof Date) {
    return d.toISOString(); // d is Date here
  }
  return d; // d is string here
}

// Truthiness narrowing
function process(s: string | null) {
  if (!s) return; // if s is null or ""
  s.toUpperCase(); // s is string (non-empty) here
}
```

**Example 2 — the in operator and property narrowing**

```ts
interface Cat {
  meow: () => void;
  purr: () => void;
}

interface Dog {
  bark: () => void;
  fetch: () => void;
}

function makeNoise(animal: Cat | Dog) {
  if ("meow" in animal) {
    // TypeScript narrows: animal is Cat
    animal.meow();
    animal.purr();
  } else {
    // TypeScript narrows: animal is Dog
    animal.bark();
  }
}
```

**Example 3 — discriminated unions**

The most powerful narrowing pattern — give each union member a literal type property:

```ts
type ApiResult<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string; code: number };

function renderUser(result: ApiResult<User>) {
  switch (result.status) {
    case "loading":
      // result is { status: "loading" } — no data or message properties
      return "<spinner>";

    case "success":
      // result is { status: "success"; data: User }
      return result.data.name; // TypeScript knows .data exists here

    case "error":
      // result is { status: "error"; message: string; code: number }
      return `Error ${result.code}: ${result.message}`;
  }
}
```

**Example 4 — exhaustive checking with never**

Discriminated unions + `never` = compile-time exhaustiveness check:

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    case "triangle":
      return (shape.base * shape.height) / 2;
    default:
      // If you add a new shape kind without handling it here,
      // TypeScript will error: "Type 'X' is not assignable to type 'never'"
      const _exhaustive: never = shape;
      throw new Error(`Unhandled shape: ${_exhaustive}`);
  }
}
```

**Example 5 — custom type guards**

Sometimes runtime checks can't be expressed with built-in operators. Write a **type predicate** function:

```ts
interface User {
  id: number;
  name: string;
}

// Type guard: returns `val is User` — tells TypeScript what type is true in the true branch
function isUser(val: unknown): val is User {
  return (
    typeof val === "object" &&
    val !== null &&
    "id" in val &&
    "name" in val &&
    typeof (val as User).id === "number" &&
    typeof (val as User).name === "string"
  );
}

// Usage:
const parsed: unknown = JSON.parse(responseBody);

if (isUser(parsed)) {
  // TypeScript narrows: parsed is User
  console.log(parsed.name.toUpperCase());
} else {
  throw new Error("Invalid user data");
}
```

## Key points

- TypeScript narrows types based on `typeof`, `instanceof`, `in`, truthiness, and assignment checks
- Discriminated unions: add a `kind` or `status` literal type property so `switch`/`if` can narrow automatically
- Exhaustiveness checking: assign the unhandled case to `never` — TypeScript will error if you miss a variant
- Custom type guards (`function isX(v: unknown): v is X`) let you encode complex validation logic with type narrowing
- Prefer narrowing over `as` type assertions — narrowing validates at runtime, assertions trust at compile time

## Go deeper

- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — narrowing section with typeof, in, instanceof
- [TypeScript: Generics](../../research/typescript-javascript-course/01-sources/web/S007-ts-generics.md) — conditional types and infer (advanced narrowing at the type level)

---

*← [Previous lesson](./L21-utility-types.md)* · *[Next lesson: DOM Manipulation →](./L23-dom.md)*
