# S004 — MDN Learn: How to Use Promises

**ID**: S004  
**URL**: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises  
**Retrieved**: 2025 (current session)  
**Addresses**: Q3 (async programming — promises and async/await)

## Key Points

### What Is a Promise?
- A `Promise` is an object returned by an async function representing the **future result** of the operation
- States: **pending** → **fulfilled** (success) or **rejected** (failure)
- "Resolved" means no longer pending (may still be locked to another promise's state)

### Using Promises (`.then()` / `.catch()`)
```js
fetch(url)
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  })
  .then(data => console.log(data))
  .catch(error => console.error(error));
```
- `.then()` returns a new promise → enables **promise chaining** (avoids callback hell)
- `.catch()` at end handles any error in the chain

### Combining Promises
- `Promise.all([p1, p2, p3])` — wait for all; rejects if any rejects
- `Promise.any([p1, p2, p3])` — resolves with first fulfilled; rejects if all reject
- `Promise.allSettled()` — wait for all regardless of success/failure

### async/await
```js
async function fetchProducts() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}
```
- `async` function always returns a Promise
- `await` pauses execution inside the async function until the promise settles
- Enables writing async code that looks like synchronous code
- `await` can only be used inside `async` functions (or top-level in ES modules)
- Does NOT block the thread — other jobs can run while awaiting

### Common Pitfalls
- `async function` always returns a promise — you must `.then()` or `await` the result
- `await` in series = sequential; use `Promise.all()` for parallel operations

## Teaching Relevance
- Promises replace the "callback hell" pattern experienced devs know from other ecosystems
- `async/await` is the modern idiomatic approach — should be taught first
- The "async function always returns Promise" gotcha trips up every dev new to JS
