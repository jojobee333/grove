# Data Mapper: Keeping the Domain Ignorant of the Database

**Module**: M05 · Persistence Boundaries in Depth  
**Type**: core  
**Estimated time**: 22 minutes  
**Claim**: C3, C6 from Strata synthesis

---

## The core idea

**Data Mapper** is a response to a fundamental structural conflict between two ways of organizing information.

**Domain objects** are organized around concepts and behavior. An `Order` knows its own rules: what makes it valid, when it can be cancelled, how discounts are calculated. It groups state and behavior together.

**Relational databases** are organized around tables, columns, foreign keys, and joins. An order might span an `orders` table, an `order_lines` table, a `customers` table, and a `discounts` table. The database thinks in terms of rows and relationships, not objects and methods.

These two models have **different structures and different evolution pressures**. Object models change as business rules evolve. Relational schemas change as storage and query requirements evolve. If domain objects must understand relational details directly, changes in one model propagate into the other. That is the boundary mismatch pressure Data Mapper exists to absorb [S020](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S020-fowler-data-mapper.md).

The pattern's response: create a dedicated layer — the **mapper** — that transfers data between the two models. Domain objects remain focused on domain concepts. The mapper knows the database shape. Neither model needs to know about the other.

**Object-relational mismatch** is the term for this incompatibility. It is not a flaw in either model — they are simply optimized for different concerns. The mapper exists to bridge them without merging them.

## Why it matters

Persistence leakage is one of the fastest ways to corrupt a domain model. When business objects start carrying column names, join conditions, or ORM-specific annotations, they stop being about the business and start serving the database.

The practical consequence: changing a database schema forces changes in domain objects. Testing domain behavior requires database access. Business logic becomes tangled with persistence mechanics. The domain model stops being a clean representation of the business.

Data Mapper fixes this by creating a clean separation. The domain does not know about tables. The mapper does not contain business rules. Each layer evolves independently [S020](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S020-fowler-data-mapper.md).

## Example 1 — active record pattern: persistence leakage

This is what the "without mapper" pattern (Active Record) looks like:

```python
class Order:
    """Active Record: the domain object knows about persistence."""
    table_name = "orders"

    def __init__(self, customer_id, total, status):
        self.id = None
        self.customer_id = customer_id   # SQL foreign key exposed in domain
        self.total = total
        self.status = status

    def save(self):
        # Domain object contains SQL — tight coupling to the database
        db.execute(
            "INSERT INTO orders (customer_id, total, status) VALUES (?, ?, ?)",
            (self.customer_id, self.total, self.status)
        )

    @classmethod
    def find_by_customer(cls, customer_id):
        rows = db.query("SELECT * FROM orders WHERE customer_id = ?", (customer_id,))
        return [cls(r["customer_id"], r["total"], r["status"]) for r in rows]
```

This is simple for small systems. But as the schema evolves, the domain object changes. As business rules evolve, SQL code must be navigated. The domain and persistence are tangled.

## Example 2 — Data Mapper pattern: clean separation

```python
# Domain object: knows only about orders as a business concept
class Order:
    def __init__(self, customer, items, status="pending"):
        self.customer = customer     # a Customer object — no IDs exposed
        self.items = items           # a list of OrderItem objects
        self.status = status
        self.id = None               # assigned by the mapper after persistence

    def total(self):
        return sum(item.subtotal() for item in self.items)

    def cancel(self):
        if self.status != "pending":
            raise ValueError("Only pending orders can be cancelled")
        self.status = "cancelled"

# Mapper: knows only about translating between Order and the database
class OrderMapper:
    def insert(self, order):
        row = {
            "customer_id": order.customer.id,
            "status": order.status,
            "total": order.total()
        }
        order.id = db.insert("orders", row)
        for item in order.items:
            self._insert_item(order.id, item)

    def find_by_id(self, order_id):
        row = db.query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
        customer = customer_mapper.find_by_id(row["customer_id"])
        items = self._load_items(order_id)
        order = Order(customer=customer, items=items, status=row["status"])
        order.id = row["id"]
        return order

    def _insert_item(self, order_id, item):
        db.insert("order_items", {"order_id": order_id, "sku": item.sku, "qty": item.quantity})

    def _load_items(self, order_id):
        rows = db.query("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
        return [OrderItem(sku=r["sku"], quantity=r["qty"]) for r in rows]
```

Now `Order` contains only business logic. `OrderMapper` contains only persistence logic. Renaming a database column only changes the mapper. Changing a business rule only changes `Order`. The two models are independent [S020](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S020-fowler-data-mapper.md).

## When Data Mapper earns its cost

Data Mapper is not always the right choice. For simple systems with a close match between the object model and the database schema, Active Record style is cleaner and faster to write. Data Mapper earns its cost when:

- The domain model has significant behavioral complexity (rules, state, relationships)
- The schema and the object model evolve at different rates
- Database schema changes should not ripple into business logic
- Independent testability of domain behavior without a database is important

The pattern is one example of the broader principle that structural indirection is valuable at real, semantically important boundaries — and decorative ceremony otherwise [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md).

## Example 3 — testing domain logic without a database

One of the most practical payoffs of Data Mapper is that it makes domain logic independently testable. When the domain object knows nothing about the database, its business behaviour can be verified in pure Python with no database setup:

```python
def test_order_cancellation_is_only_valid_from_pending():
    customer = Customer(name="Alice", id=1)
    items = [OrderItem(sku="WIDGET-001", quantity=2, unit_price=50.0)]
    order = Order(customer=customer, items=items, status="pending")

    order.cancel()

    assert order.status == "cancelled"


def test_cancelling_a_shipped_order_raises():
    customer = Customer(name="Bob", id=2)
    items = [OrderItem(sku="GADGET-002", quantity=1, unit_price=120.0)]
    order = Order(customer=customer, items=items, status="shipped")

    with pytest.raises(ValueError, match="Only pending orders"):
        order.cancel()
```

No `OrderMapper`. No database. No SQL. The domain rules run in memory at full speed. This is only possible because `Order` contains no persistence logic. If `Order` extended an Active Record base class and called `db.execute()` inside `cancel()`, these tests would require a real database connection to run at all.

Contrast this with the Active Record approach from Example 1, where `save()` is directly on the domain object. Testing any business operation with Active Record either requires a test database, an in-memory database substitute, or significant mocking infrastructure. Data Mapper removes that overhead by keeping the boundary clean [S020](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S020-fowler-data-mapper.md).

## Example 3 — testing domain logic without a database

One of the most practical payoffs of Data Mapper is that it makes domain logic independently testable. When the domain object knows nothing about the database, its business behaviour can be verified in pure Python with no database setup:

```python
def test_order_cancellation_is_only_valid_from_pending():
    customer = Customer(name="Alice", id=1)
    items = [OrderItem(sku="WIDGET-001", quantity=2, unit_price=50.0)]
    order = Order(customer=customer, items=items, status="pending")

    order.cancel()

    assert order.status == "cancelled"


def test_cancelling_a_shipped_order_raises():
    customer = Customer(name="Bob", id=2)
    items = [OrderItem(sku="GADGET-002", quantity=1, unit_price=120.0)]
    order = Order(customer=customer, items=items, status="shipped")

    with pytest.raises(ValueError, match="Only pending orders"):
        order.cancel()
```

No `OrderMapper`. No database. No SQL. The domain rules run in memory at full speed. This is only possible because `Order` contains no persistence logic. If `Order` extended an Active Record base class and called `db.execute()` inside `cancel()`, these tests would require a real database connection to run at all.

Contrast this with the Active Record approach from Example 1, where `save()` is directly on the domain object. Testing any business operation with Active Record either requires a test database, an in-memory database substitute, or significant mocking infrastructure. Data Mapper removes that overhead by keeping the boundary clean [S020](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S020-fowler-data-mapper.md).

## Key points

- Data Mapper isolates the domain from relational persistence details by putting translation in a dedicated layer [S020](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S020-fowler-data-mapper.md)
- Object models and relational schemas evolve under different pressures — the mapper keeps them from tangling
- The pattern earns its cost when the domain has real behavioral complexity and the schema mismatch is significant
- It is unnecessary ceremony when the schema closely mirrors the object model and behavioral complexity is low
- Data Mapper composes naturally with Repository (for query access) and Unit of Work (for coordinated writeback)

## Go deeper

- [S020](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S020-fowler-data-mapper.md) — Fowler on the object-relational mismatch and how the mapper layer resolves it
- [S022](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S022-fowler-repository.md) — companion pattern: Repository provides collection-like query access above the mapper

---

*[← Previous lesson](./L12-structural-selection.md)* · *[Next lesson: Repository: Query Boundaries That Still Feel Like Collections →](./L14-repository.md)*
