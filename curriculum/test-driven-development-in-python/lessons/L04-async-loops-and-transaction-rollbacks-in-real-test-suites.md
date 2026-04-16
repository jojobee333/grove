# Async Loops and Transaction Rollbacks in Real Test Suites

**Module**: M02 · Control State, Isolation, and Cleanup
**Type**: advanced
**Estimated time**: 15 minutes
**Claim**: C2, C7 - Strong Python TDD depends on explicit isolation, deterministic cleanup, and careful control of shared state; advanced Python TDD expertise includes using broader specification techniques than single example-based unit tests

---

## The advanced move

Isolation gets harder once your tests stop living entirely in pure functions. Async code introduces event-loop state. Persistence introduces transactions, commits, and cleanup costs. The research shows that expert Python TDD does not solve these problems by abandoning realism or by mocking everything away. Instead, it uses explicit control over runtime boundaries so tests can stay believable without becoming chaotic. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md`, `vault/research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md`.

The async guidance is especially important because many developers assume coroutine tests should automatically run concurrently. The `pytest-asyncio` documentation says the opposite: tests still run sequentially by design because reliability and isolation matter more than raw runner concurrency. Event-loop scope is therefore a design decision. A function-scoped loop usually gives the clearest isolation, while broader sharing should happen only when neighboring tests truly need the same lifecycle.

Database tests expose a parallel lesson. The SQLAlchemy transaction pattern in the source set is valuable because it rejects a false choice. You do not have to choose between fake-only confidence and dirty persistent state. You can let application code call `commit()` naturally inside the session while still wrapping the whole test in an outer transaction that rolls back afterward. That keeps the code path realistic without letting one test contaminate the next.

## Why it matters

This is a major dividing line between basic and advanced TDD skill. Beginners often think advanced systems require either full mocking or painful end-to-end environments. The source set argues for a narrower, more useful rule: preserve realism at the boundary you are trying to learn from, but keep control of the lifecycle around that boundary.

For async code, that means asking, "What loop scope gives me believable behavior without surprising coupling?" For database-backed code, it means asking, "How can I exercise the real persistence flow while guaranteeing reset after the test?" These are TDD questions because they determine whether the next red-green-refactor cycle is based on clean evidence.

## A concrete example

Imagine a service that awaits an async client call, then saves a result through SQLAlchemy.

Two weak testing approaches are common:

- mock the entire async client and the whole database session stack, then assert call order
- run against a shared database and clean it manually only when failures appear

The first approach often overfits implementation details. The second approach destroys isolation. The research-backed middle path is to keep the async runtime and persistence boundary under deliberate control.

For asyncio, that may mean using explicitly marked async tests and a consistent loop scope for neighboring tests. For SQLAlchemy, that may mean binding a session to a connection already inside an outer transaction, allowing normal session commits, and rolling back the outer transaction at teardown. The code under test still behaves like application code. The test environment stays resettable.

Illustratively, the pattern looks conceptually like this:

```python
connection = engine.connect()
outer_tx = connection.begin()
session = Session(bind=connection, join_transaction_mode="create_savepoint")

try:
    # run code that can call session.commit()
    ...
finally:
    session.close()
    outer_tx.rollback()
    connection.close()
```

This example is illustrative, while the transactional idea and rationale are directly drawn from the SQLAlchemy source note. The important design lesson is that you preserve realism where it helps and constrain lifecycle where it protects the suite. Source trail: `vault/research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md`, `vault/research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md`.

## Common mistakes

- Treating async tests as if loop scope were irrelevant.
- Sharing one event loop or one persistent database setup across tests without a strong reason.
- Replacing all persistence behavior with mocks before learning whether the real transaction boundary is the actual design pressure.
- Using realistic infrastructure without a guaranteed reset strategy.

## Key points

- Advanced Python TDD keeps realistic boundaries while still controlling lifecycle aggressively.
- Async tests prioritize explicit loop management and sequential reliability over hidden concurrency.
- Transaction rollback patterns let real persistence behavior stay testable without contaminating later tests.

## Go deeper

- `vault/research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md`
- `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`

---

*[<- Previous: Isolation by Default: Fixtures, Scope, and Cleanup](./L03-isolation-by-default-fixtures-scope-and-cleanup.md)* · *[Next lesson: pytest as the Daily Driver ->](./L05-pytest-as-the-daily-driver.md)*