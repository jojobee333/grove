# Primitive Types and typeof

**Module**: M02 · Variables, Types & Coercion  
**Type**: core  
**Estimated time**: 30 minutes  
**Claim**: C1 — JavaScript has 8 primitive types and one structural type; typeof is unreliable for two of them

---

## The core idea

JavaScript has **8 types**: `string`, `number`, `bigint`, `boolean`, `null`, `undefined`, `symbol`, and `object`. Everything that is not one of the first seven is an `object` — arrays, functions, dates, maps, and plain objects are all `typeof "object"` or `typeof "function"`.

The `typeof` operator returns a string representing the type of a value. It is mostly reliable, but has two notable quirks that every JS developer must know:
1. `typeof null === "object"` — this is a historical bug in the language; it cannot be fixed
2. Functions return `"function"`, not `"object"`, even though functions are objects

Unlike Java or C#, JavaScript variables have no fixed type. A variable can hold any value at any time — `let x = 5; x = "hello"; x = null;` is perfectly valid. TypeScript adds static typing on top to prevent this at compile time.

## Why it matters

The `typeof` quirks are not academic — they appear in real code all the time:
- Null-checking requires `value !== null`, not `typeof value !== "object"` (which would also exclude objects)
- Checking if something is callable: `typeof fn === "function"` works correctly
- TypeScript's `strictNullChecks` is designed specifically to address the null/undefined problem at the type level

Understanding what `undefined` vs `null` means semantically also matters: `undefined` is the language's default for "this was never assigned", while `null` is a developer's explicit signal for "no value here".

## A concrete example

**Example 1 — typeof on the 8 types**

```js
typeof "hello"        // "string"
typeof 42             // "number"
typeof 3.14           // "number"  (no int/float distinction — all are double)
typeof 9007199254740993n // "bigint"  (suffix n creates a BigInt)
typeof true           // "boolean"
typeof undefined      // "undefined"
typeof Symbol("id")   // "symbol"
typeof {}             // "object"
typeof []             // "object"   (arrays are objects)
typeof function(){}   // "function" (functions are technically objects, but get their own typeof result)
typeof null           // "object"   ← the bug
```

**Example 2 — null checking correctly**

```js
// WRONG — this also returns false for actual objects
function isNull(val) {
  return typeof val === "object" && /* but now what? */
}

// RIGHT
function isNull(val) {
  return val === null;
}

// RIGHT — check for a real object (non-null)
function isObject(val) {
  return typeof val === "object" && val !== null;
}
```

**Example 3 — undefined vs null in practice**

```js
let declared;
console.log(declared);           // undefined — declared but not assigned
console.log(notDeclared);        // ReferenceError — never declared

function greet(name) {
  console.log(name);             // undefined if caller didn't pass argument
}

const user = { name: "Alice" };
console.log(user.age);           // undefined — property doesn't exist (not an error)
console.log(user.address?.city); // undefined — optional chaining, no error

const empty = null;              // developer explicitly says "no value here"
```

The convention: use `null` when you intentionally have no value. Use `undefined` for missing arguments or uninitialized state. TypeScript with `strictNullChecks` treats them as distinct types, preventing the common bug of assuming a value exists.

**Example 4 — no integer/float distinction**

Coming from Python (int vs float) or Java (int, long, double):

```js
42        // number
3.14      // number
42 === 42.0 // true — it's all IEEE 754 double precision

// Maximum safe integer
Number.MAX_SAFE_INTEGER // 9007199254740991
9007199254740992 === 9007199254740993 // true — precision lost!

// Use BigInt for large integers
9007199254740993n === 9007199254740994n // false — exact
```

## Key points

- JavaScript has 8 types; everything else is an `object` (including arrays, dates, functions)
- `typeof null === "object"` is a historical bug — null-check with `=== null` instead
- `undefined` = "never assigned"; `null` = "explicitly no value" — use them consistently
- Numbers are always IEEE 754 doubles; use `BigInt` (suffix `n`) for integers above 2^53
- TypeScript's `strictNullChecks` makes `null` and `undefined` distinct types at compile time

## Go deeper

- [MDN: Grammar and Types](../../research/typescript-javascript-course/01-sources/web/S001-mdn-grammar-types.md) — full coverage of JS types and typeof behavior
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — how TypeScript models null/undefined with strictNullChecks

---

*← [Previous lesson](./L02-var-let-const.md)* · *[Next lesson: Equality and Type Coercion →](./L04-coercion.md)*
