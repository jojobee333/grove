# S007 — Rustlings: Exercise Sequence and Hands-On Model

**URL**: https://github.com/rust-lang/rustlings  
**Source type**: Primary / Community standard  
**Retrieved**: 2026-04-19  
**Relevance**: Q7 (hands-on curricula and sequencing)  
**Status**: active

---

## Key Content

### What Rustlings Is

- 62,500+ stars, 11,200+ forks — the most popular Rust hands-on exercise tool.
- Small, self-contained exercises where learners fix compilation errors or complete blanks.
- Recommended to run **in parallel** with The Rust Book.
- Current version: 6.5.0 (Aug 2025).

### Exercise Categories (Canonical Sequence)

Rustlings' exercise order mirrors the Rust Book closely:

1. `intro` — Welcome, getting started
2. `variables` — Mutability, shadowing
3. `functions` — Fn signatures, return values
4. `if` — Conditionals
5. `quiz1` — First checkpoint
6. `primitive_types` — Integers, slices, tuples
7. `vecs` — `Vec<T>` creation and iteration
8. `move_semantics` — Ownership, move vs copy ← **key ownership block**
9. `structs` — Struct definitions and methods
10. `enums` — Enum variants, `match`
11. `strings` — `String` vs `&str`
12. `modules` — `mod`, `use`, visibility
13. `hashmaps` — `HashMap` CRUD
14. `quiz2` — Second checkpoint
15. `options` — `Option<T>`, `if let`
16. `error_handling` — `Result<T,E>`, `?`, custom errors
17. `generics` — Generic functions and structs
18. `traits` — Define, implement, default methods, `Display`
19. `quiz3` — Third checkpoint
20. `lifetimes` — Lifetime annotations, elision
21. `tests` — Unit tests, `#[test]`
22. `iterators` — `map`, `filter`, `fold`, `collect`, `enumerate`
23. `smart_pointers` — `Box`, `Rc`, `Cell`, `RefCell`
24. `threads` — `spawn`, `Arc`, `Mutex`, `mpsc`
25. `macros` — `macro_rules!`
26. `clippy` — Idiomatic code

### What This Reveals About Sequencing (Q7)

- **Move semantics** exercise block appears BEFORE structs/enums — confirming ownership is the first major conceptual hurdle.
- **Lifetimes** come AFTER generics + traits — never before.
- **Threads** come after smart pointers — `Arc` is a prerequisite mental model.
- **Iterators** come right before concurrency — many concurrent patterns use iterators.
- Three quizzes as natural milestone checkpoints: primitive types → collections → generics/traits.

### Hands-On Model for Grove Course Design

- Every Rustlings exercise has a single concept focus.
- This validates the "one lesson = one concept + one mini-project" model.
- Grove code challenges should mirror this: compile-time + logic exercises.
- Quizzes at checkpoints map well to Grove's `modcheck` system.

---

## Evidence Quality

- Official Rust team project. 62k+ stars = community-validated sequence.
- Directly answers Q7 (proven sequencing for hands-on curricula).
- Cross-validates Q1 (learning sequence) with independent source.
