# S004 — The Rust Book: Ch 10.2 — Traits: Defining Shared Behavior

**URL**: https://doc.rust-lang.org/book/ch10-02-traits.html  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q4 (traits, generics, lifetimes scope)  
**Status**: active

---

## Key Content

### Defining a Trait

```rust
pub trait Summary {
    fn summarize(&self) -> String;
}
```

A trait is a collection of method signatures. Types that implement the trait must provide a body.

### Implementing a Trait on a Type

```rust
pub struct NewsArticle { pub headline: String, ... }

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {}", self.headline, self.author)
    }
}
```

**Orphan rule**: You can only implement a trait on a type if either the trait OR the type is local to your crate. You cannot implement `Display` on `Vec<T>` in your crate — both are external.

### Default Implementations

```rust
pub trait Summary {
    fn summarize(&self) -> String {
        String::from("(Read more...)")
    }
}
```

Default methods can call other (unimplemented) trait methods:
```rust
pub trait Summary {
    fn summarize_author(&self) -> String;  // required
    fn summarize(&self) -> String {         // default, calls required
        format!("(Read more from {}...)", self.summarize_author())
    }
}
```

### Traits as Parameters (impl Trait syntax)

```rust
pub fn notify(item: &impl Summary) {
    println!("Breaking news! {}", item.summarize());
}
```

Equivalent trait bound syntax (more expressive):
```rust
pub fn notify<T: Summary>(item: &T) { ... }
```

### Multiple Trait Bounds

```rust
pub fn notify(item: &(impl Summary + Display)) { ... }
// or with where:
fn some_fn<T, U>(t: &T, u: &U)
where
    T: Display + Clone,
    U: Clone + Debug,
{ ... }
```

### Returning Types That Implement Traits

```rust
fn returns_summarizable() -> impl Summary { ... }
```

Limitation: can only return ONE concrete type — cannot conditionally return `NewsArticle` or `SocialPost` with `impl Summary`.

### Blanket Implementations

Standard library example:
```rust
impl<T: Display> ToString for T { ... }
```

Any type implementing `Display` also gets `to_string()` for free.

### Trait Bounds for Conditional Method Implementation

```rust
impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) { ... }
}
```

---

## Key Distinctions from Other Languages

- Rust traits ≈ interfaces, but:
  - No inheritance of implementation (no `extends`)
  - Blanket impls enable powerful, type-safe polymorphism
  - Orphan rule prevents conflicting implementations

---

## Learning Sequence Implication

- Teach traits after structs/enums (learners need to have concrete types first).
- `impl Trait` syntax first, then trait bounds, then `where` clauses.
- Blanket impls are advanced; mention but don't dwell in beginner modules.

---

## Evidence Quality

- Official Rust Book ch10. High confidence. Directly addresses Q4.
