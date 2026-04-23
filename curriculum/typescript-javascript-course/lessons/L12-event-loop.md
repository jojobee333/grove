# The Event Loop

**Module**: M06 · Async JavaScript  
**Type**: core  
**Estimated time**: 45 minutes  
**Claim**: C3 — JavaScript is single-threaded; async operations are handled by an event loop that processes callbacks from a task queue after the current call stack empties

---

## The core idea

JavaScript runs in a single thread — there is only one call stack. All your synchronous code runs to completion before anything asynchronous can run. This is the event loop model: the JavaScript engine continuously checks whether the call stack is empty, and if it is, it picks the next task from the task queue and pushes it onto the stack.

This means `setTimeout(fn, 0)` does not run immediately — it schedules `fn` as a new task, which will run after the current synchronous code completes and the stack is empty.

There are two queues that matter: the **task queue** (also called macrotask queue) for I/O, timers, and user events, and the **microtask queue** for Promise callbacks and `queueMicrotask`. Microtasks have higher priority: the entire microtask queue is drained after each task, before the next task is picked up.

## Why it matters

Understanding the event loop is essential for:
- Reasoning about the order of async operations
- Avoiding blocking the UI with expensive synchronous computations
- Understanding why `async/await` code runs in a specific order
- Diagnosing "why does my callback run after X" bugs

Node.js uses the same event loop model (implemented via libuv), so this knowledge applies to both browser and server code.

## A concrete example

**Example 1 — setTimeout order**

```js
console.log("1 — start");

setTimeout(() => {
  console.log("3 — timeout");
}, 0);

console.log("2 — end");

// Output:
// 1 — start
// 2 — end
// 3 — timeout
```

Even with 0 ms delay, the setTimeout callback is queued as a task. It can only run after the current synchronous code (lines 1 and 5) finishes.

**Example 2 — microtasks vs macrotasks**

```js
console.log("1");

setTimeout(() => console.log("5 — macrotask"), 0);

Promise.resolve()
  .then(() => console.log("3 — microtask 1"))
  .then(() => console.log("4 — microtask 2"));

console.log("2");

// Output: 1, 2, 3, 4, 5
```

Order of execution:
1. Synchronous code runs: logs "1" and "2"
2. Current task ends — call stack is empty
3. Microtask queue is drained: "3 — microtask 1", then "4 — microtask 2"
4. Next macrotask is picked up: "5 — macrotask"

Microtasks always run before the next macrotask. This is why Promise `.then()` callbacks appear before `setTimeout` callbacks.

**Example 3 — blocking the event loop**

```js
// WRONG: This blocks the event loop for the entire duration
function heavySync() {
  const start = Date.now();
  while (Date.now() - start < 2000) {
    // spin for 2 seconds — no other code can run during this
  }
  console.log("done");
}

// While heavySync is running:
// - User interactions are ignored
// - Pending timers don't fire
// - Network response callbacks are queued but not processed

// FIX: Break work into chunks or move to a Web Worker
function heavyInChunks(items, index = 0) {
  const CHUNK = 100;
  const end = Math.min(index + CHUNK, items.length);
  
  for (let i = index; i < end; i++) {
    processItem(items[i]);
  }
  
  if (end < items.length) {
    setTimeout(() => heavyInChunks(items, end), 0); // yield between chunks
  }
}
```

**Example 4 — rendering and the event loop**

In browsers, rendering (painting the screen) happens as a macrotask. This means:
- Changes to the DOM aren't visible until rendering occurs
- `requestAnimationFrame(fn)` schedules `fn` just before the next render
- Too many queued tasks before a render → jank (dropped frames)

```js
// BAD: Both DOM updates are batched — browser only renders once
// But this is actually GOOD in this case:
button.textContent = "Loading...";
// ... expensive synchronous work ...
button.textContent = "Done";
// User only sees "Done" — never "Loading..."

// GOOD: To show intermediate state, yield to the browser
button.textContent = "Loading...";
setTimeout(() => {
  // ... expensive work ...
  button.textContent = "Done";
}, 0); // browser can render "Loading..." before this runs
```

**Example 5 — the event loop + async/await**

```js
async function fetchUser(id) {
  console.log("A: start fetch");
  const response = await fetch(`/api/users/${id}`); // suspends here
  console.log("C: got response");  // runs after fetch resolves
  return response.json();
}

console.log("X: before call");
fetchUser(1);
console.log("Y: after call — doesn't wait for fetchUser");

// Output:
// X: before call
// A: start fetch
// Y: after call — doesn't wait for fetchUser
// ... time passes while fetch request is in flight ...
// C: got response
```

`await` suspends the async function and returns control to the caller. The rest of the async function is scheduled as a microtask when the awaited promise resolves.

## Key points

- JavaScript is single-threaded; the event loop picks tasks from a queue when the call stack is empty
- `setTimeout(fn, 0)` schedules fn as a macrotask — it runs after current synchronous code and all queued microtasks
- Promise `.then()` callbacks are microtasks — they run before the next macrotask
- Blocking the event loop with synchronous computation freezes all async operations, UI updates, and callbacks
- `await` suspends an async function and yields to the event loop; the function resumes when the promise resolves

## Go deeper

- [MDN: JS Execution Model](../../research/typescript-javascript-course/01-sources/web/S003-mdn-execution-model.md) — the call stack, heap, and event queue in detail
- [MDN: Promises and async/await](../../research/typescript-javascript-course/01-sources/web/S004-mdn-promises.md) — how promises interact with the microtask queue

---

*← [Previous lesson](./L11-this-traps.md)* · *[Next lesson: Promises →](./L13-promises.md)*
