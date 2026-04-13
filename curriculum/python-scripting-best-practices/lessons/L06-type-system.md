# Python 3.10+ Type Annotations in Practice

**Module**: M03 · Documentation and the Type System  
**Type**: applied  
**Estimated time**: 12 minutes  
**Claim**: C10 from Strata synthesis

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
