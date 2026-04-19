# S009 — The Rust Book: Ch 6 — Enums, match, and Option

**URL**: https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html + ch06-02-match.html  
**Source type**: Primary / Official documentation  
**Retrieved**: 2026-04-19  
**Relevance**: Q1 (learning sequence), Q3 (beginner stumbling blocks: null safety)  
**Status**: active

---

## Key Content

### Defining Enums

```rust
enum IpAddrKind { V4, V6 }
```

Enum variants can carry data (unlike many languages):

```rust
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}
let home = IpAddr::V4(127, 0, 0, 1);
```

Different variants can hold different types and amounts of data — far more expressive than a struct + discriminant field.

```rust
enum Message {
    Quit,                       // no data
    Move { x: i32, y: i32 },   // named fields (like struct)
    Write(String),              // single value
    ChangeColor(i32, i32, i32), // three values
}
```

Methods work on enums too (`impl Message { fn call(&self) { ... } }`).

### Option<T> — Rust's Null Safety

Rust has **no null**. Instead:

```rust
enum Option<T> {
    Some(T),
    None,
}
```

- `Option<T>` and `T` are **different types** — compiler forces you to handle the `None` case.
- You **cannot** accidentally use an `Option<i32>` as an `i32` — compile error.
- This eliminates the "billion-dollar mistake" (null pointer exceptions).

```rust
let some_number = Some(5);
let absent: Option<i32> = None;
// To use the value: must match or unwrap
```

### The match Expression

```rust
enum Coin { Penny, Nickel, Dime, Quarter }

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
```

- `match` is exhaustive — compiler error if a case is missing.
- Arms can execute blocks: `Coin::Penny => { println!("Lucky!"); 1 }`.

### Binding in match Arms

```rust
enum Coin { Quarter(UsState) }

match coin {
    Coin::Quarter(state) => println!("State: {state:?}"),
    ...
}
```

Destructure the data out of a variant directly in the pattern.

### match with Option<T>

```rust
fn plus_one(x: Option<i32>) -> Option<i32> {
    match x {
        None => None,
        Some(i) => Some(i + 1),
    }
}
```

Exhaustiveness: omitting `None =>` is a compile error.

### Catch-All Patterns

```rust
match dice_roll {
    3 => add_fancy_hat(),
    7 => remove_fancy_hat(),
    other => move_player(other),   // named catch-all: binds value
    // OR: _ => ()                 // discard value, do nothing
}
```

---

## Key Insight for Learners

Enums + match is Rust's replacement for:
- `switch` statements (exhaustive, not fallthrough)
- `null` (replaced by `Option<T>`)
- Multiple error codes (replaced by `Result<T, E>`)
- Tagged unions (variants with data)

---

## Learning Sequence Implication

- Enums come after structs but before error handling and generics.
- `Option<T>` must be taught alongside enums — it IS an enum.
- `match` is learned simultaneously with enums — they are inseparable.
- The "no null" mental shift is often the biggest "aha moment" for Python/JS learners.

---

## Evidence Quality

- Official Rust Book ch06. High confidence. Key to Q1 and Q3.
