# Option<T> — Rust's Null Alternative

**Module**: M04 · Enums, Pattern Matching & Option  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C3 from Strata synthesis

---

## The core idea

Null pointer exceptions are one of the most common runtime crashes. Rust eliminates them entirely — there is no null. Instead, absence is represented with `Option<T>`. The type system forces you to handle the absence case before you can use the value.

**Bug prevented**: null pointer exceptions, accessing non-existent values.

## Option<T> — the type

```rust
enum Option<T> {
    Some(T),    // there is a value
    None,       // no value
}
```

This enum is so common it's in the prelude — you don't need to import `Option`, `Some`, or `None`.

```rust
let present: Option<i32> = Some(42);
let absent: Option<i32> = None;
```

## Why this beats null

```rust
fn find_user(id: u32) -> Option<String> {
    if id == 1 {
        Some(String::from("Alice"))
    } else {
        None
    }
}

// The compiler forces you to handle None — no accident possible
let name = find_user(1);
println!("{}", name);   // compile error: can't use Option<String> as String
```

## Working with Option

**match — explicit handling:**
```rust
match find_user(99) {
    Some(name) => println!("Found: {name}"),
    None       => println!("No such user"),
}
```

**if let — when you only care about Some:**
```rust
if let Some(name) = find_user(1) {
    println!("Found: {name}");
}
```

**unwrap_or — provide a default:**
```rust
let name = find_user(99).unwrap_or(String::from("Guest"));
println!("Hello, {name}");   // "Hello, Guest"
```

**unwrap_or_else — compute default lazily:**
```rust
let name = find_user(99).unwrap_or_else(|| String::from("Anonymous"));
```

**map — transform the inner value if present:**
```rust
let length: Option<usize> = find_user(1).map(|s| s.len());
// Some(5) if found, None if not
```

**and_then — chain Option-returning operations:**
```rust
fn get_email(name: &str) -> Option<String> {
    // ...
}

let email = find_user(1).and_then(|name| get_email(&name));
// None if either step returns None
```

## ? with Option (preview — full coverage in Module 6)

```rust
fn get_username_length(id: u32) -> Option<usize> {
    let user = find_user(id)?;   // return None early if None
    Some(user.len())
}
```

## unwrap and expect — for tests and prototyping only

```rust
let name = find_user(1).unwrap();          // panics if None
let name = find_user(1).expect("must exist");  // panics with message
```

**Rule**: never use `unwrap()` in production code. Use it only in tests or when you know from logic that None is impossible (and document why).

---

## Mini-project: inventory_lookup

```rust
fn find_item(inventory: &[(String, u32)], name: &str) -> Option<u32> {
    inventory.iter()
        .find(|(item, _)| item == name)
        .map(|(_, qty)| *qty)
}

fn restock_needed(inventory: &[(String, u32)], name: &str, threshold: u32) -> bool {
    find_item(inventory, name).map(|qty| qty < threshold).unwrap_or(true)
}

fn display_item(inventory: &[(String, u32)], name: &str) {
    match find_item(inventory, name) {
        Some(qty) if qty == 0 => println!("{name}: out of stock"),
        Some(qty) => println!("{name}: {qty} in stock"),
        None => println!("{name}: not in inventory"),
    }
}

fn main() {
    let inventory: Vec<(String, u32)> = vec![
        (String::from("apple"), 150),
        (String::from("banana"), 3),
        (String::from("cherry"), 0),
    ];

    display_item(&inventory, "apple");
    display_item(&inventory, "banana");
    display_item(&inventory, "cherry");
    display_item(&inventory, "mango");

    println!("\nRestock banana (threshold 10)? {}", restock_needed(&inventory, "banana", 10));
    println!("Restock apple (threshold 10)? {}", restock_needed(&inventory, "apple", 10));
    println!("Restock mango (threshold 10)? {}", restock_needed(&inventory, "mango", 10));

    // chain with and_then
    let luxury = find_item(&inventory, "cherry")
        .filter(|&qty| qty > 0)
        .and_then(|qty| if qty > 100 { Some(qty * 2) } else { None });
    println!("\nLuxury cherry order: {:?}", luxury);   // None (out of stock)
}
```
