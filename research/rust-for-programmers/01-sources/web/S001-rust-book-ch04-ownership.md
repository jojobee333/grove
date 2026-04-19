# S001 — The Rust Book: Ch 4.1 — What is Ownership?

**URL**: https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q1 (learning sequence), Q2 (ownership mental models)  
**Status**: active

---

## Key Content

### The Ownership Rules

Rust's three ownership rules (memorize these first):

1. Each value in Rust has an **owner**.
2. There can only be **one owner at a time**.
3. When the owner goes **out of scope**, the value is **dropped**.

### Stack vs Heap Mental Model

- Stack: fixed-size, fast, LIFO. Primitives live here.
- Heap: dynamic size, allocated with `allocate`, returns a pointer stored on the stack.
- The distinction matters for Rust because ownership is designed around the cost and correctness of heap allocation.

### Move Semantics

```rust
let s1 = String::from("hello");
let s2 = s1; // s1 is MOVED into s2 — s1 is now invalid
println!("{s1}"); // compile error: borrow of moved value
```

- Rust does a shallow copy of the stack pointer + invalidates the original → called a **move**.
- This prevents double-free errors.

### Copy Trait

Types that implement `Copy` are copied instead of moved:
- `i32`, `u64`, `f64`, `bool`, `char`
- Tuples of all-Copy types
- Fixed-size arrays of Copy types

### Clone (Deep Copy)

```rust
let s1 = String::from("hello");
let s2 = s1.clone(); // explicit deep copy — both valid
```

Clone is expensive; use it deliberately.

### Ownership and Functions

Passing a value to a function follows the same move/copy rules as assignment:

```rust
fn takes_ownership(s: String) { ... }  // s is moved in
fn makes_copy(x: i32) { ... }          // x is copied in
```

After calling `takes_ownership(my_string)`, `my_string` is no longer valid in the caller.

### RAII (Resource Acquisition Is Initialization)

Rust calls `drop` automatically when a variable goes out of scope. No manual `free()` needed.

---

## Evidence Quality

- Official Rust Book, canonical source. High confidence.
- Content directly addresses Q2 (what the ownership mental model is).
- Learning sequence implication: ownership must come before references, structs, or anything heap-allocated.
