# unittest Fluency and Incremental Migration

**Module**: M03 · Choose the Right Python Testing Surface
**Type**: applied
**Estimated time**: 13 minutes
**Claim**: C3 — pytest is the most ergonomic default for modern Python TDD, while unittest remains the baseline framework and an important migration path

---

## The situation

A practical Python engineer does not always start with a greenfield `pytest` codebase. Many teams inherit `unittest` suites, work in environments where only the standard library is available, or need to understand `unittest` to reason about existing tests they are responsible for maintaining. The research is clear that `pytest` is the preferred daily surface for new TDD work — but it is equally clear that `unittest` fluency is part of real expertise, not just legacy knowledge [S001](../../research/test-driven-development-in-python/01-sources/web/S001-unittest.md).

This lesson is about two things: knowing `unittest` well enough to work with it confidently, and knowing how to migrate incrementally when `pytest` would improve the suite. The two skills are related because a good migration strategy requires understanding what `unittest` provides that you are actually using, and what `pytest` can or cannot replace directly.

## The unittest model

`unittest` organizes tests around `TestCase` classes with explicit assertion methods and per-test lifecycle hooks. The full lifecycle for a single test looks like this:

```python
import unittest

class OrderServiceTests(unittest.TestCase):
    
    def setUp(self):
        # Runs before each test method
        self.service = OrderService()
        self.repo = FakeOrderRepository()
    
    def tearDown(self):
        # Runs after each test method, even if the test failed
        self.repo.clear()
    
    def test_new_order_is_stored(self):
        self.service.place_order(self.repo, customer_id=1, total=100.0)
        self.assertEqual(len(self.repo.orders), 1)
    
    def test_order_total_is_preserved(self):
        self.service.place_order(self.repo, customer_id=1, total=100.0)
        self.assertEqual(self.repo.orders[0].total, 100.0)
```

The assertion methods (`assertEqual`, `assertRaises`, `assertIn`, etc.) are inherited from `TestCase`. Discovery runs via `python -m unittest` or `pytest`, and test methods must be named with the `test_` prefix [S001](../../research/test-driven-development-in-python/01-sources/web/S001-unittest.md).

The standard library also provides `setUpClass`/`tearDownClass` for class-level fixtures (run once per class), `setUpModule`/`tearDownModule` for module-level fixtures (run once per module), and `addCleanup()` for registering teardown callbacks that run even after exceptions in `tearDown`. Understanding these lifecycle tools is necessary for reading and maintaining existing production test suites.

## What you lose and what you keep when migrating to pytest

`pytest` can run `unittest.TestCase` tests without code changes. When it does, you get:

- Better traceback and assertion diffs in failure output
- Targeted test selection: `pytest path/test_orders.py::OrderServiceTests::test_new_order_is_stored`
- The `-k` expression filter to run subsets of tests
- Parallel execution via plugins like `pytest-xdist`

What you do NOT automatically get when running `unittest.TestCase` tests through `pytest`:

- `pytest` fixture injection into test methods (the method signature can't accept fixture arguments the same way)
- `@pytest.mark.parametrize` directly on `TestCase` methods
- `pytest`'s fixture dependency graph

This is the key caveat from the research: "Advanced pytest features such as fixture argument injection and parametrization do not map directly into unittest.TestCase methods" [C3, S009](../../research/test-driven-development-in-python/01-sources/web/S009-pytest-unittest.md). There is a partial bridge: `@pytest.mark.usefixtures("my_fixture")` applied to a `TestCase` class can trigger autouse-style fixtures, but the fixture value is not injected into the method. `autouse=True` fixtures also run for `TestCase` tests, which can be useful for global setup.

## A worked example of incremental migration

Suppose you have an existing `unittest` suite for a tax calculation service.

```python
# tests/test_tax.py (existing)
import unittest

class TaxCalculatorTests(unittest.TestCase):
    
    def test_uk_standard_rate(self):
        calc = TaxCalculator(region="uk")
        self.assertAlmostEqual(calc.rate("standard"), 0.20)
    
    def test_uk_reduced_rate(self):
        calc = TaxCalculator(region="uk")
        self.assertAlmostEqual(calc.rate("reduced"), 0.05)
    
    def test_eu_standard_rate(self):
        calc = TaxCalculator(region="eu")
        self.assertAlmostEqual(calc.rate("standard"), 0.22)
```

**Step 1 — Run through pytest without changes.** You immediately gain better output and test selection. The existing tests still pass. No code changes required.

**Step 2 — Identify migration pressure.** The three test methods have identical structure: create a calculator, call `.rate()`, assert the result. This is a clear candidate for parametrization, which `pytest.mark.parametrize` handles better than repeated `TestCase` methods.

**Step 3 — Migrate under active development pressure.** When this file needs new tests or a bug fix, convert it:

```python
# tests/test_tax.py (migrated)
import pytest

@pytest.mark.parametrize(
    ("region", "kind", "expected"),
    [
        ("uk", "standard", 0.20),
        ("uk", "reduced",  0.05),
        ("eu", "standard", 0.22),
    ],
)
def test_tax_rate(region, kind, expected):
    calc = TaxCalculator(region=region)
    assert calc.rate(kind) == pytest.approx(expected)
```

The migration cut the test count from three methods to one parametrized function. Adding a new region now means adding one row to the parameter list, not writing a new method. This is the payoff from the migration — not just style, but reduced friction for the next TDD step.

**Step 4 — Leave stable code alone.** If another file in the same suite is stable and not being actively changed, there is no reason to migrate it immediately. The goal is not a uniform codebase style — it is reducing friction where you are currently working.

## The async case

`unittest` supports async tests through `IsolatedAsyncioTestCase`, which is the standard-library answer to `pytest-asyncio`. For teams that cannot install third-party packages, this is the correct tool. It manages its own event loop per test and supports `async setUp`/`tearDown` methods. For teams that have `pytest` already and are doing active TDD in async code, `pytest-asyncio` is generally more ergonomic — but `IsolatedAsyncioTestCase` is not wrong, and knowing it exists avoids unnecessary dependency additions [S001](../../research/test-driven-development-in-python/01-sources/web/S001-unittest.md).

## Decision rules for migration

- **Run `pytest` as the runner immediately.** This is zero-risk and improves output quality.
- **Migrate files under active development** when the structure would materially benefit from `pytest`-native patterns (fixtures, parametrize, plain functions).
- **Leave stable files** in `unittest` style until they need changes. Rewriting for style alone creates churn without benefit.
- **Do not assume feature parity.** `usefixtures` and `autouse` provide a bridge, but if you need fixture injection or parametrization inside a `TestCase` method, the structural migration is required.

## Key points

- `unittest` fluency includes lifecycle hooks (`setUp`, `tearDown`, `setUpClass`, `addCleanup`), assertion methods, and the discovery model.
- `pytest` can run `unittest` suites transparently; the team gains better ergonomics before writing a single new test.
- Advanced `pytest` features do not work directly inside `TestCase` methods — migration requires structural change.
- Incremental migration means converting files when they are under active maintenance, not as a batch rewrite.
- Both frameworks are valid; the choice should follow testing friction, not team branding preferences.

## Go deeper

- [S001](../../research/test-driven-development-in-python/01-sources/web/S001-unittest.md) — full `unittest` API including subtests, skips, cleanup hooks, `IsolatedAsyncioTestCase`, and the discovery model
- [S009](../../research/test-driven-development-in-python/01-sources/web/S009-pytest-unittest.md) — pytest documentation on running `unittest` suites, what works transparently, and what requires structural change
- [S003](../../research/test-driven-development-in-python/01-sources/web/S003-pytest-good-practices.md) — pytest recommended practices that become available after migrating to pytest-native test style

---

*← [Previous lesson](./L05-pytest-as-the-daily-driver.md)* · *[Next lesson](./L07-adapters-injection-and-owned-interfaces.md) →*