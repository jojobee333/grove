# Interfaces and Structural Typing

**Module**: M08 · TypeScript Foundations  
**Type**: applied  
**Estimated time**: 50 minutes  
**Claim**: C2 — TypeScript uses structural typing: two types are compatible if their shapes match, regardless of name; this is different from Java and C#'s nominal typing

---

## The core idea

TypeScript uses **structural typing** (also called "duck typing"). A value is compatible with a type if it has the required properties — the type's name doesn't matter. If an object has a `name: string` and `age: number`, it satisfies any interface that requires those properties, regardless of what that interface is called.

This is the opposite of **nominal typing** (Java, C#): in those languages, a class must explicitly declare it implements an interface with the `implements` keyword. TypeScript has no such requirement.

## Why it matters

Structural typing enables:
- Easy interop with plain JavaScript objects — they don't need to know about your interfaces
- Flexible function design — accept any object with the required shape, not a specific class
- Simpler testing — pass minimal stub objects in tests instead of real instances

The gotcha: structural typing means that extra properties are allowed on passed-in objects (they just satisfy a superset of the required shape). But TypeScript has a special check for object literals that prevents "excess properties" — a helpful consistency rule.

## A concrete example

**Example 1 — structural compatibility**

```ts
interface Named {
  name: string;
}

// No explicit "implements Named" needed:
const user = { name: "Alice", age: 30 };
const product = { name: "Widget", price: 9.99 };

function greet(entity: Named): string {
  return `Hello, ${entity.name}`;
}

greet(user);    // ✓ — user has a name property
greet(product); // ✓ — product has a name property (extra fields are ok)
greet({ id: 1 }); // Error: Property 'name' is missing
```

**Example 2 — interface definition**

```ts
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  createdAt: Date;
}

// Optional properties
interface CreateUserInput {
  name: string;
  email: string;
  role?: "admin" | "editor" | "viewer"; // defaults to "viewer" in application logic
}

// Readonly properties
interface Config {
  readonly apiUrl: string;  // can't be reassigned after creation
  readonly timeout: number;
}

const config: Config = { apiUrl: "https://api.example.com", timeout: 5000 };
config.apiUrl = "other"; // Error: Cannot assign to 'apiUrl' because it is a read-only property
```

**Example 3 — interface vs type alias**

```ts
// Both work for object shapes:
interface IUser {
  id: number;
  name: string;
}

type TUser = {
  id: number;
  name: string;
};

// Interface advantages:
// 1. Declaration merging (extending after definition)
interface Window {
  myCustomProp: string; // extends the built-in Window interface
}

// 2. Clearer error messages (TypeScript uses the interface name)
// 3. Extends syntax is more readable
interface AdminUser extends IUser {
  adminLevel: number;
}

// Type alias advantages:
// 1. Can represent unions and intersections
type IDOrName = number | string;
type AdminUser = IUser & { adminLevel: number }; // intersection type

// 2. Can use mapped types and conditional types
type Optional<T> = { [K in keyof T]?: T[K] };
```

**Example 4 — excess property check (object literal restriction)**

```ts
interface Point {
  x: number;
  y: number;
}

// Object literal — TypeScript checks for excess properties
const p: Point = { x: 1, y: 2, z: 3 }; // Error: Object literal may only specify known properties

// Variable assignment — no excess property check (structural typing allows supersets)
const q = { x: 1, y: 2, z: 3 }; // plain object with 3 props
const p2: Point = q; // OK — q satisfies the Point shape (structural)
```

This asymmetry is intentional. Object literals are usually a mistake when they have extra properties; variable assignments are often intentional upcasting.

**Example 5 — function type compatibility**

```ts
type StringTransformer = (s: string) => string;

// Both of these are compatible with StringTransformer:
const toUpper: StringTransformer = (s) => s.toUpperCase();
const addExcl: StringTransformer = (s) => s + "!";

// Functions with fewer parameters are compatible (common in array callbacks):
const nums = [1, 2, 3];
nums.forEach((n, i, arr) => { /* ... */ }); // 3-param callback

// This also works — TypeScript doesn't require all parameters to be used:
nums.forEach((n) => console.log(n)); // 1-param callback assigned to 3-param type — OK
```

## Key points

- TypeScript uses structural typing — compatibility is based on shape, not declared type names
- Extra properties on variables are allowed (structural superset); extra properties on object literals are not (excess property check)
- `interface` supports declaration merging and the `extends` keyword; `type` supports unions and intersections
- `readonly` properties cannot be reassigned after object creation; `?` makes properties optional (adds `undefined` to the type)
- Functions with fewer parameters are assignable to function types with more parameters — this is why array `.map(fn)` callbacks don't need to take `index` and `array`

## Go deeper

- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — object types, interfaces, and the structural type system
- [TypeScript: Handbook Basics](../../research/typescript-javascript-course/01-sources/web/S005-ts-handbook-basics.md) — type compatibility and assignability rules

---

*← [Previous lesson](./L18-everyday-types.md)* · *[Next lesson: Generics →](./L20-generics.md)*
