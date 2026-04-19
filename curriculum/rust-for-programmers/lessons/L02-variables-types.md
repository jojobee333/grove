# Variables, Types, and Mutability

**Module**: M01 · Setup & Rust Fundamentals  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C1 from Strata synthesis

---

## The core idea

Rust variables are immutable by default. This is a deliberate design choice: it makes code easier to reason about by making mutation explicit and intentional. When you see `let x = 5`, you know x will never change — unless it's `let mut x = 5`.

**Bug prevented here**: unintended mutation and shared mutable state.

## let and mut

```rust
let x = 5;        // immutable — x is always 5
x = 6;            // compile error: cannot assign twice to immutable variable

let mut y = 5;    // mutable — y can change
y = 6;            // fine
```

## Shadowing

Shadowing is not mutation — it creates a new binding:

```rust
let x = 5;
let x = x + 1;     // new binding — x is now 6
let x = x * 2;     // new binding — x is now 12
println!("{x}");   // 12

let spaces = "   ";          // &str
let spaces = spaces.len();   // usize — shadowing can change the type
```

Key difference from mut: shadowing can change the type; mutation cannot.

## Scalar types

| Type | Description | Example |
|------|-------------|---------|
| `i32` | 32-bit signed integer (default) | `let n: i32 = -5;` |
| `u64` | 64-bit unsigned integer | `let big: u64 = 1_000_000;` |
| `f64` | 64-bit float (default) | `let pi = 3.14159;` |
| `bool` | true or false | `let flag = true;` |
| `char` | Unicode scalar value | `let c = 'Z';` |

Rust requires explicit casts between numeric types:
```rust
let x: i32 = 5;
let y: f64 = x as f64;   // explicit cast
```

## Compound types

**Tuple**: fixed-length, heterogeneous:
```rust
let tup: (i32, f64, bool) = (500, 6.4, true);
let (x, y, z) = tup;           // destructuring
println!("{}", tup.0);         // index access
```

**Array**: fixed-length, homogeneous (stack-allocated):
```rust
let a = [1, 2, 3, 4, 5];
let b = [0; 5];                // [0, 0, 0, 0, 0]
println!("{}", a[0]);          // index access
```

Arrays are not growable — use Vec<T> for dynamic arrays (Module 5).

## Constants

Constants (`const`) are always immutable, require a type annotation, and can be declared in any scope:

```rust
const MAX_SCORE: u32 = 100_000;
```

Use `1_000_000` not `1000000` for readability — underscores in numeric literals are ignored.

---

## Mini-project: type_explorer

```rust
fn main() {
    // Scalar types
    let age: u8 = 30;
    let temperature: f64 = 98.6;
    let is_active: bool = true;
    let grade: char = 'A';

    // Shadowing — transform without mut
    let input = "42";
    let input: i32 = input.parse().expect("not a number");

    // Tuple destructuring
    let coords = (40.7128_f64, -74.0060_f64);
    let (lat, lon) = coords;

    // Constant
    const VERSION: &str = "1.0.0";

    println!("Age: {age}, Temp: {temperature}, Active: {is_active}, Grade: {grade}");
    println!("Parsed: {input}");
    println!("Lat: {lat}, Lon: {lon}");
    println!("Version: {VERSION}");
}
```

Verify: `cargo run` — all values printed. Then try changing `let age` to `age = 31` and observe the compile error.
