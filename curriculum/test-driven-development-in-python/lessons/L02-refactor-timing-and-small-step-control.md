# Refactor Timing and Small-Step Control

**Module**: M01 · Drive Design with Red-Green-Refactor
**Type**: applied
**Estimated time**: 14 minutes
**Claim**: C1 - TDD in Python is best understood as a disciplined, incremental behavior-design workflow, not merely a habit of writing tests before code

---

## The situation

Most developers who try TDD do not fail on the red step or the green step. They fail on the transition between "it passes" and "it is still a design I want to live with." That is where refactor timing matters. The research shows a real nuance here: Fowler warns that skipping refactoring is one of the most common ways teams get TDD wrong, while Beck leaves room for moving to the next test when the code is already good enough for the moment. Source trail: `vault/research/test-driven-development-in-python/02-analysis/contradictions.md`, `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md`, `vault/research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md`.

So the practical question is not "Must I refactor after every green?" The better question is "Has this step created enough friction that the next step will be riskier or harder if I leave the code as-is?" That framing matches the resolved contradiction in the analysis: refactoring is essential to the discipline overall, but not every micro-cycle requires visible restructuring.

## The approach

Use three checks after a test turns green.

First, check readability. Can you explain why the code passes without narrating accidental details? If the answer is no, you probably need some cleanup now.

Second, check duplication or awkwardness. If the last change created repeated conditionals, weird temporary names, or logic branches that are obviously preparing for future tests, that is a signal to refactor before continuing.

Third, check pressure from the next likely behavior. If the next test can be added cleanly with the current structure, you may be able to defer bigger refactoring. If the next test already looks painful, you have enough evidence that cleanup is not optional.

This is where small-step control matters. Refactoring should not become an excuse to redesign the whole module because the code "might need it later." But green should not become permission to keep expanding a shape that is already getting brittle. The disciplined move is to do only the cleanup that protects the next meaningful change.

## A worked example

Suppose you are driving a function that categorizes order totals for a shipping rule.

After two tests, your code might look like this:

```python
def shipping_band(total):
    if total < 50:
        return "standard"
    return "priority"
```

That may be fine. Now you add a third test: orders below zero should raise an error.

You make it pass quickly:

```python
def shipping_band(total):
    if total < 0:
        raise ValueError("total must be non-negative")
    if total < 50:
        return "standard"
    return "priority"
```

Still fine. Then the next test says orders above 500 get `"freight"` and later another says priority has a middle band split. At that point, you might feel pressure to jump into a large redesign. But the smallest disciplined refactor may just be naming the thresholds or extracting a clearer decision structure.

For example:

```python
def shipping_band(total):
    if total < 0:
        raise ValueError("total must be non-negative")
    if total < 50:
        return "standard"
    if total <= 500:
        return "priority"
    return "freight"
```

Later, if more business rules arrive, you may refactor into a table or dedicated rule object. The key is that you do not make that move because refactoring is a ritual. You make it because the next behavior exposes enough pressure that the current shape is starting to hide intent.

This example is illustrative. The factual point comes from the research synthesis: refactoring earns its place when it protects the next cycle, not when it becomes speculative architecture or when it is skipped indefinitely. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`, `vault/research/test-driven-development-in-python/02-analysis/contradictions.md`.

## Decision rules

- Refactor now if the latest green step made the next behavior harder to express clearly.
- Defer larger cleanup if the code is still readable and the next test can be added without strain.
- Stop calling it TDD if green turns into a long sequence of feature additions with no cleanup pressure acknowledged.
- Avoid "hero refactors" that redesign more than the current evidence supports.

## Key points

- Refactoring is essential to TDD overall, but not every green step demands a major cleanup.
- The right trigger is design pressure from readability, duplication, or the next likely behavior.
- Good micro-cycle judgment prevents both speculative redesign and slow drift into brittle code.

## Go deeper

- `vault/research/test-driven-development-in-python/02-analysis/contradictions.md`
- `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md`

---

*[<- Previous: Canonical TDD in Python: Behavior Before Implementation](./L01-canonical-tdd-in-python-behavior-before-implementation.md)* · *[Next lesson: Isolation by Default: Fixtures, Scope, and Cleanup ->](./L03-isolation-by-default-fixtures-scope-and-cleanup.md)*