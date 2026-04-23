# Arrays and Functional Iteration

**Module**: M03 · Collections & Iteration  
**Type**: applied  
**Estimated time**: 45 minutes  
**Claim**: C1 — Modern JavaScript array manipulation uses functional methods rather than imperative loops

---

## The core idea

Modern JavaScript uses a small set of array methods — `map`, `filter`, `reduce`, `find`, `some`, `every` — to transform and query collections. These are not the only way to work with arrays, but they are the idiomatic way. Code using these methods tends to be more readable, composable, and easier to type in TypeScript than imperative `for` loops.

Each of these methods accepts a callback function and iterates internally. They do not mutate the original array (with the notable exception of `sort` and `reverse`, which mutate in-place). Instead, they return new arrays or scalar values.

## Why it matters

If you're coming from Java, you likely know streams (`.stream().map().filter().collect()`). Python developers know list comprehensions. JS functional array methods are the equivalent, and they're used everywhere — in React component rendering, data transformations, API response processing, and test fixtures.

The `for...of` loop is the imperative alternative and is appropriate when you need early exit, side effects, or more complex logic. The `for...in` loop, however, iterates over *property names* of an object — using it on an array iterates over index strings ("0", "1", "2") and any enumerable properties of `Array.prototype`. Do not use `for...in` on arrays.

## A concrete example

**Example 1 — the core 5 methods**

```js
const numbers = [1, 2, 3, 4, 5, 6];

// map: transform each element, return new array of same length
const doubled = numbers.map(n => n * 2);
// [2, 4, 6, 8, 10, 12]

// filter: keep elements where callback returns true
const evens = numbers.filter(n => n % 2 === 0);
// [2, 4, 6]

// reduce: fold array into single value
const sum = numbers.reduce((acc, n) => acc + n, 0);
// 21

// find: return FIRST element where callback returns true (or undefined)
const firstBig = numbers.find(n => n > 3);
// 4

// some: true if ANY element passes the test
const hasOdd = numbers.some(n => n % 2 !== 0);
// true

// every: true if ALL elements pass the test
const allPositive = numbers.every(n => n > 0);
// true
```

**Example 2 — chaining methods (the real power)**

```js
const orders = [
  { id: 1, status: "complete", amount: 120 },
  { id: 2, status: "pending",  amount: 80 },
  { id: 3, status: "complete", amount: 200 },
  { id: 4, status: "cancelled",amount: 50 },
];

// Total revenue from completed orders only
const revenue = orders
  .filter(o => o.status === "complete")
  .map(o => o.amount)
  .reduce((sum, amount) => sum + amount, 0);
// 320
```

**Example 3 — spread and array construction**

```js
const a = [1, 2, 3];
const b = [4, 5, 6];

// Spread: create new array from existing ones
const combined = [...a, ...b];           // [1, 2, 3, 4, 5, 6]
const withExtra = [...a, 99, ...b];      // [1, 2, 3, 99, 4, 5, 6]
const copy = [...a];                      // shallow copy, not a reference

// Add element to a copy (immutable pattern):
const withNew = [...a, 4];               // [1, 2, 3, 4] — a is unchanged

// Remove element by index (immutable):
const withoutFirst = a.slice(1);        // [2, 3]
const withoutLast  = a.slice(0, -1);   // [1, 2]
const withoutMid   = [...a.slice(0, 1), ...a.slice(2)]; // [1, 3]
```

**Example 4 — for...of vs for...in**

```js
const fruits = ["apple", "banana", "cherry"];

// for...of — iterates over VALUES (correct for arrays)
for (const fruit of fruits) {
  console.log(fruit); // "apple", "banana", "cherry"
}

// for...in — iterates over KEYS (don't use on arrays)
for (const key in fruits) {
  console.log(key); // "0", "1", "2" — strings, not numbers
}

// for...of also works on strings, Maps, Sets:
for (const char of "hello") {
  console.log(char); // "h", "e", "l", "l", "o"
}

const map = new Map([["a", 1], ["b", 2]]);
for (const [key, value] of map) {
  console.log(key, value); // "a" 1, "b" 2
}
```

**Example 5 — TypeScript types for array operations**

```ts
interface Order {
  id: number;
  status: "complete" | "pending" | "cancelled";
  amount: number;
}

const orders: Order[] = [/* ... */];

// TypeScript infers types through the chain:
const completed: Order[] = orders.filter(o => o.status === "complete");
const amounts: number[] = completed.map(o => o.amount);
const total: number = amounts.reduce((sum, n) => sum + n, 0);
```

## Key points

- `map` transforms elements (same length), `filter` selects elements (shorter), `reduce` folds to one value
- `find` returns the first matching element or `undefined`; `some` and `every` return booleans
- Chain these methods for readable data transformations — no intermediate variable needed
- Use spread `[...arr]` to create copies instead of mutating in place
- Use `for...of` for imperative loops over arrays; never use `for...in` on arrays

## Go deeper

- [MDN: Grammar and Types](../../research/typescript-javascript-course/01-sources/web/S001-mdn-grammar-types.md) — array and object fundamentals
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — typing arrays, tuple types, and readonly arrays

---

*← [Previous lesson](./L04-coercion.md)* · *[Next lesson: Objects and Destructuring →](./L06-objects.md)*
