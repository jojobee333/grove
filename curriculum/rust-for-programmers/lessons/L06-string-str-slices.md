# String vs &str and Slices

**Module**: M02 · Ownership & Borrowing  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C2 from Strata synthesis

---

## The core idea

Rust has two string types that represent different ownership models. Understanding when to use each one makes your function signatures both correct and idiomatic.

## String — owned, heap-allocated, growable

```rust
let mut s = String::from("hello");
s.push_str(", world");   // can grow because it owns its buffer
s.push('!');             // push a single char
println!("{s}");         // hello, world!
```

String owns heap memory. When it goes out of scope, the memory is freed.

## &str — borrowed slice, fixed

```rust
let s: &str = "hello, world";   // string literal — lives in binary
let slice: &str = &s[0..5];     // slice of a String
```

`&str` is an immutable view into a UTF-8 sequence. You can't grow it because you don't own the data.

## The deref coercion: &String → &str

```rust
fn count_chars(s: &str) -> usize {
    s.chars().count()
}

let owned = String::from("hello");
let literal = "world";

count_chars(&owned);    // &String coerces to &str automatically
count_chars(literal);   // &str is already &str
```

**Rule**: prefer `&str` in function parameters when you only need to read. This accepts both `&String` callers and `&str` callers. A `&String` parameter is unnecessarily restrictive.

## Common String operations

```rust
let mut s = String::from("Hello, World!");

// Length
println!("{}", s.len());            // bytes, not chars
println!("{}", s.chars().count());  // Unicode char count (same here)

// Check
println!("{}", s.contains("World"));   // true
println!("{}", s.starts_with("He"));   // true

// Transform (returns new String)
let lower = s.to_lowercase();
let upper = s.to_uppercase();
let trimmed = "  hello  ".trim();    // &str, removes whitespace

// Split
let parts: Vec<&str> = s.split(", ").collect();
// ["Hello", "World!"]

// Replace
let replaced = s.replace("World", "Rust");
```

## Why you can't index a String with `s[0]`

```rust
let s = String::from("héllo");
let c = s[0];    // compile error: String cannot be indexed by integer
```

Rust strings are UTF-8. The character `é` is 2 bytes. `s[0]` would return a byte, which might be the middle of a multi-byte character — meaningless at best, corrupted data at worst. Rust prevents this at compile time.

Instead:
```rust
let c = s.chars().nth(0);   // Option<char> — safe
```

## Slices

A slice is a reference to a contiguous sequence — `&str` is a string slice, `&[i32]` is an array slice:

```rust
let a = [1, 2, 3, 4, 5];
let slice: &[i32] = &a[1..3];   // [2, 3]
println!("{:?}", slice);
```

The `..` range syntax: `0..5` is 0,1,2,3,4 (exclusive end); `0..=5` includes 5.

---

## Mini-project: string_reversal

Write a program that reverses the words in a sentence using `&str` slices — no unnecessary allocations in the processing function:

```rust
fn reverse_words(sentence: &str) -> String {
    let words: Vec<&str> = sentence.split_whitespace().collect();
    words.iter().rev().cloned().collect::<Vec<&str>>().join(" ")
}

fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }
    &s[..]   // whole string if no space
}

fn main() {
    let sentence = String::from("the quick brown fox");
    
    // &String coerces to &str — both work
    println!("Reversed: '{}'", reverse_words(&sentence));
    println!("Reversed: '{}'", reverse_words("hello world rust"));
    
    println!("First word: '{}'", first_word(&sentence));
    println!("First word: '{}'", first_word("hello"));
}
```

Expected output:
```
Reversed: 'fox brown quick the'
Reversed: 'rust world hello'
First word: 'the'
First word: 'hello'
```
