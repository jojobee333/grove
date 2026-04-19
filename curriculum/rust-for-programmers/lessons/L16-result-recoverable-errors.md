# Result<T, E> and Recoverable Errors

**Module**: M06 · Error Handling  
**Type**: core  
**Estimated time**: 20 minutes  
**Claims**: C3, C9 from Strata synthesis

---

## The core idea

Rust has no exceptions. Errors that can reasonably occur (file not found, parse failure, network timeout) are represented as values of type `Result<T, E>`. Ignoring them is a compile-time error. This makes error handling visible, composable, and zero-cost.

**Bug prevented**: uncaught exceptions, silent failures, unexpected panics.

## Result<T, E> — the type

```rust
enum Result<T, E> {
    Ok(T),    // success — contains a value of type T
    Err(E),   // failure — contains an error of type E
}
```

Like Option, Result is in the prelude.

## Reading a file — real example

```rust
use std::fs;

let result: Result<String, std::io::Error> = fs::read_to_string("hello.txt");

match result {
    Ok(content) => println!("File: {content}"),
    Err(e)      => println!("Error: {e}"),
}
```

## Parsing — another common Result

```rust
let n: Result<i32, _> = "42".parse();
let bad: Result<i32, _> = "abc".parse();

println!("{:?}", n);    // Ok(42)
println!("{:?}", bad);  // Err(ParseIntError { ... })
```

## Matching on error kinds

```rust
use std::io::ErrorKind;

match fs::read_to_string("config.txt") {
    Ok(content) => println!("{content}"),
    Err(e) => match e.kind() {
        ErrorKind::NotFound => println!("File not found — using defaults"),
        ErrorKind::PermissionDenied => eprintln!("Access denied"),
        other => panic!("Unexpected error: {other:?}"),
    }
}
```

## Result combinators — chains without nested match

```rust
let n: Result<i32, _> = "42"
    .parse::<i32>()
    .map(|n| n * 2);           // Ok(84) — transforms Ok value
// Err passes through unchanged

let doubled = "abc"
    .parse::<i32>()
    .unwrap_or(0);              // 0 — default on Err

let mapped_err = "abc"
    .parse::<i32>()
    .map_err(|e| format!("parse failed: {e}"));   // maps Err type
```

## and_then — chain fallible operations

```rust
fn parse_and_double(s: &str) -> Result<i32, String> {
    s.parse::<i32>()
        .map_err(|e| e.to_string())
        .and_then(|n| {
            if n > 0 { Ok(n * 2) }
            else { Err(String::from("must be positive")) }
        })
}

println!("{:?}", parse_and_double("5"));    // Ok(10)
println!("{:?}", parse_and_double("-3"));   // Err("must be positive")
println!("{:?}", parse_and_double("abc"));  // Err("invalid digit...")
```

## When to panic vs return Result

| Situation | Use |
|-----------|-----|
| Could reasonably fail in normal operation | `Result<T, E>` |
| Logic error / bug / violated contract | `panic!` |
| Tests (expected to succeed) | `.unwrap()` or `.expect("msg")` |
| Recoverable in the caller | `Result` and propagate with `?` |

---

## Mini-project: csv_parser

```rust
#[derive(Debug)]
struct Record {
    name: String,
    age: u32,
    score: f64,
}

#[derive(Debug)]
enum ParseError {
    WrongFieldCount { expected: usize, got: usize },
    InvalidAge(String),
    InvalidScore(String),
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            ParseError::WrongFieldCount { expected, got } =>
                write!(f, "expected {expected} fields, got {got}"),
            ParseError::InvalidAge(s) => write!(f, "invalid age: '{s}'"),
            ParseError::InvalidScore(s) => write!(f, "invalid score: '{s}'"),
        }
    }
}

fn parse_record(line: &str) -> Result<Record, ParseError> {
    let fields: Vec<&str> = line.split(',').collect();
    if fields.len() != 3 {
        return Err(ParseError::WrongFieldCount { expected: 3, got: fields.len() });
    }
    let name = fields[0].trim().to_string();
    let age = fields[1].trim().parse::<u32>()
        .map_err(|_| ParseError::InvalidAge(fields[1].trim().to_string()))?;
    let score = fields[2].trim().parse::<f64>()
        .map_err(|_| ParseError::InvalidScore(fields[2].trim().to_string()))?;

    Ok(Record { name, age, score })
}

fn main() {
    let lines = [
        "Alice, 30, 95.5",
        "Bob, 25, 82.0",
        "Charlie, abc, 77.5",
        "Dave, 28, invalid",
        "Eve",
        "Frank, 22, 88.0",
    ];

    for line in &lines {
        match parse_record(line) {
            Ok(r) => println!("OK:  {:?}", r),
            Err(e) => println!("ERR: '{line}' — {e}"),
        }
    }
}
```
