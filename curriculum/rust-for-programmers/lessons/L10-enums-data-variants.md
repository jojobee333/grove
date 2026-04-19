# Enums and Data-Carrying Variants

**Module**: M04 · Enums, Pattern Matching & Option  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C3 from Strata synthesis

---

## The core idea

Rust enums are far more powerful than enums in Java or C. Each variant can carry different data, making enums a replacement for class hierarchies, tagged unions, and type-safe heterogeneous collections.

**Bug prevented**: forgotten cases, invalid state, type confusion.

## Basic enum

```rust
enum Direction {
    North,
    South,
    East,
    West,
}

let heading = Direction::North;
```

## Enums with data

Each variant can carry different data:

```rust
enum Message {
    Quit,                          // no data
    Move { x: i32, y: i32 },      // named fields (struct-like)
    Write(String),                 // tuple variant — one String
    ChangeColor(u8, u8, u8),       // tuple variant — three u8s
}
```

This eliminates the need for a class hierarchy like:
```java
// Java — what Rust replaces with an enum
abstract class Message {}
class Quit extends Message {}
class Move extends Message { int x, y; }
class Write extends Message { String content; }
```

## Instantiating enum variants

```rust
let m1 = Message::Quit;
let m2 = Message::Move { x: 10, y: 20 };
let m3 = Message::Write(String::from("hello"));
let m4 = Message::ChangeColor(255, 0, 0);
```

## Methods on enums

Enums can have `impl` blocks, just like structs:

```rust
impl Message {
    fn call(&self) {
        match self {
            Message::Quit => println!("Quitting"),
            Message::Move { x, y } => println!("Moving to ({x}, {y})"),
            Message::Write(text) => println!("Writing: {text}"),
            Message::ChangeColor(r, g, b) => println!("Color: ({r},{g},{b})"),
        }
    }
}

let m = Message::Move { x: 5, y: 10 };
m.call();
```

## Why this matters: the expression problem

Compare with Python:

```python
# Python — needs isinstance checks at runtime, no compile-time guarantee
def handle(msg):
    if isinstance(msg, QuitMessage):
        pass
    elif isinstance(msg, MoveMessage):
        pass
    # forget WriteMessage — no error until runtime
```

Rust's match with enums is exhaustive at compile time. If you add a new variant, every match expression that doesn't handle it becomes a compile error.

---

## Mini-project: shape_enum

```rust
use std::f64::consts::PI;

#[derive(Debug)]
enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
    Triangle { base: f64, height: f64 },
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle { radius } => PI * radius * radius,
            Shape::Rectangle { width, height } => width * height,
            Shape::Triangle { base, height } => 0.5 * base * height,
        }
    }

    fn perimeter(&self) -> f64 {
        match self {
            Shape::Circle { radius } => 2.0 * PI * radius,
            Shape::Rectangle { width, height } => 2.0 * (width + height),
            Shape::Triangle { base, height } => {
                let hyp = (base * base + height * height).sqrt();
                base + height + hyp
            }
        }
    }

    fn name(&self) -> &str {
        match self {
            Shape::Circle { .. } => "Circle",
            Shape::Rectangle { .. } => "Rectangle",
            Shape::Triangle { .. } => "Triangle",
        }
    }
}

fn main() {
    let shapes: Vec<Shape> = vec![
        Shape::Circle { radius: 5.0 },
        Shape::Rectangle { width: 4.0, height: 6.0 },
        Shape::Triangle { base: 3.0, height: 4.0 },
    ];

    for shape in &shapes {
        println!("{}: area={:.2}, perimeter={:.2}",
            shape.name(), shape.area(), shape.perimeter());
    }

    // Largest by area
    let largest = shapes.iter()
        .max_by(|a, b| a.area().partial_cmp(&b.area()).unwrap());
    println!("\nLargest: {:?}", largest);
}
```
