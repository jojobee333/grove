# Ownership Rules and Move Semantics

**Module**: M02 · Ownership & Borrowing  
**Type**: core  
**Estimated time**: 22 minutes  
**Claims**: C2, C4 from Strata synthesis

---

## The core idea

Ownership is the organizing principle of Rust. The rules are simple; internalizing them takes practice. Every value has a single owner, and when the owner goes out of scope, the value is freed. No garbage collector. No manual free(). The compiler enforces this at compile time.

**Bugs prevented**: use-after-free, double-free, memory leaks.

## The three ownership rules

1. Each value has exactly one owner.
2. There can only be one owner at a time.
3. When the owner goes out of scope, the value is dropped.

```rust
{
    let s = String::from("hello");   // s is the owner
    // use s
}                                    // s goes out of scope → dropped
// s is invalid here
```

## Stack vs heap

Stack: fixed-size data, extremely fast allocation (just move a pointer). Integers, booleans, chars — all stack-allocated.

Heap: variable-size data, slower allocation. Strings, Vecs, HashMaps — all heap-allocated.

The distinction matters for ownership: stack types implement `Copy` and are automatically duplicated on assignment. Heap types do not — assignment *moves* ownership.

## Move semantics

```rust
let s1 = String::from("hello");
let s2 = s1;           // s1 is MOVED to s2

println!("{s1}");      // compile error: value borrowed after move
println!("{s2}");      // fine — s2 is the new owner
```

Why move instead of copy? Copying heap data (the String's buffer) would be expensive and unexpected. Rust makes the cost explicit: if you want a copy, say so.

## Clone for explicit deep copy

```rust
let s1 = String::from("hello");
let s2 = s1.clone();   // explicit deep copy — both s1 and s2 are valid

println!("{s1}");      // fine
println!("{s2}");      // fine
```

`.clone()` is a signal: "I'm paying the cost of a heap allocation here."

## Copy types — automatic shallow copy

Types that implement `Copy` are copied on assignment, not moved:

```rust
let x = 5;
let y = x;         // x is copied — both x and y are 5 and valid

println!("{x}");   // fine
println!("{y}");   // fine
```

**Copy types**: i32, u64, f64, bool, char, tuples/arrays of Copy types, references `&T`.  
**Not Copy**: String, Vec<T>, HashMap, Box<T>, any type that owns heap memory.

Rule: if `drop()` needs to do cleanup work (free memory, close a handle), the type cannot be Copy.

## Ownership through functions

Passing to a function moves or copies, just like assignment:

```rust
fn takes_ownership(s: String) {
    println!("{s}");
}   // s is dropped here

fn makes_copy(n: i32) {
    println!("{n}");
}   // n is a copy — original is unaffected

let s = String::from("hello");
takes_ownership(s);    // s is moved into the function
println!("{s}");       // compile error: s was moved

let n = 5;
makes_copy(n);         // n is copied
println!("{n}");       // fine — n is still valid
```

To use s after a function call, either return it or use a reference (Module 2.2).

## RAII — drop happens automatically

```rust
fn create_string() -> String {
    let s = String::from("scoped");
    s    // returned — ownership transferred to caller
}        // if not returned, s would be dropped here

let owned = create_string();   // owned now holds the String
```

The `drop` function is called automatically at scope end. You can call `drop(value)` explicitly to release resources early.

---

## Mini-project: ownership_trace

Write a program that demonstrates move, clone, and copy — with explicit println! comments showing when values are dropped:

```rust
fn consume(s: String) -> usize {
    println!("  consuming '{s}'");
    s.len()
}   // s dropped here

fn read_length(s: &String) -> usize {
    s.len()
}   // s is NOT dropped — it was borrowed, not moved

fn main() {
    println!("--- Integer (Copy) ---");
    let x = 42_i32;
    let y = x;                          // copy
    println!("x={x}, y={y}");          // both valid

    println!("\n--- String (Move) ---");
    let s1 = String::from("hello");
    let s2 = s1;                        // move — s1 invalid
    // println!("{s1}");               // would fail to compile
    println!("s2={s2}");

    println!("\n--- String (Clone) ---");
    let original = String::from("world");
    let copy = original.clone();
    println!("original={original}, copy={copy}");

    println!("\n--- Ownership through functions ---");
    let phrase = String::from("ownership");
    let len = consume(phrase);          // phrase moved
    println!("length was: {len}");
    // phrase is gone

    let kept = String::from("kept");
    let same_len = read_length(&kept);  // kept borrowed, not moved
    println!("kept='{kept}', len={same_len}");
}
```
