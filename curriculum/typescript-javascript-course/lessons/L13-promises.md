# Promises

**Module**: M06 · Async JavaScript  
**Type**: applied  
**Estimated time**: 50 minutes  
**Claim**: C3 — Promises represent eventual values and provide a composable way to sequence and parallelize asynchronous operations

---

## The core idea

A **Promise** is an object representing the eventual completion (or failure) of an async operation. It is in one of three states: pending (waiting), fulfilled (completed with a value), or rejected (failed with a reason). Once settled (fulfilled or rejected), a promise's state never changes.

Before promises, async code used nested callbacks — a pattern known as "callback hell". Promises provide:
- Linear chaining with `.then()` instead of nesting
- Centralized error handling with `.catch()`
- Combinator methods for parallel operations: `Promise.all`, `Promise.race`, `Promise.allSettled`, `Promise.any`

## Why it matters

Promises are the foundation of all modern async JavaScript. The `fetch` API, file system operations in Node.js, database queries, and many web APIs all return promises. `async/await` (L14) is syntactic sugar over promises — you cannot use `await` without understanding what it's awaiting.

The key pitfall: **an unhandled rejected promise** silently swallows errors unless you add `.catch()` or `try/catch` around `await`. This is one of the most common sources of silent failures in production.

## A concrete example

**Example 1 — creating and consuming promises**

```js
// Creating a promise
const myPromise = new Promise((resolve, reject) => {
  // Async work happens here
  setTimeout(() => {
    const success = Math.random() > 0.5;
    if (success) {
      resolve("It worked!"); // fulfill with value
    } else {
      reject(new Error("It failed")); // reject with reason
    }
  }, 1000);
});

// Consuming a promise
myPromise
  .then(value => {
    console.log("Fulfilled:", value); // "It worked!"
  })
  .catch(err => {
    console.error("Rejected:", err.message); // "It failed"
  })
  .finally(() => {
    console.log("Always runs"); // cleanup code
  });
```

**Example 2 — promise chaining**

Each `.then()` returns a new promise, enabling chaining. The value returned from a `.then()` callback becomes the input of the next `.then()`.

```js
fetch("/api/user/1")
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json(); // returns a promise
  })
  .then(user => {
    console.log(user.name);
    return fetch(`/api/posts?userId=${user.id}`); // chain another fetch
  })
  .then(response => response.json())
  .then(posts => {
    console.log(`${posts.length} posts`);
  })
  .catch(err => {
    // Catches errors from ANY step in the chain
    console.error("Something failed:", err.message);
  });
```

**Example 3 — Promise.all for parallel operations**

```js
// Sequential (slow: 3 seconds total)
const user = await fetchUser(1);    // 1 sec
const posts = await fetchPosts(1);  // 1 sec
const comments = await fetchComments(1); // 1 sec

// Parallel (fast: ~1 second total if independent)
const [user, posts, comments] = await Promise.all([
  fetchUser(1),
  fetchPosts(1),
  fetchComments(1)
]);
// All three requests start simultaneously
// Promise.all resolves when ALL three resolve
// If ANY rejects, Promise.all rejects immediately
```

**Example 4 — Promise combinator comparison**

```js
const promises = [
  Promise.resolve("A"),
  Promise.reject(new Error("B failed")),
  Promise.resolve("C")
];

// Promise.all — rejects if ANY rejects
Promise.all(promises)
  .catch(err => console.log("all rejected:", err.message)); // "B failed"

// Promise.allSettled — waits for all, returns status + value/reason
Promise.allSettled(promises).then(results => {
  results.forEach(r => {
    if (r.status === "fulfilled") console.log("✓", r.value);
    if (r.status === "rejected") console.log("✗", r.reason.message);
  });
});
// ✓ A
// ✗ B failed
// ✓ C

// Promise.race — resolves/rejects as soon as the first settles
Promise.race(promises)
  .then(v => console.log("race winner:", v)); // "A"

// Promise.any — resolves with first FULFILLED value, rejects only if ALL reject
Promise.any(promises)
  .then(v => console.log("any:", v)); // "A" (first fulfilled)
```

**Example 5 — unhandled rejections**

```js
// SILENT FAILURE — no .catch()
fetch("/api/data")
  .then(r => r.json())
  .then(data => processData(data));
// If fetch fails or processData throws, error is silently swallowed

// CORRECT — always handle rejections
fetch("/api/data")
  .then(r => r.json())
  .then(data => processData(data))
  .catch(err => {
    console.error("Failed to load data:", err);
    showErrorToUser("Could not load data. Please retry.");
  });

// In Node.js, unhandled rejections terminate the process in newer versions:
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});
```

## Key points

- Promises are in one of three states: pending → fulfilled or rejected (never reversible)
- Chain `.then()` for sequential async steps; the return value of each `.then()` callback becomes the next input
- Always attach `.catch()` (or use try/catch with await) — unhandled rejections are silent bugs
- `Promise.all` runs promises in parallel and fails fast on the first rejection; `Promise.allSettled` waits for all
- Returning a promise from a `.then()` callback chains it — the next `.then()` waits for that inner promise

## Go deeper

- [MDN: Promises and async/await](../../research/typescript-javascript-course/01-sources/web/S004-mdn-promises.md) — full coverage of promise states, creation, and all combinator methods
- [MDN: JS Execution Model](../../research/typescript-javascript-course/01-sources/web/S003-mdn-execution-model.md) — promises and the microtask queue

---

*← [Previous lesson](./L12-event-loop.md)* · *[Next lesson: async/await →](./L14-async-await.md)*
