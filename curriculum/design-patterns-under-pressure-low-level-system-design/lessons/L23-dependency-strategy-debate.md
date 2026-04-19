# Dependency Injection vs Service Locator vs Explicit Passing

**Module**: M08 · Criticism, Overuse, and Pattern Economics
**Type**: debate
**Estimated time**: 24 minutes
**Claim**: Contradiction 1 from Strata synthesis

---

## The core idea

This lesson covers a **real, unresolved debate** in the research. Fowler, writing from an enterprise and framework perspective, treats both Dependency Injection and Service Locator as legitimate mechanisms for decoupling callers from concrete implementations [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md). Nystrom, writing from a low-level systems perspective, is more skeptical of ambient access because it hides dependencies and recreates some of the structural damage of global state [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md) [S010](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S010-nystrom-singleton.md).

This lesson does not resolve the contradiction with a universal rule. Instead, it gives you the three strategies side by side so you can evaluate which cost dominates in a given system.

**Explicit passing**: a class declares its dependencies as constructor or method parameters. The caller is responsible for providing them. Nothing is hidden.

**Dependency Injection**: a container or framework is responsible for wiring dependencies and supplying them at construction time. The class still declares what it needs, but the assembly is automated.

**Service Locator**: a globally accessible registry provides dependencies on demand. The class calls out to the locator by name rather than declaring a dependency explicitly.

## Why they disagree

The disagreement is not random. Fowler is comparing assembly mechanisms in large applications where configuration flexibility, component substitution, and reusability are central. A locator-based design can simplify assembly when many components need the same service and passing it through every constructor creates repetitive plumbing.

Nystrom is reasoning about low-level, performance-sensitive, debugging-intensive systems where dependency visibility, timing, and testability matter sharply. In those systems, a class that silently calls `ServiceLocator.get("audio")` may work in production and fail in tests for reasons that are hard to diagnose. Making the dependency explicit is worth the wiring cost because the wiring cost is visible and bounded [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md).

## Example 1 — explicit passing

```python
class OrderNotifier:
    def __init__(self, email_sender: EmailSender, sms_sender: SmsSender):
        self._email = email_sender
        self._sms   = sms_sender

    def notify_placed(self, order: Order) -> None:
        self._email.send(order.customer_email, f"Order {order.id} confirmed")
        if order.customer.sms_opted_in:
            self._sms.send(order.customer.phone, f"Order {order.id} on its way")


# Wiring is visible at the composition root — one place, readable, auditable:
def build_order_notifier() -> OrderNotifier:
    return OrderNotifier(
        email_sender=SmtpEmailSender(host=config.smtp_host),
        sms_sender=TwilioSmsSender(api_key=config.twilio_key),
    )
```

Advantages: the class advertises its needs completely. Swapping `SmtpEmailSender` for a fake in tests is one-line. There are no surprises — reading `OrderNotifier.__init__` tells you exactly what it requires.

Disadvantages: in a large system with many layers, a commonly needed service (logging, telemetry, auth context) must be threaded through many constructors, which creates "dependency plumbing" noise [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md).

## Example 2 — dependency injection via container

```python
# Using a lightweight DI container pattern
class Container:
    def __init__(self):
        self._factories: dict[str, Callable] = {}

    def register(self, name: str, factory: Callable) -> None:
        self._factories[name] = factory

    def resolve(self, name: str):
        if name not in self._factories:
            raise KeyError(f"Unknown service: {name}")
        return self._factories[name]()


container = Container()
container.register("email_sender", lambda: SmtpEmailSender(host=config.smtp_host))
container.register("sms_sender",   lambda: TwilioSmsSender(api_key=config.twilio_key))
container.register("order_notifier", lambda: OrderNotifier(
    email_sender=container.resolve("email_sender"),
    sms_sender=container.resolve("sms_sender"),
))

notifier = container.resolve("order_notifier")
```

The class itself stays clean — it still receives its dependencies as constructor arguments. The container centralises wiring. This is the model used by large DI frameworks: the class declares needs, the framework assembles them.

This approach is strongest when the application has many components and centralising wiring in one place (the composition root) reduces scattered manual construction [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md).

## Example 3 — service locator and its visibility tradeoff

```python
class ServiceLocator:
    _services: dict[str, object] = {}

    @classmethod
    def register(cls, name: str, instance: object) -> None:
        cls._services[name] = instance

    @classmethod
    def get(cls, name: str) -> object:
        if name not in cls._services:
            raise KeyError(f"Service not found: {name}")
        return cls._services[name]


# Class uses the locator — dependencies are invisible from the signature
class OrderNotifier:
    def notify_placed(self, order: Order) -> None:
        email_sender = ServiceLocator.get("email_sender")   # hidden dependency
        email_sender.send(order.customer_email, f"Order {order.id} confirmed")
```

The hidden dependency problem: `OrderNotifier.notify_placed` looks like it needs only an `Order`. Nothing in its signature tells you it also needs an `EmailSender`. A test that creates an `OrderNotifier` and calls `notify_placed` will fail at runtime with "Service not found: email_sender" unless the locator was pre-configured — and in a test setup, that may not be obvious.

Nystrom's argument is that this is a structural problem, not just a style preference. The class's actual dependencies are not declared; they are discovered at runtime [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md). Fowler's counter is that for truly ambient services (logging, telemetry) where threading through constructors is uniformly painful, a locator may still be the least-bad option [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md).

**There is a real disagreement here.** The research does not yield a universal rule. The practical question is: in this specific system, which cost is higher — the wiring noise of explicit passing or the hidden-dependency cost of a locator? That is a judgment call that depends on system size, team size, testing discipline, and how widely the shared service is needed.

## Key points

- All three strategies solve the same problem: decoupling callers from concrete implementations [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md)
- Explicit passing is the most visible but creates plumbing overhead in large systems
- DI containers centralise wiring without hiding dependencies from the class declaration
- Service Locator hides dependencies from the signature, making testing and reasoning harder [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md)
- The research leaves the threshold unresolved because context changes the economics — the decision depends on wiring overhead vs visibility cost in a specific system

## Go deeper

- [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md) — most thorough comparison of all three approaches with assembly-context perspective
- [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md) — strongest critique of hidden dependency costs in low-level systems
- [S010](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S010-nystrom-singleton.md) — relevant warning about global access patterns becoming default architecture

---

*[← Previous lesson](./L22-yagni-and-abstraction-debt.md)* · *[Next lesson: When Languages Outgrow Pattern Templates →](./L24-language-evolution.md)*
