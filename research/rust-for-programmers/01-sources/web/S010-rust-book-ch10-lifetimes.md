# S010 — The Rust Book: Ch 10.3 — Lifetimes

**URL**: https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q4 (traits, generics, lifetimes scope), Q3 (beginner stumbling blocks)  
**Status**: active

---

## Key Content

### What Lifetimes Are

- Every reference has a lifetime — the scope for which it is valid.
- Most lifetimes are **inferred** (like types) — you only annotate when ambiguous.
- Main goal: prevent dangling references.

### The Borrow Checker

The compiler compares reference lifetimes to ensure borrowed values live long enough:

```
{
    let x = 5;        // 'b lifetime starts
    let r = &x;       // 'a lifetime starts
    println!("{r}");  // 'a used
}                     // 'b ends — x dropped
                      // 'a ends — r goes out of scope
// 'a < 'b — reference lifetime shorter than subject: VALID
```

If `r` outlives `x`, compile error: "does not live long enough".

### Lifetime Annotations

Annotations **describe relationships** — they don't change lifetimes. Syntax: `'a`, `'b` after `&`.

```rust
&i32        // reference
&'a i32     // reference with explicit lifetime 'a
&'a mut i32 // mutable reference with lifetime 'a
```

### Lifetime Annotations in Function Signatures

The canonical example — `longest` without annotations fails:

```rust
fn longest(x: &str, y: &str) -> &str { ... }
// error: missing lifetime specifier — can't tell if return borrows x or y
```

Fix: tie all three to the same lifetime `'a` (= "at least as long as the shorter of x and y"):

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

If only one input lifetime matters for the return:
```rust
fn longest<'a>(x: &'a str, y: &str) -> &'a str { x }
```

### Lifetime Annotations in Struct Definitions

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}
```

Instance of `ImportantExcerpt` cannot outlive the reference in `part`.
Beginner rule: avoid storing references in structs until lifetimes are mastered.

### Lifetime Elision Rules (compiler shortcuts)

Three rules the compiler applies before requiring explicit annotations:

1. **Each reference parameter gets its own lifetime**: `fn f(x: &str, y: &str)` → `fn f<'a,'b>(x: &'a str, y: &'b str)`
2. **One input lifetime → assigned to all outputs**: `fn f(x: &'a str) -> &str` → return gets `'a`
3. **Methods with `&self` → all outputs get `self`'s lifetime**

Most method signatures don't need explicit lifetimes because of rule 3.

### The `'static` Lifetime

```rust
let s: &'static str = "hello"; // lives for entire program
```

- All string literals are `'static`.
- Don't use `'static` as a quick fix for lifetime errors — it rarely is the real solution.

### Everything Together

```rust
use std::fmt::Display;
fn longest_with_announcement<'a, T>(x: &'a str, y: &'a str, ann: T) -> &'a str
where T: Display
{
    println!("Announcement: {ann}");
    if x.len() > y.len() { x } else { y }
}
```

---

## Key Beginner Stumbling Blocks (Q3)

1. **Thinking annotations change lifetimes** — they only describe them.
2. **Trying to store references in structs without annotations** — use owned types instead.
3. **Adding `'static` to silence errors** — almost always wrong.
4. **Not understanding lifetime elision** — most code doesn't need explicit annotations.

---

## Learning Sequence Implication

- Lifetimes come AFTER generics + traits (ch10 ordering).
- In a course, defer struct-with-lifetime until after basic annotations in functions.
- Elision rules are very useful to teach — reassures learners that most code is annotation-free.

---

## Evidence Quality

- Official Rust Book ch10. High confidence. Core to Q4.
