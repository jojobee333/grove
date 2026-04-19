# Defining Structs

**Module**: M03 · Structs & Methods  
**Type**: core  
**Estimated time**: 15 minutes  
**Claims**: C1 from Strata synthesis

---

## The core idea

Structs group related data into a named unit. They are Rust's primary tool for custom data modeling — the equivalent of classes without inheritance. You define the data in a struct; you add behavior in an `impl` block.

## Basic struct syntax

```rust
struct User {
    username: String,
    email: String,
    age: u32,
    active: bool,
}

let user1 = User {
    username: String::from("alice"),
    email: String::from("alice@example.com"),
    age: 30,
    active: true,
};

println!("{}", user1.username);   // field access with dot
```

## Field init shorthand

When a variable has the same name as a field, you can omit the name:

```rust
fn build_user(username: String, email: String) -> User {
    User {
        username,   // same as username: username
        email,      // same as email: email
        age: 0,
        active: true,
    }
}
```

## Struct update syntax

```rust
let user2 = User {
    email: String::from("bob@example.com"),
    ..user1    // remaining fields copied/moved from user1
};
```

Note: if `username` is a String (not Copy), user1 is partially moved — you can no longer use user1.username.

## Tuple structs

Named tuples — same type safety, field access by index:

```rust
struct Color(i32, i32, i32);   // RGB
struct Point(f64, f64, f64);   // x, y, z

let red = Color(255, 0, 0);
let origin = Point(0.0, 0.0, 0.0);

println!("R={}, G={}, B={}", red.0, red.1, red.2);
```

Even though both are `(i32, i32, i32)` tuples, `Color` and `Point` are different types — the compiler will reject passing a `Color` where a `Point` is expected.

## Unit structs

Structs with no fields — useful as type-level markers:

```rust
struct AlwaysEqual;
let _marker = AlwaysEqual;
```

Used in trait implementations (Module 7).

## Ownership in structs: use owned types

```rust
// Correct for beginners — User owns its data
struct User {
    username: String,    // owned
    email: String,       // owned
}

// Requires lifetime annotations — defer until Module 7
struct UserRef<'a> {
    username: &'a str,   // borrowed — needs 'a
}
```

Rule: until you've learned lifetimes, use `String` not `&str` in struct fields. The same applies to `Vec<T>` vs `&[T]`.

---

## Mini-project: point_struct

```rust
#[derive(Debug)]
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    // Explicit syntax
    let p1 = Point { x: 3.0, y: 4.0 };

    // Shorthand syntax via constructor
    let x = 1.0_f64;
    let y = 2.0_f64;
    let p2 = Point { x, y };

    // Update syntax
    let p3 = Point { x: 10.0, ..p1 };   // p3.y = 4.0 (copied from p1)

    println!("p1: {:?}", p1);
    println!("p2: {:?}", p2);
    println!("p3: {:?}", p3);

    // Tuple struct for RGB
    #[derive(Debug)]
    struct Color(u8, u8, u8);
    let sky_blue = Color(135, 206, 235);
    println!("Sky blue: R={}, G={}, B={}", sky_blue.0, sky_blue.1, sky_blue.2);
}
```
