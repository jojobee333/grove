# Objects and Destructuring

**Module**: M03 · Collections & Iteration  
**Type**: applied  
**Estimated time**: 40 minutes  
**Claim**: C1 — Destructuring and object spread are the standard idioms for working with structured data in modern JavaScript

---

## The core idea

Destructuring is syntax for unpacking values from objects and arrays into named variables. Instead of `const name = user.name; const age = user.age;`, you write `const { name, age } = user;`. It makes the intent of your code clearer and reduces repetitive property access.

Object spread (`{...obj}`) creates shallow copies of objects and is used to build new objects that are variations of existing ones. Together, these patterns are the foundation of the immutable-update style used in React state management, Redux reducers, and functional data transformations.

## Why it matters

You will see destructuring and spread everywhere in modern JavaScript and TypeScript codebases. React function components destructure props as their first argument. API response processing uses destructuring to pull out needed fields. Spread is used constantly to merge objects without mutation.

The key footgun to watch for: both destructuring and spread are **shallow**. Nested objects are still shared by reference. If you need a deep clone, use `structuredClone()` (modern browsers/Node.js) or a library.

## A concrete example

**Example 1 — object destructuring**

```js
const user = { name: "Alice", age: 30, role: "admin" };

// Without destructuring
const name = user.name;
const age  = user.age;

// With destructuring
const { name, age } = user;

// Rename while destructuring
const { name: userName, age: userAge } = user;
console.log(userName); // "Alice"

// Default values
const { name, theme = "dark" } = user; // theme is "dark" since user.theme is undefined

// Nested destructuring
const { address: { city } } = { name: "Alice", address: { city: "London" } };
console.log(city); // "London"
```

**Example 2 — array destructuring**

```js
const rgb = [255, 128, 0];

// Without destructuring
const r = rgb[0];
const g = rgb[1];
const b = rgb[2];

// With destructuring
const [r, g, b] = rgb;

// Skip elements with commas
const [first, , third] = rgb;  // first = 255, third = 0

// Rest pattern captures the remainder
const [head, ...tail] = [1, 2, 3, 4, 5];
// head = 1, tail = [2, 3, 4, 5]

// Swapping variables
let a = 1, b = 2;
[a, b] = [b, a];  // a = 2, b = 1 — no temp variable needed
```

**Example 3 — function parameters with destructuring**

```js
// Before
function greet(user) {
  return `Hello, ${user.name} (${user.role})`;
}

// After — destructure directly in the parameter
function greet({ name, role }) {
  return `Hello, ${name} (${role})`;
}

// With defaults in params
function createCard({ title = "Untitled", color = "#fff" } = {}) {
  return { title, color };
}

// TypeScript typed version
interface User {
  name: string;
  role: string;
}

function greetTyped({ name, role }: User): string {
  return `Hello, ${name} (${role})`;
}
```

**Example 4 — object spread**

```js
const defaults = { theme: "dark", lang: "en", timeout: 3000 };
const overrides = { lang: "fr", timeout: 5000 };

// Later properties win
const config = { ...defaults, ...overrides };
// { theme: "dark", lang: "fr", timeout: 5000 }

// Immutable update pattern (common in React)
const user = { name: "Alice", age: 30, role: "user" };

const promoted = { ...user, role: "admin" };
// { name: "Alice", age: 30, role: "admin" } — user is unchanged

// Add field
const withEmail = { ...user, email: "alice@example.com" };

// Remove field (spread + destructure)
const { role, ...withoutRole } = user;
// withoutRole = { name: "Alice", age: 30 }
```

**Example 5 — the shallow clone warning**

```js
const original = {
  name: "Alice",
  address: { city: "London", zip: "EC1A" }
};

const copy = { ...original };
copy.name = "Bob";          // original.name is still "Alice" ✓
copy.address.city = "Paris"; // original.address.city is now "Paris" ✗

// address is shared by reference — spread is shallow

// Deep clone:
const deep = structuredClone(original); // modern JS — safe and recursive
deep.address.city = "Berlin"; // original.address.city unchanged ✓
```

## Key points

- Destructuring unpacks object or array values into named variables, with optional renaming and defaults
- Spread creates shallow copies — nested objects are still shared by reference
- Use `{ ...obj, key: newValue }` for immutable object updates (React pattern)
- Use rest `...rest` in destructuring to capture remaining fields or array elements
- `structuredClone()` is the modern standard for deep clones of plain objects

## Go deeper

- [MDN: Grammar and Types](../../research/typescript-javascript-course/01-sources/web/S001-mdn-grammar-types.md) — object literals and spread
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — typed destructuring and object types

---

*← [Previous lesson](./L05-arrays.md)* · *[Next lesson: Function Forms and Hoisting →](./L07-function-forms.md)*
