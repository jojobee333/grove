# S003 — The Rust Book: Ch 9 — Error Handling

**URL**: https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q5 (error handling patterns)  
**Status**: active

---

## Key Content

### Two Error Categories

- **Recoverable** (`Result<T, E>`): File not found, parse failure — handle gracefully.
- **Unrecoverable** (`panic!`): Bug in code, out-of-bounds — stop execution.

### The Result Enum

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

### Matching on Result

```rust
let f = File::open("hello.txt");
let file = match f {
    Ok(file) => file,
    Err(e) => panic!("Problem: {e:?}"),
};
```

### Matching on Error Kind

```rust
match File::open("hello.txt") {
    Ok(f) => f,
    Err(e) => match e.kind() {
        ErrorKind::NotFound => File::create("hello.txt").unwrap(),
        _ => panic!("Unexpected error: {e:?}"),
    },
}
```

### Shortcuts: unwrap and expect

```rust
// Panics with default message if Err
let file = File::open("hello.txt").unwrap();

// Panics with custom message if Err — prefer in production code
let file = File::open("hello.txt")
    .expect("hello.txt should be in the project");
```

Idiomatic preference: use `expect` over `unwrap` in production; give context-explaining messages.

### The ? Operator (Propagating Errors)

```rust
fn read_username_from_file() -> Result<String, io::Error> {
    let mut username_file = File::open("hello.txt")?;
    let mut username = String::new();
    username_file.read_to_string(&mut username)?;
    Ok(username)
}
```

`?` = if `Err`, return early with that error (after calling `From::from` to convert error types); if `Ok`, unwrap and continue.

Can chain:
```rust
File::open("hello.txt")?.read_to_string(&mut username)?;
```

### ? Only Works in Compatible Return Types

`?` can only be used in functions returning `Result`, `Option`, or a type implementing `FromResidual`.

To use `?` in `main`:
```rust
fn main() -> Result<(), Box<dyn Error>> {
    let _f = File::open("hello.txt")?;
    Ok(())
}
```

### ? with Option

```rust
fn last_char_of_first_line(text: &str) -> Option<char> {
    text.lines().next()?.chars().last()
}
```

### unwrap_or_else (Closure Alternative to match)

```rust
File::open("hello.txt").unwrap_or_else(|e| {
    if e.kind() == ErrorKind::NotFound {
        File::create("hello.txt").unwrap_or_else(|e| panic!("Can't create: {e:?}"))
    } else {
        panic!("Unexpected: {e:?}")
    }
})
```

---

## Learning Sequence Implication

- Teach `match` on Result first.
- Then `unwrap`/`expect` as shortcuts.
- Then `?` operator as the idiomatic production pattern.
- Custom error types (`Box<dyn Error>` → then `thiserror`/`anyhow` crates) are a natural next step after mastering `?`.

---

## Evidence Quality

- Official Rust Book ch09. High confidence.
- Directly addresses Q5.
