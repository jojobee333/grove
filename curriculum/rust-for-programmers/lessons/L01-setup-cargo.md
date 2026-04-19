# Installing Rust and Hello, Cargo

**Module**: M01 · Setup & Rust Fundamentals  
**Type**: core  
**Estimated time**: 15 minutes  
**Claims**: C1 from Strata synthesis

---

## The core idea

Every Rust project is managed by Cargo — the official build system and package manager. You don't compile Rust files manually; you use `cargo build`, `cargo run`, and `cargo test`. The first step is always `rustup`, which manages Rust toolchain versions.

## Setting up

Install Rust via [rustup.rs](https://rustup.rs). One command installs everything: `rustc` (the compiler), `cargo` (the build tool), and `rustup` (the toolchain manager).

```bash
# Install (macOS/Linux)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify
rustc --version
cargo --version
```

On Windows: download and run rustup-init.exe from rustup.rs.

## Your first project

```bash
cargo new hello_world
cd hello_world
```

This creates:
```
hello_world/
├── Cargo.toml   ← project manifest (name, version, dependencies)
└── src/
    └── main.rs  ← entry point
```

The default `src/main.rs`:
```rust
fn main() {
    println!("Hello, world!");
}
```

Run it:
```bash
cargo run
# Compiling hello_world v0.1.0
# Finished dev profile
# Hello, world!
```

## Key concepts

**println! is a macro**, not a function — the `!` is the tell. Macros are expanded at compile time and can accept variable argument counts, which regular functions can't.

**Cargo.toml** is your project's contract with the ecosystem:
```toml
[package]
name = "hello_world"
version = "0.1.0"
edition = "2021"

[dependencies]
# add crates here
```

**cargo commands you'll use daily:**
- `cargo new <name>` — create a project
- `cargo run` — compile and run
- `cargo build` — compile only (debug by default)
- `cargo build --release` — optimized build
- `cargo check` — type-check without producing a binary (fastest feedback loop)
- `cargo test` — run tests
- `cargo clippy` — run the Rust linter

## Why this matters

Unlike Python (`python script.py`) or JavaScript (`node script.js`), Rust is always compiled. There is no interpreter. `cargo run` compiles your entire project and runs the binary — errors are always caught before execution.

The compilation step is Rust's first line of defense.

---

## Mini-project: hello_world

Extend the default main.rs to:
1. Print a personalized greeting using a `name` variable
2. Print the Rust edition from a constant
3. Use `cargo check` to verify it compiles without running it

```rust
fn main() {
    let name = "Rustacean";
    const EDITION: u32 = 2021;
    println!("Hello, {}! Welcome to Rust Edition {}.", name, EDITION);
}
```

Run with `cargo run`. Notice the compilation output — this is what Rust does before every execution.
