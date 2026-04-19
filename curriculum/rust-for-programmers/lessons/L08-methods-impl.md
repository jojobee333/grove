# Methods and impl Blocks

**Module**: M03 · Structs & Methods  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C1 from Strata synthesis

---

## The core idea

Structs hold data; `impl` blocks add behavior. Methods in Rust are ordinary functions with a special first parameter (`self`, `&self`, or `&mut self`) that binds them to the type.

## The impl block

```rust
struct Rectangle {
    width: f64,
    height: f64,
}

impl Rectangle {
    fn area(&self) -> f64 {
        self.width * self.height
    }

    fn perimeter(&self) -> f64 {
        2.0 * (self.width + self.height)
    }

    fn is_square(&self) -> bool {
        self.width == self.height
    }
}

let rect = Rectangle { width: 10.0, height: 5.0 };
println!("Area: {}", rect.area());         // 50.0
println!("Perimeter: {}", rect.perimeter()); // 30.0
println!("Square: {}", rect.is_square());  // false
```

## The three self forms

| Parameter | What it means | When to use |
|-----------|---------------|-------------|
| `&self` | Borrow the instance (read) | Most methods — read data |
| `&mut self` | Mutably borrow (read + write) | Methods that modify fields |
| `self` | Consume the instance | Builder pattern, conversions |

```rust
impl Rectangle {
    fn double_width(&mut self) {
        self.width *= 2.0;   // requires &mut self
    }

    fn into_square(self) -> Rectangle {   // consumes self
        let side = self.width.min(self.height);
        Rectangle { width: side, height: side }
    }
}

let mut r = Rectangle { width: 10.0, height: 5.0 };
r.double_width();         // r is now 20.0 x 5.0
let sq = r.into_square(); // r is consumed — can't use r after this
```

## Method call syntax and auto-referencing

`rect.area()` is syntactic sugar for `Rectangle::area(&rect)`. Rust automatically adds `&`, `&mut`, or `*` to match the method signature. This is "auto-referencing."

## Associated functions (constructors)

Associated functions don't take `self` — they're called with `::` not `.`:

```rust
impl Rectangle {
    fn new(width: f64, height: f64) -> Self {
        Rectangle { width, height }
    }

    fn square(size: f64) -> Self {
        Rectangle { width: size, height: size }
    }
}

let r = Rectangle::new(10.0, 5.0);
let sq = Rectangle::square(7.0);
```

`Self` (capital S) is an alias for the implementing type — `Rectangle` here.

## Multiple impl blocks

A type can have multiple `impl` blocks — this is useful when organizing methods by topic:

```rust
impl Rectangle {
    fn area(&self) -> f64 { self.width * self.height }
}

impl Rectangle {
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}
```

---

## Mini-project: rectangle

```rust
#[derive(Debug)]
struct Rectangle {
    width: f64,
    height: f64,
}

impl Rectangle {
    fn new(width: f64, height: f64) -> Self {
        Rectangle { width, height }
    }

    fn square(size: f64) -> Self {
        Rectangle { width: size, height: size }
    }

    fn area(&self) -> f64 {
        self.width * self.height
    }

    fn perimeter(&self) -> f64 {
        2.0 * (self.width + self.height)
    }

    fn is_square(&self) -> bool {
        (self.width - self.height).abs() < f64::EPSILON
    }

    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }

    fn scale(&mut self, factor: f64) {
        self.width *= factor;
        self.height *= factor;
    }
}

fn main() {
    let r1 = Rectangle::new(10.0, 5.0);
    let r2 = Rectangle::new(3.0, 2.0);
    let sq = Rectangle::square(7.0);

    println!("{r1:?}");
    println!("Area: {:.1}", r1.area());
    println!("Perimeter: {:.1}", r1.perimeter());
    println!("Is square: {}", r1.is_square());
    println!("r1 can hold r2: {}", r1.can_hold(&r2));

    println!("\n{sq:?}");
    println!("Is square: {}", sq.is_square());

    let mut r3 = Rectangle::new(4.0, 2.0);
    r3.scale(2.0);
    println!("\nAfter scale: {r3:?}");
}
```
