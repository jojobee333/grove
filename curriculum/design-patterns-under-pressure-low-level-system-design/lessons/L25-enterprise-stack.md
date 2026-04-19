# Composing the Enterprise Stack

**Module**: M09 · Composition Studios
**Type**: core
**Estimated time**: 26 minutes
**Claim**: C6 from Strata synthesis

---

## The core idea

Good composition assigns each pattern a distinct pressure. The strongest multi-pattern combination in the research is what Fowler's corpus describes as an enterprise application stack: a **Service Layer** that orchestrates application use cases, a **Domain Model** that owns business rules, a **Data Mapper** that translates between object and relational models, a **Repository** that abstracts query access, and a **Unit of Work** that coordinates transactional writeback [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md) [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md) [S020](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S020-fowler-data-mapper.md) [S021](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S021-fowler-unit-of-work.md) [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md).

This lesson teaches composition — not because every system needs these five layers, but because this combination shows clearly how separate responsibilities can stay separate. Each pattern answers one kind of pressure. None of them intrude on the others. That is the lesson. Composition becomes accidental complexity when two patterns compete for the same responsibility or when a layer is added speculatively rather than in response to observed pressure [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md).

## Why it matters

Many learners who understand individual patterns still struggle to put them together. The instinct is often either to reach for all five layers immediately or to avoid them entirely. What the research supports is a third path: each layer should arrive when a specific pressure demands it. This lesson maps the pressures to the layers so you can apply that judgment.

## Example 1 — how the five layers divide responsibility

Here is a complete order placement flow showing each layer doing exactly its job:

```python
# ── Domain Layer: owns business rules and invariants ──────────────────────────
class Order:
    def __init__(self, customer: Customer):
        self.customer  = customer
        self.items:    list[OrderItem] = []
        self.status    = OrderStatus.PENDING

    def add_item(self, product: Product, quantity: int) -> None:
        if quantity < 1:
            raise ValueError("Quantity must be at least 1")
        if product.stock < quantity:
            raise ValueError(f"Insufficient stock for {product.name}")
        self.items.append(OrderItem(product, quantity))

    def total(self) -> Decimal:
        return sum(i.subtotal() for i in self.items)


# ── Repository: query access only — no persistence logic, no rules ────────────
class OrderRepository:
    def find(self, order_id: int) -> Order | None: ...
    def add(self, order: Order) -> None: ...


class CustomerRepository:
    def find(self, customer_id: int) -> Customer | None: ...


# ── Data Mapper: translates between objects and rows (hidden inside repos) ────
# (not shown at this level — the repository calls the mapper internally)

# ── Unit of Work: coordinates transaction scope across multiple objects ────────
class UnitOfWork:
    def __init__(self, session):
        self._session = session
        self.orders   = OrderRepository(session)
        self.customers = CustomerRepository(session)

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()


# ── Service Layer: orchestrates the use case, coordinates the other layers ────
class PlaceOrderService:
    def __init__(self, uow: UnitOfWork):
        self._uow = uow

    def execute(self, customer_id: int, items: list[dict]) -> int:
        with self._uow:
            customer = self._uow.customers.find(customer_id)
            if customer is None:
                raise ValueError(f"Customer {customer_id} not found")

            order = Order(customer=customer)
            for item_req in items:
                product  = self._uow.products.find(item_req["product_id"])
                order.add_item(product, item_req["quantity"])

            self._uow.orders.add(order)
            self._uow.commit()
            return order.id
```

Each layer does one thing: `Order` enforces invariants; `OrderRepository` provides collection-like access; `UnitOfWork` owns the transaction boundary; `PlaceOrderService` orchestrates the interaction. None of these layers reach into each other's responsibilities [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md).

## Example 2 — what breaks when layers mix responsibilities

The contrast is instructive. Here is the same use case with muddied composition:

```python
class PlaceOrderService:
    def execute(self, customer_id: int, items: list[dict]) -> int:
        # Service directly queries the database — bypassing the repository
        customer_row = self.db.query_one(
            "SELECT * FROM customers WHERE id = ?", (customer_id,)
        )

        # Service computes business rules instead of calling domain methods
        total = Decimal("0")
        for item_req in items:
            product_row = self.db.query_one(
                "SELECT * FROM products WHERE id = ?", (item_req["product_id"],)
            )
            if product_row["stock"] < item_req["quantity"]:
                raise ValueError(f"Insufficient stock")
            line_total = product_row["price"] * item_req["quantity"]
            total += line_total

        # Service manages its own transaction directly
        self.db.begin()
        order_id = self.db.insert("orders", {"customer_id": customer_id, "total": float(total)})
        for item_req in items:
            self.db.insert("order_items", {"order_id": order_id, **item_req})
        self.db.commit()
        return order_id
```

The service now queries the database directly (bypassing the repository), computes business rules inline (bypassing the domain model), and manages its own transaction (bypassing the unit of work). Every pattern that was meant to own a distinct pressure is now being worked around. The result is that each concern — persistence, business rules, transaction scope — has leaked into one procedure [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md).

## Example 3 — when to stop adding layers

The enterprise stack is not a target to reach. It is a composition that makes sense when the corresponding pressures exist:

| Add this layer | When this pressure is real |
|---|---|
| Service Layer | Multiple interfaces (API, CLI, async jobs) duplicate orchestration logic |
| Domain Model | Business rules are dense enough that procedural scripts fragment them |
| Data Mapper | Object model and relational model are meaningfully different in structure or lifecycle |
| Repository | Query logic is being duplicated across multiple services |
| Unit of Work | Multiple objects must commit together transactionally and writeback timing matters |

A system with one endpoint, simple CRUD operations, and no meaningful business rules may need only a Transaction Script and a direct database call. Adding all five layers to that system is the speculative abstraction error from Lesson 22 [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

The composition is coherent when each layer answers a distinct pressure. It becomes complexity when a layer is added before its pressure has appeared.

## Key points

- Good composition assigns one pressure to one abstraction: orchestration → service layer; rules → domain model; ORM isolation → data mapper; query access → repository; writeback coordination → unit of work [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md)
- The enterprise stack is an example of coherent composition, not a target architecture for all systems
- Mixing layer responsibilities fragments the design — the service that queries directly and enforces rules inline is doing the domain model's and repository's jobs
- Each layer should arrive when its pressure appears, not before [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md)
- Composition fails when multiple abstractions claim the same responsibility

## Go deeper

- [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md) — service layer as orchestration boundary
- [S016](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S016-fowler-anemic-domain-model.md) — thin services over rich domain; what happens when the domain becomes a data bag
- [S021](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S021-fowler-unit-of-work.md) — coordinating transactional writeback across the business action

---

*[← Previous lesson](./L24-language-evolution.md)* · *[Next lesson: Composing Editor and Workflow Patterns →](./L26-editor-workflow-composition.md)*
