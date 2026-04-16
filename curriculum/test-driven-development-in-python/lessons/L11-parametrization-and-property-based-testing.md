# Parametrization and Property-Based Testing

**Module**: M06 · Broaden Specification Beyond Single Examples
**Type**: advanced
**Estimated time**: 15 minutes
**Claim**: C7 - Advanced Python TDD expertise includes using broader specification techniques than single example-based unit tests

---

## The advanced move

Single examples are where most TDD work starts, but they are not where strong specification work has to end. The research makes a clear progression: once a behavior stops being well described by one or two hand-picked examples, Python teams should broaden the specification with parametrization or property-based testing rather than duplicating nearly identical tests or hoping edge cases will appear later. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/web/S005-pytest-parametrize.md`, `vault/research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md`.

Parametrization is the simpler expansion. It says, "This one behavior should hold across several named cases." Property-based testing goes further. It says, "This invariant should hold across many generated inputs, and if it breaks, show me the smallest falsifying example." Both are useful, but they answer slightly different questions.

For TDD, that distinction matters. Parametrization is usually the next move when you already understand the case family and want to express it clearly. Hypothesis becomes valuable when the space of interesting inputs is too broad, too surprising, or too combinatorial to cover comfortably by hand. Neither replaces small example-driven design work. They extend it.

## Why it matters

Teams often hit a ceiling where their tests are technically numerous but conceptually narrow. They have one happy-path example, one obvious failure, and maybe one edge case, but they have not actually described the behavior space. At that point, design can still be under-specified even though the file has many green tests.

Broader specification techniques solve that by changing the unit of thinking. Instead of asking only, "What is one more example?" you ask, "What family of cases belongs together?" or "What property should always remain true?" That pushes the suite closer to real behavioral coverage.

## A concrete example

Suppose you are driving a function that normalizes tags by trimming whitespace, lowercasing text, and discarding blanks.

You might begin with one concrete example, then broaden with parametrization:

```python
import pytest


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (" Python ", "python"),
        ("PYTHON", "python"),
        ("   ", ""),
    ],
)
def test_normalize_tag_examples(raw, expected):
    assert normalize_tag(raw) == expected
```

That is a useful family of explicit cases. But maybe you also want to state a broader invariant: normalizing a tag twice should produce the same result as normalizing it once. That is where Hypothesis becomes useful:

```python
from hypothesis import given, strategies as st


@given(st.text())
def test_normalize_tag_is_idempotent(text):
    assert normalize_tag(normalize_tag(text)) == normalize_tag(text)
```

Now the test is not tied to a few manually chosen strings. It is checking a property across many generated inputs. If the behavior fails, Hypothesis gives you a falsifying example small enough to reason about.

The example is illustrative, but the research-backed lesson is direct: parametrization broadens example coverage cleanly, and Hypothesis adds generated exploration that complements, rather than replaces, example-driven TDD. Source trail: `vault/research/test-driven-development-in-python/01-sources/web/S005-pytest-parametrize.md`, `vault/research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md`.

## Common mistakes

- Using property-based tests before you can name the core behavior in ordinary examples.
- Writing giant parametrized matrices that hide the behavior under too much data.
- Treating generated inputs as magical coverage instead of tying them to a meaningful invariant.
- Replacing readable examples with properties when the examples are still the clearest teaching tool.

## Key points

- Parametrization is best for a known family of concrete cases.
- Property-based testing is best for broader invariants and surprising input exploration.
- Both techniques strengthen Python TDD when they extend small example-driven design rather than trying to skip it.

## Go deeper

- `vault/research/test-driven-development-in-python/01-sources/web/S005-pytest-parametrize.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md`
- `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`

---

*[<- Previous: When to Prefer Verified Fakes or Contract Checks](./L10-when-to-prefer-verified-fakes-or-contract-checks.md)* · *[Next lesson: Advanced Boundary Coverage in Practice ->](./L12-advanced-boundary-coverage-in-practice.md)*