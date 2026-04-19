# References and the Borrow Checker

**Module**: M02 · Ownership & Borrowing  
**Type**: core  
**Estimated time**: 22 minutes  
**Claims**: C2, C4 from Strata synthesis

---

## The core idea

You don't always want to transfer ownership — sometimes you just want to read or temporarily modify a value. Borrowing lets you access values without taking ownership. The borrow checker enforces the rules that make this safe.

**Bug prevented**: data races, use-after-free via aliases.

## References

A reference lets you refer to a value without owning it:

```rust
fn calculate_length(s: &String) -> usize {
    s.len()
}   // s goes out of scope, but the String is NOT dropped (s doesn't own it)

let s = String::from("hello");
let len = calculate_length(&s);   // &s creates a reference
println!("'{s}' has length {len}");   // s is still valid
```

The `&` in the function signature says: "I borrow this, I don't own it."

## The two borrowing rules

1. At any time, you may have **either** one mutable reference (`&mut T`) **OR** any number of immutable references (`&T`). Never both simultaneously.
2. References must always point to valid data (no dangling references).

These are checked at compile time — not at runtime.

## Immutable references — multiple OK

```rust
let s = String::from("hello");
let r1 = &s;
let r2 = &s;
println!("{r1}, {r2}");   // fine — multiple readers allowed
```

## Mutable references — only one at a time

```rust
let mut s = String::from("hello");
let r1 = &mut s;
let r2 = &mut s;   // compile error: cannot borrow `s` as mutable more than once
```

This prevents data races — if two `&mut` references existed, they could race to write.

## Cannot mix mutable and immutable

```rust
let mut s = String::from("hello");
let r1 = &s;          // immutable borrow
let r2 = &s;          // immutable borrow — fine (multiple readers)
let r3 = &mut s;      // compile error: can't have &mut while &s is active
```

## Non-lexical lifetimes (NLL)

The borrow ends at the last use — not at the end of the block. This means many programs that used to fail compile now succeed:

```rust
let mut s = String::from("hello");
let r1 = &s;
println!("{r1}");   // r1 last used here — borrow ends
s.push_str(" world");   // fine! r1 is no longer active
println!("{s}");
```

## Dangling references — compile error

Rust prevents you from creating a reference to a value that's been freed:

```rust
fn dangle() -> &String {
    let s = String::from("hello");
    &s    // compile error: s will be dropped at end of function, can't return reference to it
}
```

Fix: return the String itself (transfer ownership), not a reference.

## Summary: Reference rules at a glance

| Operation | Allowed? | Reason |
|-----------|----------|--------|
| Multiple `&T` simultaneously | ✅ | Multiple readers are safe |
| One `&mut T` | ✅ | Single writer, no contention |
| `&T` + `&mut T` simultaneously | ❌ | Reader could see partial writes |
| Multiple `&mut T` | ❌ | Data race |
| `&T` that outlives the value | ❌ | Dangling reference |

---

## Mini-project: borrow_checker_tour

```rust
fn print_string(s: &String) {
    println!("  read: '{s}' (len={})", s.len());
}

fn append_exclamation(s: &mut String) {
    s.push('!');
    println!("  mutated: '{s}'");
}

fn consume_string(s: String) -> usize {
    println!("  consumed: '{s}'");
    s.len()
}

fn main() {
    let mut s = String::from("hello");

    // Step 1: Immutable borrow — s still valid after
    print_string(&s);
    println!("After immutable borrow: '{s}'");

    // Step 2: Multiple immutable borrows simultaneously
    let r1 = &s;
    let r2 = &s;
    println!("  two readers: '{}' + '{}'", r1, r2);
    // r1 and r2 go out of scope here (NLL)

    // Step 3: Mutable borrow — must not have active & borrows
    append_exclamation(&mut s);
    println!("After mutable borrow: '{s}'");

    // Step 4: Transfer ownership — s is gone
    let len = consume_string(s);
    println!("Consumed. Length was: {len}");
    // println!("{s}");  // would fail — s was moved
}
```
