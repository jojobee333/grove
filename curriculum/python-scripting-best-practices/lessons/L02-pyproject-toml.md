# pyproject.toml: One File to Configure Them All

**Module**: M01 · The Python Quality Toolchain  
**Type**: core  
**Estimated time**: 12 minutes  
**Claim**: C2 from Strata synthesis

---

## The core idea

`pyproject.toml` is the single configuration file for a Python script project. It holds dev tool configuration (`[tool.ruff]`, `[tool.mypy]`, `[tool.pytest.ini_options]`) and, via the `tomllib` stdlib module (Python 3.11+), can also serve as the runtime configuration source for the script itself.

Four independent tools — pytest ([S006](../../research/python-scripting-best-practices/01-sources/web/S006-pytest-practices.md)), mypy ([S011](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md)), ruff ([S017](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md)), and tomllib ([S009](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md)) — each independently document `pyproject.toml` as their configuration home. This convergence is now the de facto standard for any Python project created since 2022.

## Why it matters when teaching

The most common objection is "we already have a `setup.cfg` / `tox.ini` / `.flake8` / `mypy.ini`". The answer: that is four files, any of which can be inconsistent with the others. `pyproject.toml` eliminates the question "which config applies here?" by making the answer always the same file.

The second teaching point is the dual role. `tomllib` (read-only, stdlib since 3.11) means the script can read its own application configuration from a TOML file at runtime — the same format used by the dev tools. Developers who work in one format become fluent in both uses faster.

## A concrete example

**Dev tool config** (tool chain is configured here, not in separate files):

```toml
# pyproject.toml
[tool.ruff]
line-length = 88

[tool.mypy]
strict = true

[tool.pytest.ini_options]
testpaths = ["tests"]
```

**Runtime app config** (the script reads its own settings from TOML at startup):

```python
import tomllib
from pathlib import Path

def load_config(config_path: Path) -> dict[str, object]:
    with config_path.open("rb") as f:
        return tomllib.load(f)
```

The script can read from `pyproject.toml` directly using a `[tool.myscript]` section, or from a separate `config.toml` supplied by the operator. Either way, the format is identical: typed (strings, ints, booleans, arrays natively), readable, and non-executable (unlike Python config files).

**The one caveat to teach**: tomllib is read-only. If the script needs to write config back to disk, use `tomli_w` (third-party) or a separate format for write-back.

## Key points

- `pyproject.toml` is the primary config artifact — configure every dev tool here, not in separate files
- `tomllib` (Python 3.11+) makes TOML a first-class runtime config format; use `tomli` as a backport for 3.10 targets
- For end-user-facing config that non-technical users edit by hand, INI (configparser) is still valid — TOML is for developer-facing configuration

## Go deeper

- [S009 — tomllib docs](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md) — module API and TOML syntax reference
- [S008 — configparser docs](../../research/python-scripting-best-practices/01-sources/web/S008-configparser.md) — when INI is still appropriate

---

*[← L01: Automating Quality](./L01-quality-toolchain.md)* · *[L03: The Universal Script Skeleton →](./L03-script-skeleton.md)*
