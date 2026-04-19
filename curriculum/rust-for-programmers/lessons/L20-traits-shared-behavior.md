# Traits: Shared Behavior

**Module**: M07 · Generics, Traits & Lifetimes  
**Type**: core  
**Estimated time**: 22 minutes  
**Claims**: C3 from Strata synthesis

---

## The core idea

Traits define behavior that types can implement. They are Rust's answer to interfaces — but more powerful. They enable polymorphism without inheritance, and the compiler resolves all trait dispatch at compile time (static dispatch) unless you explicitly ask for runtime dispatch.

## Defining and implementing a trait

```rust
trait Summary {
    fn summarize(&self) -> String;
}

struct Article {
    title: String,
    author: String,
    content: String,
}

struct Tweet {
    username: String,
    content: String,
}

impl Summary for Article {
    fn summarize(&self) -> String {
        format!("{}, by {} — {}", self.title, self.author, &self.content[..50.min(self.content.len())])
    }
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}
```

## Default method implementations

```rust
trait Summary {
    fn summarize_author(&self) -> String;

    // Default — can be overridden
    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.summarize_author())
    }
}
```

If a type only implements `summarize_author`, it gets the default `summarize` for free.

## Traits as parameters — impl Trait

```rust
fn notify(item: &impl Summary) {
    println!("Breaking: {}", item.summarize());
}

// Equivalent using trait bound:
fn notify<T: Summary>(item: &T) {
    println!("Breaking: {}", item.summarize());
}

notify(&Article { ... });
notify(&Tweet { ... });   // both work
```

## Multiple trait bounds

```rust
fn notify_display<T: Summary + std::fmt::Display>(item: &T) {
    println!("{}", item);
    println!("Summary: {}", item.summarize());
}
```

## Returning traits — impl Trait in return position

```rust
fn make_summarizable(is_article: bool) -> impl Summary {
    // Must return ONE concrete type — cannot switch based on runtime condition
    Tweet { username: String::from("bot"), content: String::from("hello") }
}
```

## Trait objects — runtime dispatch with dyn

When you need to return different types dynamically:

```rust
fn make_summary(is_article: bool) -> Box<dyn Summary> {
    if is_article {
        Box::new(Article { title: String::from("Rust"), author: String::from("Ferris"), content: String::from("...") })
    } else {
        Box::new(Tweet { username: String::from("ferris"), content: String::from("Rust!") })
    }
}
```

`dyn Summary` = "some type that implements Summary, determined at runtime." Costs one pointer indirection per call. Use `impl Trait` (static dispatch) when possible.

## Deriving standard traits

Most of the time, you don't implement standard traits manually — you derive them:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct Point { x: i32, y: i32 }
```

Manually implement `Display`, `Iterator`, `From`, and custom domain traits.

---

## Mini-project: shape_area

```rust
use std::fmt;

trait Shape: fmt::Display {
    fn area(&self) -> f64;
    fn perimeter(&self) -> f64;
    fn name(&self) -> &str;

    fn describe(&self) -> String {
        format!("{}: area={:.2}, perimeter={:.2}", self.name(), self.area(), self.perimeter())
    }
}

struct Circle { radius: f64 }
struct Rectangle { width: f64, height: f64 }
struct Triangle { a: f64, b: f64, c: f64 }

impl Shape for Circle {
    fn area(&self) -> f64 { std::f64::consts::PI * self.radius * self.radius }
    fn perimeter(&self) -> f64 { 2.0 * std::f64::consts::PI * self.radius }
    fn name(&self) -> &str { "Circle" }
}

impl Shape for Rectangle {
    fn area(&self) -> f64 { self.width * self.height }
    fn perimeter(&self) -> f64 { 2.0 * (self.width + self.height) }
    fn name(&self) -> &str { "Rectangle" }
}

impl Shape for Triangle {
    fn area(&self) -> f64 {
        let s = (self.a + self.b + self.c) / 2.0;
        (s * (s - self.a) * (s - self.b) * (s - self.c)).sqrt()
    }
    fn perimeter(&self) -> f64 { self.a + self.b + self.c }
    fn name(&self) -> &str { "Triangle" }
}

impl fmt::Display for Circle {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Circle(r={})", self.radius)
    }
}
impl fmt::Display for Rectangle {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Rectangle({}x{})", self.width, self.height)
    }
}
impl fmt::Display for Triangle {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Triangle({}, {}, {})", self.a, self.b, self.c)
    }
}

fn largest_by_area(shapes: &[Box<dyn Shape>]) -> Option<&dyn Shape> {
    shapes.iter().max_by(|a, b| a.area().partial_cmp(&b.area()).unwrap())
        .map(|s| s.as_ref())
}

fn main() {
    let shapes: Vec<Box<dyn Shape>> = vec![
        Box::new(Circle { radius: 5.0 }),
        Box::new(Rectangle { width: 4.0, height: 6.0 }),
        Box::new(Triangle { a: 3.0, b: 4.0, c: 5.0 }),
    ];

    for s in &shapes {
        println!("{}", s.describe());
    }

    if let Some(largest) = largest_by_area(&shapes) {
        println!("\nLargest: {largest}");
    }
}
```
