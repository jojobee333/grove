# When to Prefer Verified Fakes or Contract Checks

**Module**: M05 · Use Mocks, Fakes, and Contracts Intentionally
**Type**: debate
**Estimated time**: 16 minutes
**Claim**: C6 from Strata synthesis

---

## The core idea

Strict mocks are a good tool for owned collaborators. But as soon as the boundary crosses into a system your team does not own — an external HTTP API, an event bus managed by another team, a persistence layer with its own semantics — a mock starts making a promise it cannot keep. It can simulate the shape of the external interface as you understood it when you wrote the test, but it cannot tell you whether that understanding is still correct.

The research draws a clear distinction here: the right question is not "mock or not mock?" but "what is the cheapest test that still tells the truth about this boundary?" [S014](../../research/test-driven-development-in-python/01-sources/web/S014-verified-fakes.md). Sometimes the honest answer is a verified fake. Sometimes it is a Pact-style consumer-provider contract check. Sometimes it is a focused integration test. The choice depends on fidelity needs and maintenance cost — and on being precise about which of these three different things you actually mean when you say "test this boundary."

A second nuance from the research: the term "contract testing" is used inconsistently. Some sources use it loosely for any agreed-interface check. Pact uses it more precisely for consumer-provider interaction verification. When planning a suite, name the exact mechanism, not just the label.

## Why it matters

A suite that mocks every external boundary deeply will stay fast and green — right up to the moment when the external service changes in a way the mock did not anticipate. At that point, the tests do not catch the breakage. The first signal is a production failure.

Verified fakes and contract checks address this by introducing a feedback mechanism: the fake or contract is periodically validated against the real system's behavior. Speed is preserved (you are not calling the real system on every test run), but the gap between what the test assumes and what the real system does is regularly closed.

The tradeoff is maintenance cost and setup complexity. Verified fakes require someone to build and update them. Contract tests require tooling (Pact, or an equivalent) and coordination between teams. Those costs are real — which is why the recommendation is not "always use verified fakes," but "prefer them where deep mocks would otherwise silently lie about a boundary you care about."

## Example 1 — verified fake: a hand-written lightweight implementation

A verified fake is an implementation that is much simpler than the real thing but follows the same interface contract and is tested against the real behavior periodically.

```python
# storage.py — owned interface
from abc import ABC, abstractmethod
from typing import Optional


class DocumentStore(ABC):
    @abstractmethod
    def save(self, doc_id: str, content: str) -> None:
        ...

    @abstractmethod
    def load(self, doc_id: str) -> Optional[str]:
        ...


# fakes.py — fast in-memory stand-in for tests
class InMemoryDocumentStore(DocumentStore):
    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    def save(self, doc_id: str, content: str) -> None:
        self._store[doc_id] = content

    def load(self, doc_id: str) -> Optional[str]:
        return self._store.get(doc_id)
```

The "verified" part: the same behavioral tests that exercise the fake also run against the real `S3DocumentStore`. A shared test suite (a contract test class) is parameterised over both implementations:

```python
@pytest.fixture(params=["fake", "real"])
def store(request):
    if request.param == "fake":
        return InMemoryDocumentStore()
    return S3DocumentStore(bucket="test-bucket")

def test_saved_document_is_loadable(store: DocumentStore):
    store.save("doc-1", "hello world")
    assert store.load("doc-1") == "hello world"

def test_missing_document_returns_none(store: DocumentStore):
    assert store.load("nonexistent") is None
```

The real-store tests run in CI but not in every local unit pass (they are slow and require a bucket). The fake tests run everywhere and are fast. If the real store behavior changes — say the S3 client now returns `""` instead of `None` for missing keys — the verified test catches it [S014](../../research/test-driven-development-in-python/01-sources/web/S014-verified-fakes.md).

## Example 2 — consumer-provider contract test with Pact

When your application calls a service owned by another team, a Pact-style test lets you express your consumer expectations and have the provider verify them independently.

```python
# test_notification_consumer.py
from pact import Consumer, Provider, Like

pact = Consumer("BillingService").has_pact_with(Provider("NotificationService"))


def test_billing_can_request_invoice_notification():
    expected_body = Like({"status": "sent", "notification_id": "some-id"})

    (
        pact
        .given("the notification service is running")
        .upon_receiving("a request to send invoice notification INV-42")
        .with_request(
            method="POST",
            path="/notifications",
            body={"type": "invoice", "invoice_id": "INV-42"},
        )
        .will_respond_with(200, body=expected_body)
    )

    with pact:
        adapter = NotificationAdapter(base_url=pact.uri)
        result  = adapter.send_invoice_notification("INV-42")
        assert result.status == "sent"
```

This test runs without the real notification service. It verifies that your adapter correctly formats the request and handles the response. The provider team runs their own Pact verification to confirm they still satisfy these expectations. Both sides learn about incompatible changes before deployment [S017](../../research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md).

## Example 3 — when to use a focused integration test instead

Sometimes neither a fake nor a contract check is the right tool. When you need to verify a complex query, a database constraint, a cascade delete, or a transaction boundary, a focused integration test against real infrastructure tells the truth more directly than either approach.

```python
# test_invoice_integration.py  (uses the rollback fixture from L08)

def test_cancelled_invoice_cascades_to_line_items(db):
    """Verify that DELETE on invoices cascades to invoice_items at DB level."""
    invoice = Invoice(customer_id=1, status="pending")
    db.add(invoice)
    db.flush()

    item = InvoiceItem(invoice_id=invoice.id, description="Widget", amount_cents=999)
    db.add(item)
    db.flush()

    db.delete(invoice)
    db.flush()

    remaining = db.query(InvoiceItem).filter_by(invoice_id=invoice.id).all()
    assert remaining == [], "cascade delete should remove line items"
```

A mock session would never catch a missing `ON DELETE CASCADE` constraint in the schema. A verified fake would catch it only if the fake implements the same cascade behavior. Only a real database test tells the truth here [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md).

The decision rule: use a verified fake or contract check when the cost of calling the real system is too high for the feedback loop you need. Use a real integration test when the database or service semantics themselves are what you are trying to learn.

## Key points

- Deep mocks at external boundaries preserve speed but can silently drift from reality [S014](../../research/test-driven-development-in-python/01-sources/web/S014-verified-fakes.md)
- A verified fake is a lightweight implementation that is periodically validated against the real system — speed plus higher behavioral truth
- Consumer-provider contract tests protect interaction shapes between independently evolving services [S017](../../research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md)
- "Contract testing" is an overloaded term — define the exact mechanism when planning a suite
- Focused integration tests still have a place for database semantics, constraints, and transaction behavior that no fake can accurately model [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md)

## Go deeper

- [S014](../../research/test-driven-development-in-python/01-sources/web/S014-verified-fakes.md) — verified fakes: a higher-assurance alternative to ordinary hand-rolled test doubles
- [S017](../../research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md) — how Pact implements consumer-provider contract verification
- [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md) — transaction rollback strategy and why real database tests are sometimes the only honest choice

---

*[← Previous lesson](./L09-strict-mocks-without-false-confidence.md)* · *[Next lesson →](./L11-parametrization-and-property-based-testing.md)*