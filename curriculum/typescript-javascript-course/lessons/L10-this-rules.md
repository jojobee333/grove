# this Binding Rules

**Module**: M05 · this Binding  
**Type**: core  
**Estimated time**: 45 minutes  
**Claim**: C1 — The value of this in JavaScript is determined by how a function is called, not where it is defined; there are exactly five call-site rules

---

## The core idea

In Java and Python, `this`/`self` always refers to the object the method belongs to. In JavaScript, `this` is **not** determined by where the function is defined — it is determined by **how the function is called** at runtime. The same function called in different ways will have a different `this`.

There are exactly five rules that determine `this`, evaluated in priority order:
1. `new` binding — `new Fn()` creates a new object and `this` is that object
2. Explicit binding — `fn.call(obj)`, `fn.apply(obj)`, or `fn.bind(obj)` force `this` to be `obj`
3. Implicit binding — `obj.method()` sets `this` to `obj`
4. Default binding — a plain call `fn()` sets `this` to `undefined` (strict mode) or the global object
5. Arrow functions — see L11; they don't have their own `this`

## Why it matters

`this` is the #1 source of bugs for developers moving to JavaScript from class-based languages. The specific failure modes:
- Extracting a method from an object and calling it as a plain function loses `this`
- Passing an object method as a callback loses `this`
- Nested functions inside methods don't inherit the outer `this`

TypeScript does not automatically fix `this` bugs — they're runtime behavior. However, you can use TypeScript's `noImplicitThis` flag (included in `strict`) to get errors when `this` is typed as `any`.

## A concrete example

**Example 1 — Rule 3: Implicit binding**

```js
const user = {
  name: "Alice",
  greet() {
    console.log(`Hello, I am ${this.name}`);
  }
};

user.greet(); // "Hello, I am Alice" — this = user (implicit binding)
```

The rule: when a function is called as a property of an object with `obj.fn()`, `this` is `obj`.

**Example 2 — Losing implicit binding (the classic bug)**

```js
const user = {
  name: "Alice",
  greet() {
    console.log(`Hello, I am ${this.name}`);
  }
};

// Extract the method into a standalone variable
const greetFn = user.greet;

// Now call it — no object in front of the dot
greetFn(); // "Hello, I am undefined" (strict mode) or "" (sloppy)

// Why? greetFn is called as a plain function — Rule 4 (default binding)
// this = undefined in strict mode (or globalThis in sloppy)
```

**Example 3 — Rule 2: Explicit binding with call/apply/bind**

```js
function greet(greeting, punctuation) {
  console.log(`${greeting}, I am ${this.name}${punctuation}`);
}

const alice = { name: "Alice" };
const bob   = { name: "Bob" };

// call: first arg is this, rest are function args
greet.call(alice, "Hello", "!");   // "Hello, I am Alice!"
greet.call(bob, "Hi", ".");       // "Hi, I am Bob."

// apply: first arg is this, second is array of args
greet.apply(alice, ["Hello", "!"]); // same as call above

// bind: returns a NEW function with this permanently bound
const greetAlice = greet.bind(alice);
greetAlice("Hey", "?"); // "Hey, I am Alice?"

// Once bound, the binding cannot be overridden by call/apply:
greetAlice.call(bob, "Hey", "?"); // still "Hey, I am Alice?" — bind wins
```

**Example 4 — Rule 1: new binding**

```js
function Person(name, age) {
  // When called with new, this is the new empty object
  this.name = name;
  this.age = age;
  // implicit return this
}

const alice = new Person("Alice", 30);
console.log(alice.name); // "Alice"
console.log(alice.age);  // 30
```

**Example 5 — Rule 4: Default binding and strict mode**

```js
function whoAmI() {
  console.log(this);
}

whoAmI(); 
// Sloppy mode: logs the global object (window in browser, globalThis in Node)
// Strict mode: logs undefined

// With 'use strict':
function whoAmIStrict() {
  "use strict";
  console.log(this); // undefined
}
whoAmIStrict(); // undefined
```

TypeScript files are always compiled to strict mode (when `strict: true`), so default binding always gives `undefined`.

**Example 6 — the callback lose-this problem**

```js
class Timer {
  seconds = 0;

  start() {
    // BROKEN: passing this.tick as a callback loses this
    setInterval(this.tick, 1000);
  }

  tick() {
    this.seconds++; // this is undefined here — ReferenceError
    console.log(this.seconds);
  }
}

// Fix 1: bind in the constructor or at point of use
class TimerFixed {
  seconds = 0;

  start() {
    setInterval(this.tick.bind(this), 1000); // explicit binding
  }

  tick() {
    this.seconds++;
    console.log(this.seconds);
  }
}

// Fix 2: arrow function (see L11)
class TimerArrow {
  seconds = 0;

  start() {
    setInterval(() => this.tick(), 1000); // arrow captures this from start()
  }

  tick() {
    this.seconds++;
  }
}
```

## Key points

- `this` is determined at call-time, not definition-time; the five rules apply in priority order: new > explicit > implicit > default > arrow
- `obj.method()` binds `this` to `obj`; assigning the method to a variable and calling it plain loses the binding
- Use `.bind(obj)` to permanently attach a `this` to a function before passing it as a callback
- In strict mode (and TypeScript), the default binding is `undefined`, not the global object
- Arrow functions don't have their own `this` at all — see L11 for the full story

## Go deeper

- [MDN: this keyword](../../research/typescript-javascript-course/01-sources/web/S010-mdn-this.md) — five call-site rules with detailed examples
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — `noImplicitThis` option

---

*← [Previous lesson](./L09-closures.md)* · *[Next lesson: Arrow Functions and this Traps →](./L11-this-traps.md)*
