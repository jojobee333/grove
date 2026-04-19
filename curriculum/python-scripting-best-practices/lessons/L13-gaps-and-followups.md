# Gaps and Follow-Ups: What This Course Does Not Cover

**Module**: M07 · Teaching Complications and Honest Limits  
**Type**: gap  
**Estimated time**: 10 minutes  
**Source**: gaps.md from Strata research (G010–G013)

---

## The core idea

This course is built on 22 sources spanning the most commonly cited Python scripting best practices. Four important topics fell outside that scope — not because they are unimportant, but because the research base was insufficient to teach them to the same evidentiary standard as the rest of the course. Naming the gaps is part of honest curriculum design: an intermediate developer will notice these gaps regardless, and presenting the course as complete when it is not would damage trust.

Each gap below includes: why it is out of scope, what specific assumption the course makes in its absence, and the best available next resource.

---

## G010 — Packaging and Distribution

**What this course covers**: scripts — single-file or small-package programs designed to be run directly. What it does not cover: how to package those scripts as installable Python packages published to PyPI, how to define `[project.scripts]` entry points in `pyproject.toml`, or how to build wheel distributions.

**What the course assumes**: learners run scripts with `python script.py` or `python -m module`. This is the correct assumption for internal automation and one-off tooling. It breaks down when you want to distribute the script to other users or teams as an installable command-line tool.

**The gap in practice**: a learner who finishes this course and tries to turn their script into `pip install myscript` will find that none of the course's content addresses this. The `[project]` table in `pyproject.toml`, `python-build`, and the distinction between `[project.scripts]` and `[project.entry-points]` are entirely separate terrain.

**Where to go next**: [Python Packaging User Guide](https://packaging.python.org/) — the authoritative reference from the Python Packaging Authority. Start with the "packaging Python projects" tutorial.

---

## G011 — Dependency Management

**What this course covers**: `pyproject.toml` as the configuration hub for dev tools. What it does not cover: managing runtime dependencies — declaring them, pinning their versions, creating reproducible environments, or the tools used to do so (uv, Poetry, pip-compile, conda).

**What the course assumes**: learners have Python and the tools installed, and the command `pip install ruff mypy pytest` just works. This is valid for a course focused on scripting practices, but leaves a significant operational gap: reproducible environments, lock files, and the difference between "it works on my machine" and "it works in CI and production."

**The gap in practice**: a learner who wants to share a project that requires `httpx` and `tomli` (for Python 3.10 backport) will encounter the dependency management question immediately. None of the course's content addresses it.

**Where to go next**: [uv documentation](https://docs.astral.sh/uv/) — from the same team that built ruff, `uv` is the fastest modern Python dependency manager. It handles virtual environments, lock files, and script execution. Recommended for new projects. For existing `pip`-based workflows: [pip-tools](https://pip-tools.readthedocs.io/) for lock-file generation.

---

## G012 — Pre-commit Hooks

**What this course covers**: ruff and mypy as tools you run manually or in CI. What it does not cover: `pre-commit` — the framework that runs these checks automatically before each `git commit`, preventing lint failures and type errors from reaching the repository at all.

**What the course assumes**: developers run `ruff check .` and `mypy .` by discipline. In practice, this assumption breaks down under deadline pressure, onboarding new contributors, or any workflow where CI is the only gate.

**The gap in practice**: the pre-commit hook is the difference between "our CI fails sometimes due to lint issues" and "lint issues never enter the repo." For a team teaching these practices, pre-commit is the enforcement mechanism that makes the toolchain actually work.

**Where to go next**: [pre-commit documentation](https://pre-commit.com/) — setup takes under 10 minutes. The recommended starting config for this course's toolchain:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.9.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests, tomli]
```

Install with `pre-commit install` in any repository that has a `.pre-commit-config.yaml`. From that point, every `git commit` runs ruff and mypy automatically before the commit is recorded.

---

## G013 — Dataclasses and attrs

**What this course covers**: `TypedDict` for typed dictionary structures. What it does not cover: `dataclasses` (stdlib since 3.7) or the `attrs` library for defining typed data containers as classes — with constructors, equality, ordering, `__repr__`, and runtime field access generated automatically.

**What the course assumes**: when you need a typed container with known fields, use `TypedDict`. This is correct for data that is fundamentally a dictionary (e.g., config dicts, JSON records). It is insufficient when you need a class with methods, validators, or initialization logic.

**The gap in practice**: the first time a learner wants a typed container that also needs a `validate()` method or a computed property, `TypedDict` breaks down. `dataclasses` is the stdlib answer; `attrs` is the third-party answer with more features. Neither is covered here.

**Where to go next**: [dataclasses documentation](https://docs.python.org/3/library/dataclasses.html) — start here. The `@dataclass` decorator generates `__init__`, `__repr__`, and `__eq__` from annotated class fields. For larger projects requiring validators, converters, and slots: [attrs documentation](https://www.attrs.org/).

---

## Why naming gaps matters

Every curriculum is a set of decisions about what to include and what to defer. The wrong response to a gap is to fill it with shallowly-researched content — that produces lessons that mislead rather than inform. The right response is to name the gap, state the assumption the course makes in its absence, and point to the best available next resource.

An intermediate-level learner will notice these gaps regardless. Acknowledging them explicitly does two things: it builds trust ("the instructor knows the limits of this material") and it provides a roadmap ("here is what to study next"). Both are more valuable than pretending the course is complete when it is not.

The four gaps above are also the natural next research questions for anyone who completes this course and wants to build production-quality Python tooling at scale.

## Key points

- Packaging/distribution, dependency management, pre-commit hooks, and dataclasses are the four topics this course intentionally defers
- Each gap has a specific root cause (insufficient research base) and a specific "go next" resource — learners are not left without direction
- Naming curriculum limits is a credibility signal for intermediate learners who will notice the gaps regardless
- The correct response to a research gap is to name it honestly and point outward, not to fill it with shallow content

---

*[← L12: The Type Annotation Debate](./L12-type-annotation-debate.md)*

---

## The core idea

This course is built from 22 sources spanning the most commonly cited Python scripting best practices. Four important topics fell outside that scope — not because they are unimportant, but because the research base was insufficient to teach them to the same standard as the other 13 lessons. Naming the gaps is part of honest curriculum design.

## The four gaps

### G010 — Packaging and Distribution

This course covers scripts: single-file programs designed to be run directly. It does not cover how to package those scripts as installable Python packages (e.g., publishing to PyPI, building wheels, defining `[project.scripts]` entry points in `pyproject.toml`).

**Where to go next**: [Python Packaging User Guide](https://packaging.python.org/) — the authoritative reference from the Python Packaging Authority.

---

### G011 — Dependency Management

This course uses `pyproject.toml` for tool configuration, but does not address how to manage runtime dependencies: virtual environments, pinning, `uv`, Poetry, or pip-compile workflows.

**Where to go next**: [uv documentation](https://docs.astral.sh/uv/) — the fastest modern Python dependency manager, from the same team that built ruff. Also: [pip-tools](https://pip-tools.readthedocs.io/) for lock-file generation without virtual environment management.

---

### G012 — Pre-commit Hooks

This course teaches `ruff` and `mypy` as tools you run manually or in CI. It does not cover `pre-commit` — the framework that runs these checks automatically before each `git commit`, preventing lint failures from reaching CI.

**Where to go next**: [pre-commit documentation](https://pre-commit.com/) — setup takes under 10 minutes. A recommended config for this course's toolchain:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.0
    hooks:
      - id: ruff
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.9.0
    hooks:
      - id: mypy
```

---

### G013 — Dataclasses and attrs

The course uses `TypedDict` for typed dictionary structures, but does not cover `dataclasses` (stdlib since 3.7) or the `attrs` library for defining typed data containers as classes. These are significant patterns in production Python scripting.

**Where to go next**: [dataclasses documentation](https://docs.python.org/3/library/dataclasses.html) — start here. [attrs documentation](https://www.attrs.org/) for larger projects needing validators and converters.

---

## Why this matters when teaching

Acknowledging gaps signals intellectual honesty and gives learners a roadmap beyond this course. It prevents the anti-pattern of presenting a partial toolkit as a complete one.

Every curriculum is a set of choices about what to include and what to defer. The right response to a gap is not to fill it with shallowly-researched content — it is to name it, state the confidence level, and point to the best available next resource.

## Key points

- Packaging, dependency management, pre-commit hooks, and dataclasses are the four topics this course intentionally defers
- Each gap has a specific "go next" resource — learners are not left without direction
- Teaching honest curriculum limits builds credibility with intermediate-level learners who will notice the gaps regardless

---

*[← L12: The Type Annotation Debate](./L12-type-annotation-debate.md)*
