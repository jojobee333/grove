# Lifetimes

**Module**: M07 · Generics, Traits & Lifetimes  
**Type**: core  
**Estimated time**: 22 minutes  
**Claims**: C5 from Strata synthesis

---

## The core idea

Lifetimes are the compiler's way of tracking how long references are valid. In the vast majority of cases, the compiler figures them out automatically (lifetime elision). You only write lifetime annotations when the compiler needs help connecting the lifetimes of references in a function signature or struct.

**Bug prevented**: dangling references, use-after-free via references.

## Lifetime elision — the common case

These three functions all compile without any annotations because the rules are unambiguous:

```rust
fn first_word(s: &str) -> &str {         // input lifetime flows to output
    s.split_whitespace().next().unwrap_or("")
}

fn longest_greeting(greeting: &str) -> &str {  // single reference input
    greeting
}

fn count_chars(s: &str) -> usize {       // returns owned value — no ambiguity
    s.chars().count()
}
```

The elision rules: if there's one reference input, its lifetime flows to the output. If there's a `&self` or `&mut self`, that lifetime flows to the output.

## When annotations are required

When the output reference could come from multiple inputs, the compiler needs to know which:

```rust
// Compile error — lifetime ambiguous
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}

// Fixed — the output lives as long as the shorter of x and y
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

`'a` is a lifetime parameter — it names a lifetime so you can refer to it. The annotation says: "the returned reference is valid for as long as both x and y are valid."

## Using the annotated function

```rust
let string1 = String::from("long string is long");
let result;
{
    let string2 = String::from("xyz");
    result = longest(string1.as_str(), string2.as_str());
    println!("Longest: {result}");  // OK — both strings alive here
}
// result can't be used here — string2 dropped
```

## Lifetimes in structs

When a struct holds a reference, it needs a lifetime parameter:

```rust
#[derive(Debug)]
struct Excerpt<'a> {
    text: &'a str,   // this reference must not outlive the source
}

let novel = String::from("Call me Ishmael. Some years ago...");
let first_sentence = novel.split('.').next().unwrap();
let excerpt = Excerpt { text: first_sentence };   // lives as long as 'novel'
println!("{:?}", excerpt);
```

Rule: until you're comfortable with lifetimes, use owned types (String, Vec) in structs to avoid needing lifetime annotations.

## The 'static lifetime

References that live for the entire program:

```rust
let s: &'static str = "I live forever";   // string literals are 'static
```

You'll see `'static` in trait objects: `Box<dyn Error + 'static>`. This is usually automatically satisfied.

## Key insight: lifetimes don't change how long things live

Lifetime annotations describe relationships — they don't make things live longer. If you try to return a reference to a local variable, no annotation can save you:

```rust
fn bad() -> &str {         // can't annotate your way out of this
    let s = String::from("local");
    &s    // compile error — s is dropped at end of function
}

fn good() -> String {      // return owned value instead
    String::from("local")
}
```

---

## Mini-project: text_analysis

```rust
#[derive(Debug)]
struct TextStats<'a> {
    source: &'a str,
    first_word: &'a str,
    longest_word: &'a str,
}

impl<'a> TextStats<'a> {
    fn new(text: &'a str) -> Self {
        let first_word = text.split_whitespace().next().unwrap_or("");
        let longest_word = text.split_whitespace()
            .max_by_key(|w| w.len())
            .unwrap_or("");
        TextStats { source: text, first_word, longest_word }
    }

    fn word_count(&self) -> usize {
        self.source.split_whitespace().count()
    }
}

fn longer_text<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    let text1 = String::from("the quick brown fox jumps over the lazy dog");
    let text2 = String::from("Rust programming is fast and safe");

    let stats1 = TextStats::new(&text1);
    let stats2 = TextStats::new(&text2);

    println!("Text 1:");
    println!("  Words:        {}", stats1.word_count());
    println!("  First word:   '{}'", stats1.first_word);
    println!("  Longest word: '{}'", stats1.longest_word);

    println!("\nText 2:");
    println!("  Words:        {}", stats2.word_count());
    println!("  First word:   '{}'", stats2.first_word);
    println!("  Longest word: '{}'", stats2.longest_word);

    let longer = longer_text(&text1, &text2);
    println!("\nLonger text starts with: '{}'", 
        longer.split_whitespace().next().unwrap_or(""));
}
```
