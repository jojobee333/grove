# Gaps and Follow-Ups: What This Course Does Not Cover

**Module**: M07 · Teaching Complications and Honest Limits  
**Type**: gap  
**Estimated time**: 8 minutes  
**Source**: gaps.md from Strata research (G010–G013)

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
