# S006 — Rust By Example: Table of Contents & Scope Map

**URL**: https://doc.rust-lang.org/rust-by-example/  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q1 (learning sequence), Q7 (hands-on curricula)  
**Status**: active

---

## Key Content

### What Rust By Example Is

A collection of **runnable examples** illustrating Rust concepts and standard libraries. Complements The Rust Book by providing executable code snippets rather than prose explanations.

### Full Topic List (Canonical Learning Sequence)

1. Hello World
2. Primitives (integers, floats, bool, char, unit)
3. Custom Types (`struct`, `enum`)
4. Variable Bindings (mutability, scope, shadowing)
5. Types (casting, aliases)
6. Conversion (`From`/`Into`, `TryFrom`/`TryInto`, `to_string`, `parse`)
7. Expressions
8. Flow of Control (`if`/`else`, `loop`, `while`, `for`, `match`, `if let`, `while let`)
9. Functions (methods, closures, higher-order functions)
10. Modules (visibility, `use`, `super`, file hierarchy)
11. Crates (library crates, `extern crate`)
12. Cargo (dependencies, conventions, testing, build scripts)
13. Attributes (`#[derive]`, `cfg`, custom)
14. Generics (functions, implementations, bounds, `where`, `impl Trait`, `dyn`)
15. Scoping Rules (RAII, ownership, borrowing, lifetimes)
16. Traits (derive, dyn, returning, iterating, operator overloading, `Drop`, `Clone`, `Copy`)
17. Macros
18. Error Handling (`panic`, `Option`, `Result`, `?`)
19. Std Library Types (`Box<T>`, `Vec<T>`, `String`, `HashMap`, `HashSet`, `Rc`, `Arc`)
20. Std Misc (threads, channels, `Path`, `File`)
21. Testing (unit, integration, documentation tests)
22. Unsafe Operations
23. Compatibility (editions)
24. Meta (docs, benchmarks)

---

## Learning Sequence Evidence

The RBE ordering strongly suggests:
- **Primitives → Custom Types → Flow Control → Functions** as the foundation block.
- **Generics and Scoping Rules (ownership/borrowing)** come after the learner has concrete type experience.
- **Traits** after generics — they are deeply intertwined.
- **Error handling** deliberately placed AFTER traits/generics because it relies on both.
- **Concurrency** in "Std Misc" — near the end, after error handling.

This sequence is consistent with The Rust Book's chapter ordering and validates Q1.

### Hands-On Applicability (Q7)

- All RBE examples are runnable in the browser (play.rust-lang.org).
- Each example is self-contained — natural micro-project model.
- Grove's code-challenges can model this: one standalone function per exercise.

---

## Evidence Quality

- Official secondary source (Rust core team maintained). High confidence.
- Addresses both Q1 (sequence) and Q7 (hands-on, runnable examples model).
