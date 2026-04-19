# Closures

**Module**: M08 · Iterators & Functional Patterns  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C6 from Strata synthesis

---

## The core idea

Closures are anonymous functions that capture variables from their surrounding scope. They are the building blocks of Rust's iterator system and make it possible to pass custom behavior to functions without defining a full named function.

## Basic closure syntax

```rust
// Named function
fn add_one(x: i32) -> i32 { x + 1 }

// Equivalent closure
let add_one = |x| x + 1;          // types inferred
let add_one = |x: i32| -> i32 { x + 1 };  // explicit
```

Closure syntax: `|params| body` or `|params| { multi-line body }`.

## Capturing the environment

```rust
let threshold = 5;
let above_threshold = |x: &i32| *x > threshold;  // captures 'threshold' from scope

let numbers = vec![1, 8, 3, 9, 2, 7];
let filtered: Vec<&i32> = numbers.iter().filter(|x| above_threshold(x)).collect();
println!("{filtered:?}");  // [8, 9, 7]
```

A regular function cannot capture `threshold` — it has no surrounding scope. Closures can.

## The three capture modes

Rust automatically chooses the least restrictive capture mode:

| Mode | Syntax | When used |
|------|--------|-----------|
| Borrow immutably | `\|x\| use(x)` | Closure only reads captured vars |
| Borrow mutably | `\|x\| modify(x)` | Closure modifies captured vars |
| Take ownership | `move \|x\| use(x)` | Closure outlives the scope (e.g., threads) |

```rust
let mut count = 0;
let mut increment = || { count += 1; };  // borrows count mutably
increment();
increment();
println!("{count}");   // 2

// move — takes ownership (needed for threads)
let data = vec![1, 2, 3];
let owns_data = move || println!("{data:?}");  // data moved into closure
owns_data();
// data is no longer accessible here
```

## The Fn traits

Closures implement one or more of these traits:

| Trait | Can be called | Captures |
|-------|--------------|----------|
| `FnOnce` | Once only | Moves out of captured vars |
| `FnMut` | Multiple times | Mutates captured vars |
| `Fn` | Multiple times | Only borrows |

```rust
fn apply<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(x)
}

fn apply_twice<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(f(x))
}

let double = |x| x * 2;
println!("{}", apply(double, 5));        // 10
println!("{}", apply_twice(double, 3));  // 12
```

## Returning closures

```rust
fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
    move |x| x + n   // move captures n by value
}

let add5 = make_adder(5);
let add10 = make_adder(10);
println!("{}", add5(3));    // 8
println!("{}", add10(3));   // 13
```

---

## Mini-project: sort_with_closures

```rust
#[derive(Debug, Clone)]
struct Student {
    name: String,
    gpa: f64,
    year: u32,
}

impl Student {
    fn new(name: &str, gpa: f64, year: u32) -> Self {
        Student { name: name.to_string(), gpa, year }
    }
}

fn sort_by<T, K: Ord>(items: &mut Vec<T>, key: impl Fn(&T) -> K) {
    items.sort_by_key(key);
}

fn main() {
    let mut students = vec![
        Student::new("Charlie", 3.5, 2),
        Student::new("Alice", 3.9, 1),
        Student::new("Bob", 3.7, 3),
        Student::new("Diana", 3.9, 2),
    ];

    // Sort by GPA descending
    students.sort_by(|a, b| b.gpa.partial_cmp(&a.gpa).unwrap());
    println!("By GPA (desc):");
    for s in &students { println!("  {} — {:.1}", s.name, s.gpa); }

    // Sort by name ascending
    students.sort_by_key(|s| s.name.clone());
    println!("\nBy name:");
    for s in &students { println!("  {}", s.name); }

    // Sort by year then GPA
    students.sort_by(|a, b| {
        a.year.cmp(&b.year).then_with(|| b.gpa.partial_cmp(&a.gpa).unwrap())
    });
    println!("\nBy year, then GPA:");
    for s in &students { println!("  Year {} — {} ({:.1})", s.year, s.name, s.gpa); }

    // Filter with closure
    let honor_roll: Vec<&Student> = students.iter().filter(|s| s.gpa >= 3.8).collect();
    println!("\nHonor roll: {:?}", honor_roll.iter().map(|s| &s.name).collect::<Vec<_>>());
}
```
