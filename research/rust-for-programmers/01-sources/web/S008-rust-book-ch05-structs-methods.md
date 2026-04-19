# S008 — The Rust Book: Ch 5 — Structs and Methods

**URL**: https://doc.rust-lang.org/book/ch05-01-defining-structs.html + ch05-03-method-syntax.html  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q1 (learning sequence), Q2 (ownership in structs)  
**Status**: active

---

## Key Content

### Defining a Struct

```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}
```

- Named fields with types.
- Entire instance must be `mut` to mutate any field — no partial mutability.
- Field init shorthand: if variable name matches field name, write once: `User { active, username, email, sign_in_count: 1 }`.

### Struct Update Syntax

```rust
let user2 = User {
    email: String::from("new@example.com"),
    ..user1  // remaining fields from user1
};
```

Important: this is a move — if `user1.username` (a `String`) was moved into `user2`, `user1` is no longer fully valid.

### Other Struct Kinds

- **Tuple structs**: `struct Color(i32, i32, i32);` — typed tuples; access via `.0`, `.1`, etc.
- **Unit-like structs**: `struct AlwaysEqual;` — no fields, used to implement traits on nothing.

### Ownership in Structs

If you store a reference (`&str`) in a struct, Rust requires **lifetime annotations**:

```rust
// WON'T COMPILE without lifetime annotation:
struct User {
    username: &str,  // error: missing lifetime specifier
}
```

Beginner rule: **use owned types** (`String` not `&str`) until lifetimes are understood.

### Methods (impl blocks)

```rust
#[derive(Debug)]
struct Rectangle { width: u32, height: u32 }

impl Rectangle {
    fn area(&self) -> u32 {          // borrows self immutably
        self.width * self.height
    }
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}
```

- `&self` = borrow immutably (read); `&mut self` = borrow mutably (write); `self` = take ownership (consume).
- Multiple `impl` blocks allowed; useful with generics.

### Associated Functions (constructors)

```rust
impl Rectangle {
    fn square(size: u32) -> Self {
        Self { width: size, height: size }
    }
}
let sq = Rectangle::square(3); // :: syntax
```

`String::from`, `Vec::new` — these are all associated functions.

### Automatic Referencing

Rust automatically adds `&`, `&mut`, or `*` when calling methods — no `->` operator needed:
```rust
p1.distance(&p2); // same as (&p1).distance(&p2)
```

---

## Learning Sequence Implication

- Structs should come **before** enums in the curriculum (enums reference structs in examples).
- Teach `#[derive(Debug)]` early — learners need to print structs immediately.
- Defer structs-with-references until lifetimes module.
- `Rectangle` example is the canonical hands-on project for this module.

---

## Evidence Quality

- Official Rust Book ch05. High confidence. Core to Q1 sequencing.
