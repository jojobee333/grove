# pyproject.toml: One File to Configure Them All

**Module**: M01 · The Python Quality Toolchain  
**Type**: core  
**Estimated time**: 15 minutes  
**Claim**: C2 from Strata synthesis

---

## The core idea

`pyproject.toml` is the single configuration file for a Python script project — for both dev tooling and, since Python 3.11, for the runtime configuration of the script itself. It holds `[tool.ruff]`, `[tool.mypy]`, and `[tool.pytest.ini_options]` for the quality stack, and via `tomllib` (stdlib since 3.11), it can serve as the runtime config source too.

Four independent tools each document `pyproject.toml` as their canonical configuration home: [pytest](../../research/python-scripting-best-practices/01-sources/web/S006-pytest-practices.md), [mypy](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md), [ruff](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md), and [tomllib](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md). The convergence is not coincidental — it reflects a deliberate Python ecosystem decision made through PEP 517/518 (2016–2018) to end the proliferation of incompatible tool-specific config formats.

Before `pyproject.toml`, a typical Python project might carry `setup.py`, `setup.cfg`, `mypy.ini`, `.flake8`, `.isort.cfg`, and `pytest.ini` — six configuration files with no enforced consistency between them. A change to line length in `.flake8` was invisible to black and mypy unless manually replicated. `pyproject.toml` makes that class of inconsistency structurally impossible.

## Why this matters when teaching

The most common objection is "we already have a `setup.cfg` / `tox.ini` / `.flake8` / `mypy.ini`." The reply: that is four files, any of which can drift out of sync. `pyproject.toml` eliminates the question "which config applies here?" — the answer is always the same file.

The second teaching point is the dual role. `tomllib` (read-only, stdlib since 3.11) means the script can read its own *application* configuration from a TOML file at runtime — the same format and the same file used by the dev tools. Once developers are fluent in TOML for tool config, they use it naturally for application config too. This eliminates the "what format should I use for config?" decision for most new projects.

The third teaching point is TOML's type safety. `configparser` stores everything as strings; you must call `.getint()`, `.getboolean()` explicitly. TOML natively represents integers, floats, booleans, dates, and arrays — [the type conversion table in tomllib](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md) maps TOML types directly to Python types with no manual conversion required.

## Dev tool configuration example

The complete starting configuration for a new project:

```toml
# pyproject.toml
[tool.ruff]
line-length = 88
target-version = "py310"

[tool.ruff.lint]
select = ["E", "W", "F", "B", "I", "UP", "N", "D", "S"]
fixable = ["ALL"]

[tool.ruff.lint.pydocstyle]
convention = "google"

[tool.mypy]
python_version = "3.10"
strict = true

[[tool.mypy.overrides]]
module = ["requests.*", "boto3.*"]  # third-party stubs — relax when missing
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = ["--import-mode=importlib", "--strict-markers", "-q"]
```

This file is the complete configuration for the three-tool quality stack. No other configuration files are needed.

## Runtime config with tomllib

The same project can use `pyproject.toml` as the runtime config source. The `[tool.myscript]` section namespace is the convention:

```python
import tomllib
from pathlib import Path


def load_config(project_root: Path | None = None) -> dict[str, object]:
    """Load runtime config from pyproject.toml or a standalone config.toml.

    Args:
        project_root: Directory containing pyproject.toml. Defaults to cwd.

    Returns:
        A dict of configuration values under [tool.myscript].
    """
    root = project_root or Path.cwd()
    config_path = root / "pyproject.toml"

    if not config_path.exists():
        return {}  # graceful fallback to defaults in calling code

    with config_path.open("rb") as f:   # tomllib REQUIRES binary mode "rb"
        data = tomllib.load(f)

    # Navigate: pyproject.toml → tool → myscript
    return data.get("tool", {}).get("myscript", {})
```

Your `pyproject.toml` then carries:

```toml
[tool.myscript]
timeout_seconds = 30
workers = 4
log_level = "INFO"
allowed_paths = ["/data", "/tmp"]  # TOML array → Python list[str] natively
```

TOML integers, booleans, and arrays come back as native Python types — no `.getint()` calls needed. The timeout is already an `int`, not the string `"30"`.

## Validating TOML config against a schema

Because `tomllib.load()` returns `dict[str, object]`, mypy cannot statically verify the shape of the loaded config. The pattern for production-quality config loading is to define a `TypedDict` for the expected shape and validate at runtime:

```python
import tomllib
from pathlib import Path
from typing import TypedDict


class ScriptConfig(TypedDict):
    """Expected structure of [tool.myscript] in pyproject.toml."""
    timeout_seconds: int
    workers: int
    log_level: str


def load_and_validate_config(path: Path) -> ScriptConfig:
    """Load and validate the [tool.myscript] section from a TOML file.

    Args:
        path: Path to the TOML configuration file.

    Returns:
        Validated ScriptConfig typed dict.

    Raises:
        KeyError: If required keys are missing.
        TypeError: If a value has the wrong type.
    """
    with path.open("rb") as f:
        data = tomllib.load(f)

    section = data.get("tool", {}).get("myscript", {})

    # Explicit runtime validation — TypedDict is not enforced at runtime
    required_int_keys = ["timeout_seconds", "workers"]
    for key in required_int_keys:
        if key not in section:
            raise KeyError(f"Missing required config key: tool.myscript.{key}")
        if not isinstance(section[key], int):
            raise TypeError(f"Config key {key!r} must be int, got {type(section[key]).__name__}")

    return section  # type: ignore[return-value]  # runtime check above validates shape
```

This pattern is worth teaching: TOML gives you correct types from the file, but you still need runtime validation to give users clear error messages when their config is malformed. The `TypedDict` documents the expected shape for static analysis; the explicit checks produce meaningful errors instead of cryptic `KeyError` tracebacks.

## Limitations

The critical caveat to teach clearly: **tomllib is read-only**. It parses TOML but provides no `dump()` function. If a script needs to *write* config back to disk — storing user preferences, updating a generated file — you need a third-party library. `tomli_w` is write-only and minimal. `tomlkit` preserves formatting and comments (useful for tools that edit `pyproject.toml` in place, like `uv add`).

For Python versions older than 3.11, `tomllib` does not exist in the stdlib. Use the `tomli` backport (`pip install tomli`) with a conditional import:

```python
try:
    import tomllib        # Python 3.11+
except ImportError:
    import tomli as tomllib  # backport for 3.8–3.10  # type: ignore[no-redef]
```

For *end-user-facing* config that non-technical users edit by hand — think application settings for a desktop tool — INI format (`configparser`) is still a valid choice. TOML's integer arrays and datetime types can confuse non-developers. The guidance: TOML for developer-facing config, INI for end-user-facing config.

## Key points

- `pyproject.toml` is the single config artifact — every dev tool reads from `[tool.<toolname>]`; nothing else needed
- `tomllib` (Python 3.11+) makes TOML a first-class runtime config format with native Python type conversion; use `tomli` as the backport for 3.8–3.10
- tomllib is read-only by design — if write-back is needed, use `tomli_w` (write-only) or `tomlkit` (style-preserving read+write)
- For end-user-editable config where TOML might intimidate, `configparser` (INI format) remains valid

## Go deeper

- [S009 — tomllib docs](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md) — full TOML-to-Python type conversion table, binary mode requirement, and `pyproject.toml` section patterns
- [S006 — pytest integration practices](../../research/python-scripting-best-practices/01-sources/web/S006-pytest-practices.md) — the full `[tool.pytest.ini_options]` reference including `--import-mode=importlib`
- [S008 — configparser docs](../../research/python-scripting-best-practices/01-sources/web/S008-configparser.md) — when INI is appropriate, typed getters, and the DEFAULT section pattern

---

*[← L01: Automating Quality](./L01-quality-toolchain.md)* · *[L03: The Universal Script Skeleton →](./L03-script-skeleton.md)*
