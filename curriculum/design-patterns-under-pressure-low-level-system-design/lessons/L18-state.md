# State: Making Behavioral Change Explicit

**Module**: M06 · Behavioral Patterns One by One  
**Type**: applied  
**Estimated time**: 24 minutes  
**Claim**: C4 from Strata synthesis

---

## The core idea

State is a response to branching pain. When code repeatedly checks flags, modes, or status values to decide what behavior is legal, that logic often starts to sprawl. Nystrom's chapter is strong because it does not jump straight to the full State object pattern. It first shows that even an enum-backed finite state machine (FSM) can remove illegal combinations and make transitions easier to follow. Only after that does it justify the full pattern, where state-specific behavior and state-specific data live together in dedicated objects [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md).

This gradual move matters. It shows that deep pattern study is not about escalating to dynamic dispatch immediately. It is about matching the level of structure to the level of behavioral complexity.

## Why it matters

For practical design, State matters in editors, workflows, games, and order systems where legal transitions matter and behavior changes over time. It also matters as a lesson in restraint. Sometimes an enum plus switch is enough. Sometimes you need full state objects. Good design depends on telling those apart.

## Example 1 — the problem: scattered flag checks

```python
class Order:
    def __init__(self):
        self.status = "pending"
        self.is_paid = False
        self.is_shipped = False
        self.is_cancelled = False

    def pay(self) -> None:
        if self.is_paid:
            raise ValueError("Already paid")
        if self.is_cancelled:
            raise ValueError("Cannot pay cancelled order")
        if self.is_shipped:
            raise ValueError("Already shipped")
        self.is_paid = True
        self.status = "paid"

    def ship(self) -> None:
        if not self.is_paid:
            raise ValueError("Must be paid before shipping")
        if self.is_shipped:
            raise ValueError("Already shipped")
        if self.is_cancelled:
            raise ValueError("Cannot ship cancelled order")
        self.is_shipped = True
        self.status = "shipped"

    def cancel(self) -> None:
        if self.is_shipped:
            raise ValueError("Cannot cancel shipped order")
        self.is_cancelled = True
        self.status = "cancelled"
```

The validation logic in every method checks a combination of three boolean flags. Adding a new state (say, `refunded`) requires touching every method again. The class knows nothing about which transitions are actually legal — it reconstructs that knowledge from flags every time.

## Example 2 — enum-backed FSM (simpler intermediate step)

```python
from enum import Enum, auto

class OrderStatus(Enum):
    PENDING   = auto()
    PAID      = auto()
    SHIPPED   = auto()
    CANCELLED = auto()

# Legal transitions defined once:
TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING:   {OrderStatus.PAID, OrderStatus.CANCELLED},
    OrderStatus.PAID:      {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED:   set(),        # terminal — no transitions out
    OrderStatus.CANCELLED: set(),        # terminal
}

class Order:
    def __init__(self):
        self.status = OrderStatus.PENDING

    def transition_to(self, new_status: OrderStatus) -> None:
        if new_status not in TRANSITIONS[self.status]:
            raise ValueError(
                f"Cannot transition from {self.status.name} to {new_status.name}"
            )
        self.status = new_status

    def pay(self)    -> None: self.transition_to(OrderStatus.PAID)
    def ship(self)   -> None: self.transition_to(OrderStatus.SHIPPED)
    def cancel(self) -> None: self.transition_to(OrderStatus.CANCELLED)
```

The valid transitions are now declared once in `TRANSITIONS`. Adding a new state means updating that dictionary, not auditing every method. The methods themselves become thin wrappers around `transition_to()`. This is Nystrom's first recommendation: an enum-backed FSM before reaching for full State objects [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md).

## Example 3 — full State pattern for behavior that differs per state

When different states need different behavior, not just different transitions, the full State pattern moves behavior into state objects:

```python
from abc import ABC, abstractmethod

class OrderState(ABC):
    @abstractmethod
    def pay(self, order: "Order") -> None: ...

    @abstractmethod
    def ship(self, order: "Order") -> None: ...

    @abstractmethod
    def cancel(self, order: "Order") -> None: ...


class PendingState(OrderState):
    def pay(self, order: "Order") -> None:
        order.charge_payment()          # behavior unique to pending → paid
        order.state = PaidState()

    def ship(self, order: "Order") -> None:
        raise ValueError("Cannot ship an unpaid order")

    def cancel(self, order: "Order") -> None:
        order.send_cancellation_notice()
        order.state = CancelledState()


class PaidState(OrderState):
    def pay(self, order: "Order") -> None:
        raise ValueError("Already paid")

    def ship(self, order: "Order") -> None:
        order.notify_warehouse()        # behavior unique to paid → shipped
        order.state = ShippedState()

    def cancel(self, order: "Order") -> None:
        order.issue_refund()            # refund required because payment was taken
        order.state = CancelledState()


class ShippedState(OrderState):
    def pay(self, order: "Order")    -> None: raise ValueError("Already shipped and paid")
    def ship(self, order: "Order")   -> None: raise ValueError("Already shipped")
    def cancel(self, order: "Order") -> None: raise ValueError("Cannot cancel shipped order")


class CancelledState(OrderState):
    def pay(self, order: "Order")    -> None: raise ValueError("Order is cancelled")
    def ship(self, order: "Order")   -> None: raise ValueError("Order is cancelled")
    def cancel(self, order: "Order") -> None: raise ValueError("Already cancelled")


class Order:
    def __init__(self):
        self.state: OrderState = PendingState()

    def pay(self)    -> None: self.state.pay(self)
    def ship(self)   -> None: self.state.ship(self)
    def cancel(self) -> None: self.state.cancel(self)

    def charge_payment(self) -> None:        ...
    def notify_warehouse(self) -> None:      ...
    def issue_refund(self) -> None:          ...
    def send_cancellation_notice(self) -> None: ...
```

Each state class carries its own behavior. `PendingState.cancel()` sends a notice; `PaidState.cancel()` issues a refund. That difference lives inside the state object, not inside a growing chain of `if self.status == "paid" and not self.is_refunded` conditions. The `Order` class itself stays thin — it delegates every behavior call to the current state [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md).

## Key points

- State becomes valuable when flag-heavy branching and illegal combinations are making behavior hard to manage [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md)
- An enum-backed FSM is the right first step — it centralizes transitions without creating a full object hierarchy
- The full State pattern is justified when different states need meaningfully different behavior, not just different guards
- Terminal states (shipped, cancelled) make illegal transitions immediately obvious rather than scattered across methods
- The pattern solves behavioral transition pressure — it is not a general-purpose complexity reducer

## Go deeper

- [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md) — strongest worked example for behavioral change over time and the FSM-to-State progression
- [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md) — helpful neighbor when actions and state transitions interact

---

*[← Previous lesson](./L17-observer.md)* · *[Next lesson: Transaction Script: Simple on Purpose →](./L19-transaction-script.md)*