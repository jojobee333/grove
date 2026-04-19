# Research Plan — Rust for Programmers

## Research Questions

| # | Question | Priority | Source Strategy |
|---|----------|----------|-----------------|
| Q1 | What is the canonical learning sequence for Rust fundamentals as recommended by the Rust team and community? | HIGH | The Rust Book (official), Rustlings, community surveys |
| Q2 | What are the specific mental models needed to understand ownership and the borrow checker? | HIGH | The Rust Book ch4-5, Jon Gjengset talks, Rust for Rustaceans |
| Q3 | What are the most common beginner mistakes and misconceptions in Rust, and how are they best addressed pedagogically? | HIGH | Rust forums, Stack Overflow, Exercism discussions |
| Q4 | What is the right scope and ordering of trait, generics, and lifetime content for a first Rust course? | HIGH | The Rust Book ch10, Rust By Example, Rustonomicon |
| Q5 | How should error handling (Result, ?, panic) be introduced and what are the idiomatic patterns? | MEDIUM | Rust Book ch9, std::error docs, thiserror/anyhow crates |
| Q6 | What concurrency primitives should a beginner course cover, and at what depth? | MEDIUM | Rust Book ch16, async book, Tokio docs |
| Q7 | What project-based or hands-on Rust curricula exist (100 Days style, Rustlings, etc.) and what sequencing / project ideas do they use? | HIGH | Rustlings repo, 100 Days of Rust resources, Exercism Rust track, community blog posts |

## Source Strategy

- Primary: The Rust Programming Language book (doc.rust-lang.org/book) — official, authoritative
- Primary: Rust By Example (doc.rust-lang.org/rust-by-example) — code-first companion
- Secondary: Rust Reference (doc.rust-lang.org/reference) — for precision on rules
- Secondary: Community survey data (blog.rust-lang.org) — for pain points
- Supplementary: Jon Gjengset's Crust of Rust series notes — for mental models
- Supplementary: Exercism Rust track — for exercise scope and sequencing signals

## Estimated Sources
12–18 web sources. No papers needed (this is an established, well-documented language).

## Scope Boundaries
- IN: ownership, borrowing, lifetimes, structs, enums, traits, generics, error handling, iterators, basic concurrency
- OUT: unsafe, macros (beyond `println!/vec!`), FFI, WebAssembly, embedded Rust, async depth beyond tokio::spawn
