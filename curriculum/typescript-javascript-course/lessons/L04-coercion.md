# Equality and Type Coercion

**Module**: M02 · Variables, Types & Coercion  
**Type**: applied  
**Estimated time**: 35 minutes  
**Claim**: C1 — JavaScript's == operator performs implicit type coercion that produces counterintuitive results; the + operator is overloaded between addition and concatenation

---

## The core idea

JavaScript has two equality operators: `==` (loose equality) and `===` (strict equality). Loose equality performs **type coercion** — it converts operands to the same type before comparing. The coercion rules are complex enough that even experienced JS developers can't reliably predict the result without consulting a table. **Always use `===`**. This is not a preference — it is a hard rule enforced by every serious linter and coding standard.

The `+` operator has the same problem: it means numeric addition when both operands are numbers, and string concatenation when either operand is a string. This means `"3" + 4` is `"34"`, not `7`. Other arithmetic operators (`-`, `*`, `/`) don't have this problem — they always coerce to numbers.

## Why it matters

These are the coercion bugs you will encounter most often:
- Comparing a number from an API (which might arrive as a string) with `==` instead of `===`
- Concatenating a string with a number accidentally with `+`
- Checking if something is falsy without accounting for the full falsy value set

TypeScript's type system largely prevents coercion bugs by ensuring you don't mix types accidentally — but only if you use `strict: true` and avoid type assertions.

## A concrete example

**Example 1 — == vs === comparison table**

```js
// Strict equality — no surprises
5 === 5           // true
"5" === 5         // false — different types
null === undefined // false
0 === false        // false

// Loose equality — coercion mayhem
5 == "5"          // true  — string "5" coerced to number 5
null == undefined  // true  — special rule: only equal to each other
0 == false         // true  — false coerced to 0
0 == ""            // true  — "" coerced to 0
"" == false        // true  — both coerce to 0
[] == false        // true  — [] coerces to "" then to 0
[] == ![]          // true  — both sides coerce to 0 (try explaining this)
```

The `==` rules are a 20-step algorithm in the spec. The `===` rules are simple: same type and same value. Use `===`.

**Example 2 — the + operator trap**

```js
// Numeric addition — what you expect
5 + 3    // 8
5.0 + 3  // 8

// String concatenation — also +
"hello" + " world"  // "hello world"

// The trap: if either side is a string, + concatenates
"5" + 3    // "53"  — 3 coerced to "3"
5 + "3"    // "53"  — same
"5" + 3 + 2  // "532"  — left-to-right: "5" + 3 = "53", then "53" + 2 = "532"
5 + 3 + "2"  // "82"   — 5 + 3 = 8, then 8 + "2" = "82"

// Other arithmetic operators always coerce to number:
"5" - 3   // 2
"5" * 2   // 10
"5" / 2   // 2.5
"5" - "3" // 2
"hello" - 1 // NaN
```

**Example 3 — falsy values**

JavaScript has exactly 6 falsy values. Everything else is truthy.

```js
// The 6 falsy values:
if (!false)     // falsy
if (!0)         // falsy
if (!0n)        // falsy (BigInt zero)
if (!"")        // falsy (empty string)
if (!null)      // falsy
if (!undefined) // falsy

// Common trap: these are TRUTHY
if ("0")        // truthy — non-empty string
if ([])         // truthy — empty array (it's an object reference)
if ({})         // truthy — empty object

// Practical use of truthy/falsy in guards:
function processName(name) {
  if (!name) {  // catches null, undefined, and ""
    return "Anonymous";
  }
  return name.toUpperCase();
}
```

**Example 4 — fixing coercion in real scenarios**

```js
// API response — quantity arrives as string "5" from URL param
const raw = "5";

// Bug: "5" + 1 = "51"
const broken = raw + 1; // "51"

// Fix: parse first
const correct = parseInt(raw, 10) + 1; // 6
const alsoCorrect = Number(raw) + 1;   // 6
const withPlus = +raw + 1;             // 6 (unary + converts to number)

// TypeScript would have caught the bug:
// Error: Operator '+' cannot be applied to types 'string' and 'number'
```

## Key points

- Always use `===` (strict equality); `==` performs unpredictable type coercion
- The `+` operator concatenates when either operand is a string; `-`/`*`/`/` always coerce to number
- JavaScript has exactly 6 falsy values: `false`, `0`, `0n`, `""`, `null`, `undefined`
- Empty arrays `[]` and objects `{}` are truthy — this surprises developers from every background
- TypeScript with `strict: true` prevents most coercion bugs at compile time

## Go deeper

- [MDN: Grammar and Types](../../research/typescript-javascript-course/01-sources/web/S001-mdn-grammar-types.md) — full coverage of coercion rules and the equality algorithm
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — how strict null checks and union types prevent coercion bugs

---

*← [Previous lesson](./L03-primitive-types.md)* · *[Next lesson: Arrays and Functional Iteration →](./L05-arrays.md)*
