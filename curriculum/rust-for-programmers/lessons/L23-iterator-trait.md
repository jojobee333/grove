# The Iterator Trait

**Module**: M08 · Iterators & Functional Patterns  
**Type**: core  
**Estimated time**: 20 minutes  
**Claims**: C6 from Strata synthesis

---

## The core idea

Rust iterators are lazy, composable, and zero-cost. An iterator is any type that implements the `Iterator` trait — which requires just one method: `next()`. Everything else — map, filter, sum, collect — is built on top of next(). The compiler optimizes iterator chains as efficiently as hand-written loops.

## The Iterator trait

```rust
trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
    // 90+ methods provided by default, all built on next()
}
```

`next()` returns `Some(item)` while items remain, then `None` to signal exhaustion.

## Getting an iterator from a collection

```rust
let v = vec![1, 2, 3];

// Three flavors:
v.iter()        // &T   — borrows each element (v still usable after)
v.iter_mut()    // &mut T — borrows each element mutably
v.into_iter()   // T    — consumes v, yields owned values
```

For-loops use `into_iter()` automatically:
```rust
for x in &v { /* uses iter() */ }
for x in &mut v { /* uses iter_mut() */ }
for x in v { /* uses into_iter() — v consumed */ }
```

## Implementing Iterator for a custom type

```rust
struct Counter {
    count: u32,
    max: u32,
}

impl Counter {
    fn new(max: u32) -> Self { Counter { count: 0, max } }
}

impl Iterator for Counter {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.count < self.max {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}

let c = Counter::new(5);
let sum: u32 = c.sum();  // 15  — .sum() provided by Iterator for free
```

## Key consuming adapters

These exhaust the iterator and produce a final value:

```rust
let v = vec![1, 2, 3, 4, 5];

let total: i32 = v.iter().sum();              // 15
let product: i32 = v.iter().product();        // 120
let count = v.iter().count();                 // 5
let max = v.iter().max();                     // Some(&5)
let min = v.iter().min();                     // Some(&1)
let any_even = v.iter().any(|&x| x % 2 == 0); // true
let all_pos = v.iter().all(|&x| x > 0);       // true
let first_even = v.iter().find(|&&x| x % 2 == 0); // Some(&2)
let pos = v.iter().position(|&x| x == 3);     // Some(2)
```

## Collect — turn iterator back into a collection

```rust
let doubled: Vec<i32> = v.iter().map(|&x| x * 2).collect();
let evens: Vec<&i32> = v.iter().filter(|&&x| x % 2 == 0).collect();
let set: std::collections::HashSet<i32> = v.iter().cloned().collect();
```

---

## Mini-project: fibonacci_iterator

```rust
struct Fibonacci {
    a: u64,
    b: u64,
}

impl Fibonacci {
    fn new() -> Self {
        Fibonacci { a: 0, b: 1 }
    }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<u64> {
        let next = self.a;
        let new_b = self.a + self.b;
        self.a = self.b;
        self.b = new_b;
        Some(next)   // infinite — always Some
    }
}

fn main() {
    let fib = Fibonacci::new();

    // First 10 Fibonacci numbers
    let first_ten: Vec<u64> = fib.take(10).collect();
    println!("First 10: {first_ten:?}");

    // Sum of first 20
    let sum: u64 = Fibonacci::new().take(20).sum();
    println!("Sum of first 20: {sum}");

    // First Fibonacci number greater than 1000
    let first_over_1000 = Fibonacci::new().find(|&n| n > 1000);
    println!("First > 1000: {:?}", first_over_1000);

    // How many Fibonacci numbers fit in u32?
    let count = Fibonacci::new()
        .take_while(|&n| n <= u32::MAX as u64)
        .count();
    println!("Fibonacci numbers ≤ u32::MAX: {count}");

    // Even Fibonacci numbers under 100
    let evens: Vec<u64> = Fibonacci::new()
        .take_while(|&n| n < 100)
        .filter(|n| n % 2 == 0)
        .collect();
    println!("Even Fibonacci < 100: {evens:?}");
}
```
