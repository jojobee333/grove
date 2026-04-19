# Canonical TDD in Python: Behavior Before Implementation

**Module**: M01 · Drive Design with Red-Green-Refactor
**Type**: core
**Estimated time**: 12 minutes
**Claim**: C1 — TDD in Python is best understood as a disciplined, incremental behavior-design workflow, not merely a habit of writing tests before code

---

## The core idea

Test-driven development has a naming problem. "Test-driven" sounds like a testing technique, which causes most newcomers to reach for it as a way to verify code they have already designed. That framing misses the point entirely. TDD is a way of driving the design of code through small, explicit behavioral steps — the tests are the medium, not the purpose.

Martin Fowler defines the core loop precisely: write a failing test, write the minimum code to make it pass, then refactor to preserve structural integrity — in that order, without collapsing the steps [S006](../../research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md). Kent Beck adds a layer that shorter summaries often omit: before any test is written, canonical TDD begins with a *test list* — a brief enumeration of the behaviors you intend to drive through the cycle [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md). That list is not a plan in the project-management sense. It is a thinking tool: you are deciding what the next meaningful behavior is before committing to the exact test that will specify it.

This changes what TDD actually demands. You are not proving code works after the fact. You are deciding, one small step at a time, what the code should do — and letting the test force you to express that decision in a form the system can verify. Fowler and Beck converge on this point even though they describe the rhythm slightly differently. Both treat behavioral sequencing as the core discipline, and both identify the same most common failure mode: skipping or deferring the refactor step [S006](../../research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md).

## Why it matters

If you already have some exposure to Python and testing, the most dangerous mistake is collapsing TDD into the word "test." Once that collapse happens, developers preserve the label while losing the discipline. They build implementation-heavy code first, then write tests that merely confirm what already exists. Or they write a large batch of tests based on assumptions the final design will not keep. Both patterns produce tests, but neither uses tests to steer design.

For practical Python work, this distinction changes how you approach a feature. A TDD-oriented developer asks: what is the next observable behavior I can specify? A non-TDD, test-aware developer often asks: how should I build this, and how will I verify it afterward? The second question is not useless, but it makes it much easier to overbuild early or to defer interface decisions until the design is already sticky. The first question keeps design pressure close to the behavior the code must expose.

Beck also identifies something important about criticisms of TDD: many attacks target strawman workflows like "write all tests up front" or "one long test per feature" [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md). Those are not canonical TDD. If you read critiques of TDD, it is worth asking which workflow the critic is actually describing — you will often find it is not the test-list-driven, one-behavior-at-a-time, refactor-separately cycle that Fowler and Beck both endorse.

## A concrete example

Here is a full walkthrough of canonical TDD for a small Python feature: a function that normalizes user-entered tags before saving them.

Start by writing the test list. Do not write any code yet:

- A single tag with leading and trailing whitespace becomes lowercase and trimmed
- An already-normalized tag is unchanged
- An empty-string tag is discarded
- A list with duplicate tags after normalization retains only the first occurrence

Now convert the first list item into a concrete failing test:

```python
# test_tags.py — RED: function does not exist yet
def test_trims_and_lowercases_tag():
    assert normalize_tag("  Python  ") == "python"
```

Running this produces `NameError`. That is the red phase — the test is failing for the right reason. Now write the minimum code to make it pass:

```python
# tags.py — GREEN: simplest possible implementation
def normalize_tag(raw: str) -> str:
    return raw.strip().lower()
```

The test is green. Now the refactor step: is there anything here that will make the next step harder? At this scale, no. Proceed to the next item on the test list.

```python
def test_unchanged_normalized_tag():
    assert normalize_tag("python") == "python"
```

This passes immediately. That is valid. Beck explicitly notes that a test that passes without new code is still a productive step — you confirmed the behavior and moved forward [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md). Do not manufacture an artificial failure.

```python
def test_empty_string_returns_empty():
    assert normalize_tag("") == ""
```

This also passes. The next item — discarding empties — requires a decision about the return type. Returning `None` or `""` are both options. The test forces you to make that call explicitly before implementing:

```python
def test_discards_blank_tag():
    assert normalize_tag("   ") is None
```

Now the test fails. You update the implementation:

```python
def normalize_tag(raw: str) -> str | None:
    result = raw.strip().lower()
    return result if result else None
```

Green. Now the refactor step is more meaningful: the function signature changed to allow `None`. Any caller that assumed a `str` return type needs to handle `None` now. TDD has surfaced that design decision at the exact moment when the behavioral need appeared — not speculatively, and not after several callers were already written.

## The interface design benefit, made explicit

The deepest reason TDD improves design is not that it produces more tests. It is that writing the test first forces you to think from the caller's perspective before thinking from the implementer's perspective. When you write `normalize_tag("  Python  ")` before writing `normalize_tag`, you are deciding the function name, the argument type, and the expected return value in one gesture. That decision happens before you know *how* the function will work internally.

This ordering matters because interface decisions and implementation decisions are naturally in tension. Implementation thinking pushes toward convenience: "I already have a set internally, so I'll just return a set." Interface thinking pushes toward clarity: "My caller works with ordered lists, so the return type should respect that." Writing the test first forces interface clarity upfront, when changing your mind is still cheap.

Fowler captures this exactly: writing tests first supports self-testing code and forces earlier thinking about interface and usage rather than implementation details [S006](../../research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md). The practice does not guarantee good design, but it consistently raises the cost of bad interface choices early — at the moment when they are still easy to revise.

In Python specifically, this benefit is especially useful because the language offers maximum flexibility in how you structure things. Without TDD's discipline, a Python codebase can grow a lot of code where objects do everything themselves and callers are tightly coupled to internal details. The test-list and behavioral-specification approach keeps the interface visible and negotiable throughout development.

## Limitations

The exact granularity of the refactor step is less standardized across canonical sources than the red and green steps. Fowler emphasizes the risk of skipping refactoring [S006](../../research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md), and Beck treats refactoring as a mode of work that must stay separate from the making-it-pass mode [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md). But neither defines a hard threshold for how much cleanup each cycle requires. In practice, beginners often over-refactor — redesigning before the suite is large enough to guide the redesign — or skip entirely, accumulating inconsistency across cycles.

There is also a practical caveat about how canonical TDD scales to larger systems. The test-list and one-behavior-at-a-time discipline works cleanly when a feature is small enough to drive without a global design plan. For genuinely complex systems with many interdependencies, the discipline must coexist with some higher-level architecture thinking. Beck acknowledges this implicitly by framing TDD as a design *aid*, not a design *replacement* [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md). The specific calibration of when micro-cycle discipline is sufficient and when larger structural thinking is also needed is addressed in later lessons on boundary design and advanced coverage.

## Key points

- TDD starts with a test list that names intended behaviors, not a test that encodes an implementation assumption.
- Red, green, and refactor are separate modes of work; mixing them undermines the discipline.
- Writing the test first forces interface decisions before implementation decisions — that is the primary design benefit.
- A test that passes immediately after a prior green step is valid; do not manufacture artificial failures.
- Neglecting the refactor step is the most common way teams undermine their own TDD suites.

## Go deeper

- [S006](../../research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md) — Fowler's canonical explanation of red-green-refactor and his identification of refactor-skipping as the key failure mode
- [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md) — Beck's sharper formulation including the test list, test ordering, and which TDD criticisms attack strawman workflows

---

*[Next lesson](./L02-refactor-timing-and-small-step-control.md) →*
