# Python 3.10+ Type System: Union, TypedDict, Protocol, Final

**Module**: M03 · Documentation and the Type System  
**Type**: applied  
**Estimated time**: 15 minutes  
**Claim**: C10 from Strata synthesis

---

## The core idea

Python 3.10 simplified type annotation syntax significantly, and the [typing module](../../research/python-scripting-best-practices/01-sources/web/S010-typing.md) provides four constructs that solve real problems beyond basic parameter annotations. New code should use `str | None` instead of `Optional[str]`, `list[str]` instead of `List[str]`, and `dict[str, int]` instead of `Dict[str, int]`. Beyond syntax, four constructs handle the cases that scalar annotations cannot: `TypedDict` for typed dictionary structures, `Protocol` for structural typing, `Final` for constants, and `TypeAlias` for readable complex types.

This is the vocabulary recommended by the [typing docs](../../research/python-scripting-best-practices/01-sources/web/S010-typing.md), [mypy](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md), [PEP 484](../../research/python-scripting-best-practices/01-sources/web/S022-pep484.md), and the [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) for any Python 3.10+ project running `mypy --strict`.

## Why the modern syntax matters

The old `Optional[str]`, `List[str]`, `Dict[str, int]` forms require importing from `typing`. The new forms (`str | None`, `list[str]`, `dict[str, int]`) are built-in syntax since Python 3.10 and require no imports. Beyond brevity, the new union syntax `A | B` is unambiguous at a glance — `str | None` makes "nullable string" visually obvious in a way `Optional[str]` does not for readers who don't know what `Optional` expands to.

Ruff's `UP007` rule auto-upgrades `Optional[str]` to `str | None`, and `UP006` upgrades `List[str]` to `list[str]`. If you have `pyupgrade` rules in your ruff config, the migration happens automatically on `ruff check --fix`.

```python
# Old forms — still valid, avoid in new code
from typing import Optional, List, Dict, Tuple
def process(
    items: List[str],
    limit: Optional[int] = None,
) -> Dict[str, int]: ...

# Modern forms — prefer these in Python 3.10+
def process(
    items: list[str],
    limit: int | None = None,
) -> dict[str, int]: ...
```

## TypedDict — give shape to configuration dictionaries

The most common typing anti-pattern in Python scripts is `dict[str, Any]` for configuration objects. `Any` disables type checking for everything in that dict. `TypedDict` is the correct replacement: it gives a dictionary a fixed schema that mypy can verify.

```python
from typing import TypedDict, NotRequired
from pathlib import Path


class DatabaseConfig(TypedDict):
    """Configuration for database connection."""
    host: str
    port: int
    database: str
    password: NotRequired[str]   # optional key — may be absent


class AppConfig(TypedDict):
    """Top-level application configuration."""
    debug: bool
    workers: int
    db: DatabaseConfig
    log_level: str


def connect(cfg: DatabaseConfig) -> None:
    """Connect to the database described by cfg."""
    # mypy knows cfg["host"] is str and cfg["port"] is int
    # It will flag cfg["hostt"] (typo) as KeyError at static analysis time
    print(f"Connecting to {cfg['host']}:{cfg['port']}")
```

When you load config from `tomllib` and assign it to a `AppConfig` variable, mypy will verify that the loaded dict has the right keys and types. This catches config schema mismatches before the script runs — not during a production midnight incident.

## Protocol — write interfaces without inheritance

Python's dynamic typing means that any object with the right methods can satisfy an interface — this is duck typing. `Protocol` makes that implicit contract explicit and statically checkable without requiring inheritance.

```python
from typing import Protocol
from pathlib import Path


class Writable(Protocol):
    """Any object that can write text content to a destination."""
    def write(self, content: str) -> int: ...


class FileWriter:
    """Writes content to a file path."""
    def __init__(self, path: Path) -> None:
        self._path = path

    def write(self, content: str) -> int:
        self._path.write_text(content, encoding="utf-8")
        return len(content)


class TestWriter:
    """In-memory writer for tests — no file I/O."""
    def __init__(self) -> None:
        self.written: list[str] = []

    def write(self, content: str) -> int:
        self.written.append(content)
        return len(content)


def save_report(writer: Writable, report: str) -> None:
    """Save a report using any Writable implementation.

    Args:
        writer: Any object satisfying the Writable protocol.
        report: The report content to save.
    """
    writer.write(report)
```

`FileWriter` and `TestWriter` both satisfy `Writable` without inheriting from it. In tests, you pass a `TestWriter`. In production, you pass a `FileWriter`. mypy verifies both work at static analysis time.

## Final — constants that cannot be reassigned

`Final` tells mypy (and readers) that a name is a constant. It prevents accidental reassignment anywhere in the codebase:

```python
from typing import Final

MAX_RETRIES: Final = 3
DEFAULT_TIMEOUT: Final[float] = 30.0
BASE_URL: Final = "https://api.example.com"

# mypy will flag this:
MAX_RETRIES = 5   # error: Cannot assign to final name "MAX_RETRIES"
```

This is the correct pattern for module-level constants that should never be overridden. PEP 8's `ALL_CAPS` naming convention signals intent; `Final` *enforces* it.

## There is a real disagreement here

**[PEP 484](../../research/python-scripting-best-practices/01-sources/web/S022-pep484.md)** states: "the authors have no desire to ever make type hints mandatory or even ubiquitous." Its `Any` type is described as "consistent with every type" — an intentional escape hatch.

**[The Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md)** states: "Do not use `Any`. It opts out of the type system." For new production code, Google mandates annotations and prohibits `Any` except in deliberate migration scenarios.

This is a real tension. PEP 484 designed `Any` as a first-class tool for gradual typing. Google treats it as a smell. The resolution: `Any` is appropriate during migration (type `# type: ignore[assignment]` with an explanation comment, or annotate as `Any` with a comment marking it for follow-up). It is not appropriate in fully-typed new code. The synthesis this course takes: use mypy `--strict` from the start for new projects, which enables `--disallow-any-generics` and `--warn-return-any` — making `Any` a deliberate choice that requires explicit suppression.

## Limitations

Python 3.10+ syntax (`A | B` union, `list[T]` generics) can be used in *annotations* on Python 3.10+ without any import. However, if your code *inspects* type annotations at runtime — as Pydantic, dataclasses with `fields()`, or code using `typing.get_type_hints()` does — you need `from __future__ import annotations` to defer evaluation, or the `A | B` syntax will raise `TypeError` on Python 3.9 and below.

Remove `from __future__ import annotations` if you depend on runtime-accessible annotations: it makes all annotations strings (deferred), which breaks Pydantic models and some dataclass validators. This is the one place where the annotation syntax and runtime behaviour interact in a non-obvious way.

## Key points

- Prefer `X | None` over `Optional[X]` and `list[X]` over `List[X]` in Python 3.10+; ruff's `UP` rules auto-upgrade the old forms
- Use `TypedDict` instead of `dict[str, Any]` for configuration dicts — it gives mypy a schema to verify
- `Protocol` enables structural typing without inheritance — the correct pattern for writing testable interfaces
- `Final` prevents constant reassignment; do not use `Any` in fully-typed new code

## Go deeper

- [S010 — typing module docs](../../research/python-scripting-best-practices/01-sources/web/S010-typing.md) — `TypedDict` with `NotRequired`/`Required`, `Literal`, `ParamSpec`, and the `type` statement (Python 3.12+)
- [S011 — mypy docs](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md) — what `--strict` enables for generic and `Any` checks, per-module override patterns for third-party stubs
- [S022 — PEP 484](../../research/python-scripting-best-practices/01-sources/web/S022-pep484.md) — `TypeVar`, `Generic`, `@overload`, and the `collections.abc` abstract types for function arguments

---

*[← L05: Self-Documenting Functions](./L05-self-documenting-functions.md)* · *[L07: pathlib and Context Managers →](./L07-pathlib-context-managers.md)*

---

## The core idea

Python 3.10 simplified type annotation syntax significantly: use `str | None` instead of `Optional[str]`, `list[str]` instead of `List[str]`, and `dict[str, int]` instead of `Dict[str, int]`. The old forms still work — mypy ([S011](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md)) and Python 3.10+ both accept them — but new code should use the modern forms. They are shorter, more readable, and require no imports from `typing`.

Beyond the syntax changes, four constructs solve real problems that simpler annotations cannot: `TypedDict` for typed dictionary structures, `Protocol` for structural typing, `Final` for constants, and `TypeAlias` for readable complex types.

## Why it matters when teaching

The value of the modern type system is not catching bugs you already know about — it is catching bugs you didn't know were possible. When you annotate a function as returning `str | None`, mypy will flag every call site that treats the result as a plain `str` without checking for `None`. That is a whole class of `AttributeError` and `TypeError` eliminated before the code runs.

When teaching, the comparison between old and new syntax is a useful anchor. Then the four advanced constructs give intermediate learners an upgrade path: they know how to annotate scalar values, but they may not know how to annotate a configuration dictionary or a class-independent interface.

## A concrete example

**Old vs. new syntax** (Python 3.10+):

```python
# Old (still valid, avoid in new code)
from typing import Optional, List, Dict
def process(items: List[str], limit: Optional[int] = None) -> Dict[str, int]: ...

# New (prefer this)
def process(items: list[str], limit: int | None = None) -> dict[str, int]: ...
```

**TypedDict** — for dictionaries with known shapes:

```python
from typing import TypedDict

class Config(TypedDict):
    host: str
    port: int
    debug: bool

def connect(cfg: Config) -> None:
    ...  # mypy enforces that cfg["host"] exists and is str
```

**Protocol** — structural typing without inheritance:

```python
from typing import Protocol

class Closeable(Protocol):
    def close(self) -> None: ...

def shutdown(resource: Closeable) -> None:
    resource.close()   # works for any class with close(), no inheritance required
```

**Final** — runtime-visible constants:

```python
from typing import Final

MAX_RETRIES: Final = 3   # mypy prevents reassignment
```

Run `mypy --strict` to enforce these across an entire project:

```toml
[tool.mypy]
strict = true
```

## Key points

- Prefer `X | None` over `Optional[X]` and `list[X]` over `List[X]` in Python 3.10+ code
- Use `TypedDict` to give typed shapes to config dictionaries instead of `dict[str, Any]`
- `Protocol` enables structural typing — write interfaces without requiring inheritance

## Go deeper

- [S011 — mypy documentation](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md) — `--strict` mode checks, `TypedDict` and `Protocol` support
- [S010 — PEP 604](../../research/python-scripting-best-practices/01-sources/web/S010-pep604.md) — the `X | Y` union syntax specification and rationale

---

*[← L05: Self-Documenting Functions](./L05-self-documenting-functions.md)* · *[L07: pathlib and Context Managers →](./L07-pathlib-context-managers.md)*
