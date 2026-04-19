# pytest as the Daily Driver

**Module**: M03 · Choose the Right Python Testing Surface
**Type**: core
**Estimated time**: 12 minutes
**Claim**: C3 — pytest is the most ergonomic default for modern Python TDD, while unittest remains the baseline framework and an important migration path

---

## The core idea

The choice of testing framework is not neutral. Friction in expressing the next test directly affects whether you actually write it. For modern Python TDD, the research supports a pragmatic default: `pytest` is the framework that reduces friction most consistently across the common TDD workflow — plain test functions, fixture injection, parametrization, and clear failure output for fast feedback [S003](../../research/test-driven-development-in-python/01-sources/web/S003-pytest-good-practices.md).

This is not a brand preference. It is a consequence of how pytest packages the mechanics that matter most during tight red-green-refactor cycles. A test can begin as a plain function requiring no class hierarchy. Fixtures are injected by name without requiring `self.` prefixes or explicit setup assignments. Parametrization broadens behavioral coverage with a single decorator. Assertion failures are described in readable diffs rather than generic `AssertionError` messages.

The practical value of these features is that they lower the cost of writing the *next* test. TDD lives or dies at the moment when a developer decides whether to write a new test for an edge case or to skip it. The more expensive that decision is — syntactically, structurally, or cognitively — the more often developers will skip tests that would have driven better design.

## Why it matters

The research explicitly links tool ergonomics to TDD success. Developers who use `pytest` can often express a new behavioral test in fewer lines, with less structural ceremony, and with clearer failure output than the equivalent `unittest` test. That difference adds up across a day of TDD work [S003](../../research/test-driven-development-in-python/01-sources/web/S003-pytest-good-practices.md).

Critically, `pytest` also runs existing `unittest.TestCase` suites without code changes. This means the choice of `pytest` as a runner does not require abandoning existing investments. Teams can adopt `pytest` for new work and improve existing suites incrementally, which is the migration path the next lesson covers.

## A concrete example

**Example 1 — Simple function test with no ceremony**

One of `pytest`'s most useful properties is that a test is just a function. There is no required class, no import of an assertion library, and no ritual setup:

```python
# test_formatter.py

def test_positive_temperature_formats_with_degree_symbol():
    assert format_temperature(25) == "25°C"

def test_zero_temperature_formats_correctly():
    assert format_temperature(0) == "0°C"

def test_negative_temperature_formats_correctly():
    assert format_temperature(-10) == "-10°C"
```

Each function is independently runnable: `pytest test_formatter.py::test_negative_temperature_formats_correctly`. When one fails, the output shows the exact expression that failed, the left-hand value, and the right-hand value without additional configuration.

**Example 2 — Parametrize to cover a behavioral family**

When a behavior applies to a family of cases, `pytest.mark.parametrize` expresses the whole family without duplicating the test body [S003](../../research/test-driven-development-in-python/01-sources/web/S003-pytest-good-practices.md):

```python
import pytest

@pytest.mark.parametrize(
    ("value", "unit", "expected"),
    [
        (25,  "C", "25°C"),
        (77,  "F", "77°F"),
        (-10, "C", "-10°C"),
        (0,   "C", "0°C"),
    ],
)
def test_temperature_formatting(value, unit, expected):
    assert format_temperature(value, unit=unit) == expected
```

This expresses four cases with one test body. In TDD terms, it is often the right move when a third or fourth test adds a case that is structurally identical to earlier cases but with different inputs. The alternative — four separate functions — is not wrong, but parametrization makes the family relationship explicit and keeps the test file readable as the case list grows.

## Project layout and configuration

The `pytest` maintainers recommend an explicit project layout that avoids discovery surprises. For a typical Python TDD project [S003](../../research/test-driven-development-in-python/01-sources/web/S003-pytest-good-practices.md):

```
project/
├── pyproject.toml
├── src/
│   └── mypackage/
│       ├── __init__.py
│       └── formatter.py
└── tests/
    ├── __init__.py
    └── test_formatter.py
```

The `pyproject.toml` should configure `pytest` explicitly:

```toml
[tool.pytest.ini_options]
addopts = "--import-mode=importlib"
testpaths = ["tests"]
```

`importlib` import mode avoids a class of confusing failures where `sys.path` manipulation or missing `__init__.py` files cause test discovery to import the wrong version of a module. Making this explicit in configuration reduces the chance of "works on my machine, fails in CI" behavior.

The `src/` layout separates installed source from test code. This prevents tests from accidentally importing the uninstalled package from the project root instead of the installed one, which can cause tests to pass locally but fail after packaging [S003](../../research/test-driven-development-in-python/01-sources/web/S003-pytest-good-practices.md).

## Running unittest suites through pytest

One of `pytest`'s practical strengths for teams with existing code is that it can run `unittest.TestCase` test files without modification. The test discovery finds `unittest` tests and executes them, providing `pytest`'s better error output and test selection capabilities.

This means adopting `pytest` as the runner is typically a zero-cost first step. The team gains selection, filtering, and output improvements before rewriting a single test. The structural migration — from `TestCase` to plain functions and fixtures — can happen incrementally as sections of the suite are actively maintained [S009](../../research/test-driven-development-in-python/01-sources/web/S009-pytest-unittest.md).

## Limitations

Advanced `pytest` features — fixture argument injection into test functions, `@pytest.mark.parametrize`, and fixture dependency graphs — do not work directly inside `unittest.TestCase` methods. `usefixtures` and `autouse` provide a partial bridge, but the architectural difference between `TestCase`'s setup/teardown model and `pytest`'s injection model means some migration steps still require structural changes. This is not a criticism of either framework; it is a consequence of the design choices each made. The caveat from the research is explicit: "Advanced pytest features such as fixture argument injection and parametrization do not map directly into unittest.TestCase methods" [C3].

## Key points

- `pytest` is the practical default for modern Python TDD because it reduces friction at the test-writing step where TDD success is most fragile.
- Plain test functions, fixture injection, and parametrization are the features that make `pytest` especially well-matched to red-green-refactor cycles.
- `pytest` runs existing `unittest` suites transparently, making framework adoption a low-risk incremental step.
- Project layout and configuration (`importlib` mode, explicit `testpaths`, `src/` layout) reduce discovery surprises in CI and team environments.
- Fixture injection and parametrization do not work directly inside `unittest.TestCase` methods — full migration to pytest-native style requires structural changes.

## Go deeper

- [S003](../../research/test-driven-development-in-python/01-sources/web/S003-pytest-good-practices.md) — pytest maintainers' recommended project structure, import mode, configuration, and ergonomics for modern Python testing
- [S009](../../research/test-driven-development-in-python/01-sources/web/S009-pytest-unittest.md) — how pytest runs unittest suites and what capabilities are available before and after structural migration
- [S001](../../research/test-driven-development-in-python/01-sources/web/S001-unittest.md) — the standard-library baseline that pytest can execute and that the next lesson covers in depth

---

*← [Previous lesson](./L04-async-loops-and-transaction-rollbacks-in-real-test-suites.md)* · *[Next lesson](./L06-unittest-fluency-and-incremental-migration.md) →*