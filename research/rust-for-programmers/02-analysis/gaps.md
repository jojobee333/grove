# Gaps — Rust for Programmers

| ID | Question | Priority | Status | Sources |
|----|----------|----------|--------|---------|
| Q1 | Canonical learning sequence for Rust fundamentals | HIGH | answered | S001, S002, S006, S007, S008, S009, S011 |
| Q2 | Mental models for ownership and borrow checker | HIGH | answered | S001, S002, S008 |
| Q3 | Common beginner mistakes and misconceptions | HIGH | partial | S001, S002, S009, S010 (own research; Brown Univ interactive book not sourced) |
| Q4 | Scope and ordering of traits, generics, lifetimes | HIGH | answered | S004, S010 |
| Q5 | Error handling patterns (Result, ?, panic) | MEDIUM | answered | S003 |
| Q6 | Concurrency scope for beginners | MEDIUM | answered | S005 |
| Q7 | Hands-on / project-based Rust curricula and sequencing | HIGH | answered | S006, S007 |

## Residual Gaps

- **Q3 partial**: We have beginner mistakes from the Rust Book's own notes (ownership misconceptions, `'static` misuse, struct-with-ref pitfalls). We did NOT source: Brown Univ interactive Rust book (which has empirical novice study data), Stack Overflow Rust questions, or r/rust "common mistakes" threads. For course purposes, existing sources provide sufficient evidence to write curriculum content. Mark Q3 "addressed" for synthesis.
- **Collections**: No dedicated source for `HashMap`, `Vec<T>`, or `String` operations. These are workhorses in mini-projects. Could add S012 (ch8) if needed during course building.
- **Smart pointers**: Intentionally out of scope for beginner course.
- **`impl Trait` vs `dyn Trait`**: S004 covers `impl Trait` briefly. Dynamic dispatch is borderline — note for synthesis as optional advanced aside.
