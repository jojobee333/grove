# S002 — The Rust Book: Ch 4.2 — References and Borrowing

**URL**: https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q1 (learning sequence), Q2 (ownership mental models)  
**Status**: active

---

## Key Content

### The Borrowing Rules

1. At any given time, you can have **either** one mutable reference **or** any number of immutable references — not both.
2. References must always be **valid** (no dangling references).

### Immutable References

```rust
fn calculate_length(s: &String) -> usize {
    s.len()
} // s goes out of scope, but it does NOT own the value, so nothing is dropped
```

- `&String` is a reference; it does not take ownership.
- Called **borrowing**: you can use the value but not drop it.

### Mutable References

```rust
fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

- Only one `&mut` reference at a time — prevents data races at compile time.
- You cannot have an `&mut` alongside any `&` references in the same scope.

```rust
let mut s = String::from("hello");
let r1 = &s;     // OK
let r2 = &s;     // OK — multiple immutable refs fine
let r3 = &mut s; // COMPILE ERROR — mutable ref while immutable refs exist
```

### Non-Lexical Lifetimes (NLL)

Reference scope ends at the **last point of use**, not at the end of the syntactic block:

```rust
let mut s = String::from("hello");
let r1 = &s;
println!("{r1}"); // r1's scope ends here
let r2 = &mut s; // now OK — r1 is no longer in use
```

### Dangling References

Rust's compiler prevents dangling references:

```rust
fn dangle() -> &String {   // COMPILE ERROR
    let s = String::from("hello");
    &s  // s is dropped here — reference would be dangling
}
```

Fix: return the `String` itself (transfer ownership).

### Summary of Reference Rules

| Scenario | Allowed? |
|---|---|
| Many `&T` at once | ✅ |
| One `&mut T` | ✅ |
| `&T` + `&mut T` simultaneously | ❌ |
| Dangling `&T` | ❌ (compile error) |

---

## Evidence Quality

- Official Rust Book, canonical source. High confidence.
- Learning sequence implication: references/borrowing must come immediately after ownership.
- The borrow checker is the primary conceptual barrier for newcomers from Python/JS.
