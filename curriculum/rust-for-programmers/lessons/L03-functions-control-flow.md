# Functions and Control Flow

**Module**: M01 · Setup & Rust Fundamentals  
**Type**: core  
**Estimated time**: 20 minutes  
**Claims**: C1 from Strata synthesis

---

## The core idea

In Rust, almost everything is an expression — including `if`, `match`, and function bodies. The last expression in a block is its return value. This makes code more composable and eliminates a whole class of uninitialized variable bugs.

## Functions

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b    // no semicolon — this is the return expression
}

fn greet(name: &str) {
    println!("Hello, {name}!");   // implicit return ()
}
```

Rules:
- Parameters always require type annotations (no inference)
- Return type follows `->` — omit if returning `()` (unit, the "nothing" type)
- The last expression (without `;`) is returned
- `return` is allowed for early returns only

```rust
fn first_positive(nums: &[i32]) -> Option<i32> {
    for &n in nums {
        if n > 0 {
            return Some(n);   // early return
        }
    }
    None    // final expression returned
}
```

## if/else as an expression

```rust
let result = if condition { 5 } else { 6 };
// Both arms must return the same type
```

This replaces ternary operators from other languages.

## Loops

**loop** — infinite loop with explicit break:
```rust
let mut count = 0;
let result = loop {
    count += 1;
    if count == 10 {
        break count * 2;   // loop returns a value via break
    }
};
// result == 20
```

**while** — conditional loop:
```rust
let mut n = 3;
while n > 0 {
    println!("{n}");
    n -= 1;
}
```

**for** — the preferred loop for collections:
```rust
let a = [10, 20, 30];
for element in &a {
    println!("{element}");
}

// Ranges
for i in 1..=5 {      // 1, 2, 3, 4, 5 (inclusive)
    println!("{i}");
}
for i in 0..5 {       // 0, 1, 2, 3, 4 (exclusive end)
    println!("{i}");
}
```

**match** on values (preview — full match in Module 4):
```rust
let n = 3;
match n {
    1 => println!("one"),
    2 | 3 => println!("two or three"),
    4..=9 => println!("four to nine"),
    _ => println!("something else"),
}
```

---

## Mini-project: temperature_converter

```rust
fn celsius_to_fahrenheit(c: f64) -> f64 {
    c * 9.0 / 5.0 + 32.0
}

fn fahrenheit_to_celsius(f: f64) -> f64 {
    (f - 32.0) * 5.0 / 9.0
}

fn kelvin_to_celsius(k: f64) -> f64 {
    k - 273.15
}

fn convert(value: f64, unit: &str) -> String {
    match unit {
        "C" => format!("{:.2}°F", celsius_to_fahrenheit(value)),
        "F" => format!("{:.2}°C", fahrenheit_to_celsius(value)),
        "K" => format!("{:.2}°C", kelvin_to_celsius(value)),
        _   => String::from("Unknown unit"),
    }
}

fn main() {
    let conversions = [
        (100.0, "C"),
        (212.0, "F"),
        (373.15, "K"),
        (0.0, "C"),
        (32.0, "F"),
    ];

    for (value, unit) in &conversions {
        println!("{value}°{unit} → {}", convert(*value, unit));
    }
}
```

Expected output:
```
100°C → 212.00°F
212°F → 100.00°C
373.15°K → 100.00°C
0°C → 32.00°F
32°F → 0.00°C
```
