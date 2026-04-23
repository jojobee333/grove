# S010 — MDN: `this` keyword

**URL**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this  
**Retrieved**: 2026-04-19  
**Relevance**: Q1 (JS gotchas), Q2 (scope/closures), Q5 (hardest concepts to teach)

---

## Core concept

`this` is a **runtime binding** — its value is determined by *how a function is called*, not where it is defined. Think of it as a hidden parameter passed at the call site.

---

## Five call-site rules

### 1. Method call (`obj.method()`)
`this` = the object the method is called on.
```js
function getThis() { return this; }
const obj1 = { name: "obj1", getThis };
const obj2 = { name: "obj2", getThis };
obj1.getThis(); // { name: "obj1", ... }
obj2.getThis(); // { name: "obj2", ... }
```
`this` follows the *call site*, not where the function lives. If `obj5.getThis = obj4.getThis`, calling `obj5.getThis()` returns `obj5`.

### 2. Plain function call (`func()`)
- **Non-strict mode**: `this` = `globalThis` (window in browser)
- **Strict mode**: `this` = `undefined`
```js
function getThisStrict() { "use strict"; return this; }
typeof getThisStrict(); // "undefined"
```

### 3. Arrow functions — lexical `this`
Arrow functions do **not** create their own `this` binding. They inherit `this` from the enclosing lexical scope at the time they are defined.
```js
const obj = {
  getThisGetter() {
    const getter = () => this;  // 'this' captured from getThisGetter's call
    return getter;
  }
};
const fn = obj.getThisGetter();
fn() === obj;  // true — arrow captured obj

// But unbind the method first:
const fn2 = obj.getThisGetter;
fn2()() === globalThis;  // true — getThisGetter called without obj, so this=globalThis
```
Arrow functions **ignore** `call`, `bind`, `apply` for `this` purposes.

### 4. Explicit binding (`call`, `apply`, `bind`)
- `fn.call(obj, arg1, arg2)` — sets `this` to `obj` for one call
- `fn.apply(obj, [arg1, arg2])` — same, but args as array
- `fn.bind(obj)` — returns a **new function** with `this` permanently bound; bind only works once

```js
function add(c, d) { return this.a + this.b + c + d; }
const o = { a: 1, b: 3 };
add.call(o, 5, 7);    // 16
add.apply(o, [10, 20]); // 34

const g = add.bind(o);
g(5, 7); // 16 — always uses o as this
const h = g.bind({ a: 99 }); // bind only works once!
h(5, 7); // still 16
```

### 5. Constructor call (`new Func()`)
`this` is bound to the newly-created object.
```js
function C() { this.a = 37; }
const o = new C();
o.a; // 37
```
If the constructor returns a non-primitive object, that object replaces `this`.

---

## Callbacks
Callbacks are called with `this = undefined` (strict) or `globalThis` (non-strict) unless explicitly bound. Array iteration methods accept an optional `thisArg`:
```js
[1, 2, 3].forEach(logThis, { name: "obj" }); // { name: "obj" } each time
```

---

## Class context
- Class bodies run in strict mode always.
- Constructor: `this` = new instance.
- Instance methods: `this` = instance (when called normally).
- Static methods: `this` = the class itself.
- Arrow functions in class fields capture `this` at construction time — useful for callbacks, but creates a per-instance function copy.

```js
class Car {
  constructor() {
    this.sayBye = this.sayBye.bind(this); // manual bind
  }
  sayHi() { console.log(`Hello from ${this.name}`); }
  sayBye() { console.log(`Bye from ${this.name}`); }
  get name() { return "Ferrari"; }
}
const car = new Car();
const bird = { name: "Tweety" };
bird.sayHi = car.sayHi;
bird.sayHi(); // "Hello from Tweety" — this follows call site
bird.sayBye = car.sayBye;
bird.sayBye(); // "Bye from Ferrari" — this permanently bound
```

Detaching an unbound class method and calling it throws TypeError in strict mode:
```js
const sayHi = car.sayHi;
sayHi(); // TypeError: Cannot read properties of undefined
```

---

## DOM event handlers
`this` inside an event handler is the DOM element the listener is attached to:
```js
element.addEventListener("click", function() {
  console.log(this === element); // true
});
```
Arrow function handlers do *not* bind `this` to the element — they inherit from surrounding scope.

---

## Global context
- Script (non-module): `this === globalThis` (window in browser)
- ES module top-level: `this === undefined`
- Node.js CJS module: `this === module.exports` (wrapper function)

---

## This substitution (non-strict mode quirk)
In non-strict mode, if `this` would be `null` or `undefined`, it is replaced with `globalThis`. If `this` would be a primitive, it is boxed into a wrapper object. Strict mode prevents this — primitives stay primitive, undefined stays undefined.

---

## Teaching notes (Q5)
`this` is consistently the #1 source of confusion for developers coming from Python/Java/C#:
- Python has explicit `self` — always clear who the receiver is.
- Java/C# `this` is always the current class instance — no variation by call site.
- JS `this` is dynamic by default — the *same function* can have different `this` depending purely on how it is invoked.

**Key mental model to teach**: "Who is to the left of the dot?" If nothing, `this` is `globalThis`/`undefined`. If `new`, `this` is the fresh object. Arrow functions inherit — they never bind.

**Common traps**:
1. Passing an object method as a callback loses `this`: `setTimeout(obj.method, 100)` — `this` is now `globalThis`.
2. Destructuring a method: `const { method } = obj; method()` — `this` is lost.
3. Class methods called as event callbacks without binding.

**Fixes**: `.bind()`, arrow class fields, or arrow wrapper `() => obj.method()`.
