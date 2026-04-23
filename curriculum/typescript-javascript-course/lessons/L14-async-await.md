# async/await

**Module**: M06 · Async JavaScript  
**Type**: applied  
**Estimated time**: 45 minutes  
**Claim**: C3 — async/await is syntactic sugar over Promises that allows writing asynchronous code in a synchronous style

---

## The core idea

`async/await` is not a new async model — it is syntax built on top of Promises. An `async` function always returns a Promise. The `await` keyword, used inside an `async` function, pauses execution of that function until the awaited Promise settles, then returns the resolved value (or throws on rejection).

The mental model: `async/await` lets you write Promise-based code that *looks* synchronous. Error handling uses `try/catch` instead of `.catch()`. Control flow (`if`, `for`, `while`) works naturally, unlike with promise chains.

## Why it matters

`async/await` is the preferred style for writing asynchronous code in modern JavaScript and TypeScript. Promise chains are still used (especially in functional-style code), but `async/await` is more readable for complex sequential logic with branching and error handling.

The traps:
- **Not awaiting a promise**: `const result = fetchData()` — you have a Promise, not data
- **Sequential awaits when parallel is better**: `await a; await b;` waits for a before starting b
- **Forgetting try/catch**: an uncaught rejection in an async function propagates as an unhandled rejection
- **Top-level await**: only works in ES modules or REPL; not in CommonJS modules

## A concrete example

**Example 1 — async function basics**

```js
// Every async function returns a Promise
async function getUser(id) {
  return { id, name: "Alice" }; // implicitly wraps in Promise.resolve()
}

// Calling it:
const user = await getUser(1); // { id: 1, name: "Alice" }

// Or with .then():
getUser(1).then(user => console.log(user));

// Throwing in async function rejects the returned promise
async function riskyOp() {
  throw new Error("Something went wrong");
}
// riskyOp() returns a rejected Promise — not a thrown exception from calling perspective
```

**Example 2 — await unwraps promises**

```js
async function fetchUser(id) {
  // Without await: response is a Promise<Response>
  const response = await fetch(`/api/users/${id}`); // Response object
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const user = await response.json(); // awaits the json() Promise
  return user; // user is the parsed object
}
```

**Example 3 — error handling with try/catch**

```js
async function loadDashboard(userId) {
  try {
    const user = await fetchUser(userId);
    const posts = await fetchUserPosts(userId);
    const notifications = await fetchNotifications(userId);
    
    return { user, posts, notifications };
  } catch (err) {
    // Catches rejection from any of the three awaits
    console.error("Dashboard load failed:", err.message);
    throw err; // re-throw so caller can handle it too
  }
}

// Caller:
try {
  const data = await loadDashboard(1);
  renderDashboard(data);
} catch (err) {
  showErrorBanner("Could not load your dashboard. Please refresh.");
}
```

**Example 4 — parallel vs sequential await**

```js
// SLOW: Sequential — user fetch completes before posts fetch starts
async function loadSlowly(userId) {
  const user  = await fetchUser(userId);   // ~100ms
  const posts = await fetchPosts(userId);  // ~150ms — didn't start until user finished
  return { user, posts };
  // Total: ~250ms
}

// FAST: Parallel — both start immediately
async function loadFast(userId) {
  const [user, posts] = await Promise.all([
    fetchUser(userId),   // starts immediately
    fetchPosts(userId),  // also starts immediately
  ]);
  return { user, posts };
  // Total: ~150ms (the slower of the two)
}

// Pattern: Start promises without await, then await all at end
async function loadFastManual(userId) {
  const userPromise  = fetchUser(userId);  // starts immediately, not awaited yet
  const postsPromise = fetchPosts(userId); // starts immediately

  const user  = await userPromise;  // wait for user
  const posts = await postsPromise; // wait for posts (likely already done)
  return { user, posts };
}
```

**Example 5 — async in loops**

```js
const userIds = [1, 2, 3, 4, 5];

// Sequential (processes one at a time — use when order matters or rate-limiting)
async function processSequential(ids) {
  const results = [];
  for (const id of ids) {
    const user = await fetchUser(id); // waits for each
    results.push(user);
  }
  return results;
}

// Parallel (starts all at once — use when independent and no rate limit)
async function processParallel(ids) {
  return Promise.all(ids.map(id => fetchUser(id)));
}

// WRONG: forEach with async — doesn't await the callbacks
async function processWrong(ids) {
  const results = [];
  ids.forEach(async (id) => {       // forEach doesn't wait for async callbacks
    const user = await fetchUser(id);
    results.push(user);             // may not be populated when forEach ends
  });
  return results; // returns [] immediately!
}
```

**Example 6 — TypeScript async return types**

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

// Return type is Promise<User>
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<User>;
}

// Promise<void> for operations with no meaningful return
async function deleteUser(id: number): Promise<void> {
  const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
}
```

## Key points

- `async` functions always return a Promise; `await` pauses the function until the Promise settles
- Use `try/catch` around `await` calls for error handling — unhandled rejections in async functions become unhandled promise rejections
- `await a; await b;` is sequential; `await Promise.all([a, b])` is parallel — use parallel when operations are independent
- Don't use `await` inside `forEach` — use `for...of` for sequential, `Promise.all` + `map` for parallel
- TypeScript: annotate the return type as `Promise<T>` for async functions that return a value

## Go deeper

- [MDN: Promises and async/await](../../research/typescript-javascript-course/01-sources/web/S004-mdn-promises.md) — async/await deep dive and advanced patterns
- [MDN: JS Execution Model](../../research/typescript-javascript-course/01-sources/web/S003-mdn-execution-model.md) — how await interacts with the microtask queue

---

*← [Previous lesson](./L13-promises.md)* · *[Next lesson: ES Modules →](./L15-modules.md)*
