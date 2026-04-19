# The ? Operator and Error Propagation

**Module**: M06 · Error Handling  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C9 from Strata synthesis

---

## The core idea

The `?` operator propagates errors upward — if an operation returns `Err(e)`, `?` immediately returns that error from the current function. It replaces verbose `match` boilerplate with a single character, making error-handling code as readable as "happy path" code.

**Bug prevented**: accidentally ignoring errors, missing propagation paths.

## Before ? — verbose propagation

```rust
use std::fs;
use std::num::ParseIntError;

fn read_and_parse(filename: &str) -> Result<i32, String> {
    let content = match fs::read_to_string(filename) {
        Ok(c) => c,
        Err(e) => return Err(e.to_string()),
    };
    let trimmed = content.trim();
    match trimmed.parse::<i32>() {
        Ok(n) => Ok(n),
        Err(e) => Err(e.to_string()),
    }
}
```

## After ? — clean propagation

```rust
fn read_and_parse(filename: &str) -> Result<i32, String> {
    let content = fs::read_to_string(filename).map_err(|e| e.to_string())?;
    let n = content.trim().parse::<i32>().map_err(|e| e.to_string())?;
    Ok(n)
}
```

`?` does three things automatically:
1. If `Ok(val)` — unwrap and bind to the variable
2. If `Err(e)` — convert the error with `From::from(e)` and `return Err(...)`
3. Works on both `Result` and `Option`

## Chaining with ?

```rust
fn process_file(filename: &str) -> Result<Vec<i32>, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(filename)?;

    let numbers: Result<Vec<i32>, _> = content
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.trim().parse::<i32>())
        .collect();

    Ok(numbers?)
}
```

## ? with Option

```rust
fn first_word_length(text: &str) -> Option<usize> {
    let word = text.split_whitespace().next()?;  // return None if empty
    Some(word.len())
}

println!("{:?}", first_word_length("hello world"));  // Some(5)
println!("{:?}", first_word_length(""));              // None
```

## The return type requirement

`?` can only be used in functions that return `Result` or `Option`. It cannot be used in `main()` unless you change its signature:

```rust
// main() can return Result
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string("config.txt")?;
    println!("{content}");
    Ok(())
}
```

## Error type conversion — the From trait

`?` calls `From::from(e)` to convert the error to the function's return error type. This is why you often see `Box<dyn std::error::Error>` as a catch-all, or custom error enums that implement `From` for each variant.

```rust
#[derive(Debug)]
enum AppError {
    Io(std::io::Error),
    Parse(std::num::ParseIntError),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self { AppError::Io(e) }
}
impl From<std::num::ParseIntError> for AppError {
    fn from(e: std::num::ParseIntError) -> Self { AppError::Parse(e) }
}

fn load_config(path: &str) -> Result<i32, AppError> {
    let content = fs::read_to_string(path)?;  // io::Error → AppError::Io
    let n = content.trim().parse::<i32>()?;   // ParseIntError → AppError::Parse
    Ok(n)
}
```

---

## Mini-project: config_reader

```rust
use std::collections::HashMap;
use std::fmt;

#[derive(Debug)]
enum ConfigError {
    Io(std::io::Error),
    MissingKey(String),
    InvalidValue { key: String, value: String },
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ConfigError::Io(e) => write!(f, "IO error: {e}"),
            ConfigError::MissingKey(k) => write!(f, "missing key: '{k}'"),
            ConfigError::InvalidValue { key, value } =>
                write!(f, "invalid value for '{key}': '{value}'"),
        }
    }
}

impl From<std::io::Error> for ConfigError {
    fn from(e: std::io::Error) -> Self { ConfigError::Io(e) }
}

fn parse_config(content: &str) -> HashMap<String, String> {
    content.lines()
        .filter(|l| !l.trim().is_empty() && !l.starts_with('#'))
        .filter_map(|l| {
            let mut parts = l.splitn(2, '=');
            let key = parts.next()?.trim().to_string();
            let val = parts.next()?.trim().to_string();
            Some((key, val))
        })
        .collect()
}

fn get_required(config: &HashMap<String, String>, key: &str) -> Result<&str, ConfigError> {
    config.get(key).map(String::as_str)
        .ok_or_else(|| ConfigError::MissingKey(key.to_string()))
}

fn get_u32(config: &HashMap<String, String>, key: &str) -> Result<u32, ConfigError> {
    let val = get_required(config, key)?;
    val.parse::<u32>().map_err(|_| ConfigError::InvalidValue {
        key: key.to_string(),
        value: val.to_string(),
    })
}

fn main() {
    let config_str = "
# App configuration
host = localhost
port = 8080
max_connections = 100
debug = true
";
    let config = parse_config(config_str);

    match get_required(&config, "host") {
        Ok(host) => println!("host: {host}"),
        Err(e) => println!("Error: {e}"),
    }
    match get_u32(&config, "port") {
        Ok(port) => println!("port: {port}"),
        Err(e) => println!("Error: {e}"),
    }
    match get_required(&config, "missing_key") {
        Ok(v) => println!("missing_key: {v}"),
        Err(e) => println!("Error: {e}"),
    }
    match get_u32(&config, "debug") {
        Ok(v) => println!("debug as u32: {v}"),
        Err(e) => println!("Error: {e}"),
    }
}
```
