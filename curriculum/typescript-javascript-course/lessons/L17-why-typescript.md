# Why TypeScript — Type Inference and Erased Types

**Module**: M08 · TypeScript Foundations  
**Type**: core  
**Estimated time**: 35 minutes  
**Claim**: C2 — TypeScript is a compile-time tool; it adds types to JavaScript and erases them; the runtime behavior is identical to JavaScript

---

## The core idea

TypeScript is **JavaScript with types**. The TypeScript compiler (`tsc`) reads `.ts` files, checks them for type errors, and emits `.js` files. The emitted JavaScript contains no trace of TypeScript — no type annotations, no interfaces, no `as` assertions. At runtime, it's just JavaScript.

This "type erasure" design has an important implication: TypeScript types cannot affect runtime behavior. `x as number` does not convert `x` to a number — it's a compiler assertion that is removed before the code runs. All type checking happens before execution.

The other key concept is **type inference**: TypeScript can determine the type of most expressions without explicit annotations. `const x = 5` is inferred as `number`. You don't need to annotate everything — only the places TypeScript can't infer (function parameters being the main one).

## Why it matters

Understanding type erasure and inference shapes how you use TypeScript:
- You can't use TypeScript types for validation at runtime — use a library like Zod for that
- You don't need to annotate every variable — the compiler is smart; over-annotation is noise
- Type errors do not prevent the JavaScript from running (unless you use `noEmit` + block on errors); they are warnings you choose to fix

This also explains why TypeScript is popular: zero runtime cost, zero new APIs to learn, gradual adoption possible, and full interop with JavaScript libraries.

## A concrete example

**Example 1 — type erasure**

TypeScript input:

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

function greet(user: User): string {
  return `Hello, ${user.name}`;
}

const alice: User = { id: 1, name: "Alice", email: "alice@example.com" };
console.log(greet(alice));
```

JavaScript output (after `tsc`):

```js
function greet(user) {        // parameter type annotation gone
  return `Hello, ${user.name}`;
}

const alice = { id: 1, name: "Alice", email: "alice@example.com" }; // : User gone
console.log(greet(alice));
```

The interface doesn't exist at runtime. There is no `User` object, no property validation, nothing. Just JavaScript.

**Example 2 — type inference**

```ts
// TypeScript infers all of these without explicit annotations:
const x = 5;             // number
const s = "hello";       // string
const b = true;          // boolean
const arr = [1, 2, 3];   // number[]
const obj = { a: 1 };   // { a: number }

// Function return type inferred:
function double(n: number) { // n must be annotated (TypeScript can't infer input)
  return n * 2; // return type inferred as number
}

// Array operations preserve types:
const nums = [1, 2, 3]; // number[]
const doubled = nums.map(n => n * 2); // number[] — inferred
const strs = nums.map(n => n.toString()); // string[] — inferred

// const vs let inference:
const fixed = "hello"; // type: "hello" (literal type)
let mutable = "hello"; // type: string (widened — it can change)
```

**Example 3 — when to annotate explicitly**

```ts
// Function parameters — always annotate (TypeScript cannot infer these)
function add(a: number, b: number) {
  return a + b; // return type inferred as number
}

// Variables with complex types that inference gets wrong:
const items = []; // TypeScript infers never[] — empty array has no type info
const typedItems: string[] = []; // explicit annotation needed

// When you want a wider type than inferred:
const config = {
  theme: "dark",  // inferred as literal "dark"
};
// If you need to assign config.theme later:
const config: { theme: string } = {
  theme: "dark",  // now inferred as string
};

// Function return type for documentation and contract enforcement:
function fetchUser(id: number): Promise<User> {
  // TypeScript will error if the actual return type doesn't match
  return fetch(`/api/users/${id}`).then(r => r.json());
}
```

**Example 4 — as assertion vs type safety**

```ts
const raw: unknown = "hello";

// Type assertion — tells TypeScript "trust me, this is a string"
const s = raw as string;
s.toUpperCase(); // no error — but if raw were actually 5, this would crash at runtime

// Better: type guard that actually validates
if (typeof raw === "string") {
  raw.toUpperCase(); // TypeScript knows this is safe — proven by the runtime check
}

// as is not a cast — it doesn't change the value
const n = "not a number" as unknown as number;
n.toFixed(2); // TypeScript is happy; runtime crashes with "n.toFixed is not a function"
```

The rule: use type guards and narrowing instead of `as` assertions wherever possible.

## Key points

- TypeScript types are erased at compile time — the emitted JavaScript is identical to what you'd write without types
- Type inference handles most variables and return types — annotate only function parameters and complex cases
- Type assertions (`as`) are not runtime casts; they don't validate or transform values
- TypeScript cannot prevent runtime type errors by itself — combine with Zod or runtime validation at boundaries (e.g., API responses)
- `const` creates a literal type; `let` creates a widened type — this affects inference

## Go deeper

- [TypeScript: Handbook Basics](../../research/typescript-javascript-course/01-sources/web/S005-ts-handbook-basics.md) — type inference rules, the basics of the type system
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — common types, union types, and annotations

---

*← [Previous lesson](./L16-tsconfig.md)* · *[Next lesson: Everyday Types — Unions, Literals, and Null →](./L18-everyday-types.md)*
