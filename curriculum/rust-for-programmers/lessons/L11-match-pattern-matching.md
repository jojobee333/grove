# match and Pattern Matching

**Module**: M04 · Enums, Pattern Matching & Option  
**Type**: core  
**Estimated time**: 20 minutes  
**Claims**: C3 from Strata synthesis

---

## The core idea

`match` is the primary way to work with enums. It is exhaustive — you must handle every case, or the code won't compile. This turns missed cases from a runtime bug into a compile error.

## Basic match

```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn value_in_cents(coin: &Coin) -> u32 {
    match coin {
        Coin::Penny   => 1,
        Coin::Nickel  => 5,
        Coin::Dime    => 10,
        Coin::Quarter => 25,
    }
}
```

If you add a new variant `HalfDollar` to `Coin` and forget to update this function, the compiler emits an error — not a test failure, not a runtime panic.

## Extracting data from variants

```rust
#[derive(Debug)]
enum Message {
    Echo(String),
    Point { x: i32, y: i32 },
    Color(u8, u8, u8),
    Nothing,
}

fn handle(msg: &Message) {
    match msg {
        Message::Echo(text)        => println!("Echo: {text}"),
        Message::Point { x, y }   => println!("Point: ({x},{y})"),
        Message::Color(r, g, b)   => println!("RGB: {r},{g},{b}"),
        Message::Nothing           => println!("(nothing)"),
    }
}
```

## Guards — extra conditions

```rust
let n = 7;
match n {
    x if x < 0   => println!("negative: {x}"),
    0             => println!("zero"),
    x if x % 2 == 0 => println!("positive even: {x}"),
    x             => println!("positive odd: {x}"),
}
```

## Binding with @ 

Capture the value and test it simultaneously:

```rust
match n {
    x @ 1..=10 => println!("got {x}, in range 1..=10"),
    x @ 11..=100 => println!("got {x}, medium"),
    x => println!("got {x}, large"),
}
```

## The wildcard and multiple patterns

```rust
match n {
    1 | 2       => println!("one or two"),
    3..=9       => println!("three through nine"),
    _           => println!("something else"),   // wildcard: matches anything
}
```

## Nested patterns

```rust
#[derive(Debug)]
struct Point { x: i32, y: i32 }

let points = vec![
    Point { x: 0, y: 0 },
    Point { x: 5, y: 0 },
    Point { x: 0, y: 7 },
    Point { x: 3, y: 4 },
];

for p in &points {
    match p {
        Point { x: 0, y: 0 } => println!("origin"),
        Point { x, y: 0 }    => println!("on x-axis at {x}"),
        Point { x: 0, y }    => println!("on y-axis at {y}"),
        Point { x, y }        => println!("({x}, {y})"),
    }
}
```

## if let — match one case

When you only care about one variant:

```rust
let msg = Message::Echo(String::from("hello"));

if let Message::Echo(text) = &msg {
    println!("Got echo: {text}");
}
// silently ignores all other variants
```

Use `match` when you need exhaustive handling. Use `if let` when you want to act on exactly one case and ignore the rest.

---

## Mini-project: command_parser

```rust
#[derive(Debug)]
enum Command {
    Move { direction: String, steps: u32 },
    Attack(String),
    Heal { amount: u32 },
    Inspect,
    Quit,
}

fn parse_command(input: &str) -> Option<Command> {
    let parts: Vec<&str> = input.trim().splitn(2, ' ').collect();
    match parts.as_slice() {
        ["quit"] | ["q"] => Some(Command::Quit),
        ["inspect"] => Some(Command::Inspect),
        ["move", rest] => {
            let mut iter = rest.splitn(2, ' ');
            let dir = iter.next()?.to_string();
            let steps = iter.next().and_then(|s| s.parse().ok()).unwrap_or(1);
            Some(Command::Move { direction: dir, steps })
        }
        ["attack", target] => Some(Command::Attack(target.to_string())),
        ["heal", amount] => amount.parse().ok().map(|n| Command::Heal { amount: n }),
        _ => None,
    }
}

fn execute(cmd: &Command) {
    match cmd {
        Command::Move { direction, steps } =>
            println!("Moving {steps} steps {direction}"),
        Command::Attack(target) =>
            println!("Attacking {target}!"),
        Command::Heal { amount } =>
            println!("Healed for {amount} HP"),
        Command::Inspect =>
            println!("Inspecting surroundings..."),
        Command::Quit =>
            println!("Goodbye!"),
    }
}

fn main() {
    let inputs = ["move north 3", "attack goblin", "heal 50", "inspect", "quit", "unknown cmd"];
    for input in &inputs {
        match parse_command(input) {
            Some(cmd) => {
                print!("  '{input}' → ");
                execute(&cmd);
            }
            None => println!("  '{input}' → unknown command"),
        }
    }
}
```
