# Iterator Adapters and Chains

**Module**: M08 · Iterators & Functional Patterns  
**Type**: core  
**Estimated time**: 20 minutes  
**Claims**: C6 from Strata synthesis

---

## The core idea

Iterator adapters transform one iterator into another. They are lazy — no work happens until you call a consuming adapter at the end. Chains of adapters compile down to a single optimized loop with zero intermediate allocations.

## Lazy evaluation — nothing happens until consumed

```rust
let v = vec![1, 2, 3, 4, 5];

// This does nothing yet — just builds a description
let chain = v.iter().map(|&x| x * 2).filter(|&x| x > 4);

// Now computation happens
let result: Vec<i32> = chain.collect();  // [6, 8, 10]
```

## Core adapters

**map** — transform each element:
```rust
let doubled: Vec<i32> = vec![1, 2, 3].iter().map(|&x| x * 2).collect();
// [2, 4, 6]
```

**filter** — keep elements matching a predicate:
```rust
let evens: Vec<i32> = (1..=10).filter(|x| x % 2 == 0).collect();
// [2, 4, 6, 8, 10]
```

**filter_map** — map and filter in one step (keeps Some, discards None):
```rust
let parsed: Vec<i32> = vec!["1", "two", "3", "four"]
    .iter()
    .filter_map(|s| s.parse::<i32>().ok())
    .collect();
// [1, 3]
```

**flat_map** — map then flatten one level:
```rust
let words = vec!["hello world", "foo bar"];
let chars: Vec<&str> = words.iter()
    .flat_map(|s| s.split_whitespace())
    .collect();
// ["hello", "world", "foo", "bar"]
```

**enumerate** — add indices:
```rust
for (i, val) in vec!["a", "b", "c"].iter().enumerate() {
    println!("{i}: {val}");
}
```

**zip** — pair two iterators:
```rust
let names = vec!["Alice", "Bob"];
let scores = vec![95, 80];
let pairs: Vec<(&&str, &i32)> = names.iter().zip(scores.iter()).collect();
```

**take / skip / take_while / skip_while:**
```rust
let first5: Vec<i32> = (1..).take(5).collect();          // [1,2,3,4,5]
let after3: Vec<i32> = (1..=6).skip(3).collect();        // [4,5,6]
let prefix: Vec<i32> = (1..).take_while(|&x| x < 5).collect(); // [1,2,3,4]
```

**chain** — concatenate two iterators:
```rust
let a = vec![1, 2, 3];
let b = vec![4, 5, 6];
let all: Vec<i32> = a.iter().chain(b.iter()).cloned().collect();
// [1, 2, 3, 4, 5, 6]
```

**fold — general accumulator:**
```rust
let sum = vec![1, 2, 3, 4, 5].iter().fold(0, |acc, &x| acc + x);
// 15

let product = vec![1, 2, 3, 4].iter().fold(1, |acc, &x| acc * x);
// 24
```

## Iterators vs loops — the equivalence

```rust
// Idiomatic Rust — iterator chain
let result: i32 = (1..=100)
    .filter(|x| x % 3 == 0)
    .map(|x| x * x)
    .sum();

// Same result, explicit loop
let mut result = 0;
for x in 1..=100 {
    if x % 3 == 0 {
        result += x * x;
    }
}
```

Both compile to the same machine code. Use iterators — they are clearer and cannot accidentally mutate variables you don't mean to.

---

## Mini-project: data_pipeline

```rust
#[derive(Debug, Clone)]
struct Record {
    name: String,
    department: String,
    salary: f64,
    years: u32,
}

impl Record {
    fn new(name: &str, dept: &str, salary: f64, years: u32) -> Self {
        Record { name: name.to_string(), department: dept.to_string(), salary, years }
    }
}

fn main() {
    let records = vec![
        Record::new("Alice",   "Engineering", 95000.0, 5),
        Record::new("Bob",     "Marketing",   72000.0, 3),
        Record::new("Charlie", "Engineering", 105000.0, 8),
        Record::new("Diana",   "Engineering", 88000.0, 2),
        Record::new("Eve",     "Marketing",   68000.0, 6),
        Record::new("Frank",   "HR",          62000.0, 4),
        Record::new("Grace",   "Engineering", 112000.0, 10),
    ];

    // Engineers with more than 4 years experience
    let senior_engineers: Vec<&Record> = records.iter()
        .filter(|r| r.department == "Engineering" && r.years > 4)
        .collect();
    println!("Senior engineers:");
    for r in &senior_engineers { println!("  {} ({}y, ${:.0})", r.name, r.years, r.salary); }

    // Average salary by department
    let mut dept_totals: std::collections::HashMap<&str, (f64, usize)> = std::collections::HashMap::new();
    for r in &records {
        let entry = dept_totals.entry(r.department.as_str()).or_insert((0.0, 0));
        entry.0 += r.salary;
        entry.1 += 1;
    }
    println!("\nAverage salaries:");
    let mut depts: Vec<(&str, f64)> = dept_totals.iter()
        .map(|(&dept, &(total, count))| (dept, total / count as f64))
        .collect();
    depts.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    for (dept, avg) in &depts { println!("  {dept}: ${avg:.0}"); }

    // Top 3 earners
    let mut sorted = records.clone();
    sorted.sort_by(|a, b| b.salary.partial_cmp(&a.salary).unwrap());
    println!("\nTop 3 earners:");
    sorted.iter().take(3).enumerate().for_each(|(i, r)| {
        println!("  {}. {} — ${:.0}", i + 1, r.name, r.salary);
    });

    // Names of all staff in alphabetical order
    let mut names: Vec<&str> = records.iter().map(|r| r.name.as_str()).collect();
    names.sort();
    println!("\nAll staff: {}", names.join(", "));
}
```
