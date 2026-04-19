# YAGNI, Premature Indirection, and Abstraction Debt

**Module**: M08 · Criticism, Overuse, and Pattern Economics
**Type**: core
**Estimated time**: 24 minutes
**Claim**: C5 from Strata synthesis

---

## The core idea

**YAGNI** stands for "You Aren't Gonna Need It." Fowler's formulation is precise: do not implement something until it is actually needed [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md). The principle is not about avoiding all abstraction. It is about avoiding abstraction whose cost is paid today for a benefit that is still imaginary.

Every abstraction has costs Fowler names explicitly: **build cost** (time spent creating it), **delay cost** (the real feature is delayed while the abstraction is being built), **carry cost** (every future reader must understand and maintain it), and **optimisation cost** (if the future requirement turns out different from what was anticipated, the abstraction makes the real solution harder to build, not easier).

When applied to design patterns, the YAGNI argument becomes sharp. A factory hierarchy that exists "because we might need multiple implementations someday" is abstraction debt when there is currently one implementation. A repository with elaborate query methods that exist "because reporting might need them later" is carry cost for a future that may never arrive. The pattern is not wrong by form. It is wrong by timing [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md).

## Why it matters

This is the economic center of the entire course. Every preceding lesson showed when a pattern is justified. This lesson shows what happens when you add the pattern before the justification arrives. If you skip this lesson, the risk is that the course produces engineers who can name patterns fluently but add them before they are needed — which is the most common failure mode in real design work [S006](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S006-sourcemaking-overuse.md).

Fowler frames this as an economic argument, not an aesthetic one. The question is not "is this abstraction theoretically sound?" It is "does this abstraction solve a cost I am already paying?"

## Example 1 — the speculative factory

This is a common early-career pattern mistake. A developer is implementing one payment processor and decides to build a full abstraction in case more are added later:

```python
# Present reality: only Stripe exists
class StripeProcessor:
    def charge(self, amount: int, token: str) -> dict:
        return stripe.charge(amount=amount, source=token)

# What gets built instead:
from abc import ABC, abstractmethod

class PaymentProcessor(ABC):
    @abstractmethod
    def charge(self, amount: int, token: str) -> dict: ...

class StripeProcessor(PaymentProcessor):
    def charge(self, amount: int, token: str) -> dict:
        return stripe.charge(amount=amount, source=token)

class PayPalProcessor(PaymentProcessor):
    # Does not exist yet. Stubbed out "for the future"
    def charge(self, amount: int, token: str) -> dict:
        raise NotImplementedError("PayPal not implemented yet")

class ProcessorFactory:
    _registry: dict[str, type[PaymentProcessor]] = {
        "stripe": StripeProcessor,
        "paypal": PayPalProcessor,
    }

    @classmethod
    def create(cls, name: str) -> PaymentProcessor:
        if name not in cls._registry:
            raise ValueError(f"Unknown processor: {name}")
        return cls._registry[name]()
```

The developer has paid build cost (wrote three classes and a registry) and carry cost (every reader must now understand the factory, the registry, and the unimplemented stub) for a benefit that does not exist yet. If PayPal support is eventually added, the factory might not even match how PayPal's API works. The abstraction may need to be redesigned anyway. The pattern was applied correctly in form but incorrectly in timing [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

The YAGNI-correct version is the single `StripeProcessor` class. When a second processor genuinely arrives, the abstraction is introduced then — with full knowledge of what both implementations actually need.

## Example 2 — premature repository abstraction

```python
# Actual usage: one query exists, from one service
class OrderRepository:
    def find_by_id(self, order_id: int) -> Order | None:
        row = self.db.query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
        return self._map(row) if row else None

    # Added speculatively — no consumer exists yet:
    def find_by_customer_since(self, customer_id: int, since: datetime) -> list[Order]:
        raise NotImplementedError

    def find_pending_older_than(self, cutoff: datetime) -> list[Order]:
        raise NotImplementedError

    def find_by_status_and_region(self, status: str, region: str) -> list[Order]:
        raise NotImplementedError

    def count_by_week(self) -> dict[str, int]:
        raise NotImplementedError
```

The repository has four unimplemented methods based on reporting requirements that were mentioned in a planning conversation. Those methods now exist, raise `NotImplementedError`, and create false confidence that the feature is partially built. They also mislead every reader about the actual capabilities of the repository. The only honest solution is to not write them until they are actually needed [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

## Example 3 — the pricing engine that over-abstracted the wrong future

Fowler's own example is a pricing engine for storm risk insurance. The correct task is to implement storm-risk pricing. The developer anticipates that piracy-risk pricing will be needed later and builds a general pricing framework to cover both:

```python
# What the task actually requires right now:
def calculate_storm_premium(policy: Policy) -> Decimal:
    base   = policy.insured_value * Decimal("0.002")
    zone   = storm_zone_multiplier(policy.location)
    return base * zone

# What gets built instead: a general risk-pricing framework
from abc import ABC, abstractmethod

class RiskFactor(ABC):
    @abstractmethod
    def load(self, policy: "Policy") -> Decimal: ...

class ZoneFactor(RiskFactor):
    def load(self, policy: "Policy") -> Decimal:
        return storm_zone_multiplier(policy.location)

class PolicyHistoryFactor(RiskFactor):
    def load(self, policy: "Policy") -> Decimal:
        # Not implemented — planned for piracy risk that doesn't exist yet
        raise NotImplementedError

class PremiumCalculator:
    def __init__(self, base_rate: Decimal, factors: list[RiskFactor]):
        self.base_rate = base_rate
        self.factors   = factors

    def calculate(self, policy: "Policy") -> Decimal:
        total = policy.insured_value * self.base_rate
        for factor in self.factors:
            total *= factor.load(policy)
        return total
```

The general framework added delay cost (the storm feature shipped later), carry cost (three new abstractions to understand), and optimisation cost (when piracy risk actually arrives, it turns out the load-multiplier model does not fit its pricing structure anyway — piracy risk uses additive surcharges, not multiplicative factors). The framework must be redesigned around real requirements, but now there is an established abstraction to work around [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

The right approach was to implement storm pricing simply, then introduce the abstraction when a second type of risk actually appeared and the common shape became visible.

## Key points

- YAGNI applies to design patterns and abstractions, not just user-facing features: every layer is code with a build, carry, and optimisation cost [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md)
- The failure mode is paying today's real cost for tomorrow's imaginary benefit [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md)
- Evolutionary design is the alternative: add patterns as pressures appear, not before
- A pattern applied at the right time with the right justification is good design; the same pattern applied speculatively is abstraction debt
- Optimisation cost is often the most damaging: the speculative abstraction shapes the design in a way that makes the real future solution harder

## Go deeper

- [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md) — full economic case for deferring abstractions until they are needed
- [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md) — design as evolutionary growth into patterns rather than upfront blueprinting

---

*[← Previous lesson](./L21-anemic-domain-model.md)* · *[Next lesson: Dependency Injection vs Service Locator vs Explicit Passing →](./L23-dependency-strategy-debate.md)*
