# Everyday Types — Unions, Literals, and Null Safety

**Module**: M08 · TypeScript Foundations  
**Type**: applied  
**Estimated time**: 50 minutes  
**Claim**: C2 — Union types, literal types, and strict null checks are the core of TypeScript's practical type system for modeling real-world data

---

## The core idea

TypeScript's most practically useful type constructs are:
- **Union types** (`string | number`): a value can be one of several types
- **Literal types** (`"active" | "inactive"`): a value must be exactly one of specific values
- **Strict null checks**: `null` and `undefined` are not in every type by default — you must opt in to allow them

Together, these three let you model real-world data precisely: an API status field can be `"pending" | "complete" | "failed"` rather than just `string`. A user's email is `string | null` (might not be set), not just `string`.

## Why it matters

These are the types you reach for every day. They:
- Prevent string typos on enum-like values at compile time
- Make optional properties explicit in interfaces
- Force you to handle null/undefined cases (eliminating an entire class of runtime errors)
- Enable TypeScript's narrowing system (L22) to work correctly

## A concrete example

**Example 1 — union types**

```ts
// A function that accepts multiple types
function formatId(id: string | number): string {
  if (typeof id === "string") {
    return id.toUpperCase();
  }
  return id.toString();
}

formatId(42);       // "42"
formatId("abc");    // "ABC"
formatId(true);     // Error: Argument of type 'boolean' is not assignable to 'string | number'
```

**Example 2 — literal types**

```ts
// Without literal types — too broad
type Status = string; // could be "active", "INACTIVE", "xyz", anything

// With literal types — only these three values are valid
type Status = "active" | "inactive" | "suspended";

let userStatus: Status = "active";    // ✓
userStatus = "inactive";              // ✓
userStatus = "banned";                // Error: Type '"banned"' is not assignable to type 'Status'

// Numeric literals
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
function roll(): DiceRoll {
  return Math.floor(Math.random() * 6 + 1) as DiceRoll;
}

// Using literal types as function parameters (self-documenting)
function setAlignment(align: "left" | "center" | "right") { /* ... */ }
setAlignment("center"); // IDE autocomplete shows the three options
setAlignment("middle"); // Error at compile time, not runtime
```

**Example 3 — strict null checks**

```ts
// Without strictNullChecks (dangerous)
let name: string = null; // allowed — type is effectively string | null | undefined

// With strictNullChecks (enabled by strict: true)
let name: string = null;    // Error: Type 'null' is not assignable to type 'string'
let name: string | null = null; // Correct — explicitly allows null

// Optional properties (? makes it T | undefined)
interface User {
  id: number;
  name: string;
  email?: string;       // string | undefined — may not be present
  deletedAt: Date | null; // null — explicitly set to null (soft delete pattern)
}

const user: User = {
  id: 1,
  name: "Alice",
  deletedAt: null,
  // email omitted — valid because it's optional
};
```

**Example 4 — handling nullable values**

```ts
interface User {
  name: string;
  email: string | null;
}

function sendEmail(user: User) {
  // TypeScript forces you to handle null:
  user.email.toLowerCase(); // Error: Object is possibly 'null'

  // Fix 1: explicit null check
  if (user.email !== null) {
    user.email.toLowerCase(); // safe — TypeScript narrows to string
  }

  // Fix 2: optional chaining (?.)
  const lower = user.email?.toLowerCase(); // string | undefined

  // Fix 3: nullish coalescing (??)
  const email = user.email ?? "no-email@example.com"; // string

  // Fix 4: non-null assertion (use sparingly)
  const forced = user.email!.toLowerCase(); // you're telling TS "I know it's not null"
  // If user.email is actually null, this crashes at runtime
}
```

**Example 5 — type aliases and interface comparison**

```ts
// Type alias — for union types, primitives, and computed types
type ID = string | number;
type Status = "active" | "inactive";
type Result<T> = { data: T; error: null } | { data: null; error: Error };

// Interface — for object shapes (preferred for objects that extend)
interface User {
  id: ID;
  name: string;
  status: Status;
}

// Interfaces can be extended:
interface AdminUser extends User {
  adminLevel: 1 | 2 | 3;
}

// Type aliases can extend via intersection:
type AdminUser = User & {
  adminLevel: 1 | 2 | 3;
};

// Rule of thumb: interface for object shapes, type alias for unions and primitives
```

## Key points

- Union types (`A | B`) allow a value to be one of multiple types; the compiler enforces you handle all possibilities
- Literal types (`"left" | "center" | "right"`) restrict a value to specific exact values — safer than bare `string`
- `strict: true` enables `strictNullChecks`: `null` and `undefined` must be explicitly included in union types
- Optional properties (`name?: string`) are `string | undefined`; null properties (`name: string | null`) are explicitly nullable
- Prefer `interface` for object shapes, `type` for unions, primitives, and complex computed types

## Go deeper

- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — full coverage of primitive types, unions, optional properties
- [TypeScript: Handbook Basics](../../research/typescript-javascript-course/01-sources/web/S005-ts-handbook-basics.md) — strictNullChecks and the type system fundamentals

---

*← [Previous lesson](./L17-why-typescript.md)* · *[Next lesson: Interfaces and Structural Typing →](./L19-interfaces.md)*
