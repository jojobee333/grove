# Full Research Report — Rust for Programmers

_Strata research output. Sources: S001–S011 (11 sources). Questions: Q1–Q7 (all addressed)._

---

## Executive Summary

A comprehensive Rust course for experienced programmers (Python/JS/Java background) is best structured as 9 sequential modules following the order validated by The Rust Book, Rust By Example, and Rustlings. The course is distinguished by hands-on mini-projects in every module, explicit "what bug does this prevent?" framing, and an emphasis on idiomatic Rust patterns over raw language mechanics.

The single most important insight: **ownership is not a feature — it is the organizing principle of the entire language**. Every subsequent concept (lifetimes, traits, Option, concurrency) is ownership applied to a new domain.

---

## Research Questions and Answers

### Q1: What is the canonical learning sequence for Rust fundamentals?

**Answer**: Three independent sources converge on the same 9-step sequence:

1. Variables, functions, control flow (primitives)
2. Ownership + borrowing + references
3. Structs + methods
4. Enums + match + Option
5. Collections (Vec, HashMap, String)
6. Error handling (Result, ?, panic vs recover)
7. Generics + Traits + Lifetimes (in that sub-order)
8. Closures + Iterators
9. Concurrency (threads, channels, shared state)

No source deviates from this order. Deviating causes dependency gaps (e.g., teaching traits before ownership creates confusion about `Clone`, `Copy`, and `Display`).

**Sources**: S001, S002, S006, S007, S008, S009, S011

---

### Q2: What mental models help programmers grasp ownership?

**Answers**:

1. **Single ownership**: each value has exactly one owner; assignment moves ownership (not copy, unless `Copy` is implemented).
2. **Borrowing as temporary permissions**: `&T` = read-only loan; `&mut T` = exclusive write loan. Cannot have both simultaneously.
3. **Scope as lifetime**: values are dropped at end of their owner's scope (RAII). No garbage collector.
4. **NLL (non-lexical lifetimes)**: borrow ends at last use, not at block close — this is why modern Rust code is less annotation-heavy than older examples.
5. **`String` vs `&str`**: `String` owns heap memory; `&str` borrows a slice. In early learning, "use `String` when in doubt."

**Sources**: S001, S002, S008

---

### Q3: What are the most common beginner mistakes?

**Identified stumbling blocks** (from Rust Book, Rustlings ordering, and author notes):

1. **Expecting `s2 = s1` to copy** — moves are the default, copying requires `Copy` or `.clone()`.
2. **Trying to use a value after moving it** — especially in function calls: `foo(s); println!("{s}");` fails.
3. **Trying to have `&mut` and `&` simultaneously** — borrow checker error most beginners encounter first.
4. **Storing references in structs without lifetime annotations** — the fix is to use owned types (`String` instead of `&str`) until lifetimes are learned.
5. **Adding `'static` to silence lifetime errors** — almost always wrong; indicates a design issue.
6. **Forgetting iterator adapters are lazy** — `.map(...)` without `.collect()` does nothing.
7. **Using `unwrap()` everywhere instead of `?`** — produces panics in production code; `?` is the correct idiom.

**Sources**: S001, S002, S009, S010, S011

---

### Q4: How should traits, generics, and lifetimes be scoped and ordered?

**Answer**:

The sub-ordering matters: generics first (concrete syntax for `<T>`), traits second (constraints on `T`), lifetimes last (relationships between references).

- **Generics** (`<T>`): teach with `struct Stack<T>` and a generic function — shows syntax before semantics.
- **Traits**: define → implement → default methods → `impl Trait` parameter → `where T: Display` syntax. Cover `Display`, `Clone`, `Iterator`, `From`/`Into`. Note orphan rule. **Don't** cover `dyn Trait` as a first example — use `impl Trait`.
- **Lifetimes**: open with elision rules ("most code needs no annotations"), then `fn longest<'a>(...)`, then `struct ImportantExcerpt<'a>`, then method elision. Defer struct-with-lifetime to a single lesson at end.

**Sources**: S004, S010

---

### Q5: What error handling patterns should the course cover?

**Answer**: Three-stage progression:

1. `match result { Ok(v) => ..., Err(e) => ... }` — explicit, shows the type
2. `result.unwrap()` / `result.expect("msg")` — shortcuts for prototyping; introduce early, flag as non-production
3. `?` operator — production idiom; explain: desugars to early return + implicit `From::from` conversion

Also cover: `panic!` vs recoverable errors (design decision, not just syntax), `Box<dyn Error>` in `main`, and when to create custom error types (when library code is being written).

**Sources**: S003

---

### Q6: What concurrency topics should a beginner Rust course cover?

**Answer**: Three patterns, in order:

1. `thread::spawn` + `JoinHandle::join` — basic parallelism
2. `mpsc::channel` — message passing (safe data transfer between threads)
3. `Arc<Mutex<T>>` — shared state (connect back to ownership: `Arc` is the `Rc` that is `Send`)

Explicitly defer: async/await (requires Future trait, Pin, runtime ecosystem — separate course).

Frame the entire module as: "The borrow checker prevents data races at compile time. `Rc` vs `Arc` is just ownership enforced at thread boundaries."

**Sources**: S005

---

### Q7: How do hands-on curricula structure Rust learning?

**Answer**:

Rustlings (62k GitHub stars) validates: 26 exercise categories, 3 quiz checkpoints, incremental complexity per topic. Key insight: exercises are short (5–20 line functions) but the quizzes synthesize multiple concepts. This matches the Grove module checkpoint model.

Rust By Example validates: 24 topics in sequence; each runnable in the browser. The "run it yourself" model is critical for retention.

The "100 Days of Python" model (user-specified) adds the daily mini-project layer: a complete, runnable program per lesson, not an exercise fragment.

**Course design decision**: every lesson = 1 concept + 1 mini-project. Every module = 3–4 lessons + 1 capstone project. Three checkpoints at modules 1, 5, and 8.

**Sources**: S006, S007

---

## Validated Course Outline (9 Modules)

### Module 1 — Setup & Rust Fundamentals
- L1.1: Installing Rust, Cargo, VS Code setup. `hello_world` + `cargo new`.
- L1.2: Variables, mutability, data types (scalar, compound). Shadowing.
- L1.3: Functions, expressions vs statements, control flow (`if`, `loop`, `while`, `for`).
- **Mini-project**: CLI Temperature Converter (Fahrenheit ↔ Celsius ↔ Kelvin). Demonstrates: functions, match, loop.
- **Checkpoint 1**: Quiz on variables, functions, control flow.

### Module 2 — Ownership & Borrowing
- L2.1: Stack vs heap, ownership rules (one owner, move semantics, scope/drop).
- L2.2: References + borrowing rules. `&T` vs `&mut T`. NLL.
- L2.3: `String` vs `&str`, slices. String operations.
- **Mini-project**: String Ownership Analyzer CLI — takes user input, processes with `&str`/`String` functions, demonstrates move vs borrow.

### Module 3 — Structs & Methods
- L3.1: Defining structs, field init shorthand, update syntax, tuple structs.
- L3.2: `impl` blocks, methods (`&self`), associated functions (constructors).
- L3.3: Derived traits (`Debug`, `Clone`), ownership in structs (use owned types).
- **Mini-project**: Student Grade Calculator — struct with methods, associated constructor, computed field (average).

### Module 4 — Enums, Pattern Matching & Option
- L4.1: Enum variants with data. `match` exhaustiveness. The `_` catch-all.
- L4.2: `Option<T>` — Rust's null alternative. `if let`, `while let`.
- L4.3: Pattern matching deep-dive — destructuring structs/tuples, nested patterns.
- **Mini-project**: Expression Evaluator — `enum Expr { Num(f64), Add(Box<Expr>, Box<Expr>), ... }` with recursive eval.

### Module 5 — Collections
- L5.1: `Vec<T>` — creation, push/pop, iteration, slices.
- L5.2: `HashMap<K, V>` — insert, get, entry API.
- L5.3: `String` operations — concatenation, push_str, split, chars.
- **Mini-project**: Word Frequency Counter — reads text, uses HashMap to count words, prints top-10.
- **Checkpoint 2**: Quiz on structs, enums, collections, Option.

### Module 6 — Error Handling
- L6.1: `Result<T, E>` — match, unwrap, expect, panic policy.
- L6.2: `?` operator — error propagation, `From` conversion, in main.
- L6.3: Custom error types — `enum AppError`, implementing `Display` and `Error`.
- **Mini-project**: CSV Parser — reads a CSV file, parses rows into structs, propagates errors with `?`, reports parse failures without panicking.

### Module 7 — Generics, Traits & Lifetimes
- L7.1: Generics — `struct Stack<T>`, generic functions, monomorphization.
- L7.2: Traits — define, implement, default methods, `impl Trait` / `where T: Trait` syntax. Blanket impls.
- L7.3: Lifetimes — elision rules first, `fn longest<'a>`, struct lifetime annotations.
- **Mini-project**: Generic Stack data structure with `Display` bound for printing; `push`/`pop`/`peek` methods.

### Module 8 — Closures & Iterators
- L8.1: Closures — syntax, environment capture (by ref / by value / `move`), `Fn`/`FnMut`/`FnOnce`.
- L8.2: Iterator trait — `next`, `iter()`/`into_iter()`/`iter_mut()`, lazy evaluation.
- L8.3: Iterator adapters — `map`, `filter`, `enumerate`, `zip`, `flat_map`, `collect`. Zero-cost abstraction.
- **Mini-project**: Log File Analyzer — read lines, parse log level + message, filter by level, collect stats using iterator chain.
- **Checkpoint 3**: Quiz on generics, traits, lifetimes, iterators.

### Module 9 — Concurrency
- L9.1: Threads — `thread::spawn`, `JoinHandle`, `move` closures. Why `move` is needed.
- L9.2: Message passing — `mpsc::channel`, `Sender`/`Receiver`, producer-consumer pattern.
- L9.3: Shared state — `Arc<Mutex<T>>`, lock guards, deadlock avoidance. `Send`/`Sync` marker traits.
- **Mini-project**: Parallel Word Counter — splits input file into N chunks, spawns N threads, each counts words, aggregates via `Arc<Mutex<HashMap>>`.
- **Course capstone**: Extend the word counter to use channels instead of shared state — compare both approaches.

---

## Key Pedagogical Principles (from synthesis)

1. **Ownership first, everything else second** — don't rush past Module 2.
2. **Bug-class framing** — open each module: "What does the compiler prevent here?"
3. **Idiomatic Rust always** — after showing the explicit version, show the idiomatic version.
4. **Complete programs, not fragments** — mini-projects must compile and run.
5. **`String` vs `&str` thread** — mention in M2, revisit in M3, M5, M6. Don't try to fully explain once.
6. **Async deferred** — mention at end of M9 as "the next chapter", point to Tokio docs.

---

## Sources

| ID | Source | Role |
|----|--------|------|
| S001 | Rust Book Ch4.1 | Ownership rules, move semantics |
| S002 | Rust Book Ch4.2 | Borrowing, NLL |
| S003 | Rust Book Ch9 | Error handling |
| S004 | Rust Book Ch10.2 | Traits |
| S005 | Rust Book Ch16 | Concurrency |
| S006 | Rust By Example ToC | Sequence validation, runnable model |
| S007 | Rustlings | Exercise sequence, checkpoint pattern |
| S008 | Rust Book Ch5 | Structs, methods |
| S009 | Rust Book Ch6 | Enums, match, Option |
| S010 | Rust Book Ch10.3 | Lifetimes, elision rules |
| S011 | Rust Book Ch13.2 | Iterators, lazy evaluation |
