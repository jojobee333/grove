# Dependency Injection as a Construction Boundary

**Module**: M02 · Construction and Runtime Variation  
**Type**: core  
**Estimated time**: 24 minutes  
**Claim**: C2 from Strata synthesis

---

## The core idea

**Dependency Injection** (DI) solves a specific and common problem: business code should not also be responsible for deciding which concrete collaborators it builds. When construction logic is mixed into application behavior, every change in configuration or implementation leaks into ordinary code. The result is coupling pressure: changing the sender library, the storage backend, or the environment requires editing files that should know nothing about infrastructure.

Fowler's deeper principle is broader than any pattern name: **separate configuration from use** [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md). Once you see injection that way, it becomes a boundary around construction pressure rather than a ritual of frameworks and containers.

Let us define a few terms before going further.

A **dependency** is any object your code needs to do its job. If `OrderNotifier` sends emails, the email sender is a dependency. If `ReportBuilder` reads from a database, the query executor is a dependency.

**Direct construction** means the class creates its own dependencies inside its methods or `__init__`. "I need an email sender, so I will build one right here."

**Injection** means the class declares what it needs and receives it from the outside — typically at construction time. "I need an email sender. Pass one to me when you create me."

The difference is where the decision about *which* concrete thing to use gets made. Direct construction hides that decision inside the class. Injection surfaces it at the construction site, where it belongs.

## Three styles of injection

Fowler identifies three main forms, each with different tradeoffs [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md):

**Constructor injection** puts required dependencies in `__init__`. The class cannot be created without them, which makes valid-object construction easy to enforce and makes the dependency visible immediately when you read the class.

**Setter injection** accepts dependencies through methods after construction. This is useful when dependencies vary after creation or when some are optional, but it allows objects to exist in a partially configured state, which can introduce subtle bugs.

**Factory methods or injection containers** move the assembly responsibility entirely outside the class and into a configuration layer. This is the model used by most DI frameworks.

For beginners, constructor injection is the clearest starting point because it is explicit and easy to read.

## Why it matters

Injection matters practically because many low-level systems need implementation variation long before they need rich behavioral abstraction. Tests may need a fake dependency. Production may need a real adapter. Local development may need a cheaper or in-memory version.

Without injection, every one of those scenarios requires editing the class itself. With injection, you change the construction site — one place — and the class never needs to know.

Injection is also how patterns compose. When a Service Layer calls a Domain Model, when a Repository calls a Data Mapper, when a notifier calls a transport — all of those relationships are wiring decisions. Injection keeps those wiring decisions visible and concentrated, which makes the system easier to understand and test [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md).

## Example 1 — naive direct construction

```python
class OrderNotifier:
    def notify(self, order):
        # Builds its own sender every time — hard to test, hard to swap
        sender = SmtpSender(host="mail.example.com", port=587)
        sender.send(
            to=order.customer_email,
            subject=f"Order {order.id} confirmed",
            body=f"Your total is {order.total}"
        )
```

Problems with this design:
- Every test call sends a real email or raises a network error
- Switching to SendGrid requires editing `notify()` directly
- Adding an SMS channel requires adding more construction logic to the same method
- You cannot swap the sender per environment without branching inside the method

## Example 2 — constructor injection applied

```python
class OrderNotifier:
    def __init__(self, sender):
        # Dependency declared at construction — visible, testable, swappable
        self._sender = sender

    def notify(self, order):
        self._sender.send(
            to=order.customer_email,
            subject=f"Order {order.id} confirmed",
            body=f"Your total is {order.total}"
        )

# Wiring lives in one place, separate from business logic:
# In tests:
notifier = OrderNotifier(sender=FakeSender())
# In production:
notifier = OrderNotifier(sender=SmtpSender(host="mail.example.com", port=587))
```

Now the class is testable in isolation. Swapping the sender requires no edits to `OrderNotifier`. Adding a new environment or transport variant is a construction-site change, not a business-logic change. The separation of configuration from use is complete [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md).

**There is a real disagreement here.** The research notes that some canonical creational patterns — including injection-heavy designs — can lose to simpler direct construction or plain functions when the problem is small [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md). If your class will only ever have one concrete dependency and no testing seam is needed, direct construction is still the right choice. Injection is not better because it is abstract. It is better when the coupling pressure from construction is real. The evidence supports a conditional rule, not a blanket endorsement of injection as always necessary [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

## Example 3 — multiple injected dependencies and test isolation

Injection scales naturally to classes with multiple collaborators. Consider an order service that coordinates three dependencies:

```python
class OrderService:
    def __init__(
        self,
        repo: OrderRepository,
        notifier: NotificationSender,
        auditor: AuditLogger,
    ):
        self._repo = repo
        self._notifier = notifier
        self._auditor = auditor

    def place_order(self, order_data: dict) -> Order:
        order = Order.from_dict(order_data)
        self._repo.save(order)
        self._notifier.send_confirmation(order)
        self._auditor.log("order_placed", order.id)
        return order
```

With constructor injection, each dependency is independently replaceable in tests:

```python
def test_place_order_audits_action():
    repo     = FakeOrderRepository()
    notifier = FakeSender()      # no real emails
    auditor  = FakeAuditor()     # captures logged events

    service = OrderService(repo, notifier, auditor)
    service.place_order({"id": "ORD-001", "total": 99.00})

    assert "order_placed" in auditor.logged_events
```

No global state. No module patching. The test is self-contained because the constructor *declares* everything it needs. This is separation of configuration from use in full effect: the business logic of `place_order` stays identical regardless of which concrete implementations are wired in [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md).

Contrast this with the same class written with direct construction: every test would either hit a real database, send real emails, and write real audit records — or require module-level patching at multiple points. Injection moves all those seams to the construction site, where they are visible and manageable.

## Limitations

Injection adds wiring overhead at the construction site. In large systems this is managed by dependency injection containers (frameworks that auto-wire based on type or configuration). In small systems, plain constructor injection is enough and often clearer. Fowler notes that the more durable principle is the *separation of configuration from use* — the specific injection mechanism matters less than keeping assembly logic out of business code [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md).

## Key points

- Dependency Injection separates the decision of *which* concrete thing to use from the class that *uses* it [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md)
- Constructor injection is the clearest form: required dependencies are declared up-front and visible
- Injection earns its cost when testing, deployment variation, or implementation substitution are real pressures
- It is not universally required: direct construction is still correct for small, stable, single-implementation classes [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md)
- The deeper principle is separation of configuration from use, not the mechanics of any specific injection style

## Go deeper

- [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md) — Fowler's full comparison of constructor, setter, and interface injection with service locator tradeoffs
- [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md) — helps calibrate when to grow into injection gradually rather than imposing it early

---

*[← Previous lesson](./L03-pattern-languages.md)* · *[Next lesson: Plugin as a Runtime Extension Pattern →](./L05-plugin-pattern.md)*
