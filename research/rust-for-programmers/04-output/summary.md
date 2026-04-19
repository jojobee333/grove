# Summary — Rust for Programmers

_One-page course brief. Target audience: Python/JS/Java developers, zero Rust experience._

---

## What This Course Teaches

Rust fundamentals from first principles to idiomatic concurrency. By the end, learners write safe, idiomatic Rust application code and understand the type system well enough to tackle async Rust independently.

**Scope in**: ownership, borrowing, lifetimes, structs, enums, traits, generics, error handling, iterators, closures, threads/channels/Arc+Mutex.  
**Scope out**: async/await, unsafe, macros, FFI, embedded, WASM.

---

## Why This Sequence

Three independent sources (The Rust Book, Rust By Example, Rustlings) all converge on the same 9-step learning order. The course follows this validated sequence: each module builds directly on the previous without requiring forward references.

---

## 9-Module Outline

| # | Module | Capstone Mini-Project |
|---|--------|-----------------------|
| 1 | Setup + Variables + Functions | CLI Temperature Converter |
| 2 | Ownership + Borrowing | String Reversal CLI with ownership trace |
| 3 | Structs + Methods | Student grade calculator struct |
| 4 | Enums + Pattern Matching + Option | Expression evaluator (`enum Expr`) |
| 5 | Collections (Vec, HashMap, String) | Word frequency counter (HashMap) |
| 6 | Error Handling (Result, ?, custom errors) | CSV parser with robust error propagation |
| 7 | Generics + Traits + Lifetimes | Generic stack (`impl<T>` with Display bound) |
| 8 | Closures + Iterators | Log file analyzer (chain: filter/map/collect) |
| 9 | Concurrency (threads, channels, Arc/Mutex) | Parallel word counter (4 threads) |

Each module ends with a standalone mini-project. Three knowledge checkpoints (after modules 1, 5, and 8) assess cumulative understanding.

---

## Pedagogy

- **Hands-on first**: every lesson ends with working code, not fragments.
- **Bug-class framing**: each module opens with "what class of bugs does this eliminate?"
- **Idiomatic Rust**: always show the idiomatic version after the explicit version.
- **Progressive complexity**: CLI tools → data structures → functional pipelines → concurrency.
