# Async Loops and Transaction Rollbacks in Real Test Suites

**Module**: M02 · Control State, Isolation, and Cleanup
**Type**: advanced
**Estimated time**: 15 minutes
**Claim**: C2, C7 — Strong Python TDD depends on explicit isolation, deterministic cleanup, and careful control of shared state; advanced Python TDD expertise includes using broader specification techniques than single example-based unit tests

---

## The core idea

Isolation discipline extends beyond simple in-memory objects. Once your code uses `asyncio` or talks to a real database, the lifecycle choices you make in your test suite determine whether tests stay independent, whether database state leaks across test boundaries, and whether async failures produce diagnosable error messages or confusing cross-test interference.

The research identifies two specific patterns that address these challenges without retreating to pure mocking. For async code, `pytest-asyncio` provides event-loop scoping that keeps async tests isolated while still running sequentially [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md). For database-backed code, SQLAlchemy's external transaction pattern lets real ORM sessions call `commit()` during tests while still rolling everything back at teardown [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md). Both patterns extend the isolation discipline from the previous lesson into territory where simple fixtures are not enough.

These are not optional refinements. If you skip them, you either mock away the async runtime and persistence behavior entirely (reducing the TDD feedback value for the hardest parts of your system) or accept contamination between tests (undermining the reliability of the entire suite). Expert Python TDD finds the path between those two bad options.

## Why it matters

This lesson marks a dividing line between surface-level TDD skill and the kind of judgment that makes TDD work in production codebases. Beginners often think advanced systems require either mocking everything or accepting brittle integration tests. The research argues for a narrower, more useful rule: preserve realism at the boundary you need to learn from, and keep explicit control over the lifecycle around that boundary.

For async code, that means asking which event-loop scope gives you believable isolation for neighboring tests. For database code, it means asking how to let the real persistence flow run while still guaranteeing that every test starts with a clean slate.

## Example 1 — Async loop scope with pytest-asyncio

The `pytest-asyncio` plugin gives each test its own event loop at function scope by default. This is the isolation-first default: each async test runs in a completely fresh loop with no shared async state from neighboring tests [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md).

```python
# pytest.ini or pyproject.toml
# [pytest]
# asyncio_mode = auto

import pytest
import asyncio

@pytest.mark.asyncio
async def test_notification_is_sent():
    service = NotificationService()
    await service.send("user-1", "welcome")
    assert service.sent_count() == 1

@pytest.mark.asyncio
async def test_failed_send_does_not_increment_count():
    service = NotificationService()
    with pytest.raises(DeliveryError):
        await service.send("user-2", None)  # None message triggers error
    assert service.sent_count() == 0
```

Each test gets its own `NotificationService` instance via its own setup, and its own event loop. Neither test can reach into the other's async state.

An important detail from the `pytest-asyncio` docs: async tests run **sequentially**, not concurrently, even though they use `await` [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md). This is intentional. The docs show that two 2-second async tests take ~4 seconds total, not ~2. Concurrency in the runner would improve speed but would undermine isolation — two async tests sharing an event loop can interfere with each other through shared coroutine state. The sequential design prioritizes reliability over raw throughput.

For neighboring tests that share a setup-heavy async resource (e.g., an HTTP server that takes time to start), you can elevate loop scope deliberately. But the docs recommend keeping neighboring tests at the same scope level — mixing scopes makes async behavior harder to reason about [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md).

## Example 2 — Transaction rollback for real database isolation

Real database tests present a specific challenge: application code typically calls `session.commit()` to persist state. If each test commits to the database, tests accumulate state that later tests must clean up — a fragile and slow strategy.

SQLAlchemy 2.0 provides a clean answer: bind the session to a connection that is already inside an external transaction, then roll that transaction back at teardown. The application's `commit()` calls create savepoints inside the outer transaction instead of committing to the real database [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md).

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

@pytest.fixture(scope="session")
def engine():
    return create_engine("postgresql://user:pass@localhost/testdb")

@pytest.fixture
def db_session(engine):
    # Start an outer transaction that wraps the entire test
    connection = engine.connect()
    transaction = connection.begin()
    
    # Bind the session to this connection, using savepoints for commits
    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
    )
    
    yield session  # The test uses this session normally
    
    # Rollback the outer transaction — ALL changes from the test are undone
    session.close()
    transaction.rollback()
    connection.close()

def test_creates_order(db_session):
    order = Order(customer_id=1, total=150.0)
    db_session.add(order)
    db_session.commit()  # Creates a SAVEPOINT internally; does NOT commit to DB
    
    result = db_session.query(Order).filter_by(customer_id=1).first()
    assert result is not None
    assert result.total == 150.0

def test_empty_orders_for_new_customer(db_session):
    # Previous test's data was rolled back — this starts clean
    result = db_session.query(Order).filter_by(customer_id=1).all()
    assert result == []
```

The key is `join_transaction_mode="create_savepoint"`. When the application calls `session.commit()`, SQLAlchemy issues a `SAVEPOINT` command rather than a real commit. The outer transaction remains open. At teardown, `transaction.rollback()` reverts everything including the savepoint data [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md).

This is a major upgrade over alternatives: it is more realistic than mocking the session (real SQL runs), faster than truncating tables between tests (one rollback instead of many deletes), and safer than using a separate database per test (no provisioning overhead).

## Connecting the patterns to broader specification

Both patterns reflect the broader TDD principle in C7: expert Python testing extends behavioral specification into the domains where code actually fails in production. Async lifecycle bugs and persistence boundary bugs are not theoretical risks — they are among the most common sources of production incidents. Testing them with realistic lifecycles (controlled loops, real transactions) gives your red-green-refactor cycles the same feedback quality for I/O-heavy code that function-scoped unit tests give for pure logic [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md) [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md).

## Limitations

These techniques increase power but also demand stronger judgment about readability, runtime cost, and failure diagnosis. An async test that fails due to a loop-scope misconfiguration produces error messages that are harder to interpret than a plain unit test failure. A transaction rollback test that appears to pass locally but fails in CI because the test database is provisioned differently is confusing in a different way. The techniques are worth the added complexity — but they require explicit documentation of the setup pattern so the team understands why the fixture is structured as it is.

## Key points

- Async tests run sequentially by default in `pytest-asyncio` because isolation is more important than runner concurrency.
- Function-scoped event loops give each async test independent lifecycle; elevate scope only when setup cost justifies the coupling.
- SQLAlchemy's `join_transaction_mode="create_savepoint"` lets real ORM code call `commit()` during tests while rolling back at teardown.
- These patterns extend TDD isolation discipline to the most common production failure domains: async lifecycles and persistence boundaries.
- Both patterns prioritize realism at the boundary over speed of setup — the tradeoff is explicit and intentional.

## Go deeper

- [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md) — pytest-asyncio concepts including event-loop scope, mode selection, and why async tests run sequentially
- [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md) — SQLAlchemy's external transaction recipe for test isolation including the savepoint mode and SQLAlchemy 2.0 improvements
- [S004](../../research/test-driven-development-in-python/01-sources/web/S004-pytest-fixtures.md) — pytest fixture scoping and yield teardown as the foundation for the patterns in this lesson

---

*← [Previous lesson](./L03-isolation-by-default-fixtures-scope-and-cleanup.md)* · *[Next lesson](./L05-pytest-as-the-daily-driver.md) →*