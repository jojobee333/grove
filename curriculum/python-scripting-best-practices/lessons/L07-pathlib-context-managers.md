# pathlib and Context Managers: Safe I/O by Default

**Module**: M04 · Resource Management and Configuration  
**Type**: core  
**Estimated time**: 15 minutes  
**Claims**: C7, C8 from Strata synthesis

---

## The core idea

Two practices eliminate entire categories of resource bugs in Python scripts. First: use `pathlib.Path` for every filesystem operation — the [pathlib documentation](../../research/python-scripting-best-practices/01-sources/web/S007-pathlib.md) is an exhaustive reference for the object-oriented Path API that replaces `os.path` entirely. Second: use `with` statements (context managers) for every resource that must be released — this is mandated by [PEP 8](../../research/python-scripting-best-practices/01-sources/web/S001-pep8.md), the [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md), and the [tempfile documentation](../../research/python-scripting-best-practices/01-sources/web/S020-tempfile.md) for the specific case of temporary files.

Neither is an advanced feature. Both are available since Python 3.4+ and documented as the baseline for all new Python code.

## Why pathlib replaces os.path

`os.path` is string concatenation with directory separators. It works, but it has three fundamental problems:

**No cross-platform path logic**: `os.path.join("data", "input.txt")` returns `"data\\input.txt"` on Windows and `"data/input.txt"` on POSIX. `pathlib.Path("data") / "input.txt"` returns the correct platform path in all environments automatically.

**No object model**: `os.path` is a collection of standalone functions. You cannot call `os.path.read_text()` — you need `open(os.path.join(dir, name), 'r').read()`, a four-function chain to do what `(dir / name).read_text()` does in one call.

**Silently accepts wrong types**: `os.path.join` accepts strings, bytes, and path-like objects inconsistently across platforms. `pathlib.Path` is typed (`Path` subclass of `os.PathLike[str]`) and mypy will flag type mismatches at analysis time.

The [pathlib documentation](../../research/python-scripting-best-practices/01-sources/web/S007-pathlib.md) covers the full API. The key daily methods:

```python
from pathlib import Path

# Construction
p = Path("/data/input.txt")
p = Path.cwd() / "reports" / "summary.txt"   # / operator for joining

# Query
p.exists()       # True/False
p.is_file()      # True/False
p.is_dir()       # True/False

# Components
p.name           # "summary.txt"
p.stem           # "summary"
p.suffix         # ".txt"
p.parent         # Path("/data/reports")

# Read/write (no open() needed for simple cases)
text = p.read_text(encoding="utf-8")
p.write_text("content", encoding="utf-8")
data = p.read_bytes()
p.write_bytes(b"binary data")

# Directory operations
p.mkdir(parents=True, exist_ok=True)   # like mkdir -p
list(p.glob("*.csv"))                   # no os.listdir needed
list(p.rglob("*.py"))                   # recursive glob
```

The one thing `pathlib` does *not* replace: `shutil` for copy and move operations. `Path.copy()` and `Path.move()` were added in Python 3.14 but are not yet available in 3.10–3.13. Use `shutil.copy2()` and `shutil.move()` for cross-device file operations in earlier versions.

## Why context managers are mandatory for all resources

The `with` statement guarantees `__exit__` runs even when exceptions occur. Without it:

```python
# ❌ Resource leak: if process() raises, f.close() never runs
f = open("data.txt")
process(f)
f.close()   # may not execute
```

With `with`:

```python
# ✅ __exit__ is guaranteed to run even if process() raises
with open("data.txt") as f:
    process(f)
# f is closed here — always
```

This guarantee applies to every resource that must be released: file handles, network connections, database connections, thread locks, asyncio locks, and temporary directories. The [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) states this explicitly: context managers are required for all resources. PEP 8 reinforces it: "Use with statements when dealing with files."

## Temporary files and the mktemp() race condition

The [tempfile documentation](../../research/python-scripting-best-practices/01-sources/web/S020-tempfile.md) explicitly marks `tempfile.mktemp()` as deprecated due to a security race condition: between generating the name and creating the file, another process could create a file at that path. This is a TOCTOU (time-of-check-to-time-of-use) vulnerability.

The correct replacements are all context managers:

```python
import tempfile
from pathlib import Path


def process_with_temp_file(data: bytes) -> str:
    """Process data via a temporary file with guaranteed cleanup.

    Args:
        data: Binary data to process.

    Returns:
        Result string from processing.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir) / "work.bin"
        tmp_path.write_bytes(data)
        # Process tmp_path here — it exists for the duration of the with block
        result = tmp_path.stat().st_size
        return f"Processed {result} bytes"
    # tmp_dir and all contents deleted here — even if an exception was raised


def write_report_atomically(report: str, output: Path) -> None:
    """Write a report to output via a temporary file to avoid partial writes.

    Args:
        report: Report content to write.
        output: Final destination path.
    """
    import shutil
    # Write to temp file first, then move atomically
    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".tmp",
        dir=output.parent,   # same filesystem for atomic rename
        delete=False,
        encoding="utf-8",
    ) as tmp:
        tmp.write(report)
        tmp_path = Path(tmp.name)
    shutil.move(str(tmp_path), output)   # atomic on same filesystem
```

The write-to-temp-then-move pattern is important for scripts that write reports or produce output files: if the script crashes mid-write, the final output file is either fully written (old version) or fully new — never a partially-written corrupt file.

## Windows caveat for NamedTemporaryFile

On Windows, `NamedTemporaryFile` with `delete=True` (the default) cannot be re-opened by another process while it is still open — the OS holds an exclusive lock. If you need to pass the temporary file path to a subprocess or re-open it by name, use `delete=False` and manage cleanup manually, or use Python 3.12+'s `delete_on_close=False` parameter. Using `TemporaryDirectory` and placing files inside it avoids this issue entirely.

## Key points

- Use `pathlib.Path` for all filesystem operations — the `/` operator replaces `os.path.join()`, `.read_text()` replaces `open()`, `.glob()` replaces `os.listdir()`
- `with` statements guarantee resource cleanup even when exceptions occur — use them for files, connections, locks, and temporary directories
- `tempfile.TemporaryDirectory()` as a context manager eliminates both the cleanup bug and the `mktemp()` TOCTOU race condition
- On Windows, `NamedTemporaryFile` with `delete=True` cannot be re-opened while open — use `TemporaryDirectory` to avoid this

## Go deeper

- [S007 — pathlib documentation](../../research/python-scripting-best-practices/01-sources/web/S007-pathlib.md) — full method reference including `Path.stat()`, `Path.rename()`, `Path.unlink()`, and the new `Path.copy()` / `Path.move()` (3.14+)
- [S020 — tempfile documentation](../../research/python-scripting-best-practices/01-sources/web/S020-tempfile.md) — `TemporaryFile`, `NamedTemporaryFile`, `SpooledTemporaryFile`, `mkstemp`, `mkdtemp`, and the Windows `delete_on_close` option
- [S001 — PEP 8](../../research/python-scripting-best-practices/01-sources/web/S001-pep8.md) — the `with` statement requirement and the complete Python style rules that pathlib helps enforce (no string path manipulation)

---

*[← L06: The Type System](./L06-type-system.md)* · *[L08: Configuration and Secrets →](./L08-configuration-secrets.md)*

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
