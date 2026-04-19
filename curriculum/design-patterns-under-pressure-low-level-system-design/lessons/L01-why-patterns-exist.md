# Why Patterns Exist at All

**Module**: M01 · Pressure-First Foundations  
**Type**: core  
**Estimated time**: 20 minutes  
**Claim**: C1 from Strata synthesis

---

## The core idea

A **design pattern** is a named, reusable answer to a recurring design problem. Think of it like a recipe. A recipe does not tell you to cook every meal the same way. It tells you: when you have *these* ingredients and *this* goal, here is a reliable combination. Patterns work the same way in code. They exist not because they are fashionable, but because certain problems keep appearing across different projects, and certain structures keep solving them reliably.

Where do patterns come from? They were not invented in a classroom. They were noticed in real software systems, collected across many projects, and named so engineers could talk about them efficiently. Fowler and collaborators documented roughly forty such patterns observed repeatedly across enterprise platforms [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md). Ward Cunningham's framing goes further: patterns are not just a list — they form a *language*. One design move often suggests another, just as words in a sentence work together [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md).

But patterns have a real cost. Every pattern adds a layer, a concept, or a boundary that a reader must understand. A simple `if` statement costs almost nothing to read. A factory hierarchy that produces implementations through configuration costs much more. That cost is only worth paying when the pattern is solving a real, present problem — not a hypothetical future one [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md) [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

This is why the first question in this course is not "which pattern should I use?" It is "what pressure is making this design expensive?"

## What is a design pressure?

A **design pressure** is a recurring cost that keeps reappearing as a system grows. It is not a style preference. It is not an aesthetic complaint. It is a concrete problem that will get more expensive if left untreated.

Here are the five pressure types you will use throughout this course. Learn them as vocabulary — they are the diagnostic lens for every lesson.

**Coupling pressure** is when changing one part of the system forces edits in many unrelated places. Imagine a codebase where swapping the email transport library requires editing ten files. That is coupling pressure. The signal is: a change in one place triggers a cascade of fragile edits elsewhere.

**Volatility pressure** is when a behavior needs to change frequently across environments, modes, or policy versions. Imagine a payment system where test mode, sandbox mode, and production each need different behavior — and those differences are scattered as `if env == "prod"` checks throughout business logic. That is volatility pressure.

**Coordination pressure** is when correctness depends on ordering, timing, or multi-step state. Imagine a checkout flow that charges a card, reduces inventory, and sends a confirmation — and a bug causes the inventory step to succeed but the confirmation to fail with no rollback. That is coordination pressure.

**Boundary mismatch pressure** is when two models meet awkwardly. The classic example is the object-relational mismatch: your domain objects think in terms of concepts and behaviors, but your database thinks in tables, columns, and joins. Translation logic starts to leak everywhere.

**Duplication pressure** is when the same rule appears in multiple workflows and gradually drifts apart. If you update a discount rule in one handler and forget another, that is duplication pressure. The signal: a rule change requires hunting down multiple copies.

Pressure language separates **symptoms** from **causes**. "This class is too big" is a symptom. "Coordination logic is scattered across four services with no shared writeback boundary" is a cause — and it points toward a specific pattern category. Precise diagnosis makes pattern selection easier to justify.

## Why it matters

This lesson changes your starting question for every design decision going forward. Instead of asking "Should I use Strategy, Observer, or Repository here?", you start asking "What pressure is making this code expensive to change?"

That shift protects you from cargo-cult design — adding patterns because they look professional, not because they solve something. It also lets you explain your choices in plain language: "We added a service layer because multiple interfaces were duplicating orchestration logic," or "We introduced command objects because undo and replay became actual product requirements."

## Example 1 — before the pressure appears

Here is a simple pricing function with no active pressure yet:

```python
def calculate_price(order):
    base = order.quantity * order.unit_price
    if order.customer_type == "premium":
        base = base * 0.9
    return base
```

This is direct and easy to read. There is one pricing rule, one modifier, no environment variation. Adding a Strategy pattern, factory, or configuration layer here would make the code *worse*, not better. The abstraction cost is real today. The future benefit is still imaginary [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

## Example 2 — after multiple pressures appear

Now the same system has grown. Three regions each have different discount rules. A test environment uses flat pricing. A regulatory override applies in certain jurisdictions:

```python
def calculate_price(order, env, region):
    base = order.quantity * order.unit_price

    if env == "test":
        return base  # flat pricing in tests

    if region == "EU":
        if order.customer_type == "premium":
            base *= 0.85
        else:
            base *= 0.95
    elif region == "US":
        if order.customer_type == "premium":
            base *= 0.88
        elif order.has_coupon:
            base *= 0.92
    elif region == "APAC":
        base *= 0.97

    return base
```

The code now changes along multiple axes. Adding a new region requires editing this function directly. Adding a new customer tier requires adding branches everywhere. The test override is baked in. This is volatility pressure combined with coupling pressure.

At this point, patterns like Strategy (isolating pricing rules as objects) or Plugin (centralizing environment-specific binding) start to earn their cost. Patterns become useful when recurring forces make the naive design too costly to change [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md) [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md).

## Example 3 — coordination pressure in a checkout flow

Here is a checkout function that handles three steps in sequence:

```python
def process_checkout(order):
    payment_gateway.charge(order.customer_card, order.total)
    inventory_service.reduce(order.items)       # If this fails, the charge already went through
    email_service.send_confirmation(order.email) # If this fails, inventory was already reduced
```

This looks simple and direct. It works in the happy path. The problem surfaces in failure. If `inventory_service.reduce()` raises a `StockError`, the payment has already been taken. There is no automatic rollback. The customer was charged but their items were not reserved. If `email_service` then fails, the customer has no confirmation and may file a dispute.

The pressure here is not coupling (the function can easily switch to a different gateway). It is not volatility (the steps themselves are stable). It is **coordination pressure**: correctness depends on all three steps succeeding or failing as a unit, but the current design has no mechanism to enforce that. Each step is independent; the consistency is only assumed.

This pressure points toward a **Unit of Work** pattern, which tracks all changes across a business operation and commits or rolls back as one atomic transaction [S021](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S021-fowler-unit-of-work.md). You will study Unit of Work in L15. The point here is the diagnostic step: naming the pressure type correctly (coordination, not coupling) tells you which pattern category is relevant before you open a pattern catalog.

This is why pressure vocabulary matters. The same symptom word — "this function is fragile" — could mask coupling pressure, coordination pressure, or boundary mismatch. Different pressures require different pattern responses. Getting the diagnosis right focuses your search.

## Limitations

The research behind Claim 1 is strong, but it is mostly practitioner-based reasoning. Expert authors describe *when* pressures become real from field experience. What the evidence does not provide is a precise numerical threshold — "add a pattern when the pressure score exceeds X." That threshold is contextual and judgment-based, not formulaic. This course gives heuristics and worked examples. It cannot give you a universal formula.

## Key points

- Design patterns are reusable answers to recurring design pressures, not checklist items [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md)
- A pattern earns its cost only when it relieves a real, present pressure — not a hypothetical future one [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md)
- The five pressure types — coupling, volatility, coordination, boundary mismatch, duplication — are the diagnostic vocabulary for this entire course
- Simplicity is the right default until a pressure makes it expensive [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md)
- Patterns were observed in real field projects, not invented theoretically [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md)

## Go deeper

- [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md) — Ward Cunningham on patterns as a language rather than a catalog of isolated names
- [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md) — Fowler on growing into patterns gradually, with real cost-of-change analysis
- [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md) — the field-observed pattern corpus that grounded enterprise pattern thinking
- [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md) — Fowler on premature abstraction costs with the insurance pricing example

---

*[Next lesson: Diagnosing Pressure Before Adding Structure →](./L02-diagnosing-pressure.md)*
