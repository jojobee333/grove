# Parametrization and Property-Based Testing

**Module**: M06 · Broaden Specification Beyond Single Examples
**Type**: advanced
**Estimated time**: 15 minutes
**Claim**: C7 from Strata synthesis

---

## The core idea

Single examples are where most TDD work starts, and for good reason: they are readable, concrete, and fast to write. But they have a ceiling. Once a behavior has more than two or three interesting input families, writing one example at a time stops being the most efficient way to specify it. And for behaviors with very large or continuous input spaces, hand-picking examples may leave whole regions of the behavior unexplored without you realizing it.

Python TDD provides two tools for moving past that ceiling. Parametrization lets you express a known family of cases in one test design — the same assertion, applied systematically across a table of named examples [S005](../../research/test-driven-development-in-python/01-sources/web/S005-pytest-parametrize.md). Property-based testing with Hypothesis takes the next step: you define an invariant that should hold across a broad class of inputs, then the library generates inputs and searches for counterexamples you did not think to write [S010](../../research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md).

The two tools answer different questions. Parametrization says: "This behavior should produce exactly these outputs for these named cases." Hypothesis says: "This property should hold for any input the library can generate — find the smallest one that breaks it." Neither replaces small example-driven TDD. They extend it when the example space becomes too large or unpredictable to express manually.

## Why it matters

A test suite with one happy-path case, one failure case, and one edge case per function is often under-specified in ways that are hard to see by reading the tests. The tests are green, but the behavior on inputs you did not explicitly choose is undefined territory. Bugs from that territory are often the hardest to reproduce and diagnose, because the test suite gave no signal that the input space had interesting structure beyond the three hand-picked cases.

Parametrization and property-based testing both sharpen specification coverage. Parametrization makes a case family explicit — the developer chooses the cases intentionally and names them. Hypothesis explores beyond the developer's choices, looking for inputs where the stated invariant breaks. Both changes reduce the gap between what the tests verify and what the function is actually expected to do.

## Example 1 — starting point: three separate examples that want to be parametrized

An initial pass through `normalize_tag` might produce three separate tests:

```python
def test_strips_whitespace():
    assert normalize_tag("  Python  ") == "python"

def test_lowercases():
    assert normalize_tag("PYTHON") == "python"

def test_blank_becomes_none():
    assert normalize_tag("   ") is None
```

Each test is simple, but they share an identical structure: call `normalize_tag(input)`, assert the output. That repetition is the signal to consolidate with `pytest.mark.parametrize`:

```python
import pytest


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("  Python  ", "python"),     # trims and lowercases
        ("PYTHON",     "python"),     # only lowercases
        ("python",     "python"),     # already normal
        ("   ",        None),         # blank → None
        ("",           None),         # empty → None
        ("C++",        "c++"),        # non-alpha characters preserved
    ],
)
def test_normalize_tag(raw: str, expected: str | None) -> None:
    assert normalize_tag(raw) == expected
```

Now six cases live in one test. Adding a seventh is one line in the table. Pytest reports each case individually if it fails, so you still get precise diagnostics. The parametrized form is more expressive, not less readable [S005](../../research/test-driven-development-in-python/01-sources/web/S005-pytest-parametrize.md).

## Example 2 — property-based testing with Hypothesis

After establishing the specific cases, you may want to state a broader invariant. For `normalize_tag`, one natural invariant is idempotency: normalizing an already-normalized tag should return the same tag. Another is the output type: the result is always either a lowercase string or `None`.

```python
from hypothesis import given, strategies as st


@given(st.text())
def test_normalize_tag_is_idempotent(raw: str) -> None:
    """Normalizing twice should give the same result as normalizing once."""
    once  = normalize_tag(raw)
    twice = normalize_tag(raw) if once is None else normalize_tag(once)
    assert once == twice


@given(st.text())
def test_normalize_tag_result_type(raw: str) -> None:
    """Result is always str (lowercase) or None — never anything else."""
    result = normalize_tag(raw)
    assert result is None or (isinstance(result, str) and result == result.lower())
```

Hypothesis generates hundreds of inputs across runs, then shrinks any falsifying example to its minimum form. If your implementation has a bug that only appears with a Unicode character, a zero-width space, or a very specific combination of whitespace, Hypothesis will find it and show you the smallest input that demonstrates the failure [S010](../../research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md).

## Example 3 — applying both techniques to a business function

A discount calculation rule: orders over a threshold earn a percentage discount. The discount rate should never exceed 1.0, and orders below the threshold should always receive 0 discount.

Specific cases with parametrization:

```python
@pytest.mark.parametrize(
    ("total_cents", "threshold_cents", "rate", "expected_discount_cents"),
    [
        (10_000, 5_000, 0.10, 1_000),   # above threshold → discount applied
        (5_000,  5_000, 0.10, 0),        # exactly at threshold → no discount (exclusive)
        (4_999,  5_000, 0.10, 0),        # below threshold → no discount
        (10_000, 5_000, 0.00, 0),        # zero rate → no discount
    ],
)
def test_calculate_discount(total_cents, threshold_cents, rate, expected_discount_cents):
    assert calculate_discount(total_cents, threshold_cents, rate) == expected_discount_cents
```

Invariant with Hypothesis: the discount should never exceed the total order amount, and should always be non-negative:

```python
from hypothesis import given, settings, strategies as st


@given(
    total_cents    = st.integers(min_value=0, max_value=1_000_000),
    threshold_cents = st.integers(min_value=1, max_value=1_000_000),
    rate           = st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
)
def test_discount_is_non_negative_and_bounded(total_cents, threshold_cents, rate):
    discount = calculate_discount(total_cents, threshold_cents, rate)
    assert 0 <= discount <= total_cents
```

The parametrized tests verify named cases precisely. The Hypothesis test guards against a whole class of implementation errors — negative discounts, discounts larger than the order, off-by-one threshold bugs — across the full input space. Together they give stronger behavioral coverage than either technique alone.

## Key points

- Parametrize when you have a known family of named cases that share a test structure [S005](../../research/test-driven-development-in-python/01-sources/web/S005-pytest-parametrize.md)
- Use Hypothesis when you can state a meaningful invariant and want the library to search for counterexamples [S010](../../research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md)
- Both techniques extend small example-driven TDD rather than replace it
- Hypothesis output is a falsifying example shrunk to its minimum — if it fails, the error is always reproducible and minimal
- Avoid large parametrized matrices with no clear pattern — if the data does not tell a story, the test probably covers too much or too little

## Go deeper

- [S005](../../research/test-driven-development-in-python/01-sources/web/S005-pytest-parametrize.md) — parametrize usage including IDs, indirect fixtures, and stacking multiple decorators
- [S010](../../research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md) — Hypothesis quickstart: strategies, given decorator, settings, and shrinking behavior
- [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md) — how broader specification fits into the TDD loop without abandoning the example-first discipline

---

*[← Previous lesson](./L10-when-to-prefer-verified-fakes-or-contract-checks.md)* · *[Next lesson →](./L12-advanced-boundary-coverage-in-practice.md)*