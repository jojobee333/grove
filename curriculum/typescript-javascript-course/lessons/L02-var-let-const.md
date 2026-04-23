# var, let, and const — Scoping Pitfalls

**Module**: M02 · Variables, Types & Coercion  
**Type**: applied  
**Estimated time**: 40 minutes  
**Claim**: C1 — var hoisting and function scoping cause bugs that experienced developers from other languages don't anticipate

---

## The core idea

Every language you already know uses block scoping: a variable declared inside an `if` block or a `for` loop is only visible within that block. JavaScript's original variable declaration, `var`, does not follow this rule. `var` is function-scoped, and it is hoisted to the top of its containing function with an initial value of `undefined`. This combination produces bugs that are almost impossible to reason about if you're coming from Python, Java, or C#.

`let` and `const`, introduced in ES2015, behave like variables in every other modern language — they are block-scoped and not accessible before their declaration (this restriction is called the Temporal Dead Zone). In modern JavaScript and TypeScript, you should never use `var`. Not "rarely" — never.

## Why it matters

In practice, the var/let/const distinction matters most in two situations: loops and conditionals. The loop case is the most dangerous because it silently produces wrong behavior at runtime rather than a compile error. Every developer from a C-family language will write the loop-var bug the first time they encounter it — and the output will look random until you understand hoisting.

TypeScript with `strict: true` will not save you from the var footgun — it's not a type error, it's a scoping behavior. You have to internalize the rule: **let and const everywhere, var nowhere**.

## A concrete example

**Example 1 — var hoisting in action**

```js
console.log(x); // undefined — not ReferenceError
var x = 5;
console.log(x); // 5
```

Under the hood, JavaScript transforms this to:

```js
var x; // hoisted to top of function/module, initialized to undefined
console.log(x); // undefined
x = 5;
console.log(x); // 5
```

With `let`, the same code throws a `ReferenceError`:

```js
console.log(x); // ReferenceError: Cannot access 'x' before initialization
let x = 5;
```

The error is better — it tells you exactly what went wrong.

**Example 2 — var leaks out of blocks**

```js
if (true) {
  var leaked = "I escaped!";
  let blocked = "I stayed here";
}

console.log(leaked);  // "I escaped!" — var ignores the if-block
console.log(blocked); // ReferenceError — let is block-scoped
```

In Python, a variable assigned inside an if block is still accessible after (because Python has function scope too, just without hoisting). In Java/C#, the variable would not exist outside the block. JavaScript with `let`/`const` matches Java/C# behavior.

**Example 3 — the loop var bug**

This is the footgun you will encounter in real code. It combines var hoisting with closures:

```js
// Bug: what do you expect this to print?
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints: 3, 3, 3 — not 0, 1, 2
```

Why? Because `var i` creates a single variable shared across all iterations. By the time the setTimeout callbacks run, the loop has finished and `i` is 3. Each closure captures the same `i`.

```js
// Fix: use let — creates a new binding per iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints: 0, 1, 2 — each closure captures its own i
```

**Example 4 — const is not immutable, it's non-reassignable**

```js
const user = { name: "Alice", age: 30 };
user.age = 31;           // OK — mutating the object's property
user = { name: "Bob" };  // TypeError: Assignment to constant variable

const nums = [1, 2, 3];
nums.push(4);  // OK — mutating the array
nums = [];     // TypeError
```

`const` prevents re-binding the variable to a new value. It does not deep-freeze objects or arrays. If you need an immutable object, use `Object.freeze()` or TypeScript's `Readonly<T>`.

## Key points

- `var` is function-scoped and hoisted with `undefined` — use `let`/`const` instead in all new code
- `let` and `const` are block-scoped; accessing them before declaration throws `ReferenceError` (Temporal Dead Zone)
- The loop-var bug: `for (var i...)` shares one `i` across all iterations; `for (let i...)` creates a new binding each time
- `const` prevents re-assignment, not mutation — object properties and array elements are still mutable
- In TypeScript, prefer `const` by default; upgrade to `let` only when you need to reassign

## Go deeper

- [MDN: Grammar and Types](../../research/typescript-javascript-course/01-sources/web/S001-mdn-grammar-types.md) — covers var/let/const hoisting, TDZ, and the full variable lifecycle
- [MDN: Closures](../../research/typescript-javascript-course/01-sources/web/S002-mdn-closures.md) — the loop-var bug is explained in detail in the closures module; this lesson and L09 are connected

---

*← [Previous lesson](./L01-js-landscape.md)* · *[Next lesson: Primitive Types and typeof →](./L03-primitive-types.md)*
