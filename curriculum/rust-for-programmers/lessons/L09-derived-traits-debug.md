# Derived Traits and Debug

**Module**: M03 · Structs & Methods  
**Type**: core  
**Estimated time**: 15 minutes  
**Claims**: C1 from Strata synthesis

---

## The core idea

Traits define shared behavior. Rust provides a shortcut for common traits: `#[derive]`. With one annotation, your struct automatically gets formatting, comparison, and cloning capabilities.

## Debug — the developer display

```rust
#[derive(Debug)]
struct Student {
    name: String,
    grade: u8,
}

let s = Student { name: String::from("Alice"), grade: 90 };
println!("{:?}", s);    // Student { name: "Alice", grade: 90 }
println!("{:#?}", s);   // pretty-printed multi-line
```

You can only `derive(Debug)` if every field type also implements Debug. All standard library types do.

## Display — the user-facing display

`Debug` is for developers. `Display` is for end users. You must implement it manually:

```rust
use std::fmt;

struct Point {
    x: f64,
    y: f64,
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

let p = Point { x: 3.0, y: 4.0 };
println!("{p}");        // (3, 4)
println!("{p:?}");      // compile error — Debug not implemented
```

## Clone — explicit deep copy

```rust
#[derive(Debug, Clone)]
struct Config {
    max_connections: u32,
    timeout_secs: u64,
}

let original = Config { max_connections: 10, timeout_secs: 30 };
let modified = Config { max_connections: 20, ..original.clone() };

println!("{:?}", original);   // still valid — was cloned, not moved
println!("{:?}", modified);
```

## Copy — implicit shallow copy

For small, stack-only types:

```rust
#[derive(Debug, Clone, Copy)]
struct Point2D {
    x: f32,
    y: f32,
}

let p1 = Point2D { x: 1.0, y: 2.0 };
let p2 = p1;   // copied, not moved
println!("{p1:?}");   // still valid
println!("{p2:?}");
```

You can only derive Copy if all fields are also Copy. String, Vec, etc. are not Copy — a struct containing String cannot derive Copy.

## PartialEq and Eq — equality

```rust
#[derive(Debug, Clone, PartialEq)]
struct Color {
    r: u8,
    g: u8,
    b: u8,
}

let red1 = Color { r: 255, g: 0, b: 0 };
let red2 = Color { r: 255, g: 0, b: 0 };
let blue = Color { r: 0, g: 0, b: 255 };

println!("{}", red1 == red2);   // true
println!("{}", red1 == blue);   // false
println!("{}", red1 != blue);   // true
```

## Common derive combinations

| Goal | Derive |
|------|--------|
| Debugging / logging | `Debug` |
| User-facing output | Implement `Display` manually |
| Cloneable config | `Debug, Clone` |
| Value type (small, Copy) | `Debug, Clone, Copy, PartialEq` |
| Enum variants comparable | `Debug, Clone, PartialEq, Eq` |

---

## Mini-project: student_grade_calculator

```rust
use std::fmt;

#[derive(Debug, Clone)]
struct Student {
    name: String,
    grades: Vec<f64>,
}

impl Student {
    fn new(name: &str) -> Self {
        Student {
            name: name.to_string(),
            grades: Vec::new(),
        }
    }

    fn add_grade(&mut self, grade: f64) {
        self.grades.push(grade);
    }

    fn average(&self) -> Option<f64> {
        if self.grades.is_empty() {
            None
        } else {
            Some(self.grades.iter().sum::<f64>() / self.grades.len() as f64)
        }
    }

    fn letter_grade(&self) -> char {
        match self.average() {
            Some(avg) if avg >= 90.0 => 'A',
            Some(avg) if avg >= 80.0 => 'B',
            Some(avg) if avg >= 70.0 => 'C',
            Some(avg) if avg >= 60.0 => 'D',
            Some(_) => 'F',
            None => '?',
        }
    }
}

impl fmt::Display for Student {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let avg = self.average().map(|a| format!("{a:.1}")).unwrap_or("N/A".to_string());
        write!(f, "{} — avg: {} ({})", self.name, avg, self.letter_grade())
    }
}

fn main() {
    let mut alice = Student::new("Alice");
    alice.add_grade(92.0);
    alice.add_grade(88.0);
    alice.add_grade(95.0);

    let mut bob = Student::new("Bob");
    bob.add_grade(72.0);
    bob.add_grade(68.0);
    bob.add_grade(75.0);

    let empty = Student::new("Charlie");

    println!("{alice}");
    println!("{bob}");
    println!("{empty}");
    println!("\nDebug: {alice:?}");
}
```
