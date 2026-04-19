# Boundary Decisions for APIs, Services, and Persistence

**Module**: M04 · Design Seams the Tests Can Trust
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C4, C7 from Strata synthesis

---

## The core idea

Knowing that seams are good is not enough. In a real system you still have to decide where each seam should go. Should you wrap the HTTP client, the service layer, the repository, the ORM session, or some combination? The research points toward a practical answer: create seams around places where external detail would otherwise distort your business-level tests, then choose higher-fidelity verification for the boundary itself when translation correctness matters [S011](../../research/test-driven-development-in-python/01-sources/web/S011-dont-mock-what-you-dont-own.md) [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md).

That means boundary design is tied to a learning question: what do you need to find out from this test? If you need to verify that business logic makes the right decision, a thin application seam and a strict mock often give you a focused answer at low cost. If you need to verify that your persistence layer correctly translates objects through real session semantics, a focused integration test against the real database boundary is what gives you the honest answer. The right seam is the one that lets you ask the cheapest question that still tells the truth.

## Why it matters

Teams that skip this analysis tend toward one of two extremes. The first is an application where all tests mock everything, so the suite is fast but drifts away from reality at every boundary. The second is an application where all tests run against real infrastructure, so the suite is truthful but too slow to run in the TDD loop. Neither supports good TDD practice.

Boundary placement lets you get both: domain tests that are fast and behavioral, plus a focused layer of more realistic tests that verify translation at the points where it matters. The key insight is that you do not have to pick one style across the entire suite — you pick the right style for each kind of learning the suite needs to provide [S011](../../research/test-driven-development-in-python/01-sources/web/S011-dont-mock-what-you-dont-own.md).

## Example 1 — HTTP API boundary: wrap the transport, verify the adapter separately

An application that fetches shipping quotes from an external carrier API. The seam wraps the HTTP transport so that business logic tests never encode request or response formats.

```python
# shipping.py — owned interface
from dataclasses import dataclass
from abc import ABC, abstractmethod


@dataclass
class ShippingQuote:
    carrier:    str
    rate_cents: int
    est_days:   int


class ShippingService(ABC):
    @abstractmethod
    def get_quote(
        self, origin: str, destination: str, weight_kg: float
    ) -> ShippingQuote:
        ...
```

```python
# adapters/carrier_api.py — real translation layer
import httpx
from shipping import ShippingQuote, ShippingService


class CarrierAPIAdapter(ShippingService):
    def __init__(self, base_url: str, api_key: str) -> None:
        self._base_url = base_url
        self._api_key  = api_key

    def get_quote(
        self, origin: str, destination: str, weight_kg: float
    ) -> ShippingQuote:
        resp = httpx.get(
            f"{self._base_url}/quotes",
            params={"from": origin, "to": destination, "weight": weight_kg},
            headers={"X-API-Key": self._api_key},
        )
        resp.raise_for_status()
        data = resp.json()
        return ShippingQuote(
            carrier=data["carrier_name"],
            rate_cents=data["price_usd_cents"],
            est_days=data["estimated_days"],
        )
```

Domain tests use `create_autospec(ShippingService, instance=True)` — they never see `httpx`, headers, or API keys. A separate narrow adapter test exercises `CarrierAPIAdapter` against a recorded HTTP fixture or a test-mode endpoint to verify the JSON field mapping is still correct.

## Example 2 — persistence boundary: transaction-wrapped integration test

For persistence, the right boundary check is a real database test wrapped in a transaction that rolls back after each test. This preserves isolation without resetting the schema between tests — a significant speed gain [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md).

```python
# conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from myapp.models import Base


@pytest.fixture(scope="session")
def engine():
    e = create_engine("postgresql://localhost/test_db")
    Base.metadata.create_all(e)
    yield e
    Base.metadata.drop_all(e)


@pytest.fixture()
def db(engine):
    """Each test gets its own transaction, rolled back on teardown."""
    conn        = engine.connect()
    transaction = conn.begin()
    session     = Session(bind=conn)
    yield session
    session.close()
    transaction.rollback()
    conn.close()
```

```python
# test_order_repository.py
def test_saved_order_is_retrievable(db):
    repo  = OrderRepository(db)
    order = Order(customer_id=1, total_cents=4999, status="pending")
    repo.save(order)

    found = repo.find_by_id(order.id)
    assert found.total_cents == 4999
    assert found.status == "pending"
```

This test uses the real SQL engine and the real ORM session mechanics. It finds mapping errors, constraint violations, and cascade behaviors that a mock session never would — while rolling back cleanly before the next test starts.

## Example 3 — service boundary: when to add a contract-style check

When your application calls a service it does not own, and that service evolves independently, a contract-style check gives you a middle path. It verifies that your application's expectations still match the provider's behavior, without requiring a full end-to-end stack to run on every push [S017](../../research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md).

```python
# test_fulfillment_contract.py (simplified Pact consumer test)
from pact import Consumer, Provider, Like

pact = Consumer("OrderService").has_pact_with(Provider("FulfillmentService"))


def test_fulfillment_accepts_ship_request():
    (
        pact
        .given("a pending order ORD-1 exists")
        .upon_receiving("a ship request for ORD-1")
        .with_request("POST", "/ship", body={"order_id": "ORD-1"})
        .will_respond_with(200, body=Like({"status": "queued"}))
    )

    with pact:
        adapter = FulfillmentAdapter(base_url=pact.uri)
        result  = adapter.ship("ORD-1")
        assert result.status == "queued"
```

This checks the interaction shape — your consumer's expectations about what the provider will accept and return — without requiring the real fulfillment service to be running. When the provider team runs their own pact verification, both sides learn about incompatible changes before deployment.

## Decision rules

- Use a strict mock for an owned collaborator where the question is behavioral coordination
- Use a transaction-wrapped integration test where real persistence semantics — constraints, cascades, mapping correctness — need to be verified honestly [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md)
- Use a contract or recorded-fixture test where an independently evolving external service interaction shape needs protection [S017](../../research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md)
- Do not wrap every line of infrastructure — wrap boundaries where foreign detail would otherwise distort many business tests

## Key points

- Boundary placement is a learning decision, not just a structural one [S011](../../research/test-driven-development-in-python/01-sources/web/S011-dont-mock-what-you-dont-own.md)
- Different boundary types — HTTP APIs, persistence layers, external services — call for different verification strategies
- Seam-based unit tests do not erase the need for boundary checks; they define where those checks should live
- Transaction rollback is the standard strategy for keeping real database integration tests isolated without full schema resets [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md)

## Go deeper

- [S011](../../research/test-driven-development-in-python/01-sources/web/S011-dont-mock-what-you-dont-own.md) — why wrapping external boundaries produces less brittle suites
- [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md) — transaction rollback strategy for real database integration tests
- [S017](../../research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md) — consumer-provider contract testing to protect service interaction shapes

---

*[← Previous lesson](./L07-adapters-injection-and-owned-interfaces.md)* · *[Next lesson →](./L09-strict-mocks-without-false-confidence.md)*