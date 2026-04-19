# Transaction Script: Simple on Purpose

**Module**: M07 · Modeling Business Complexity  
**Type**: core  
**Estimated time**: 22 minutes  
**Claim**: C5; Contradiction 3 from Strata synthesis

---

## The core idea

Transaction Script is a reminder that not every business workflow needs rich object collaboration. Fowler describes it as organizing logic per request or transaction: usually one procedure that performs the validations, calculations, and data changes for that interaction [S018](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S018-fowler-transaction-script.md).

That sounds plain because it is plain. And that is exactly the point. Transaction Script exists as a first-class pattern because simplicity is sometimes the right design. When complexity is still modest, introducing a full domain model adds indirection, persistence complexity, and abstraction cost that the system has not earned yet.

This lesson matters because pattern courses often quietly teach that "richer" means "better." The research rejects that. A practical engineer must know when a procedural organization is still the healthiest choice.

## Example 1 — a clean transaction script doing its job

```python
def confirm_payment(order_id: int, payment_token: str, db) -> dict:
    """Confirms a payment for a pending order. Single transaction, clear flow."""

    # 1. Validate
    order = db.query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    if order is None:
        raise ValueError(f"Order {order_id} not found")
    if order["status"] != "pending":
        raise ValueError(f"Order {order_id} is not pending")

    # 2. Charge
    charge_result = payment_gateway.charge(payment_token, order["total"])
    if not charge_result["success"]:
        raise PaymentError(charge_result["error"])

    # 3. Record
    db.execute(
        "UPDATE orders SET status = 'paid', payment_ref = ? WHERE id = ?",
        (charge_result["reference"], order_id)
    )
    db.insert("payment_events", {
        "order_id": order_id,
        "amount":   order["total"],
        "ref":      charge_result["reference"],
    })

    # 4. Notify
    email_service.send_receipt(order["customer_email"], order_id)

    return {"status": "confirmed", "ref": charge_result["reference"]}
```

This is Transaction Script at its most defensible: one function, one responsibility, readable from top to bottom. A new developer can follow the entire payment flow without reading any other class. Validation, charging, recording, and notification all live in one procedure. There are no domain objects here — and that is appropriate for this level of complexity [S018](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S018-fowler-transaction-script.md).

## Example 2 — the same approach under growing pressure

```python
def confirm_payment(order_id: int, payment_token: str, db) -> dict:
    order = db.query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    customer = db.query_one("SELECT * FROM customers WHERE id = ?", (order["customer_id"],))
    subscription = db.query_one("SELECT * FROM subscriptions WHERE customer_id = ?", (customer["id"],))

    # Growing eligibility rules:
    if order["status"] != "pending":
        raise ValueError("Not pending")
    if customer["account_status"] == "suspended":
        raise ValueError("Account suspended")
    if customer["outstanding_balance"] > 0 and not customer["payment_plan_active"]:
        raise ValueError("Outstanding balance must be cleared first")

    # Discount logic:
    discount = 0
    if subscription and subscription["tier"] == "premium":
        discount = order["total"] * 0.1
    if customer["loyalty_points"] >= 500:
        discount += 20
    if order["promo_code"]:
        discount += calculate_promo_discount(order["promo_code"], order["total"])
    final_total = order["total"] - discount

    # Charge, record, update loyalty, notify — 40 more lines
    ...
```

The function is now tracking customer eligibility, subscription tier, loyalty points, and promo codes. Each new rule adds another read and branch. The procedure is still "one function" but it is no longer self-contained — it is secretly a coordination script for business rules that belong to `Customer`, `Order`, and `Subscription`. This is the signal that the complexity curve has moved. Transaction Script is becoming a liability [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md).

## Example 3 — what the complexity threshold actually looks like

The pressure curve test: count how many separate domain concepts the script must coordinate in one function. One or two is fine. Four or five with their own state, rules, and relationships is the threshold.

```python
# Healthy script: one concept, one clear flow
def register_user(email: str, password: str, db) -> int:
    if db.query_one("SELECT id FROM users WHERE email = ?", (email,)):
        raise ValueError("Email already in use")
    hashed = bcrypt.hash(password)
    return db.insert("users", {"email": email, "password_hash": hashed})


# Overloaded script: many concepts, implicit state machine
def process_return_request(order_id: int, reason: str, db) -> dict:
    order    = db.query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    customer = db.query_one("SELECT * FROM customers WHERE id = ?", (order["customer_id"],))
    items    = db.query("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    policy   = db.query_one("SELECT * FROM return_policies WHERE tier = ?", (customer["tier"],))
    # ...another 60 lines of intertwined rules
```

`register_user` is a valid transaction script — one concept, simple rules. `process_return_request` is a transaction script that has outgrown itself — four separate concepts each with their own rules and state. That is the moment to consider Domain Model [S019](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S019-fowler-domain-model.md).

## Key points

- Transaction Script is a valid pattern when complexity is still modest [S018](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S018-fowler-transaction-script.md)
- Simplicity is an intentional design choice, not a failure to be "architectural"
- A healthy script coordinates one or two concepts with clear, linear flow
- The pressure curve test: when rules for multiple concepts intertwine inside one function, the script is outgrowing itself
- Transaction Script is not an anti-pattern — it becomes a problem only when complexity has grown past what procedural flow can manage cleanly

## Go deeper

- [S018](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S018-fowler-transaction-script.md) — primary source on transaction-shaped procedural organization
- [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md) — cost model for staying simple until complexity is real

---

*[← Previous lesson](./L18-state.md)* · *[Next lesson: Domain Model: Behavior Where the Concepts Live →](./L20-domain-model.md)*