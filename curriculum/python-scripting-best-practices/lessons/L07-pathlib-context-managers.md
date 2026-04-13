# pathlib and Context Managers

**Module**: M04 · Resource Management and Configuration  
**Type**: core  
**Estimated time**: 12 minutes  
**Claims**: C7, C8 from Strata synthesis

---

## The core idea

Two practices eliminate entire categories of resource bugs. First: use `pathlib.Path` for every file system operation — never `os.path`. Second: use `with` statements (context managers) for every resource that must be released — files, network connections, temporary directories, thread locks.

Both are supported across Python 3.8+ and documented in the official stdlib ([S007](../../research/python-scripting-best-practices/01-sources/web/S007-pathlib.md), [S001](../../research/python-scripting-best-practices/01-sources/web/S001-context-managers.md)). They are not advanced features — they are the baseline.

## Why it matters when teaching

`os.path` is string concatenation with delimiters. It works, but it fails silently on cross-platform paths, offers no autocompletion on path components, and spreads path logic across multiple modules. `pathlib.Path` makes paths first-class objects: methods like `.read_text()`, `.write_text()`, `.glob()`, `.parent`, and the `/` operator for joining make path intent explicit and eliminate a class of string-handling bugs.

Context managers address a different problem: resources that must be closed even when exceptions occur. The pattern `with open(path) as f:` is familiar — but the same contract applies to database connections, HTTP sessions, temporary directories, and asyncio locks. Without `with`, a crash before `.close()` leaks the resource. With `with`, the `__exit__` method is guaranteed to run.

The comparison that lands best in teaching: `tempfile.TemporaryDirectory` vs `tempfile.mktemp()`. Both create temporary directories. But `mktemp()` does not clean up — and between creating the name and creating the directory, another process could create the same path (a race condition). `TemporaryDirectory` as a context manager creates, provides, and removes the directory atomically.

## A concrete example

```python
from pathlib import Path
import tempfile

def process_config_files(config_dir: Path) -> list[str]:
    """Read all .toml files from a directory and return their contents."""
    results = []
    for path in config_dir.glob("*.toml"):          # Path.glob — no os.listdir
        content = path.read_text(encoding="utf-8")  # Path.read_text — no open()
        results.append(content)
    return results


def write_report(output_dir: Path, name: str, body: str) -> Path:
    """Write a report file, creating parent directories if needed."""
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / name                 # / operator for joining
    report_path.write_text(body, encoding="utf-8")
    return report_path


def build_in_tempdir(source: Path) -> str:
    """Process files in a guaranteed-cleanup temporary directory."""
    with tempfile.TemporaryDirectory() as tmp:      # always cleaned up
        tmp_path = Path(tmp)
        (tmp_path / "work.txt").write_text("data")
        return (tmp_path / "work.txt").read_text()
    # tmp_path is deleted here, even if an exception was raised
```

## Key points

- `pathlib.Path` replaces `os.path`, `os.getcwd()`, `open()`, and string-based path joins — prefer it for all filesystem operations
- The `with` statement guarantees `__exit__` runs even when exceptions occur — use it for every resource that must be released
- `tempfile.TemporaryDirectory()` as a context manager eliminates cleanup bugs and `mktemp()` race conditions

## Go deeper

- [S007 — pathlib documentation](../../research/python-scripting-best-practices/01-sources/web/S007-pathlib.md) — full method reference, `Path.stat()`, `Path.rename()`, `Path.unlink()`
- [S001 — contextlib documentation](../../research/python-scripting-best-practices/01-sources/web/S001-context-managers.md) — `contextlib.contextmanager` decorator for building custom context managers

---

*[← L06: The Type System](./L06-type-system.md)* · *[L08: Configuration and Secrets →](./L08-configuration-secrets.md)*
