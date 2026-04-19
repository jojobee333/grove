# Domain Model: Behavior Where the Concepts Live

**Module**: M07 · Modeling Business Complexity  
**Type**: core  
**Estimated time**: 24 minutes  
**Claim**: C6; Contradiction 3 from Strata synthesis

---

## The core idea

Domain Model becomes valuable when business logic is no longer local, simple, or isolated. Fowler's definition is concise: the model incorporates both data and behavior. That matters because a genuinely complex domain does not just store facts — it enforces rules, relationships, and transitions across connected concepts [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md).

This is the positive counterpart to Transaction Script. Once logic is dense enough, scattering it across request handlers or service methods creates fragmentation — the behavior is there, but it has no natural home. Domain Model answers that pressure by letting the concepts that matter carry their own behavior. The rule about what makes an order eligible for cancellation lives on `Order`, not inside a service that happens to know that rule.

## Example 1 — behavior scattered without a domain model

```python
# Service method: all business rules live here, domain objects are just data bags
class OrderService:
    def cancel_order(self, order_id: int) -> None:
        order = self.db.find_order(order_id)
        customer = self.db.find_customer(order["customer_id"])
        items = self.db.find_items(order_id)

        # Rules duplicated across service methods:
        if order["status"] == "shipped":
            raise ValueError("Cannot cancel a shipped order")
        if order["status"] == "cancelled":
            raise ValueError("Already cancelled")

        # Refund logic also lives here, not on Order
        if order["status"] == "paid":
            total = sum(i["unit_price"] * i["quantity"] for i in items)
            discount = 0
            if customer["tier"] == "premium":
                discount = total * 0.05
            self.payment_service.refund(order["payment_ref"], total - discount)

        self.db.update_order(order_id, {"status": "cancelled"})
        self.notification_service.send_cancellation(customer["email"])
```

The service knows every business rule about orders. If there is a `process_refund` method in another service, it probably duplicates the discount calculation. The `Order` dictionary itself carries no behavior — it is just a data bag. This fragmentation is what Domain Model addresses [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md).

## Example 2 — rich domain model with behavior on the objects

```python
from decimal import Decimal
from enum import Enum, auto

class OrderStatus(Enum):
    PENDING   = auto()
    PAID      = auto()
    SHIPPED   = auto()
    CANCELLED = auto()

class Order:
    def __init__(self, customer: "Customer", items: list["OrderItem"]):
        self.customer = customer
        self.items    = items
        self.status   = OrderStatus.PENDING
        self._payment_ref: str | None = None

    def total(self) -> Decimal:
        return sum(i.subtotal() for i in self.items)

    def total_after_discount(self) -> Decimal:
        discount = self.customer.loyalty_discount()
        return self.total() * (1 - discount)

    def cancel(self) -> "RefundRequest | None":
        if self.status == OrderStatus.SHIPPED:
            raise ValueError("Cannot cancel a shipped order")
        if self.status == OrderStatus.CANCELLED:
            raise ValueError("Already cancelled")

        refund = None
        if self.status == OrderStatus.PAID:
            refund = RefundRequest(
                payment_ref=self._payment_ref,
                amount=self.total_after_discount()
            )

        self.status = OrderStatus.CANCELLED
        return refund    # caller handles side effects (payment, notification)

    def mark_paid(self, payment_ref: str) -> None:
        if self.status != OrderStatus.PENDING:
            raise ValueError("Only pending orders can be marked paid")
        self._payment_ref = payment_ref
        self.status = OrderStatus.PAID


class OrderItem:
    def __init__(self, product: "Product", quantity: int):
        self.product  = product
        self.quantity = quantity

    def subtotal(self) -> Decimal:
        return self.product.price * self.quantity
```

The cancellation logic — what states allow it, how the refund amount is calculated — now lives on `Order`. Any code that needs to cancel an order calls `order.cancel()`. The rule is in one place. The service layer becomes thin orchestration: call the domain method, handle the returned `RefundRequest`, and send the notification [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md).

## Example 3 — domain invariants that cannot be expressed in service code cleanly

The real power of Domain Model is enforcing invariants — rules that must always be true about a concept:

```python
class Subscription:
    def __init__(self, customer: "Customer", tier: str):
        self.customer = customer
        self._tier    = tier
        self._seats   = 1
        self._max_seats_for_tier = {"basic": 1, "team": 10, "enterprise": 999}

    def add_seat(self) -> None:
        max_seats = self._max_seats_for_tier[self._tier]
        if self._seats >= max_seats:
            raise ValueError(
                f"Tier '{self._tier}' allows at most {max_seats} seats"
            )
        self._seats += 1

    def upgrade_to(self, new_tier: str) -> None:
        if new_tier not in self._max_seats_for_tier:
            raise ValueError(f"Unknown tier: {new_tier}")
        if self._max_seats_for_tier[new_tier] < self._seats:
            raise ValueError(
                f"Cannot downgrade to '{new_tier}': {self._seats} seats "
                f"exceed the new limit of {self._max_seats_for_tier[new_tier]}"
            )
        self._tier = new_tier
```

The invariant — "a subscription cannot have more seats than its tier allows" — is enforced at every mutation point inside `Subscription`. It cannot be bypassed by any caller. If this rule lived in a service method, a future developer could add a second service path that writes seats directly and silently bypass the check. Domain Model makes the invariant structural, not procedural [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md).

## Key points

- Domain Model is justified when business behavior and relationships are too dense to stay procedural cleanly [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md)
- The pattern joins behavior and state inside the concepts that carry the rules — rules about orders live on `Order`
- Domain invariants become structural rather than procedural: they cannot be bypassed by callers
- The service layer becomes thin coordination, not the owner of business logic
- Rich object design is valuable only when the domain is genuinely rich enough to need it — Transaction Script remains valid below that threshold

## Go deeper

- [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md) — primary source on behavior-plus-data modeling
- [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md) — companion critique that sharpens what Domain Model is not

---

*[← Previous lesson](./L19-transaction-script.md)* · *[Next lesson: Anemic Domain Model and the Complexity Curve →](./L21-anemic-domain-model.md)*