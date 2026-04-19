# String Operations

**Module**: M05 · Collections  
**Type**: core  
**Estimated time**: 16 minutes  
**Claims**: C1 from Strata synthesis

---

## The core idea

`String` is a growable UTF-8 text type — it's really `Vec<u8>` with UTF-8 guarantees. The same rules that apply to Vec apply here: String owns its data, you can't index it by integer, and iteration requires explicit choice between bytes, chars, or grapheme clusters.

## Building strings

```rust
// From literals
let s = String::from("hello");
let s = "hello".to_string();

// Empty, then build
let mut s = String::new();
s.push('H');          // push a char
s.push_str("ello");   // push a &str
s += " world";        // += is syntactic sugar for push_str

// Concatenation with +  — moves the left operand
let s1 = String::from("hello");
let s2 = String::from(" world");
let s3 = s1 + &s2;    // s1 is moved; s2 is borrowed
// s1 is no longer valid; s3 = "hello world"
```

## format! — preferred for complex concatenation

```rust
let s1 = String::from("tic");
let s2 = String::from("tac");
let s3 = String::from("toe");

// + is unwieldy for 3+
let result = format!("{s1}-{s2}-{s3}");   // "tic-tac-toe"
// Does not move any of s1, s2, s3
```

## Slicing strings

```rust
let s = String::from("hello world");
let hello = &s[0..5];    // "hello" — byte slice
let world = &s[6..11];   // "world"

// WARNING: slicing in the middle of a UTF-8 char panics at runtime
let emoji = String::from("😀 hello");
// &emoji[0..2] would panic — 😀 is 4 bytes
```

## Iterating safely

```rust
let s = String::from("hello");

// Characters (Unicode-aware)
for c in s.chars() {
    print!("{c} ");  // h e l l o
}

// Bytes
for b in s.bytes() {
    print!("{b} ");  // 104 101 108 108 111
}
```

## Key string methods

```rust
let s = "  Hello, World!  ";

// Whitespace
let trimmed = s.trim();               // "Hello, World!"
let left = s.trim_start();
let right = s.trim_end();

// Case
let lower = s.to_lowercase();
let upper = s.to_uppercase();

// Finding
let pos = s.find(',');                // Some(7)
let contains = s.contains("World");  // true
let starts = s.starts_with("  ");    // true

// Replacement
let replaced = s.replace("World", "Rust");

// Splitting
let parts: Vec<&str> = "a,b,c".split(',').collect();
let words: Vec<&str> = s.split_whitespace().collect();

// Parsing
let n: i32 = "42".parse().unwrap();
let n: Result<i32, _> = "abc".parse();  // Err(...)
```

## Converting to/from String

```rust
let n: i32 = 42;
let s = n.to_string();          // "42"
let back: i32 = s.parse().unwrap();

let formatted = format!("{:.2}", 3.14159);  // "3.14"
```

---

## Mini-project: text_statistics

```rust
fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

fn char_count(text: &str) -> usize {
    text.chars().count()
}

fn sentence_count(text: &str) -> usize {
    text.chars().filter(|&c| c == '.' || c == '!' || c == '?').count()
}

fn most_common_word(text: &str) -> Option<String> {
    use std::collections::HashMap;
    let mut counts: HashMap<String, usize> = HashMap::new();
    for word in text.split_whitespace() {
        let cleaned: String = word.chars()
            .filter(|c| c.is_alphabetic())
            .map(|c| c.to_lowercase().next().unwrap())
            .collect();
        if !cleaned.is_empty() {
            *counts.entry(cleaned).or_insert(0) += 1;
        }
    }
    counts.into_iter().max_by_key(|(_, count)| *count).map(|(word, _)| word)
}

fn main() {
    let text = "Rust is fast. Rust is safe. \
                Rust has zero-cost abstractions. \
                Is Rust hard? Rust takes practice!";

    println!("Text: \"{text}\"");
    println!("Words:     {}", word_count(text));
    println!("Chars:     {}", char_count(text));
    println!("Sentences: {}", sentence_count(text));
    if let Some(word) = most_common_word(text) {
        println!("Top word:  '{word}'");
    }

    // String building
    let words: Vec<&str> = text.split_whitespace()
        .filter(|w| w.len() > 4)
        .collect();
    let long_words = words.join(", ");
    println!("\nWords > 4 chars: {long_words}");
}
```
