# Shared State with Arc<Mutex<T>>

**Module**: M09 · Concurrency  
**Type**: core  
**Estimated time**: 20 minutes  
**Claims**: C7 from Strata synthesis

---

## The core idea

When threads genuinely need to share mutable data (not just pass messages), Rust provides two types: `Mutex<T>` for safe exclusive access, and `Arc<T>` for shared ownership across threads. Together, `Arc<Mutex<T>>` is the standard pattern for shared mutable state.

## Mutex<T> — mutual exclusion

```rust
use std::sync::Mutex;

let m = Mutex::new(5);

{
    let mut num = m.lock().unwrap();   // blocks until lock acquired
    *num = 6;
}   // lock released here — MutexGuard dropped

println!("m = {:?}", m);   // Mutex { data: 6, .. }
```

`.lock()` returns a `MutexGuard<T>`. When the guard is dropped, the lock is released automatically. Even if the thread panics, the lock is released (though it becomes "poisoned").

## Arc<T> — atomic reference counting

`Rc<T>` is for single-threaded shared ownership. `Arc<T>` is the thread-safe version (atomic reference count):

```rust
use std::sync::Arc;

let data = Arc::new(vec![1, 2, 3]);
let data_clone = Arc::clone(&data);

// Both data and data_clone point to the same Vec
// Dropped when last Arc is dropped
```

## Arc<Mutex<T>> — the full pattern

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0_i32));

let handles: Vec<_> = (0..10).map(|_| {
    let counter = Arc::clone(&counter);   // clone the Arc, not the Mutex
    thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    })
}).collect();

for h in handles {
    h.join().unwrap();
}

println!("Counter: {}", *counter.lock().unwrap());  // 10
```

## RwLock — multiple readers, single writer

When reads are much more common than writes:

```rust
use std::sync::{Arc, RwLock};

let data = Arc::new(RwLock::new(vec![1, 2, 3]));

// Multiple simultaneous readers
let r1 = data.read().unwrap();
let r2 = data.read().unwrap();
println!("{r1:?} {r2:?}");
drop(r1); drop(r2);

// Exclusive writer
{
    let mut w = data.write().unwrap();
    w.push(4);
}
```

## Avoiding deadlocks

Deadlocks occur when two threads each hold a lock the other needs. Rules:
1. Acquire locks in a consistent order across all threads
2. Hold locks for the minimum time (drop guards as soon as done)
3. Never acquire lock B while holding lock A, unless all code does so in the same order

```rust
// DEADLOCK-PRONE: lock order varies by thread
// thread 1: lock A then B
// thread 2: lock B then A

// SAFE: always lock in same order
// thread 1: lock A then B
// thread 2: lock A then B
```

## Send and Sync — the safety guarantees

These are the marker traits that make all this work:

- `Send`: a type is safe to transfer to another thread (owned values)
- `Sync`: a type is safe to share references across threads (`Arc<T>` where `T: Sync`)

Rust automatically derives `Send` and `Sync` when it's safe. If you try to pass a non-`Send` type to `thread::spawn`, you get a compile error — not a race condition.

---

## Mini-project: thread_safe_cache

```rust
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::thread;

type Cache = Arc<RwLock<HashMap<String, String>>>;

fn get(cache: &Cache, key: &str) -> Option<String> {
    cache.read().unwrap().get(key).cloned()
}

fn set(cache: &Cache, key: &str, value: &str) {
    cache.write().unwrap().insert(key.to_string(), value.to_string());
}

fn main() {
    let cache: Cache = Arc::new(RwLock::new(HashMap::new()));

    // Pre-populate
    set(&cache, "greeting", "hello");
    set(&cache, "language", "Rust");

    // Spawn reader threads
    let reader_handles: Vec<_> = (0..4).map(|i| {
        let cache = Arc::clone(&cache);
        thread::spawn(move || {
            let greeting = get(&cache, "greeting").unwrap_or_default();
            let lang = get(&cache, "language").unwrap_or_default();
            println!("Reader {i}: {greeting} from {lang}");
        })
    }).collect();

    // Spawn writer threads
    let writer_handles: Vec<_> = (0..2).map(|i| {
        let cache = Arc::clone(&cache);
        thread::spawn(move || {
            let key = format!("key_{i}");
            let value = format!("value_{i}");
            set(&cache, &key, &value);
            println!("Writer {i}: set {key}={value}");
        })
    }).collect();

    for h in reader_handles.into_iter().chain(writer_handles) {
        h.join().unwrap();
    }

    // Final cache state
    println!("\nFinal cache:");
    let final_state = cache.read().unwrap();
    let mut entries: Vec<(&String, &String)> = final_state.iter().collect();
    entries.sort_by_key(|(k, _)| k.as_str());
    for (k, v) in entries {
        println!("  {k} = {v}");
    }
}
```
