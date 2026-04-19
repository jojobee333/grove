# Advanced Boundary Coverage in Practice

**Module**: M06 · Broaden Specification Beyond Single Examples
**Type**: synthesis
**Estimated time**: 17 minutes
**Claim**: C7 from Strata synthesis

---

## The core idea

The previous five lessons built separate ideas: fixture isolation, async loop control, transactional persistence testing, seam design, strict mocks, verified fakes, contract checks, parametrization, and property-based testing. The synthesis challenge is knowing when to apply each. A practitioner who reaches for Hypothesis on every function is doing unnecessary work. One who only writes happy-path unit tests is leaving real coverage gaps. Advanced coverage is about deliberate layering, not exhaustive application of every technique [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md) [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md).

The research suggests a practical framing: choose each test type by the kind of learning it provides. Unit tests with strict mocks tell you whether domain logic makes correct decisions. Parametrized and property-based tests tell you whether the specification holds across a broader input space. Async loop or transaction fixture tests tell you whether runtime lifecycle boundaries preserve isolation. Real boundary tests — integration, contract, or verified-fake — tell you whether translations to external systems are still honest. Each layer earns its place by answering a different question about the system.

## Why it matters

Advanced coverage is not about having more tests. It is about having the right tests for the right concerns. A suite that overlaps heavily — unit tests, integration tests, and contract tests all covering the same assertion — is expensive to maintain and provides diminishing feedback. A suite with strategic layering provides fast feedback on domain decisions and honest feedback on boundary translations, at a sustainable maintenance cost.

The other risk is coverage theatre: a suite that is large and green but doesn't actually catch the regressions it implies it will catch. Parametrization applied to the wrong granularity, Hypothesis invariants that are too easy to satisfy, mocks that don't resemble the real interfaces — all of these produce test count without test value. The advanced skill is not running every tool, but knowing which tool answers the question you actually have.

## Example 1 — a complete suite for a domain service with boundaries

A `SubscriptionRenewalService` that renews subscriptions: validate eligibility, charge via a payment gateway, update the database, emit a domain event.

The ideal suite has distinct layers, each with a clear purpose:

```python
# Layer 1 — unit tests for domain logic (strict mocks, fast)
def test_ineligible_subscription_is_rejected(mock_gateway, mock_repo, mock_bus):
    repo  = create_autospec(SubscriptionRepo, instance=True)
    sub   = Subscription(id="sub-1", status="cancelled", expires_at=past_date())
    repo.find.return_value = sub

    service = SubscriptionRenewalService(repo, mock_gateway, mock_bus)
    with pytest.raises(IneligibleSubscriptionError):
        service.renew("sub-1")

    mock_gateway.charge.assert_not_called()
    mock_bus.publish.assert_not_called()


def test_successful_renewal_emits_event():
    repo    = create_autospec(SubscriptionRepo, instance=True)
    gateway = create_autospec(PaymentGateway, instance=True)
    bus     = create_autospec(EventBus, instance=True)

    sub = Subscription(id="sub-1", status="active", expires_at=tomorrow())
    repo.find.return_value = sub
    gateway.charge.return_value = ChargeResult(status="ok", charge_id="ch-99")

    service = SubscriptionRenewalService(repo, gateway, bus)
    service.renew("sub-1")

    bus.publish.assert_called_once_with(SubscriptionRenewed(subscription_id="sub-1"))
```

```python
# Layer 2 — parametrized cases for eligibility rules
@pytest.mark.parametrize(
    ("status", "days_until_expiry", "should_renew"),
    [
        ("active",    5,    True),
        ("active",    0,    True),
        ("cancelled", 5,    False),
        ("suspended", 5,    False),
        ("active",   -1,    False),   # already expired
    ],
)
def test_renewal_eligibility(status, days_until_expiry, should_renew):
    sub = Subscription(
        id="sub-1",
        status=status,
        expires_at=date.today() + timedelta(days=days_until_expiry),
    )
    assert sub.is_eligible_for_renewal() == should_renew
```

```python
# Layer 3 — real database test for persistence (transaction fixture)
def test_renewal_updates_expiry_in_database(db):
    sub = Subscription(id="sub-1", status="active", expires_at=tomorrow())
    db.add(sub)
    db.flush()

    repo    = SQLAlchemySubscriptionRepo(db)
    gateway = create_autospec(PaymentGateway, instance=True)
    gateway.charge.return_value = ChargeResult(status="ok", charge_id="ch-1")
    bus     = create_autospec(EventBus, instance=True)

    service = SubscriptionRenewalService(repo, gateway, bus)
    service.renew("sub-1")

    refreshed = db.query(Subscription).filter_by(id="sub-1").one()
    assert refreshed.expires_at > tomorrow()   # expiry was extended
```

Each layer is doing different work. The unit tests verify logic. The parametrized cases cover the eligibility space. The database test verifies that the repository correctly persists the renewal outcome under real session semantics [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md).

## Example 2 — adding a Hypothesis invariant

Once the unit tests and parametrized cases are in place, a property-based test can guard a broader invariant across the renewal logic: a renewal should never produce an expiry date in the past, regardless of the input state.

```python
from hypothesis import given, strategies as st, assume


@given(
    status         = st.sampled_from(["active"]),
    days_remaining = st.integers(min_value=0, max_value=365),
    renewal_days   = st.integers(min_value=1, max_value=365),
)
def test_renewal_always_extends_expiry_into_future(status, days_remaining, renewal_days):
    sub = Subscription(
        id="sub-1",
        status=status,
        expires_at=date.today() + timedelta(days=days_remaining),
    )
    new_expiry = sub.calculate_renewal_expiry(renewal_days)
    assert new_expiry > date.today()
```

This test does not replace the specific parametrized cases. It adds a different kind of assurance: that across any combination of remaining days and renewal period, the extension logic never produces a nonsensical past date [S010](../../research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md).

## Example 3 — async layer with per-test loop scope

If the service has an async notification path — say, an HTTP call to a webhook endpoint — the suite extends into async territory with an explicit per-test event loop to keep tests independent [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md).

```python
import pytest
import pytest_asyncio


@pytest_asyncio.fixture()
async def async_notifier():
    """Fresh async notifier per test — no shared event loop state."""
    notifier = AsyncWebhookNotifier(endpoint="http://localhost:9999/hook")
    yield notifier
    await notifier.close()


@pytest.mark.asyncio
async def test_renewal_webhook_fires_on_success(async_notifier, httpx_mock):
    httpx_mock.add_response(url="http://localhost:9999/hook", status_code=200)

    await async_notifier.notify_renewal("sub-1")

    requests = httpx_mock.get_requests()
    assert len(requests) == 1
    assert requests[0].method == "POST"
```

The per-test fixture scope ensures each async test starts with a fresh loop. The mock HTTP response keeps the test fast and isolated. Real integration-level checks against the actual webhook endpoint run in a separate CI stage, not on every local test run.

## Decision model

| Concern | Tool |
|---|---|
| Domain logic decisions | Unit test with strict mock (autospec) |
| Input case families | Parametrized test |
| Broad invariants | Hypothesis property test |
| Real persistence semantics | Transaction-wrapped integration test |
| External service interaction shape | Contract test or verified fake |
| Async runtime isolation | Per-test event loop scope |

## Key points

- Advanced coverage is strategic layering, not exhaustive application of every tool [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md)
- Each layer earns its place by answering a question the other layers cannot answer
- Unit tests protect logic; parametrization broadens cases; Hypothesis guards invariants; integration tests verify boundary truth [S010](../../research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md)
- Per-test async event loop scope prevents lifecycle state from leaking across test runs [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md)
- The right suite for a non-trivial Python system is chosen by learning goals, not by attachment to one test style

## Go deeper

- [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md) — async loop scope, per-test vs session-scope event loops
- [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md) — transactional test isolation for realistic persistence tests
- [S010](../../research/test-driven-development-in-python/01-sources/web/S010-hypothesis-quickstart.md) — Hypothesis in context: combining with example-based tests rather than replacing them

---

*[← Previous lesson](./L11-parametrization-and-property-based-testing.md)* · *[Next lesson →](./L13-what-the-empirical-evidence-actually-supports.md)*