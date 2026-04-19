# HashMap<K, V>

**Module**: M05 · Collections  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C1 from Strata synthesis

---

## The core idea

`HashMap<K, V>` stores key-value pairs with O(1) average lookup. Like Vec, it owns its contents. The keys must implement `Hash` and `Eq` — all primitive types and Strings already do.

## Creating and inserting

```rust
use std::collections::HashMap;

let mut scores: HashMap<String, i32> = HashMap::new();

scores.insert(String::from("Alice"), 95);
scores.insert(String::from("Bob"), 80);
scores.insert(String::from("Charlie"), 88);
```

## Reading values

```rust
// .get() — safe, returns Option<&V>
let alice = scores.get("Alice");    // Some(&95)
let dave = scores.get("Dave");      // None

// Indexing — panics if key missing
let score = scores["Alice"];        // 95

// Check existence
println!("{}", scores.contains_key("Bob"));  // true
```

## Iterating

```rust
for (name, score) in &scores {
    println!("{name}: {score}");
}
// Order is not guaranteed
```

## Update patterns

```rust
// Overwrite
scores.insert(String::from("Alice"), 100);

// Insert only if absent — entry API
scores.entry(String::from("Dave")).or_insert(70);

// Modify in place
let count = scores.entry(String::from("Bob")).or_insert(0);
*count += 10;   // dereference to modify
```

## The entry API — idiom for word counting

```rust
let text = "hello world hello rust world hello";
let mut word_count: HashMap<&str, u32> = HashMap::new();

for word in text.split_whitespace() {
    let count = word_count.entry(word).or_insert(0);
    *count += 1;
}

println!("{word_count:?}");
// {"hello": 3, "world": 2, "rust": 1}
```

## Removing

```rust
scores.remove("Charlie");   // removes key-value pair, returns Option<V>
```

## HashMap from two Vecs

```rust
let names = vec!["Alice", "Bob", "Charlie"];
let scores = vec![95, 80, 88];

let map: HashMap<&&str, &i32> = names.iter().zip(scores.iter()).collect();
```

Or with owned values:
```rust
let map: HashMap<String, i32> = names.into_iter()
    .map(String::from)
    .zip(scores)
    .collect();
```

---

## Mini-project: grade_book

```rust
use std::collections::HashMap;

struct GradeBook {
    entries: HashMap<String, Vec<f64>>,
}

impl GradeBook {
    fn new() -> Self {
        GradeBook { entries: HashMap::new() }
    }

    fn add_grade(&mut self, student: &str, grade: f64) {
        self.entries.entry(student.to_string()).or_insert_with(Vec::new).push(grade);
    }

    fn average(&self, student: &str) -> Option<f64> {
        let grades = self.entries.get(student)?;
        if grades.is_empty() { return None; }
        Some(grades.iter().sum::<f64>() / grades.len() as f64)
    }

    fn top_student(&self) -> Option<(&str, f64)> {
        self.entries.iter()
            .filter_map(|(name, grades)| {
                if grades.is_empty() { return None; }
                let avg = grades.iter().sum::<f64>() / grades.len() as f64;
                Some((name.as_str(), avg))
            })
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
    }

    fn report(&self) {
        let mut sorted: Vec<(&String, f64)> = self.entries.iter()
            .filter_map(|(name, grades)| {
                if grades.is_empty() { return None; }
                let avg = grades.iter().sum::<f64>() / grades.len() as f64;
                Some((name, avg))
            })
            .collect();
        sorted.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        println!("--- Grade Report ---");
        for (name, avg) in &sorted {
            let letter = match avg {
                a if *a >= 90.0 => 'A',
                a if *a >= 80.0 => 'B',
                a if *a >= 70.0 => 'C',
                _ => 'F',
            };
            println!("  {name}: {avg:.1} ({letter})");
        }
    }
}

fn main() {
    let mut book = GradeBook::new();
    book.add_grade("Alice", 92.0);
    book.add_grade("Alice", 88.0);
    book.add_grade("Alice", 95.0);
    book.add_grade("Bob", 74.0);
    book.add_grade("Bob", 81.0);
    book.add_grade("Charlie", 65.0);
    book.add_grade("Charlie", 70.0);
    book.add_grade("Charlie", 68.0);

    book.report();
    if let Some((name, avg)) = book.top_student() {
        println!("\nTop student: {name} ({avg:.1})");
    }
}
```
