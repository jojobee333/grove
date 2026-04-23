# S003 — MDN: JavaScript Execution Model

**ID**: S003  
**URL**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model  
**Retrieved**: 2025 (current session)  
**Addresses**: Q3 (event loop, call stack, single-threaded model)

## Key Points

### Agent Execution Model
- JavaScript runs in an **agent** (analogous to a thread), which has:
  - **Heap**: memory where objects live
  - **Call stack**: LIFO stack of execution contexts (stack frames)
  - **Job queue** (event loop): FIFO queue of pending callbacks/jobs

### Call Stack
- Each function call pushes a new **execution context** (frame) onto the stack
- Context tracks: local variables, `this`, the realm, and code position
- When a function returns, its frame is popped
- **Generators** can suspend (yield) and resume a frame later

### Job Queue and Event Loop
- JavaScript is **single-threaded**: only one statement executes at a time
- Async operations (I/O, timers, fetch) are handled via the host environment
- When async work completes, a **job** (callback) is added to the job queue
- The engine pulls jobs one at a time when the stack is empty — this is the event loop

### Microtasks vs. Tasks
- HTML event loops split jobs into **tasks** (macrotasks) and **microtasks**
- **Microtasks** (Promise callbacks) have higher priority and drain entirely before the next task
- This is why Promise `.then()` callbacks run before `setTimeout` even at 0ms

### Run-to-Completion
- Each job runs fully before the next one starts — no preemption
- Implication: a long-running job blocks all UI updates and other callbacks

### Never Blocking Guarantee
- Async I/O is never blocking — the engine continues processing while waiting
- Exceptions: `alert()`, synchronous XHR (legacy, avoid)

## Teaching Relevance
- The single-threaded model is the key difference from multi-threaded languages
- Explains why `setTimeout(fn, 0)` doesn't mean "run immediately"
- Foundation for understanding why `await` is not blocking
