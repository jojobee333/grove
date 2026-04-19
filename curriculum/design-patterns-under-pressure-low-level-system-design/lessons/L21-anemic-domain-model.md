# Anemic Domain Model and the Complexity Curve

**Module**: M07 · Modeling Business Complexity
**Type**: debate
**Estimated time**: 22 minutes
**Claim**: C5; Contradiction 3 from Strata synthesis

---

## The core idea

**Anemic Domain Model** is Fowler's critique of a specific mismatch: the system uses object-oriented class names and structures, but the business logic lives somewhere else — usually in a collection of service classes that operate directly on data-bag objects [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md).

The cost of anemia is not that the code looks wrong. The code can look reasonably organized. The cost is that business rules are fragmented across service methods that each work on the same underlying concept without a shared behavioral home. When the `Order` class is just fields and getters, every rule about orders — what makes one cancellable, how discounts compose, how state transitions happen — lives somewhere else, often duplicated.

This lesson is a **debate** lesson, not a simple condemnation. Transaction Script is legitimate when complexity is modest (Lesson 19 made that case). Domain Model is valuable when complexity is dense (Lesson 20 showed why). Anemia appears in the dangerous middle: a system that adopted Domain Model structure but never put behavior inside it. The question this lesson asks is not "scripts or objects?" but "if you chose objects, did you actually give them their behavior?"

## Why it matters

Recognizing anemia matters practically because it is the most common way good-looking design silently fails. Many teams add service layers, domain objects, and repositories — and then gradually hollow out the domain objects until they are just database rows dressed in Python or Java. The outer architecture looks fine. The inner value is gone.

For a learner who has now studied both Transaction Script and Domain Model, the lesson is this: the anti-pattern is not choosing one over the other deliberately. It is adopting Domain Model form while accidentally keeping Transaction Script behavior.

## Example 1 — what anemia looks like in practice

Here is a billing system with an anemic `Invoice` object and a service that holds all the rules:

```python
# The domain object: no behavior, just data
class Invoice:
    def __init__(self):
        self.id             = None
        self.customer_id    = None
        self.line_items     = []
        self.status         = "draft"
        self.discount_code  = None
        self.total          = 0
        self.paid_at        = None

# All business behavior lives in the service
class InvoiceService:
    def apply_discount(self, invoice: Invoice, code: str) -> None:
        policy = self.discount_repo.find(code)
        if invoice.status != "draft":
            raise ValueError("Discounts only apply to draft invoices")
        if invoice.total < policy.minimum_order:
            raise ValueError(f"Order below minimum for code {code}")
        invoice.total = invoice.total * (1 - policy.rate)
        invoice.discount_code = code

    def finalise(self, invoice: Invoice) -> None:
        if invoice.status != "draft":
            raise ValueError("Already finalised")
        if not invoice.line_items:
            raise ValueError("Cannot finalise an empty invoice")
        invoice.status = "final"

    def mark_paid(self, invoice: Invoice, paid_at) -> None:
        if invoice.status != "final":
            raise ValueError("Only final invoices can be paid")
        invoice.paid_at = paid_at
        invoice.status  = "paid"
```

The code is organized. But `Invoice` is just a mutable bag of fields. Every rule about it — what states allow discounts, what constitutes a valid finalisation, when payment is permitted — lives in `InvoiceService`. If a second service emerges (say, a bulk-billing workflow), it will likely duplicate some of these rules or work around them in ways the first service does not anticipate [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md).

## Example 2 — the same design with behavior where it belongs

Moving the rules onto `Invoice` does not mean removing the service layer. It means the service layer becomes coordination, not logic ownership:

```python
from enum import Enum, auto
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

class InvoiceStatus(Enum):
    DRAFT    = auto()
    FINAL    = auto()
    PAID     = auto()

@dataclass
class LineItem:
    description: str
    unit_price:  Decimal
    quantity:    int

    def subtotal(self) -> Decimal:
        return self.unit_price * self.quantity

class Invoice:
    def __init__(self, customer_id: int):
        self.customer_id    = customer_id
        self.line_items:    list[LineItem] = []
        self.status         = InvoiceStatus.DRAFT
        self._discount_rate = Decimal("0")
        self._discount_code: str | None = None

    def total_before_discount(self) -> Decimal:
        return sum(item.subtotal() for item in self.line_items)

    def total(self) -> Decimal:
        return self.total_before_discount() * (1 - self._discount_rate)

    def apply_discount(self, code: str, rate: Decimal, minimum_order: Decimal) -> None:
        if self.status != InvoiceStatus.DRAFT:
            raise ValueError("Discounts only apply to draft invoices")
        if self.total_before_discount() < minimum_order:
            raise ValueError(f"Order does not meet minimum for code '{code}'")
        self._discount_rate = rate
        self._discount_code = code

    def finalise(self) -> None:
        if self.status != InvoiceStatus.DRAFT:
            raise ValueError("Already finalised")
        if not self.line_items:
            raise ValueError("Cannot finalise an empty invoice")
        self.status = InvoiceStatus.FINAL

    def mark_paid(self, paid_at: datetime) -> None:
        if self.status != InvoiceStatus.FINAL:
            raise ValueError("Only final invoices can be paid")
        self.status  = InvoiceStatus.PAID
        self._paid_at = paid_at

# The service layer: thin coordination that calls domain methods
class InvoiceService:
    def apply_discount(self, invoice: Invoice, code: str) -> None:
        policy = self.discount_repo.find(code)
        invoice.apply_discount(code, policy.rate, policy.minimum_order)

    def finalise(self, invoice: Invoice) -> None:
        invoice.finalise()
        self.invoice_repo.save(invoice)
        self.notification_service.send_finalisation_notice(invoice)
```

The rules about what makes a valid discount application now live on `Invoice`. Any caller — the primary service, a bulk-billing workflow, a testing fixture — gets the same rule enforcement for free by calling the domain method [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md) [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md).

## Example 3 — distinguishing anemia from a healthy thin service

**There is a real disagreement here.** Not every service-heavy design is anemic. The distinction is about what the service owns:

```python
# Healthy: service coordinates and delegates to rich domain objects
class PlaceOrderService:
    def execute(self, customer_id: int, cart: Cart) -> Order:
        customer = self.customer_repo.find(customer_id)
        order    = Order(customer=customer)

        for cart_item in cart.items:
            product = self.product_repo.find(cart_item.product_id)
            order.add_item(product, cart_item.quantity)  # domain method enforces invariants

        if customer.has_active_promotion():
            order.apply_promotion(customer.active_promotion())  # domain method

        self.order_repo.save(order)
        self.event_bus.publish(OrderPlaced(order_id=order.id))
        return order


# Anemic: service owns the rule, domain object is a bystander
class PlaceOrderService:
    def execute(self, customer_id: int, cart: Cart) -> Order:
        customer = self.customer_repo.find(customer_id)
        order    = Order()
        order.customer_id = customer.id

        total = Decimal("0")
        for cart_item in cart.items:
            product    = self.product_repo.find(cart_item.product_id)
            line_total = product.price * cart_item.quantity
            total     += line_total
            # Service builds the order line-by-line, checking rules in-line
            if product.stock < cart_item.quantity:
                raise ValueError(f"Insufficient stock for {product.name}")
            order.items.append({
                "product_id": product.id,
                "quantity":   cart_item.quantity,
                "unit_price": product.price,
            })

        if customer.tier == "premium":
            total = total * Decimal("0.9")

        order.total = total
        self.order_repo.save(order)
```

The second version has `Order` as a passive container. All decisions — stock checking, promotion rules, pricing — are computed and written by the service. The behavioral richness that should live on `Order` is scattered through the service method instead [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md).

The useful test: if `Order.cancel()` or `Order.apply_promotion()` does not exist, where does the rule about what makes cancellation valid actually live? If the answer is "somewhere in the service," the model is anemic.

## Key points

- Anemic Domain Model keeps the vocabulary of OO design while quietly moving all the behavior into services [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md)
- The cost is fragmented rules: every service that touches an object must know the rules about it, and they drift apart
- Thin orchestration services are healthy; behavior-owning services that bypass domain methods are the anti-pattern
- The test: does `Order.cancel()` exist and enforce its own preconditions? Or must callers know the rules externally?
- Transaction Script is not anemia — it is a deliberate choice for simpler workflows; anemia is a failure to honor the Domain Model choice that was already made

## Go deeper

- [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md) — primary diagnosis of the anti-pattern and what thin services should look like
- [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md) — what a genuinely rich domain model provides that anemia cannot

---

*[← Previous lesson](./L20-domain-model.md)* · *[Next lesson: YAGNI, Premature Indirection, and Abstraction Debt →](./L22-yagni-and-abstraction-debt.md)*
