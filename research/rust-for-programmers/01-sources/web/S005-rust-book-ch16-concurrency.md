# S005 — The Rust Book: Ch 16 — Fearless Concurrency

**URL**: https://doc.rust-lang.org/book/ch16-01-threads.html  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q6 (concurrency scope for beginner course)  
**Status**: active

---

## Key Content

### Rust's Concurrency Model

- 1:1 OS thread model (one language thread = one OS thread).
- Ownership system prevents data races at compile time — "fearless concurrency".
- Concurrency errors that would be runtime bugs elsewhere are **compile errors** in Rust.

### Spawning Threads

```rust
use std::thread;
use std::time::Duration;

let handle = thread::spawn(|| {
    for i in 1..10 {
        println!("hi {i} from spawned thread");
        thread::sleep(Duration::from_millis(1));
    }
});

handle.join().unwrap(); // wait for spawned thread to finish
```

- `thread::spawn` takes a closure.
- Returns a `JoinHandle<T>`.
- Call `.join()` to wait for completion; not calling it means the thread may be killed when `main` exits.

### move Closures with Threads

```rust
let v = vec![1, 2, 3];
let handle = thread::spawn(move || {
    println!("Here's a vector: {v:?}");
});
handle.join().unwrap();
```

- `move` forces the closure to take **ownership** of captured values.
- Required because the compiler can't know if `v` will still be valid when the thread runs.
- Rust's ownership rules prevent use-after-move in the main thread.

### Message Passing (Channels)

```rust
use std::sync::mpsc;
let (tx, rx) = mpsc::channel();

thread::spawn(move || {
    tx.send(String::from("hello")).unwrap();
});

let msg = rx.recv().unwrap();
println!("Got: {msg}");
```

- `mpsc` = multiple producer, single consumer.
- `send` moves the value into the channel.
- `recv` blocks until a message arrives; `try_recv` is non-blocking.
- Multiple producers: clone `tx` with `tx.clone()`.

### Shared State with Mutex and Arc

```rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0));

let handles: Vec<_> = (0..10).map(|_| {
    let counter = Arc::clone(&counter);
    thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    })
}).collect();

for h in handles { h.join().unwrap(); }
println!("Result: {}", *counter.lock().unwrap()); // 10
```

- `Mutex<T>` provides interior mutability with locking.
- `Arc<T>` = atomic reference counting, thread-safe version of `Rc<T>`.
- Pattern: `Arc<Mutex<T>>` is the standard shared-mutable-state primitive.

### Sync and Send Traits

- `Send`: safe to transfer ownership between threads. Almost all Rust types.
- `Sync`: safe to share references between threads (`&T` is `Send` when `T: Sync`).
- `Rc<T>` is neither `Send` nor `Sync` — use `Arc<T>` for threads.
- Rust enforces these at compile time.

---

## Concurrency Topics: Scope for Beginner Course

**Include in course**:
- `thread::spawn` + `JoinHandle` + `join`
- `move` closures
- `mpsc` channels (message passing)
- `Arc<Mutex<T>>` shared state

**Defer (advanced)**:
- `async`/`await` (Tokio, Axum) — separate course
- `Rayon` parallel iterators — mention as ecosystem
- `crossbeam` — mention as ecosystem
- `unsafe` thread primitives — out of scope

---

## Evidence Quality

- Official Rust Book ch16. High confidence. Directly addresses Q6.
