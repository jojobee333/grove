# Narrative — Rust for Programmers

_The story of how to teach Rust to experienced programmers._

---

## The Central Tension

You are a programmer. You know Python, or JavaScript, or Java. You've shipped real software. Rust is supposed to be worth learning — but the first few hours feel like the compiler is gaslighting you.

`s2 = s1;` causes a compile error? You can't use a variable after you passed it to a function? The type signature for a function that returns a reference requires... what exactly?

The question isn't "what does Rust do?" — it's **"why does Rust do this, and what does it give me in exchange?"**

The answer: **Rust trades short-term developer convenience for a complete category of production bugs**. Memory leaks, null pointer exceptions, data races, dangling references — all compile-time errors. No runtime surprises.

---

## The Core Insight That Changes Everything

The Rust compiler has a model of your program's memory that runs in your head (once you learn it). Once you internalize the ownership rules, the compiler stops feeling adversarial and starts feeling like a senior engineer reviewing your code in real time.

Ownership is not "a feature." It is **the organizing principle of the entire language**. Everything else — lifetimes, traits, `Option<T>`, iterators, concurrency — is ownership applied to a new domain.

That is the through-line of this course.

---

## The Learning Arc

### Act 1: The Foundation (Modules 1–4)
You learn the rules of the game. Variables are owned. References borrow. Structs organize data. Enums replace null and switch-case simultaneously. By the end, you can write meaningful programs. The compiler is still occasionally annoying, but you mostly know why.

**The anchor moment**: writing a struct with methods that processes an `Option<T>` field — you realize you've internalized three concepts simultaneously without noticing.

### Act 2: The Type System (Modules 5–7)
Error handling stops being a chore and becomes a design tool. `Result<T, E>` is not just exception replacement — it's documentation in the type signature. Traits let you write polymorphic code without inheritance. Generics let you write it once for all types. Lifetimes let the compiler verify your memory assumptions, not just your logic.

**The anchor moment**: writing a generic function with a trait bound and seeing it work for `i32`, `String`, and your own struct without changing a line.

### Act 3: Idiomatic Rust (Modules 8–9)
Iterator chains replace loops. Closures make functional patterns natural. You write code that looks like a pipeline — readable, safe, and as fast as C. Then you write a multi-threaded program and watch the compiler stop you from introducing a data race before your code even runs.

**The anchor moment**: parallelizing a word counter with `Arc<Mutex<T>>` and realizing you already understood why it works from Module 1.

---

## Why Hands-On From Day One

Rust is learned by writing Rust, not by reading Rust. Every lesson in this course ends with a mini-project — a small, complete, runnable program. Not an exercise fragment. Not a fill-in-the-blank. A real program.

The reason: **ownership is a kinesthetic skill**. You have to hit the borrow checker errors yourself to understand them. Reading the rules is not enough.

The mini-projects follow a deliberate arc:
- Early: CLI utilities (calculator, converter) — pure function composition
- Middle: Custom data types (task manager, grade calculator) — structs, enums, collections
- Late: Pipeline tools (word counter, CSV parser, log analyzer) — iterators, error handling, closures
- Final: Concurrent programs (parallel web scraper scaffold, concurrent counter) — threads, channels, shared state

---

## What This Course Is Not

This is not a course about systems programming, embedded, WebAssembly, or unsafe Rust. Those are valid — but they require this foundation first. This course produces a programmer who:
- Can write idiomatic, safe Rust application code
- Understands the type system well enough to read community library documentation
- Has the mental model to tackle async Rust (the natural next step)
- Can contribute to an existing Rust codebase without being blocked by the compiler
