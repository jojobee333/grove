# Refactor Timing and Small-Step Control

**Module**: M01 · Drive Design with Red-Green-Refactor
**Type**: applied
**Estimated time**: 14 minutes
**Claim**: C1 — TDD in Python is best understood as a disciplined, incremental behavior-design workflow, not merely a habit of writing tests before code

---

## The situation

Most developers who try TDD do not fail on the red step or the green step. They fail on the transition between "the test passes" and "the code is still in a shape I want to live with." That transition is where refactor timing becomes a real skill. Getting it wrong in either direction has costs: skip refactoring too often and the suite slowly becomes harder to extend; refactor too aggressively and you redesign code that did not yet have enough tests to guide the redesign.

Fowler identifies neglecting refactoring as one of the most common ways teams get TDD wrong [S006](../../research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md). Beck's description of canonical TDD treats refactoring as a separate mode of work — once green, you shift into cleanup mode rather than continuing to expand features [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md). The practical nuance between these two descriptions is that not every green step requires visible structural change. The question is whether the code you just wrote is creating friction that will compound in the next cycle.

## The approach

After every green step, apply three checks before moving to the next item on the test list.

**Check 1 — Readability.** Can you explain what the code does without narrating accidental details about how you happened to implement it? If explaining the logic requires you to walk through internal branching or temporary variable names that expose construction details, there is probably a naming or extraction cleanup worth doing now.

**Check 2 — Duplication and awkwardness.** Did the last change create repeated conditionals, duplicate logic in two methods, or an awkward shape that you can already tell will need restructuring when the next test arrives? If so, refactoring now is cheaper than refactoring after the next test adds more entanglement.

**Check 3 — Pressure from the next likely behavior.** Look ahead at the next test-list item. If you can add it cleanly given the current structure, you may be able to defer bigger cleanup. If the next test already looks painful to express, you have enough evidence that cleanup is not optional.

This three-check approach respects a key distinction in the research: refactoring is essential to TDD's value over time, but not every micro-cycle requires a major restructuring. The goal is to do only the cleanup that protects the next meaningful change, not to treat each green step as an opportunity to redesign in the abstract.

## A worked example

Suppose you are driving a function that categorizes orders for a shipping calculation.

**Cycle 1 — First behavior:**

```python
# RED
def test_small_order_gets_standard_shipping():
    assert shipping_band(total=30) == "standard"

# GREEN
def shipping_band(total: float) -> str:
    return "standard"
```

After green: the function is trivially complete. No refactoring needed — there is nothing structural to clean up and the next test will force real branching.

**Cycle 2 — Second behavior:**

```python
# RED
def test_large_order_gets_priority_shipping():
    assert shipping_band(total=120) == "priority"

# GREEN
def shipping_band(total: float) -> str:
    if total >= 100:
        return "priority"
    return "standard"
```

After green: check readability (readable), duplication (none), pressure from next behavior. The code is clean. Move on.

**Cycle 3 — Validation:**

```python
# RED
def test_negative_total_raises():
    with pytest.raises(ValueError):
        shipping_band(total=-5)

# GREEN
def shipping_band(total: float) -> str:
    if total < 0:
        raise ValueError(f"total must be non-negative, got {total}")
    if total >= 100:
        return "priority"
    return "standard"
```

After green: check readability. The function is still readable. Check duplication — none. Check pressure from next behavior. The next item on the list is "freight band for orders above 500." At that point you might consider whether to add another `if` or refactor the branching into a more explicit structure. But right now the function is still coherent with two branches. Defer the structural change until the freight band is added and you have three branches to reason about.

**Cycle 4 — Freight band triggers refactor:**

```python
# RED
def test_very_large_order_gets_freight_shipping():
    assert shipping_band(total=600) == "freight"

# GREEN (minimal pass)
def shipping_band(total: float) -> str:
    if total < 0:
        raise ValueError(f"total must be non-negative, got {total}")
    if total >= 500:
        return "freight"
    if total >= 100:
        return "priority"
    return "standard"
```

Now the refactor check fires on readability. Three `if` branches with numeric thresholds scattered through the function make it harder to read the policy at a glance. A small, targeted cleanup earns its place:

```python
# REFACTOR
_BANDS = [
    (500, "freight"),
    (100, "priority"),
    (0,   "standard"),
]

def shipping_band(total: float) -> str:
    if total < 0:
        raise ValueError(f"total must be non-negative, got {total}")
    for threshold, band in _BANDS:
        if total >= threshold:
            return band
    return "standard"  # unreachable but explicit
```

The thresholds are now colocated in a structure that makes the policy visible. Adding a new band in the future is a one-line change to `_BANDS`. That refactor was earned by behavioral pressure — not done speculatively.

## What small-step control prevents

Small-step control is not just about pace. It prevents two failure modes that gradually erode TDD value.

The first failure mode is premature redesign: after seeing two tests, imagining how the whole feature will look and restructuring the code for that imagined future. That redesign has no test coverage yet. If the imagined future turns out to be wrong, you have moved work into a shape that does not match what the next test needs.

The second failure mode is deferred cleanup: always moving to the next test because "the code works" and "cleanup can wait." After enough cycles, the code has accumulated enough inconsistency that any refactoring requires understanding a large, tangled system rather than a small, contained one. Tests that drove the design now struggle to survive the refactoring because the cleanup is no longer small.

Beck treats these as symmetric mistakes. The discipline is not about a specific refactoring schedule. It is about staying honest at every green step: is the code clean enough that the next test can be added without strain? If not, clean it now [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md).

## Limitations

The exact threshold for "clean enough" is not defined in the research. Fowler and Beck describe the rhythm slightly differently — Fowler emphasizes not skipping, Beck emphasizes separating modes — but neither specifies how many lines of code or how many repeated patterns should trigger a refactor. In practice, this judgment develops with experience and differs across developers and systems. The three-check approach above is a useful heuristic, not a formal rule.

## Key points

- Refactoring is part of TDD's value, not optional cleanup added after features are done.
- The trigger for refactoring is design pressure — readability problems, duplication, or clear friction from the next behavior — not a timer or a ceremony.
- Small steps protect refactoring quality: a refactor guided by 4 tests is safer than one guided by 2, and one guided by 2 is safer than one guided by imagination.
- Skipping refactoring indefinitely and refactoring too speculatively are symmetric failure modes.
- The right move after green is to ask "can the next test be added cleanly?" and act on the answer.

## Go deeper

- [S006](../../research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md) — Fowler on red-green-refactor and the specific failure mode of omitting the refactor step
- [S007](../../research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md) — Beck on refactoring as a separate mode of work and the importance of staying honest at each green step

---

*← [Previous lesson](./L01-canonical-tdd-in-python-behavior-before-implementation.md)* · *[Next lesson](./L03-isolation-by-default-fixtures-scope-and-cleanup.md) →*