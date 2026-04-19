# Repository: Query Boundaries That Still Feel Like Collections

**Module**: M05 · Persistence Boundaries in Depth  
**Type**: core  
**Estimated time**: 22 minutes  
**Claim**: C3, C6 from Strata synthesis

---

## The core idea

**Repository** sits above the Data Mapper and answers a different pressure. The pressure is not the object-relational mismatch (that is the mapper's job). The pressure is **query logic duplication and scattering**.

As a system grows, retrieval patterns multiply. One service needs "all active premium orders placed in the last 30 days." Another needs "orders by customer status with subtotals over 500." A background job needs "all orders stuck in pending for more than 24 hours." If each caller constructs its own query, the system now has multiple definitions of the same retrieval rules. When the rule changes — say, "active" now excludes trial accounts — all those callers must be found and updated.

Repository responds by presenting a **collection-like interface** for persisted domain objects. Instead of raw query construction scattered across the codebase, the domain talks to a repository: "give me all eligible orders for this customer" [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md).

Two terms to define:

A **collection-like interface** means the repository looks and feels like a list or set of domain objects. You do not think about SQL or queries. You think about "find orders where X" or "add this order to the collection."

**Query abstraction** means the concrete query logic (SQL, ORM filters, search parameters) is hidden behind the repository interface. Callers do not know or care how the objects are actually retrieved.

## How Repository differs from Data Mapper

This distinction is worth making explicit because beginners often confuse them.

- **Data Mapper** handles the *translation* between domain objects and database rows. It answers: "How does this `Order` object become a row in the `orders` table?"
- **Repository** handles *retrieval and access*. It answers: "How do I find all `Order` objects that satisfy this business condition?"

A repository typically uses a mapper to do the actual translation. It concentrates the *what do I want* question. The mapper handles the *how does that translate to storage* question. They are complementary, not redundant [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md).

## Why it matters

Query duplication is sneaky. Teams catch duplicated write logic quickly because inconsistent writes cause visible bugs. But duplicated query predicates creep in slowly — a slightly different filter here, a subtly different sorting rule there — until changing the access policy requires a codebase-wide search.

Repository also maintains a clean separation in the dependency direction. Domain code depends on repository interfaces, not on database details. That dependency direction is easy to enforce and hard to corrupt compared with scattered query construction [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md).

## Example 1 — scattered query logic without a repository

```python
# In the billing service
def get_billable_orders(customer_id):
    return db.query(
        "SELECT * FROM orders WHERE customer_id = ? AND status = 'active' AND total > 0",
        (customer_id,)
    )

# In the reporting service
def get_orders_for_report(customer_id):
    return db.query(
        "SELECT * FROM orders WHERE customer_id = ? AND status IN ('active', 'completed')",
        (customer_id,)
    )

# In the notification service
def get_pending_confirmation_orders(customer_id):
    return db.query(
        "SELECT * FROM orders WHERE customer_id = ? AND status = 'active' AND confirmed = 0",
        (customer_id,)
    )
```

Three places define "what an active order means." If the definition changes, all three must change together. If one misses the update, the system has inconsistent access policies.

## Example 2 — repository centralizing query logic

```python
class OrderRepository:
    """Centralizes all Order access and query logic."""

    def __init__(self, mapper: OrderMapper):
        self._mapper = mapper

    def find_active_for_customer(self, customer_id: int) -> list:
        """Returns all active orders for this customer. One definition of 'active'."""
        rows = db.query(
            "SELECT * FROM orders WHERE customer_id = ? AND status = 'active' AND total > 0",
            (customer_id,)
        )
        return [self._mapper.row_to_order(row) for row in rows]

    def find_awaiting_confirmation(self, customer_id: int) -> list:
        rows = db.query(
            "SELECT * FROM orders WHERE customer_id = ? AND status = 'active' AND confirmed = 0",
            (customer_id,)
        )
        return [self._mapper.row_to_order(row) for row in rows]

    def add(self, order: Order) -> None:
        self._mapper.insert(order)

    def find_by_id(self, order_id: int) -> Order:
        return self._mapper.find_by_id(order_id)

# All callers use the same repository — one definition of each access policy:
# billing_service:      repo.find_active_for_customer(customer_id)
# reporting_service:    repo.find_active_for_customer(customer_id)
# notification_service: repo.find_awaiting_confirmation(customer_id)
```

Now changing the definition of "active order" means editing `OrderRepository.find_active_for_customer()` — one place. The mapper handles the actual translation. The repository handles the access semantics [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md).

## When Repository becomes over-engineering

The pattern is decorative ceremony when:
- There is only one or two simple queries with no real duplication risk
- The schema closely mirrors the object model (Active Record is simpler)
- The codebase is small enough that all query sites are visible and easily updated together

Fowler's observation that adding repositories to simple systems wraps simple operations behind extra names and adds indirection without reducing any real cost applies here [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md). The pattern should arrive when query duplication is already visible, not as a preventive measure.

## Example 3 — in-memory repository for testing

One of Repository’s most practical benefits is how naturally it enables test substitution. Because the repository is accessed through an interface, test code can substitute a fast in-memory implementation instead of a real database:

```python
class InMemoryOrderRepository:
    """Test double for OrderRepository — no database required."""

    def __init__(self):
        self._store: dict = {}
        self._next_id: int = 1

    def add(self, order: Order) -> None:
        order.id = self._next_id
        self._store[order.id] = order
        self._next_id += 1

    def find_by_id(self, order_id: int) -> Order | None:
        return self._store.get(order_id)

    def find_active_for_customer(self, customer_id: int) -> list:
        return [
            o for o in self._store.values()
            if o.customer.id == customer_id and o.status == "active"
        ]


# Tests use the in-memory version — instant, no setup, no teardown:
def test_billing_skips_inactive_orders():
    repo = InMemoryOrderRepository()
    customer = Customer(id=1, name="Alice")
    active_order    = Order(customer=customer, items=[...], status="active")
    cancelled_order = Order(customer=customer, items=[...], status="cancelled")
    repo.add(active_order)
    repo.add(cancelled_order)

    service = BillingService(repo)
    bills = service.run_billing_for(customer_id=1)

    assert len(bills) == 1  # only active order is billed
    assert bills[0].order_id == active_order.id
```

The `BillingService` receives `OrderRepository` as a dependency through injection (from L04). In production it receives the real SQL-backed implementation. In tests it receives `InMemoryOrderRepository`. The service is identical in both cases.

This testability is directly enabled by the collection-like interface. `BillingService` calls `repo.find_active_for_customer(customer_id)` — it does not know or care whether that goes to a SQL database or a dictionary. The repository’s interface hides the implementation detail [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md).

## Example 3 — in-memory repository for testing

One of Repository’s most practical benefits is how naturally it enables test substitution. Because the repository is accessed through an interface, test code can substitute a fast in-memory implementation instead of a real database:

```python
class InMemoryOrderRepository:
    """Test double for OrderRepository — no database required."""

    def __init__(self):
        self._store: dict = {}
        self._next_id: int = 1

    def add(self, order: Order) -> None:
        order.id = self._next_id
        self._store[order.id] = order
        self._next_id += 1

    def find_by_id(self, order_id: int) -> Order | None:
        return self._store.get(order_id)

    def find_active_for_customer(self, customer_id: int) -> list:
        return [
            o for o in self._store.values()
            if o.customer.id == customer_id and o.status == "active"
        ]


# Tests use the in-memory version — instant, no setup, no teardown:
def test_billing_skips_inactive_orders():
    repo = InMemoryOrderRepository()
    customer = Customer(id=1, name="Alice")
    active_order    = Order(customer=customer, items=[...], status="active")
    cancelled_order = Order(customer=customer, items=[...], status="cancelled")
    repo.add(active_order)
    repo.add(cancelled_order)

    service = BillingService(repo)
    bills = service.run_billing_for(customer_id=1)

    assert len(bills) == 1  # only active order is billed
    assert bills[0].order_id == active_order.id
```

The `BillingService` receives `OrderRepository` as a dependency through injection (from L04). In production it receives the real SQL-backed implementation. In tests it receives `InMemoryOrderRepository`. The service is identical in both cases.

This testability is directly enabled by the collection-like interface. `BillingService` calls `repo.find_active_for_customer(customer_id)` — it does not know or care whether that goes to a SQL database or a dictionary. The repository’s interface hides the implementation detail [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md).

## Key points

- Repository concentrates query logic and access policy — preventing scattered definitions of the same retrieval rules [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md)
- It presents a collection-like interface so domain code does not think in SQL or query mechanics
- Repository handles *what to retrieve*; Data Mapper handles *how to translate it* — they are complementary
- The pattern is necessary when query logic is already duplicating across callers; it is ceremony before that point
- Unit of Work composes naturally with Repository to coordinate writeback timing

## Go deeper

- [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md) — primary source on repository intent, collection interface, and query abstraction
- [S020](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S020-fowler-data-mapper.md) — Data Mapper: the companion pattern handling translation below the repository

---

*[← Previous lesson](./L13-data-mapper.md)* · *[Next lesson: Unit of Work: Transaction-Scope Coordination →](./L15-unit-of-work.md)*
