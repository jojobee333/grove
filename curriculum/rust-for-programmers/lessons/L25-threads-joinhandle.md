# Threads and JoinHandle

**Module**: M09 · Concurrency  
**Type**: core  
**Estimated time**: 20 minutes  
**Claims**: C7 from Strata synthesis

---

## The core idea

Rust's concurrency model is built on ownership: the same rules that prevent memory bugs in single-threaded code also prevent data races in multi-threaded code. The compiler rejects programs with concurrent access patterns that could cause races — at compile time, not at runtime.

**Bug prevented**: data races, use-after-free across threads.

## Spawning a thread

```rust
use std::thread;
use std::time::Duration;

let handle = thread::spawn(|| {
    for i in 1..=5 {
        println!("thread: {i}");
        thread::sleep(Duration::from_millis(50));
    }
});

for i in 1..=3 {
    println!("main: {i}");
    thread::sleep(Duration::from_millis(50));
}

handle.join().unwrap();  // wait for thread to finish
```

Without `.join()`, the spawned thread is killed when main() exits.

## move closures — sending data to threads

The `move` keyword transfers ownership of captured variables into the thread:

```rust
let data = vec![1, 2, 3];

let handle = thread::spawn(move || {
    println!("data in thread: {data:?}");
});

// data is no longer accessible here — it was moved into the thread
handle.join().unwrap();
```

Why required? Without `move`, the closure would borrow `data` — but the compiler can't guarantee the thread finishes before `data` is dropped in the spawning function. `move` makes the thread own its data, making this safe.

## Collecting results from threads

```rust
let handles: Vec<_> = (0..5).map(|i| {
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(10));
        i * i   // returned from thread
    })
}).collect();

let results: Vec<i32> = handles.into_iter()
    .map(|h| h.join().unwrap())
    .collect();

println!("{results:?}");  // [0, 1, 4, 9, 16] — order preserved
```

## Thread-local data

Each thread gets its own copy with `thread_local!`:

```rust
use std::cell::Cell;

thread_local! {
    static COUNTER: Cell<u32> = Cell::new(0);
}

COUNTER.with(|c| c.set(c.get() + 1));
COUNTER.with(|c| println!("Counter: {}", c.get()));
```

## When to use threads

Threads are appropriate for:
- CPU-bound work (parallel computation)
- Background processing (file I/O, compression)
- Isolating long-running tasks from the main thread

For I/O-bound concurrency (web servers, network), async/await is more efficient (a separate course topic).

---

## Mini-project: parallel_sum

```rust
use std::thread;

fn parallel_sum(data: Vec<i64>, num_threads: usize) -> i64 {
    let chunk_size = (data.len() + num_threads - 1) / num_threads;

    let handles: Vec<_> = data
        .chunks(chunk_size)
        .map(|chunk| {
            let chunk = chunk.to_vec();   // owned copy for the thread
            thread::spawn(move || chunk.iter().sum::<i64>())
        })
        .collect();

    handles.into_iter().map(|h| h.join().unwrap()).sum()
}

fn main() {
    // Build a large dataset
    let data: Vec<i64> = (1..=1_000_000).collect();
    let expected: i64 = 1_000_000 * 1_000_001 / 2;

    let result = parallel_sum(data.clone(), 4);
    println!("Sum with 4 threads: {result}");
    println!("Expected:           {expected}");
    println!("Correct: {}", result == expected);

    // Compare timing (conceptual — thread overhead matters for small data)
    let serial: i64 = data.iter().sum();
    println!("Serial sum:  {serial}");
    println!("Parallel sum: {result}");
    println!("Match: {}", serial == result);
}
```
