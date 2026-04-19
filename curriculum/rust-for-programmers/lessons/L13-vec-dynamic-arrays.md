# Vec<T> — Dynamic Arrays

**Module**: M05 · Collections  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C1, C6 from Strata synthesis

---

## The core idea

`Vec<T>` is the go-to growable sequence. It owns its contents on the heap, handles resizing automatically, and integrates directly with Rust's iterator system.

## Creating a Vec

```rust
// Empty, with type annotation
let v: Vec<i32> = Vec::new();

// With initial values — type inferred
let v = vec![1, 2, 3, 4, 5];

// Pre-allocated capacity
let mut v: Vec<String> = Vec::with_capacity(10);
```

## Adding and removing elements

```rust
let mut v = vec![1, 2, 3];
v.push(4);          // append to end
v.push(5);
let last = v.pop(); // remove and return last element: Some(5)

println!("{:?}", v);   // [1, 2, 3, 4]
println!("{:?}", last); // Some(5)
```

## Reading elements

```rust
let v = vec![10, 20, 30];

// Indexing — panics if out of bounds
let third = v[2];   // 30

// .get() — returns Option<&T>, safe
let maybe = v.get(5);   // None (no panic)
let found = v.get(1);   // Some(&20)

// Iterating
for x in &v {
    println!("{x}");
}
```

## Common operations

```rust
let v = vec![3, 1, 4, 1, 5, 9, 2, 6];

println!("len: {}", v.len());
println!("is_empty: {}", v.is_empty());
println!("contains 5: {}", v.contains(&5));
println!("first: {:?}", v.first());    // Some(&3)
println!("last: {:?}", v.last());      // Some(&6)

// Search
let pos = v.iter().position(|&x| x == 5);  // Some(4)
println!("5 is at index: {:?}", pos);

// Sorting (in-place)
let mut sorted = v.clone();
sorted.sort();
println!("sorted: {sorted:?}");

// Dedup (after sorting, removes consecutive duplicates)
sorted.dedup();
println!("deduped: {sorted:?}");
```

## Retaining values

```rust
let mut v = vec![1, 2, 3, 4, 5, 6];
v.retain(|&x| x % 2 == 0);   // keep only even numbers
println!("{v:?}");   // [2, 4, 6]
```

## Vec of enums — heterogeneous collections

```rust
#[derive(Debug)]
enum Cell {
    Int(i64),
    Float(f64),
    Text(String),
    Empty,
}

let row = vec![
    Cell::Text(String::from("Alice")),
    Cell::Int(30),
    Cell::Float(9.5),
    Cell::Empty,
];
```

This pattern lets a Vec hold values of different shapes safely.

---

## Mini-project: running_statistics

```rust
fn mean(data: &[f64]) -> Option<f64> {
    if data.is_empty() { return None; }
    Some(data.iter().sum::<f64>() / data.len() as f64)
}

fn median(data: &[f64]) -> Option<f64> {
    if data.is_empty() { return None; }
    let mut sorted = data.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        Some((sorted[mid - 1] + sorted[mid]) / 2.0)
    } else {
        Some(sorted[mid])
    }
}

fn std_dev(data: &[f64]) -> Option<f64> {
    let m = mean(data)?;
    let variance = data.iter().map(|x| (x - m).powi(2)).sum::<f64>() / data.len() as f64;
    Some(variance.sqrt())
}

fn main() {
    let mut readings: Vec<f64> = Vec::new();

    let batch = [23.5, 24.1, 22.9, 25.0, 23.8, 24.5, 22.1, 26.0, 23.3, 24.7];
    for &r in &batch {
        readings.push(r);
    }

    println!("Readings: {readings:?}");
    println!("Count:  {}", readings.len());
    println!("Mean:   {:.2}", mean(&readings).unwrap());
    println!("Median: {:.2}", median(&readings).unwrap());
    println!("StdDev: {:.2}", std_dev(&readings).unwrap());

    readings.retain(|&x| x >= 23.0 && x <= 25.0);
    println!("\nFiltered (23.0–25.0): {readings:?}");
    println!("Filtered mean: {:.2}", mean(&readings).unwrap());
}
```
