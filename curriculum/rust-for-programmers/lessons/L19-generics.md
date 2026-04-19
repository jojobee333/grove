# Generics

**Module**: M07 · Generics, Traits & Lifetimes  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C3 from Strata synthesis

---

## The core idea

Generics let you write a function or struct once that works over many types — without duplicating code and without runtime overhead. Rust compiles generics into specialized code for each type used (monomorphization), so generics are zero-cost.

**Bug prevented**: code duplication, type mismatches from copy-pasted functions.

## Generic functions

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

let numbers = vec![34, 50, 25, 100, 65];
let chars = vec!['y', 'm', 'a', 'q'];

println!("Largest number: {}", largest(&numbers));  // 100
println!("Largest char: {}", largest(&chars));       // y
```

`T: PartialOrd` is a trait bound — "T must implement comparison." Without the bound, `>` wouldn't compile because T might not support ordering.

## Generic structs

```rust
#[derive(Debug)]
struct Pair<T> {
    first: T,
    second: T,
}

impl<T> Pair<T> {
    fn new(first: T, second: T) -> Self {
        Pair { first, second }
    }
}

// Conditionally implement methods based on trait bounds
impl<T: PartialOrd + std::fmt::Display> Pair<T> {
    fn display_larger(&self) {
        if self.first >= self.second {
            println!("Larger: {}", self.first);
        } else {
            println!("Larger: {}", self.second);
        }
    }
}

let p = Pair::new(5, 10);
p.display_larger();   // "Larger: 10"
```

## Multiple type parameters

```rust
#[derive(Debug)]
struct Map<K, V> {
    key: K,
    value: V,
}

let entry = Map { key: "name", value: String::from("Alice") };
let numbered = Map { key: 1_u32, value: 99.5_f64 };
```

## Bounds with where clause — cleaner for complex signatures

```rust
// Verbose:
fn compare_and_display<T: PartialOrd + std::fmt::Display>(a: T, b: T) -> T {
    if a > b { a } else { b }
}

// Cleaner with where:
fn compare_and_display<T>(a: T, b: T) -> T
where
    T: PartialOrd + std::fmt::Display,
{
    if a > b { a } else { b }
}
```

## Monomorphization — zero runtime cost

```rust
let s = largest(&[5, 2, 8, 1]);      // Rust generates: fn largest_i32(...)
let c = largest(&['z', 'a', 'm']);   // Rust generates: fn largest_char(...)
```

The compiler generates one specialized function per concrete type. The generic version never runs at runtime.

---

## Mini-project: generic_stack

```rust
#[derive(Debug)]
struct Stack<T> {
    elements: Vec<T>,
}

impl<T> Stack<T> {
    fn new() -> Self {
        Stack { elements: Vec::new() }
    }

    fn push(&mut self, item: T) {
        self.elements.push(item);
    }

    fn pop(&mut self) -> Option<T> {
        self.elements.pop()
    }

    fn peek(&self) -> Option<&T> {
        self.elements.last()
    }

    fn is_empty(&self) -> bool {
        self.elements.is_empty()
    }

    fn size(&self) -> usize {
        self.elements.len()
    }
}

impl<T: std::fmt::Display> Stack<T> {
    fn print_top(&self) {
        match self.peek() {
            Some(top) => println!("Top: {top}"),
            None => println!("Stack is empty"),
        }
    }
}

fn main() {
    let mut int_stack: Stack<i32> = Stack::new();
    int_stack.push(1);
    int_stack.push(2);
    int_stack.push(3);
    int_stack.print_top();        // Top: 3
    println!("Popped: {:?}", int_stack.pop());  // Some(3)
    println!("Size: {}", int_stack.size());     // 2

    let mut str_stack: Stack<&str> = Stack::new();
    str_stack.push("hello");
    str_stack.push("world");
    str_stack.print_top();        // Top: world
    println!("Empty: {}", str_stack.is_empty());  // false
}
```
