# Diagnosing Pressure Before Adding Structure

**Module**: M01 · Pressure-First Foundations  
**Type**: applied  
**Estimated time**: 24 minutes  
**Claim**: C1 from Strata synthesis

---

## The core idea

Picking a pattern before diagnosing a pressure is like prescribing medicine before examining the patient. The pattern name feels like progress. But without a real diagnosis, you might be solving the wrong problem — or no problem at all.

A pressure diagnosis is a short, precise statement that names a concrete cost the current design keeps paying. It does not use pattern names. It does not use vague words like "messy" or "complex." It says exactly what keeps going wrong, why the current structure makes it worse, and how often that cost returns as the system evolves.

This lesson gives you a systematic way to produce that diagnosis. It draws on the insight that patterns should be grown into gradually as their costs become justified, not imposed speculatively on healthy code [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md). It also reinforces that any future-facing abstraction starts with costs — build cost, carry cost, and the risk of solving the wrong future problem [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

## The five-question diagnostic loop

Before naming a pattern, run through these questions in order. They convert design pain into a structured statement of pressure.

**Question 1: What concrete behavior is painful right now?**  
Be specific. "This class is too big" is not specific. "Adding a new payment method requires editing three separate handler files" is specific. Name the exact change that is currently expensive.

**Question 2: What kind of pain is this?**  
Match it to the pressure vocabulary from L01: coupling, volatility, coordination, boundary mismatch, or duplication. If more than one applies, choose the one that maps to the most frequent change trigger.

**Question 3: What happens the next time this cost appears?**  
Imagine adding one more variant, one more environment, one more edge case. Does the cost grow faster than the codebase? Does it require touching things that should not need to change? That growth rate is your pressure severity indicator.

**Question 4: What is the smallest structure that would absorb this cost?**  
Not the most elegant. Not the most future-proof. The *smallest one that works today*. This constraint forces honesty. A pattern that solves a future problem does not answer this question.

**Question 5: What new cost does that structure introduce?**  
Every pattern has a readability cost, a wiring cost, and a learning cost. If the pattern's present benefit (Question 4) is smaller than the cost it introduces (Question 5), the pattern is not yet justified.

These five questions form a triage loop. They do not guarantee the right pattern. But they prevent two common failure modes: cargo-cult abstraction (pattern before pressure) and paralysis (refusing structure because the perfect design is unclear).

## Why it matters

Many poor design choices look reasonable in hindsight because the pattern itself was correct — just applied too early or too broadly. A service layer is good design in many systems. But a service layer that wraps one trivial endpoint is pure overhead. A repository is a good design for complex query logic. But a repository hiding a single `SELECT *` is ceremony.

Without a diagnosis, you cannot make that distinction. You can only make it by naming the pressure clearly, checking whether it is real today, and matching it to the smallest structure that absorbs it [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

Diagnosis also gives you a language for design conversations. "We added constructor injection because test isolation required three fake implementations inline" is an explainable, reversible decision. "We added injection because clean architecture" is not — it offers no way to evaluate whether the cost was worth it.

## Example 1 — diagnosing coupling pressure in a notification service

Here is a naive notification handler:

```python
class OrderNotifier:
    def notify(self, order):
        sender = SmtpSender(host="mail.example.com", port=587)
        sender.send(
            to=order.customer_email,
            subject=f"Order {order.id} confirmed",
            body=f"Total: {order.total}"
        )
```

Run the five-question loop:

1. **Painful behavior**: Every test that calls `notify()` either sends a real email or raises a connection error. Testing requires network access or mocking at the socket level.
2. **Pain type**: Coupling pressure. `OrderNotifier` constructs its own concrete dependency (`SmtpSender`) at call time. The sender cannot be substituted without editing the method.
3. **Next occurrence**: Adding an SMS channel, or running tests offline, both require editing the internals of `notify()` directly.
4. **Smallest structure**: Accept the sender as a constructor parameter instead of building it internally.
5. **New cost**: The caller must now provide the sender. One more line of wiring per instantiation site. Low cost.

Diagnosis: coupling pressure on `OrderNotifier`'s sender construction is real today. The smallest structure that absorbs it is constructor injection of the sender. The wiring cost is low. The pattern is justified now.

## Example 2 — diagnosing "not yet" in a report exporter

Now consider a simpler case:

```python
class ReportExporter:
    def export_pdf(self, report_data):
        doc = PdfDocument()
        doc.add_page(report_data.summary)
        doc.add_page(report_data.detail)
        return doc.render()
```

Run the five-question loop:

1. **Painful behavior**: Hard to name one concretely right now. It works. One format, one library, no environment differences.
2. **Pain type**: No active pressure yet. Nothing is changing along multiple axes.
3. **Next occurrence**: If a Word export format is added in six months, *that* event will be the coupling trigger.
4. **Smallest structure**: None today. Direct construction is still correct.
5. **New cost**: Any abstraction added today has real build and carry costs with no present benefit.

Diagnosis: no pressure is active. Direct construction is right. An abstraction here is premature [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

This second example is as important as the first. Knowing when a pressure is *not yet* present is the other half of the diagnostic skill. The ability to say "not now, but watch for this trigger" is more valuable than the ability to identify patterns.

## Example 3 — diagnosing duplication pressure across handlers

Consider a pair of order handlers that each implement the same discount logic:

```python
def process_standard_order(order):
    if order.quantity >= 10:
        rate = 0.10
    elif order.is_returning_customer:
        rate = 0.05
    else:
        rate = 0.0
    return order.subtotal * (1 - rate)

def process_wholesale_order(order):
    if order.quantity >= 10:
        rate = 0.10  # same rule, copy-pasted
    elif order.is_returning_customer:
        rate = 0.05  # same rule, copy-pasted
    else:
        rate = 0.0
    return order.subtotal * (1 - rate)
```

Run the five-question loop:

1. **Painful behavior**: When the bulk discount threshold changes from 10 to 15, the change must be made in every handler. Miss one and pricing is inconsistent across order types.
2. **Pain type**: Duplication pressure. The same business rule — discount logic — appears in multiple places and will drift apart as requirements change.
3. **Next occurrence**: Each new order type (event orders, subscription orders, partner orders) will copy the same block. The rule becomes harder to find and keep consistent.
4. **Smallest structure**: Extract the discount calculation into a shared `calculate_discount(order)` function. All handlers call it. One change propagates everywhere.
5. **New cost**: One new shared function. Low. The tradeoff is strongly favourable.

Diagnosis: duplication pressure on the discount rule is real and growing. A simple extraction resolves it today. If the rules later need to vary by context — promotion codes, customer tiers, regional policies — *that* is when a Strategy pattern (isolating pricing variants as swappable objects) earns its abstraction cost [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md). For now, a function is enough.

This third example also illustrates that not every pressure diagnosis ends with a named design pattern. Sometimes the five-question loop leads to a simple extraction, not a formal abstraction. Reaching for a pattern when a function will do is the same anti-dogmatic failure in the other direction. The diagnostic discipline matters not because it always recommends patterns, but because it makes the recommendation — pattern or no pattern — defensible.

## A word on pressure severity

Not every pressure that exists is a pressure worth addressing. Some pressures are real but small. A lightly duplicated helper function might be annoying but not worth a full abstraction layer. The research supports using reversibility as the tiebreaker: if a decision can be made cheaply later (when the pressure is clearer), defer it [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md). If a decision will be expensive to retrofit later (because the integration surface is already large or volatile), it may justify earlier attention even without maximum clarity.

This is not a formula. It is a judgment call informed by knowing what the most common and costly pressures look like in real systems [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md).

## Key points

- Diagnose the pressure before naming a pattern — the same symptom word can hide different underlying problems
- Name the pressure in plain language: what concrete change keeps being expensive, and why the current structure makes it worse
- The five-question loop forces honesty about whether the pattern's present benefit outweighs its present cost [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md)
- Knowing when a pressure is *not yet present* is as important as identifying when it is [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md)

## Go deeper

- [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md) — Fowler on pressure, reversibility, and growing into patterns rather than imposing them
- [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md) — the economic cost model for future-facing abstraction with the pricing engine example

---

*[← Previous lesson](./L01-why-patterns-exist.md)* · *[Next lesson: Pattern Languages and Design Vocabulary →](./L03-pattern-languages.md)*
