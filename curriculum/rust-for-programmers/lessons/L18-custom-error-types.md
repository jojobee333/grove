# Custom Error Types

**Module**: M06 · Error Handling  
**Type**: core  
**Estimated time**: 18 minutes  
**Claims**: C9 from Strata synthesis

---

## The core idea

Well-structured Rust programs define custom error types so callers know exactly what can go wrong — and can recover from specific cases. A proper error type implements `Display`, `Debug`, and optionally `Error` from `std::error`.

## The minimal error trait

```rust
use std::fmt;
use std::error::Error;

#[derive(Debug)]
struct ValidationError {
    field: String,
    message: String,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "validation error on '{}': {}", self.field, self.message)
    }
}

impl Error for ValidationError {}
// Error has a default impl — you only need Display + Debug
```

## Enum errors — the standard pattern

Real code can fail in multiple ways. Use an enum:

```rust
#[derive(Debug)]
enum AppError {
    NotFound(String),
    Unauthorized,
    Validation { field: String, message: String },
    Database(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::NotFound(resource) =>
                write!(f, "not found: {resource}"),
            AppError::Unauthorized =>
                write!(f, "unauthorized access"),
            AppError::Validation { field, message } =>
                write!(f, "validation failed for '{field}': {message}"),
            AppError::Database(msg) =>
                write!(f, "database error: {msg}"),
        }
    }
}

impl Error for AppError {}
```

## Implementing From for automatic conversion

Implementing `From<OtherError>` for your type lets `?` convert automatically:

```rust
impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Database(e.to_string())
    }
}
```

Now:
```rust
fn load_data(path: &str) -> Result<String, AppError> {
    let data = std::fs::read_to_string(path)?;  // io::Error → AppError::Database
    Ok(data)
}
```

## Box<dyn Error> — the escape hatch

When you don't want to define a custom error (scripts, prototypes, tests):

```rust
fn do_everything() -> Result<(), Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string("data.txt")?;
    let n: i32 = content.trim().parse()?;
    println!("n = {n}");
    Ok(())
}
```

Use `Box<dyn Error>` when:
- Prototyping / single-use functions
- Library callers don't need to match on error variants

Use a custom enum when:
- Library code (callers need to recover from specific errors)
- HTTP handlers (map to status codes)
- Any code where the caller makes a decision based on the error type

## The thiserror crate (production standard)

In real codebases, the `thiserror` crate eliminates the Display/Error boilerplate:

```toml
# Cargo.toml
[dependencies]
thiserror = "1"
```

```rust
use thiserror::Error;

#[derive(Debug, Error)]
enum AppError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("unauthorized")]
    Unauthorized,
    #[error("validation failed for '{field}': {message}")]
    Validation { field: String, message: String },
    #[error("database: {0}")]
    Database(#[from] std::io::Error),  // auto-implements From
}
```

---

## Mini-project: user_registration

```rust
use std::fmt;

#[derive(Debug)]
enum RegistrationError {
    UsernameTooShort { min: usize, got: usize },
    UsernameTooLong { max: usize, got: usize },
    InvalidEmail(String),
    PasswordTooWeak(String),
    UsernameTaken(String),
}

impl fmt::Display for RegistrationError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            RegistrationError::UsernameTooShort { min, got } =>
                write!(f, "username too short (min {min}, got {got})"),
            RegistrationError::UsernameTooLong { max, got } =>
                write!(f, "username too long (max {max}, got {got})"),
            RegistrationError::InvalidEmail(email) =>
                write!(f, "invalid email: '{email}'"),
            RegistrationError::PasswordTooWeak(reason) =>
                write!(f, "password too weak: {reason}"),
            RegistrationError::UsernameTaken(name) =>
                write!(f, "username '{name}' is already taken"),
        }
    }
}

fn validate_username(name: &str) -> Result<(), RegistrationError> {
    let len = name.len();
    if len < 3 { return Err(RegistrationError::UsernameTooShort { min: 3, got: len }); }
    if len > 20 { return Err(RegistrationError::UsernameTooLong { max: 20, got: len }); }
    Ok(())
}

fn validate_email(email: &str) -> Result<(), RegistrationError> {
    if email.contains('@') && email.contains('.') { Ok(()) }
    else { Err(RegistrationError::InvalidEmail(email.to_string())) }
}

fn validate_password(password: &str) -> Result<(), RegistrationError> {
    if password.len() < 8 {
        return Err(RegistrationError::PasswordTooWeak("at least 8 characters required".to_string()));
    }
    if !password.chars().any(|c| c.is_uppercase()) {
        return Err(RegistrationError::PasswordTooWeak("needs an uppercase letter".to_string()));
    }
    Ok(())
}

fn register(username: &str, email: &str, password: &str) -> Result<String, RegistrationError> {
    validate_username(username)?;
    validate_email(email)?;
    validate_password(password)?;

    if username == "admin" {
        return Err(RegistrationError::UsernameTaken(username.to_string()));
    }

    Ok(format!("User '{username}' registered with {email}"))
}

fn main() {
    let attempts = [
        ("alice", "alice@example.com", "Password1"),
        ("ab", "short@ex.com", "Pass1"),
        ("admin", "admin@example.com", "Password1"),
        ("bob", "not-an-email", "Password1"),
        ("charlie", "c@c.com", "weakpass"),
        ("dave", "dave@example.com", "StrongPass1"),
    ];

    for (username, email, password) in &attempts {
        match register(username, email, password) {
            Ok(msg) => println!("✓ {msg}"),
            Err(e) => println!("✗ {e}"),
        }
    }
}
```
