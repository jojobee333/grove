# Automating Quality: ruff, mypy, and pytest

**Module**: M01 · The Python Quality Toolchain  
**Type**: core  
**Estimated time**: 15 minutes  
**Claims**: C1, C11 from Strata synthesis

---

## The core idea

The quality foundation for any production Python script is three tools working together: **ruff** (style, lint, and formatting), **mypy** (static type checking), and **pytest** (behaviour verification). A script is not production-ready until all three pass. This is not a preference or a team convention — it is the convergence point of four independent authoritative sources including [PEP 8](../../research/python-scripting-best-practices/01-sources/web/S001-pep8.md), [PEP 257](../../research/python-scripting-best-practices/01-sources/web/S002-pep257.md), the [mypy documentation](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md), and [ruff's own rule reference](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md).

Each tool occupies a distinct and non-overlapping failure domain. ruff enforces style correctness and catches a class of common bugs (unreachable code, unused imports, mutable default arguments) before the code runs. mypy performs static type analysis — it finds function calls that pass a `str` where an `int` is expected, and it does this at development time rather than in a production stack trace. pytest verifies behavioural correctness: that the script's logic actually produces the right output on real inputs. No one tool substitutes for the others, and the combination is strictly more powerful than any two of them.

Ruff alone replaced five previously separate tools — flake8, black, isort, pydocstyle, and pyupgrade — running at 10–100× the speed of any individual tool because it is implemented in Rust ([S017](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md)). That speed difference matters when running as a pre-commit hook or in CI: the faster the feedback, the more often a developer runs it.

## Why this matters when teaching

When a developer asks "do I really need all three?", the honest answer is a three-part response: each tool prevents a category of failure the others cannot catch.

**Without ruff**: style inconsistencies accumulate until code review becomes a style argument instead of a logic review. Import ordering ambiguity causes merge conflicts. The `Optional[str]` versus `str | None` debate consumes meeting time instead of being auto-resolved in milliseconds.

**Without mypy**: a function that accepts `path: str` is called with a `pathlib.Path` object and fails only when the specific branch is reached on the specific input. In a script that runs weekly, that bug might survive for months. Mypy's `strict` mode — which [the mypy documentation recommends for all new projects](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md) — catches this before the first test runs.

**Without pytest**: the script "works on my machine" with the test file someone created manually. When the input format changes, the script silently produces wrong output. Tests are the only mechanism that proves a script does what the developer claims it does, not just that it runs without crashing.

The meta-point to communicate to learners: **enforcement by toolchain is categorically more reliable than enforcement by discipline**. A rule in a config file never gets tired, never feels awkward raising the issue with a senior engineer, and never makes exceptions for the deadline.

## Full pyproject.toml configuration for all three

This is the production-ready starting point. Add it to any new project and you have all three tools configured and running:

```toml
[tool.ruff]
line-length = 88
target-version = "py310"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # Pyflakes
    "B",   # flake8-bugbear (common bug patterns)
    "I",   # isort
    "UP",  # pyupgrade (modernize old syntax automatically)
    "N",   # pep8-naming
    "D",   # pydocstyle (docstring checks)
    "S",   # bandit security checks
]
fixable = ["ALL"]

[tool.ruff.lint.pydocstyle]
convention = "google"

[tool.mypy]
python_version = "3.10"
strict = true
# strict enables: disallow_untyped_defs, disallow_any_generics,
# warn_return_any, warn_unused_ignores, strict_equality, and 8 more flags.

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = ["--import-mode=importlib", "--strict-markers", "-q"]
```

One file, three tools, zero ambiguity. Run them together:

```bash
ruff check . --fix   # lint + auto-fix safe issues
ruff format .        # format (Black-compatible)
mypy .               # type-check the whole project
pytest               # run all tests
```

When a developer adds a function missing a return type annotation, `mypy --strict` fails with a clear error. When they write `Optional[str]` in Python 3.10+, ruff's `UP007` rule auto-upgrades it to `str | None`. When they break a behaviour, pytest catches it with a clear failure message. The entire feedback loop runs in under two seconds on a typical script project.

## Incremental adoption for existing codebases

The [mypy documentation](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md) explicitly supports gradual adoption: you do not need to turn on `strict = true` on an existing codebase with thousands of unannotated functions. Instead, phase it in:

```toml
[tool.mypy]
python_version = "3.10"
# Phase 1: catch the most common issues without requiring annotations
check_untyped_defs = true
warn_return_any = true
warn_unused_ignores = true
no_implicit_optional = true

# Phase 2 (add later): require annotations on new code
disallow_untyped_defs = true
disallow_incomplete_defs = true
```

Add `strict = true` once Phase 2 passes cleanly. This approach was used by major open-source projects like Pandas to migrate millions of lines of code to typed Python without a big-bang rewrite.

## Limitations

The three-tool stack assumes a project context — a `pyproject.toml` and a `tests/` directory. For single-file throwaway scripts, running `ruff check script.py` and `mypy script.py` from the command line is a practical minimum. The [pytest documentation](../../research/python-scripting-best-practices/01-sources/web/S006-pytest-practices.md) recommends `--import-mode=importlib` for new projects to avoid `sys.path` manipulation; on older projects, the default mode is safe.

The other limitation: ruff's auto-fix for some "unsafe" rules (marked `--fix-only`) may change code semantics in rare edge cases. Review auto-fix output before committing, especially for rules in the `B` (bugbear) and `S` (security) categories where the correct fix requires human judgment.

## Key points

- ruff replaces five tools (flake8, black, isort, pydocstyle, pyupgrade) at 10–100× speed — configure once in `pyproject.toml`, run everywhere
- mypy `strict = true` is the right setting for new projects; use incremental strictness flags for existing codebases
- pytest's `--import-mode=importlib` prevents `sys.path` side effects and is the recommended default for new projects
- All three belong in `pyproject.toml` — one file, one place to look, no inconsistency between tools

## Go deeper

- [S017 — Ruff docs](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md) — the full rule reference, unsafe vs. safe auto-fixes, and monorepo configuration with cascading config
- [S011 — mypy docs](../../research/python-scripting-best-practices/01-sources/web/S011-mypy.md) — the exact flags `--strict` enables, per-module overrides for third-party stubs, and the incremental adoption path
- [S006 — pytest integration practices](../../research/python-scripting-best-practices/01-sources/web/S006-pytest-practices.md) — `--import-mode=importlib`, fixture patterns, parametrize, and exception testing

---

*[Next lesson: pyproject.toml — One File to Configure Them All →](./L02-pyproject-toml.md)*
