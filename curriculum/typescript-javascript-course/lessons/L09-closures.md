# Closures

**Module**: M04 · Functions, Scope & Closures  
**Type**: applied  
**Estimated time**: 50 minutes  
**Claim**: C2 — A closure is a function bundled with its lexical environment; it is the mechanism behind private state, factory functions, and callbacks that remember their context

---

## The core idea

A **closure** is formed whenever a function is defined inside another function and the inner function references variables from the outer function's scope. When the inner function is returned or passed elsewhere, it carries those variable bindings with it — even after the outer function has returned.

In languages without closures, variables on the call stack are destroyed when the function returns. In JavaScript, if an inner function still references those variables, the garbage collector keeps them alive as long as the inner function is reachable. This is the "closed over" state.

Closures are not a special feature you activate — they are an inevitable consequence of lexical scope. Every function that references a variable from an outer scope is a closure.

## Why it matters

Closures are the mechanism behind:
- **Encapsulation without classes**: private variables that can't be accessed from outside
- **Factories**: functions that produce other functions pre-configured with some state
- **Memoization and caching**: a closure holds the cache privately
- **Event handlers and callbacks**: they remember their context (e.g., which item was clicked)

The main footgun — the loop closure bug — is covered in detail here because it is one of the most common bugs in all JS codebases before `let` became standard.

## A concrete example

**Example 1 — the simplest closure**

```js
function makeGreeter(greeting) {
  // greeting is in makeGreeter's scope
  return function(name) {
    // This inner function closes over `greeting`
    return `${greeting}, ${name}!`;
  };
}

const hello = makeGreeter("Hello");
const ciao  = makeGreeter("Ciao");

hello("Alice"); // "Hello, Alice!"
ciao("Alice");  // "Ciao, Alice!"

// makeGreeter has returned, but `greeting` is still alive
// because hello and ciao close over it
```

**Example 2 — private state via closures**

```js
function createCounter() {
  let count = 0;        // private — not accessible from outside

  return {
    increment() { count++; },
    decrement() { count--; },
    reset()     { count = 0; },
    value()     { return count; }
  };
}

const counter = createCounter();
counter.increment();
counter.increment();
counter.value(); // 2

// count is unreachable directly:
counter.count;   // undefined — no such property on the returned object
```

This is the "module pattern" — JavaScript's pre-class mechanism for encapsulation. Even with ES6 classes, closures are still the idiomatic way to create genuinely private state (compared to `#privateField` which is class-only).

**Example 3 — the loop closure bug**

This is the most common closure gotcha:

```js
// Bug: creating functions in a loop with var
const funcs = [];
for (var i = 0; i < 3; i++) {
  funcs.push(function() {
    return i; // which i? The ONE shared var-i
  });
}

funcs[0](); // 3 — not 0!
funcs[1](); // 3 — not 1!
funcs[2](); // 3 — not 2!

// By the time the functions are called, the loop has finished
// and i is 3. All three functions close over the same i.
```

Fix 1: Use `let` — it creates a new binding per iteration:

```js
const funcs = [];
for (let i = 0; i < 3; i++) {
  funcs.push(function() {
    return i; // each closure has its own i
  });
}

funcs[0](); // 0
funcs[1](); // 1
funcs[2](); // 2
```

Fix 2 (pre-ES2015): Use an IIFE to create a new scope:

```js
const funcs = [];
for (var i = 0; i < 3; i++) {
  funcs.push((function(capturedI) {
    return function() { return capturedI; };
  })(i)); // immediately invoke, passing current i as argument
}
```

Fix 3: Use `map` — each iteration is a separate function call with its own scope:

```js
const funcs = [0, 1, 2].map(i => () => i);
funcs[0](); // 0
```

**Example 4 — closures and React hooks (practical application)**

```js
// React's useState is built on closures
function Counter() {
  const [count, setCount] = useState(0);

  // This event handler closes over count and setCount
  const handleClick = () => {
    setCount(count + 1); // closes over current count
  };

  return <button onClick={handleClick}>{count}</button>;
}
```

The stale closure bug in React: if `handleClick` captures an old `count` value, updates will be wrong. The fix is to use the functional update form `setCount(c => c + 1)`.

**Example 5 — memoization**

```js
function memoize(fn) {
  const cache = new Map(); // closed over — private to this memoized function

  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

const expensiveAdd = memoize((a, b) => {
  // Simulate expensive computation
  return a + b;
});

expensiveAdd(2, 3); // computed, cached
expensiveAdd(2, 3); // returned from cache
```

## Key points

- A closure is a function plus a reference to the variables in its lexical scope at the time it was defined
- Closures enable private state (the variable is inaccessible from outside, yet persists as long as the closure exists)
- The loop closure bug: functions in a `for (var ...)` loop all capture the same variable; use `let` or `map` instead
- Every callback that references an outer variable is a closure — you use them constantly without realizing it
- Closures have memory cost: the closed-over variables are not garbage-collected while any closure referencing them is alive

## Go deeper

- [MDN: Closures](../../research/typescript-javascript-course/01-sources/web/S002-mdn-closures.md) — full MDN coverage including the classic counter and private data examples
- [MDN: JS Execution Model](../../research/typescript-javascript-course/01-sources/web/S003-mdn-execution-model.md) — execution context and how closures relate to the call stack

---

*← [Previous lesson](./L08-lexical-scope.md)* · *[Next lesson: this Binding Rules →](./L10-this-rules.md)*
