# S011 — The Rust Book: Ch 13.2 — Iterators

**URL**: https://doc.rust-lang.org/book/ch13-02-iterators.html  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q1 (learning sequence — functional programming in Rust)  
**Status**: active

---

## Key Content

### Iterators Are Lazy

```rust
let v1 = vec![1, 2, 3];
let v1_iter = v1.iter(); // No work done yet
// Work happens only when consumed
for val in v1_iter { println!("{val}"); }
```

Iterators do nothing unless consumed. This is a zero-cost abstraction.

### The Iterator Trait

```rust
pub trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
    // Many default methods built on next...
}
```

Only `next` must be implemented. Everything else (`map`, `filter`, `sum`, etc.) comes for free.

The three variants for `Vec<T>`:
- `.iter()` → `&T` (immutable references)
- `.iter_mut()` → `&mut T` (mutable references)  
- `.into_iter()` → `T` (owned values — consumes the collection)

### Consuming Adapters (use up the iterator)

```rust
let total: i32 = vec![1, 2, 3].iter().sum(); // 6 — sum consumes the iterator
```

Other consuming adapters: `collect`, `count`, `fold`, `max`, `min`, `any`, `all`, `find`.

### Iterator Adapters (produce new iterators, lazy)

```rust
let v2: Vec<i32> = vec![1, 2, 3]
    .iter()
    .map(|x| x + 1)   // lazy — no work done
    .collect();        // consuming adapter — triggers evaluation
// v2 = [2, 3, 4]
```

Chaining:
```rust
let result: Vec<_> = shoes
    .into_iter()
    .filter(|s| s.size == shoe_size) // captures from environment
    .collect();
```

Key adapter methods: `map`, `filter`, `enumerate`, `zip`, `take`, `skip`, `flat_map`, `chain`.

### Why Iterators Over Loops?

1. **Expressiveness**: `v.iter().map(...).filter(...).collect()` reads like a pipeline.
2. **Safety**: No off-by-one index errors.
3. **Performance**: Zero-cost abstraction — compiler unrolls chains; same speed as explicit loops.
4. **Flexibility**: Works on any type implementing `Iterator`, not just indexable types.

---

## Relationship to Closures

Iterators depend heavily on closures (ch13.1). Closures can:
- Capture environment variables (`filter` example above)
- Be multi-line blocks
- Be passed by reference or owned

Teach closures and iterators together in the same module.

---

## Learning Sequence Implication

- Iterators come after closures (ch13 ordering) and after traits/generics.
- In the Grove course, iterators are a natural "functional Rust" module after the core type system.
- Rustlings confirms: iterators appear in exercise group 22, near the end.
- Every loop-based mini-project should have a second pass rewritten with iterators.

---

## Common Patterns (for mini-projects)

```rust
// Sum squares of evens
let sum: i32 = (1..=10)
    .filter(|x| x % 2 == 0)
    .map(|x| x * x)
    .sum();

// Frequency count (using fold)
let freq = words.iter().fold(HashMap::new(), |mut map, word| {
    *map.entry(word).or_insert(0) += 1;
    map
});
```

---

## Evidence Quality

- Official Rust Book ch13. High confidence. Core to Q1 (functional Rust sequencing).
