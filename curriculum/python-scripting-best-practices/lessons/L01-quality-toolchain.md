# Automating Quality: ruff, mypy, and pytest

**Module**: M01 · The Python Quality Toolchain  
**Type**: core  
**Estimated time**: 12 minutes  
**Claims**: C1, C11 from Strata synthesis

---

## The core idea

The quality foundation for any production Python script is three tools: **ruff** (style and lint), **mypy** (type enforcement), and **pytest** (behaviour verification). A script is not production-ready until all three pass. This is not a preference — it is the convergence point of 22 official sources including PEP 8, the Google Style Guide, and the mypy documentation.

Each tool fills a gap the others cannot. ruff enforces formatting and lint rules that make code readable and catches obvious bugs ([S017](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md)). mypy catches type mismatches that only reveal themselves at runtime under edge cases — things ruff cannot see ([S011](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md)). pytest verifies that the script actually does what it claims ([S006](../../research/python-scripting-best-practices/01-sources/web/S006-pytest-practices.md)). None of them substitute for the others.

## Why it matters when teaching

When a developer asks "do I really need all three?", the answer lies in the failure modes each one prevents. Without ruff, style inconsistencies accumulate until code review becomes a style argument instead of a logic review. Without mypy, functions accept wrong types silently until a production edge case surfaces the bug. Without pytest, the script "works on my machine" until it doesn't.

The meta-point to communicate: enforcement by toolchain is more reliable than enforcement by discipline. A rule in a config file never gets tired, never rushes a review, and never makes exceptions for senior developers.

## A concrete example

Here is the minimal `pyproject.toml` block that activates all three:

```toml
[tool.ruff]
line-length = 88
select = ["E", "F", "W", "I", "D", "UP", "B"]
fix = true

[tool.ruff.lint.pydocstyle]
convention = "google"

[tool.mypy]
strict = true
python_version = "3.10"

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--strict-markers -q"
```

One file, three tools configured. When a developer adds a function missing a return type annotation, `mypy --strict` fails. When they use `Optional[str]` instead of `str | None`, ruff's `UP007` rule auto-fixes it. When they break a behaviour, pytest catches it.

## Key points

- ruff replaces five tools (flake8, black, isort, pydocstyle, pyupgrade) — configure it once, not five times
- mypy `strict = true` is the correct setting for new projects; use incremental mode only for existing unannotated codebases
- All three belong in `pyproject.toml` — one file, one place to look

## Go deeper

- [S017 — Ruff docs](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md) — full rule reference and `--fix` semantics
- [S011 — mypy docs](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md) — `--strict` flag breakdown and incremental adoption path

---

*[Next lesson: pyproject.toml — One File to Configure Them All →](./L02-pyproject-toml.md)*
