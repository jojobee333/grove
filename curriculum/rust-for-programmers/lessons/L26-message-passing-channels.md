# Message Passing with Channels

**Module**: M09 · Concurrency  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C7 from Strata synthesis

---

## The core idea

Channels let threads communicate by sending values to each other. Rust's standard channel is a multi-producer, single-consumer (mpsc) queue. Ownership transfers with each message — once a thread sends a value, it no longer owns it. This eliminates shared mutable state between threads.

> "Do not communicate by sharing memory; share memory by communicating."

## Basic channel

```rust
use std::sync::mpsc;
use std::thread;

let (tx, rx) = mpsc::channel();   // tx = transmitter, rx = receiver

thread::spawn(move || {
    tx.send(String::from("hello from thread")).unwrap();
});

let received = rx.recv().unwrap();   // blocks until message arrives
println!("Got: {received}");
```

`recv()` blocks the calling thread. `try_recv()` returns immediately with `Err` if no message is waiting.

## Sending multiple messages

```rust
let (tx, rx) = mpsc::channel();

thread::spawn(move || {
    let messages = vec!["one", "two", "three", "done"];
    for msg in messages {
        tx.send(msg).unwrap();
        thread::sleep(std::time::Duration::from_millis(50));
    }
});

for received in rx {   // iterates until sender is dropped
    println!("Got: {received}");
}
```

When `tx` is dropped (end of the thread closure), `rx` iteration ends.

## Multiple producers — clone the transmitter

```rust
let (tx, rx) = mpsc::channel();
let tx2 = tx.clone();   // clone the sender, not the receiver

thread::spawn(move || tx.send("from thread 1").unwrap());
thread::spawn(move || tx2.send("from thread 2").unwrap());

// Collect both messages (order not guaranteed)
for _ in 0..2 {
    println!("{}", rx.recv().unwrap());
}
```

## Using channels as a work queue

```rust
use std::sync::mpsc;
use std::thread;

fn process_job(job: u32) -> u32 {
    job * job   // simulated work
}

fn main() {
    let num_workers = 4;
    let (job_tx, job_rx) = mpsc::channel::<u32>();
    let (result_tx, result_rx) = mpsc::channel::<u32>();

    // Spawn worker threads
    for _ in 0..num_workers {
        let job_rx = job_rx.clone();   // can't clone Receiver directly — use Arc<Mutex<>>
        let result_tx = result_tx.clone();
        // Note: for actual work queues, use Arc<Mutex<Receiver>> — see next lesson
    }
    drop(result_tx);   // ensure result channel closes when workers drop their copies

    // For this demo, process serially
    let jobs: Vec<u32> = (1..=10).collect();
    let results: Vec<u32> = jobs.iter().map(|&j| process_job(j)).collect();
    println!("Results: {results:?}");
}
```

## Channel variants

| | `mpsc::channel()` | `mpsc::sync_channel(n)` |
|---|---|---|
| Capacity | Unbounded | Fixed buffer of n |
| `send()` | Never blocks | Blocks when full |
| Use when | Low volume, burst traffic OK | Backpressure needed |

---

## Mini-project: pipeline_channels

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    // Pipeline: generate → filter → transform → collect
    let (gen_tx, gen_rx) = mpsc::channel::<i32>();
    let (filter_tx, filter_rx) = mpsc::channel::<i32>();
    let (map_tx, map_rx) = mpsc::channel::<String>();

    // Stage 1: generate numbers 1..=20
    thread::spawn(move || {
        for i in 1..=20 {
            gen_tx.send(i).unwrap();
        }
    });

    // Stage 2: filter — keep only even numbers
    thread::spawn(move || {
        for n in gen_rx {
            if n % 2 == 0 {
                filter_tx.send(n).unwrap();
            }
        }
    });

    // Stage 3: transform — format as "n^2 = m"
    thread::spawn(move || {
        for n in filter_rx {
            map_tx.send(format!("{n}^2 = {}", n * n)).unwrap();
        }
    });

    // Stage 4: collect results
    let mut results: Vec<String> = Vec::new();
    for s in map_rx {
        results.push(s);
    }

    println!("Pipeline results:");
    for r in &results {
        println!("  {r}");
    }
    println!("Total: {}", results.len());
}
```
