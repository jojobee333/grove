# unittest Fluency and Incremental Migration

**Module**: M03 · Choose the Right Python Testing Surface
**Type**: applied
**Estimated time**: 13 minutes
**Claim**: C3 - pytest is the most ergonomic default for modern Python TDD, while unittest remains the baseline framework and an important migration path

---

## The situation

A practical Python engineer does not always get to start with a greenfield pytest codebase. Many teams inherit `unittest` suites, mixed testing styles, or standard-library-only environments. The research therefore avoids a simplistic rule like "use pytest and ignore everything else." Instead, it treats `unittest` fluency as part of real expertise and treats pytest as the preferred daily surface when the team can use it. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/web/S001-unittest.md`, `vault/research/test-driven-development-in-python/01-sources/web/S009-pytest-unittest.md`.

The most useful idea here is incremental migration. Pytest can run existing `unittest.TestCase` tests and give you better selection and output without requiring immediate structural rewrite. But the interoperability has limits. You do not get full pytest fixture-argument injection and parametrization directly inside `TestCase` methods. That means migration is possible, but it is not magical.

## The approach

Use a three-part approach when you inherit a `unittest`-heavy suite.

First, learn the standard-library model well enough to reason about it. `setUp`, `tearDown`, skips, subtests, async support, and discovery are not legacy trivia. They are the real operating model of many codebases.

Second, separate execution surface from structural migration. You can often start running the suite with pytest before you rewrite tests into pytest-native style. That gives immediate value through better tracebacks and selection.

Third, migrate by pressure, not ideology. Convert the parts of the suite where pytest-native fixtures, parametrization, or simpler function-based tests genuinely reduce friction. Leave stable `unittest` code alone if rewriting it creates churn without clear learning or maintenance benefit.

## A worked example

Imagine a codebase with this existing test:

```python
import unittest


class TaxTests(unittest.TestCase):
    def setUp(self):
        self.region = "uk"

    def test_standard_rate(self):
        self.assertEqual(tax_rate(self.region, "standard"), 0.20)
```

A team adopting pytest does not need to rewrite it immediately. They can often run it through pytest and gain better developer ergonomics right away.

But if later work reveals many rate combinations and setup branches, migration pressure appears naturally. A pytest-native version may become clearer:

```python
import pytest


@pytest.mark.parametrize(
    ("region", "kind", "expected"),
    [
        ("uk", "standard", 0.20),
        ("uk", "reduced", 0.05),
        ("eu", "standard", 0.22),
    ],
)
def test_tax_rate(region, kind, expected):
    assert tax_rate(region, kind) == expected
```

The point is not that `unittest` was wrong. It is that a changing behavioral surface can make pytest-native structure more economical. Migration should follow that pressure. It should not be a rewrite campaign justified only by tool preference.

This example is illustrative. The factual support comes from the interop guidance in the source set: pytest can run `unittest` suites, but core architectural differences still limit direct feature transfer. Source trail: `vault/research/test-driven-development-in-python/01-sources/web/S009-pytest-unittest.md`, `vault/research/test-driven-development-in-python/01-sources/web/S001-unittest.md`.

## Decision rules

- Keep existing `unittest` structure when it is stable and not blocking useful TDD steps.
- Migrate to pytest-native style when fixtures, parametrization, or simpler test functions materially reduce friction.
- Do not assume pytest execution automatically grants full pytest idioms inside `TestCase` methods.
- Treat migration as a design and maintenance decision, not a branding exercise.

## Key points

- Real Python TDD expertise includes fluency with both pytest and unittest.
- Pytest can improve execution ergonomics before a suite is structurally migrated.
- The best migration path is incremental and driven by actual testing pressure.

## Go deeper

- `vault/research/test-driven-development-in-python/01-sources/web/S001-unittest.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S009-pytest-unittest.md`
- `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`

---

*[<- Previous: pytest as the Daily Driver](./L05-pytest-as-the-daily-driver.md)* · *[Next lesson: Adapters, Injection, and Owned Interfaces ->](./L07-adapters-injection-and-owned-interfaces.md)*