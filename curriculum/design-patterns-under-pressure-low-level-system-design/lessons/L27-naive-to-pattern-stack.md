# From Naive Design to Coherent Pattern Stack

**Module**: M09 · Composition Studios
**Type**: applied
**Estimated time**: 28 minutes
**Claim**: C6 from Strata synthesis

---

## The core idea

The best way to understand pattern composition is to watch a design evolve through it. A real system does not begin as an architecture diagram with five labeled layers. It begins as a simple solution. Then a pressure appears and demands a response. Then another. Each new pattern arrives because a cost became real, not because a diagram said it should be there.

This staged view is one of the most consistent findings in the research. Fowler describes design as evolutionary — patterns are grown into, not frozen into the architecture before the pressures are visible [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md). The YAGNI principle confirms the same thing from the cost direction: every premature layer is abstraction debt [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md). Together they form the composition rule: **each pattern should arrive when its pressure becomes visible, and not before**.

## Why it matters

Most design teaching compares two extremes: a naive prototype that has outgrown itself and a polished architecture with every layer in place. That comparison makes it hard to learn when to add each layer. This lesson shows the intermediate stages. If you can see what the design looked like when a pattern was not yet needed, and what changed to make it necessary, you can apply that judgment to your own systems.

## Example 1 — Stage 0: the valid simple design

An order placement service starts as a single function. The complexity is modest: one interface, straightforward business logic, one database.

```python
def place_order(customer_id: int, items: list[dict], db) -> int:
    """Place an order. Returns the new order ID."""

    # Validate the customer
    customer = db.query_one(
        "SELECT id, email FROM customers WHERE id = ?", (customer_id,)
    )
    if customer is None:
        raise ValueError(f"Customer {customer_id} not found")

    # Validate items and calculate total
    total = Decimal("0")
    for req in items:
        product = db.query_one(
            "SELECT id, name, price, stock FROM products WHERE id = ?",
            (req["product_id"],)
        )
        if product["stock"] < req["quantity"]:
            raise ValueError(f"Insufficient stock for {product['name']}")
        total += product["price"] * req["quantity"]

    # Record the order
    order_id = db.insert("orders", {
        "customer_id": customer_id,
        "total":       float(total),
        "status":      "pending",
    })
    for req in items:
        db.insert("order_items", {
            "order_id":  order_id,
            "product_id": req["product_id"],
            "quantity":   req["quantity"],
        })

    email_service.send_confirmation(customer["email"], order_id)
    return order_id
```

This is a Transaction Script and it is appropriate. One interface uses it, the business logic fits in one read, and there is no duplication pressure. Adding more layers here is abstraction debt [S018](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S018-fowler-transaction-script.md).

## Example 2 — Stage 1: a service layer appears, then a domain model

**First pressure**: a second interface appears. A background job processes bulk orders. An admin panel also places orders on behalf of customers. The orchestration logic is duplicating across three call sites.

That duplication pressure justifies a **Service Layer**: one `PlaceOrderService` that all three callers use. The function logic moves into `execute()`, callers stay thin.

**Second pressure**: the pricing logic is growing. Premium customers get a discount, loyalty points apply, promotional codes stack, and the rules are starting to duplicate between `PlaceOrderService` and an `OrderAmendmentService`. Business rules about orders are fragmenting across services.

That fragmentation pressure justifies a **Domain Model**: business rules about what makes an order valid, how totals are calculated, and what discount tiers apply belong on `Order`, not on the services.

```python
class Order:
    def __init__(self, customer: Customer):
        self.customer = customer
        self.items:   list[OrderItem] = []
        self.status   = OrderStatus.PENDING

    def add_item(self, product: Product, qty: int) -> None:
        if product.stock < qty:
            raise ValueError(f"Insufficient stock for {product.name}")
        self.items.append(OrderItem(product, qty))

    def total(self) -> Decimal:
        subtotal = sum(i.subtotal() for i in self.items)
        return subtotal * (1 - self.customer.discount_rate())


class PlaceOrderService:
    def execute(self, customer_id: int, items: list[dict]) -> int:
        customer = self.customer_repo.find(customer_id)
        order    = Order(customer)
        for req in items:
            product = self.product_repo.find(req["product_id"])
            order.add_item(product, req["quantity"])
        self.order_repo.save(order)
        self.email_service.send_confirmation(customer.email, order.id)
        return order.id
```

Each layer arrived because its pressure became real [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md).

## Example 3 — Stage 2: persistence layers, then transactional coordination

**Third pressure**: the `Order` and `OrderItem` models are starting to diverge from the relational schema. The domain model uses `Decimal` for prices; the database stores floats. The domain uses `OrderStatus` enums; the database stores strings. Translation logic is scattered through multiple repository methods.

That object-relational mismatch pressure justifies a **Data Mapper** inside each repository.

**Fourth pressure**: placing an order now involves saving `Order`, updating `Product.stock`, and recording a `PaymentIntent` — but all three need to succeed or all three need to fail. The transaction boundary is unclear.

That transactional coordination pressure justifies a **Unit of Work**.

```python
class PlaceOrderService:
    def __init__(self, uow: UnitOfWork):
        self._uow = uow

    def execute(self, customer_id: int, items: list[dict]) -> int:
        with self._uow:
            customer = self._uow.customers.find(customer_id)
            order    = Order(customer)

            for req in items:
                product = self._uow.products.find(req["product_id"])
                order.add_item(product, req["quantity"])
                product.decrement_stock(req["quantity"])   # domain method
                self._uow.products.save(product)

            payment = PaymentIntent(order.total(), customer.payment_method)
            self._uow.payments.add(payment)
            self._uow.orders.add(order)
            self._uow.commit()    # all succeed or all roll back
            return order.id
```

The design arrived at a 5-layer composition — Transaction Script → Service Layer → Domain Model → Data Mapper + Repository → Unit of Work — but only because each pressure appeared and demanded a response. No layer was added speculatively. Each one solves a problem that was actually felt at the time it was introduced [S021](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S021-fowler-unit-of-work.md) [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md).

## Key points

- Pattern composition is most coherent when patterns accumulate in response to observed pressure, not upfront planning [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md)
- Stage 0 (Transaction Script) is not a failure — it is the right starting point when complexity is still modest [S018](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S018-fowler-transaction-script.md)
- A service layer appears when orchestration is duplicating; a domain model appears when business rules are fragmenting; data mappers and repositories appear when persistence translation is spreading; a unit of work appears when transactional correctness becomes unclear
- Not all systems need to progress to Stage 2 — the appropriate endpoint depends on the complexity of the actual domain
- The staged view prevents both premature architecture and the other failure: clinging to simplicity after the pressures have made simplicity expensive [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md)

## Go deeper

- [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md) — evolutionary design: growing into patterns as pressures become real
- [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md) — the economic case for deferring each layer until it earns its cost
- [S018](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S018-fowler-transaction-script.md) — a healthy simple starting point before the pressures accumulate

---

*[← Previous lesson](./L26-editor-workflow-composition.md)* · *[Next lesson: What This Research Still Cannot Settle →](./L28-what-research-cannot-settle.md)*
