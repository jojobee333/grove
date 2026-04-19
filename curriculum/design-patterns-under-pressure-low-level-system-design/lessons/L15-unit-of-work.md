# Unit of Work: Transaction-Scope Coordination

**Module**: M05 · Persistence Boundaries in Depth  
**Type**: applied  
**Estimated time**: 24 minutes  
**Claim**: C4, C6 from Strata synthesis

---

## The core idea

**Unit of Work** solves a coordination problem that appears as business operations grow to touch multiple objects. Writing each domain change to the database the moment it occurs is simple but brittle: if a later step in the same business action fails, earlier writes have already happened with no clean way to undo them. Opening separate database transactions for each object write can also create performance bottlenecks and consistency gaps.

Unit of Work responds by acting as a **change tracker**: it records which objects were created, modified, or deleted during a business interaction, then coordinates all the persistence work at one controlled moment — the commit [S021](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S021-fowler-unit-of-work.md).

Three terms to define:

**Business transaction** here means the complete set of work required to satisfy one user or system request. Placing an order is a business transaction. It may touch an `Order`, reduce `Inventory`, create a `PaymentRecord`, and update `LoyaltyPoints`. All of these changes belong to the same logical unit of work.

**Identity map** is a companion mechanism: the Unit of Work keeps a record of which objects it has already loaded. If the same object is requested twice during one transaction, it returns the same in-memory instance rather than issuing a second database query. This prevents inconsistencies from having two separate in-memory copies of the same row.

**Deferred writeback** means the pattern batches and sequences writes at commit time, rather than immediately when each object is changed.

## Why it matters

Coordination pressure grows as business interactions touch more objects. A single-row update — "change this customer's email" — needs no coordination mechanism. But an order placement that creates an order, reserves inventory, records a payment, and queues a confirmation needs a way to treat all of that as one atomic outcome. Unit of Work provides that boundary.

It composes directly with Repository (L14): the repository provides collection-like access; the Unit of Work coordinates writeback. It fits naturally with Data Mapper (L13): the mapper translates individual objects to rows; the Unit of Work decides when and in what order those translations happen [S021](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S021-fowler-unit-of-work.md).

## Example 1 — immediate writes without coordination

```python
def place_order(customer_id: int, item_skus: list) -> int:
    order_id = db.insert("orders", {"customer_id": customer_id, "status": "pending", "total": 0})

    total = 0
    for sku in item_skus:
        item = db.query_one("SELECT * FROM products WHERE sku = ?", (sku,))
        db.execute("UPDATE inventory SET qty = qty - 1 WHERE sku = ?", (sku,))
        db.insert("order_items", {"order_id": order_id, "sku": sku})
        total += item["price"]

    db.execute("UPDATE orders SET total = ? WHERE id = ?", (total, order_id))

    # If this fails, all writes above are already committed:
    db.execute(
        "UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?",
        (int(total // 10), customer_id)
    )
    return order_id
```

If the loyalty points update fails, the order and inventory changes are already written. The customer was charged but gets no points. Partial failure leaves the system inconsistent, and multiple database round-trips happen for a single action.

## Example 2 — Unit of Work tracking and deferred commit

```python
class UnitOfWork:
    def __init__(self, db_connection):
        self._db = db_connection
        self._new_objects:     list = []
        self._dirty_objects:   list = []
        self._deleted_objects: list = []

    def register_new(self, obj) -> None:
        self._new_objects.append(obj)

    def register_dirty(self, obj) -> None:
        if obj not in self._dirty_objects:
            self._dirty_objects.append(obj)

    def commit(self) -> None:
        """Write all tracked changes in a single atomic transaction."""
        with self._db.transaction():
            for obj in self._new_objects:
                self._insert(obj)
            for obj in self._dirty_objects:
                self._update(obj)
            for obj in self._deleted_objects:
                self._delete(obj)

    def _insert(self, obj): ...
    def _update(self, obj): ...
    def _delete(self, obj): ...


# Application code works against in-memory objects, then commits once:
def place_order(customer: Customer, item_skus: list, uow: UnitOfWork) -> Order:
    order = Order(customer=customer, items=[])
    uow.register_new(order)

    for sku in item_skus:
        product = product_repo.find_by_sku(sku)
        product.reduce_inventory(1)
        uow.register_dirty(product)
        order.add_item(product)

    customer.award_loyalty_points(order.total())
    uow.register_dirty(customer)

    uow.commit()   # all writes happen atomically here — or none do
    return order
```

The business logic runs against in-memory domain objects. The Unit of Work collects everything. One `commit()` writes it all in a single transaction. If the transaction fails, nothing is written and the system stays consistent [S021](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S021-fowler-unit-of-work.md).

## Example 3 — context manager for clean commit/rollback boundaries

In Python, Unit of Work pairs naturally with a context manager, making the commit/rollback boundary explicit and automatic:

```python
class UnitOfWork:
    def __enter__(self):
        self._new_objects   = []
        self._dirty_objects = []
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.commit()    # success path — write everything
        else:
            self.rollback()  # exception path — discard everything

    def commit(self):   ...
    def rollback(self): ...


# The with-block makes the boundary visible and automatic:
def process_subscription_renewal(customer_id: int) -> None:
    with UnitOfWork() as uow:
        customer     = customer_repo.find_by_id(customer_id)
        subscription = subscription_repo.find_active_for(customer_id)

        subscription.renew()
        customer.extend_access()

        uow.register_dirty(subscription)
        uow.register_dirty(customer)
        # commit() called automatically on successful exit
        # rollback() called automatically if any exception is raised
```

The context manager is not a required part of the pattern — it is a Python-native way to make the transactional boundary visible and hard to forget. Modern ORMs (SQLAlchemy, Django ORM) implement Unit of Work internally and expose a similar session context API. The underlying concept is the same: business logic works against in-memory objects, and persistence is coordinated at a single commit point.

## Limitations

Unit of Work adds tracking overhead. Every domain object interaction must call `register_new()` or `register_dirty()`, which is bookkeeping that does not exist in direct-write approaches. For simple systems where most requests touch one or two objects in isolation, that overhead exceeds the benefit. Active Record style remains appropriate when business interactions are simple and isolated. The pattern is justified only when multiple objects regularly change together and transactional consistency across that change is a real requirement [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md).

## Key points

- Unit of Work tracks all changes during a business interaction and writes them atomically at commit time [S021](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S021-fowler-unit-of-work.md)
- Deferred writeback reduces database round-trips and enables all-or-nothing consistency across multi-object operations
- The identity map companion prevents two in-memory copies of the same row causing inconsistent state
- It composes with Repository (collection-like access) and Data Mapper (row translation) in the persistence stack
- The pattern earns its cost when multiple objects regularly change together; isolated operations do not need it

## Go deeper

- [S021](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S021-fowler-unit-of-work.md) — primary source on tracked change sets, deferred writeback, and identity map
- [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md) — Repository: the companion pattern providing collection-like access above the Unit of Work

---

*[← Previous lesson](./L14-repository.md)* · *[Next lesson: Command: Reified Actions, Undo, and Replay →](./L16-command.md)*