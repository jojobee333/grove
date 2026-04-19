# Isolation by Default: Fixtures, Scope, and Cleanup

**Module**: M02 · Control State, Isolation, and Cleanup
**Type**: core
**Estimated time**: 13 minutes
**Claim**: C2 — Strong Python TDD depends on explicit isolation, deterministic cleanup, and careful control of shared state

---

## The core idea

Test isolation is not a hygiene concern you address after the suite is working. It is part of what makes test feedback trustworthy in the first place. A test that passes because the previous test set up the right environment is not a passing test in any useful sense — it is a coincidence that will eventually become a confusing failure when run order changes.

The Python testing ecosystem has always recognized this. The `unittest` documentation explicitly warns that shared fixtures like `setUpClass()` and `setUpModule()` break isolation more easily and do not pair well with parallelization [S001](../../research/test-driven-development-in-python/01-sources/web/S001-unittest.md). The pytest fixture documentation recommends small, single-responsibility fixtures with colocated teardown, specifically because those properties preserve independence across tests [S004](../../research/test-driven-development-in-python/01-sources/web/S004-pytest-fixtures.md). Both frameworks point to the same underlying discipline even though the mechanics differ: default to the smallest unit of shared state that keeps the suite practically fast, and be deliberate when you choose something broader.

This discipline feeds directly into TDD quality. Red-green-refactor depends on short, believable feedback cycles. If one test leaves state behind for the next, the red-green signal becomes noisy. A failing test might fail because a previous test left the database in an unexpected state. A passing test might pass because an earlier test happened to create the configuration this one needed. When that happens, developers stop trusting the suite and start compensating — re-running tests, debugging test infrastructure, adding teardown code reactively. TDD's design feedback collapses into test management overhead.

## Why it matters

This is one of the sharpest dividing lines between a TDD suite that accelerates design and one that gradually becomes a drag. Developers with some test exposure often recognize isolation failures after they cause a problem. The discipline here is recognizing them as a structural risk *before* they cause a problem — and building fixture habits that prevent them by default.

The `pytest` fixture scope hierarchy makes the tradeoff explicit: function scope (the default) gives each test its own instance of the fixture. Class scope shares within a class. Module and session scope share more broadly. Each step up the hierarchy trades isolation for speed [S004](../../research/test-driven-development-in-python/01-sources/web/S004-pytest-fixtures.md). That trade can be worth it when the fixture is expensive to create and the tests do not mutate shared state. It is dangerous when shared state is mutable and tests can influence each other's outcomes.

The `unittest` model makes the same tradeoff available through different mechanisms: `setUp`/`tearDown` (per-test), `setUpClass`/`tearDownClass` (per class), and `setUpModule`/`tearDownModule` (per module). The framework warns that broader scopes can produce hidden coupling [S001](../../research/test-driven-development-in-python/01-sources/web/S001-unittest.md). The practical lesson is identical regardless of which framework you use.

## Example 1 — Function-scoped fixtures prevent order dependence

Here is the brittle pattern: a shared repository object that gets mutated across tests.

```python
# BRITTLE: module-level shared state
repo = TaskRepository()

def test_new_repo_is_empty():
    assert repo.all() == []

def test_added_task_is_returned():
    repo.add("write lesson")
    assert repo.all() == ["write lesson"]

def test_repo_count_after_add():
    # Passes only if test_added_task_is_returned ran first
    assert len(repo.all()) == 1
```

The third test fails if run in isolation or in a different order. The second test "prepares" the environment that the third test assumes. That is a hidden dependency that TDD cannot tolerate — the suite is now lying about which behaviors are actually verified.

Here is the isolation-preserving version:

```python
import pytest

@pytest.fixture
def repo():
    return TaskRepository()

def test_new_repo_is_empty(repo):
    assert repo.all() == []

def test_added_task_is_returned(repo):
    repo.add("write lesson")
    assert repo.all() == ["write lesson"]

def test_repo_count_after_add(repo):
    repo.add("write lesson")
    assert len(repo.all()) == 1
```

Each test gets its own fresh `TaskRepository`. The third test now owns its own setup. It can run in any order, in isolation, or in parallel without producing different results. The fixture is small, boring, and completely correct.

## Example 2 — Yield fixtures with deterministic cleanup

For fixtures that allocate external resources — database connections, temporary files, HTTP servers — cleanup must be deterministic. The `yield` fixture pattern keeps setup and teardown colocated, which makes the cleanup intent visible and prevents the common mistake of teardown code that only runs when no exception occurred [S004](../../research/test-driven-development-in-python/01-sources/web/S004-pytest-fixtures.md).

```python
import pytest
import tempfile
import os

@pytest.fixture
def temp_config_file():
    # Setup: create a temporary file with test configuration
    fd, path = tempfile.mkstemp(suffix=".json")
    with os.fdopen(fd, "w") as f:
        f.write('{"mode": "test"}')
    
    yield path  # The test receives the path here
    
    # Teardown: always runs, even if the test raised
    os.unlink(path)

def test_config_loader_reads_mode(temp_config_file):
    config = load_config(temp_config_file)
    assert config["mode"] == "test"

def test_config_loader_returns_dict(temp_config_file):
    config = load_config(temp_config_file)
    assert isinstance(config, dict)
```

The yield pattern is more than syntax convenience. It means teardown runs in the same stack frame as setup, which makes it easier to reason about, and it runs even if the test body raises an exception. Compare this to a pattern where teardown is in a separate `tearDown` method or in a `finally` block after the yield — both work, but they separate the intent from the cleanup, making it easier for future maintainers to accidentally break the teardown.

The pytest documentation explicitly recommends yield fixtures as the standard teardown mechanism for exactly these reasons [S004](../../research/test-driven-development-in-python/01-sources/web/S004-pytest-fixtures.md).

## Fixture scope in practice

A useful default: start every fixture at function scope. Elevate scope only when:

1. The fixture creation is genuinely expensive (a database connection pool, a process launch, an HTTP server start)
2. The tests that share the scope do not mutate the fixture's state
3. You can explicitly verify that the elevated scope does not introduce order dependence

When those three conditions hold, a module or session-scoped fixture can save meaningful time without sacrificing reliability. When any one of them does not hold, elevating scope creates a fragile dependency that will produce confusing failures under the worst possible conditions — a deadline, a CI environment with parallel workers, a new team member running tests in an unexpected order.

The `async` testing lifecycle adds one more consideration: event-loop scope interacts with fixture scope. This is covered in the next lesson.

## Limitations

Broader fixture scopes are not wrong. They are a deliberate speed-isolation tradeoff. The caveat from the research is that this tradeoff should be intentional: "Broader fixture scopes are still useful when the speed tradeoff is intentional and the resulting coupling is understood" [C2]. Teams sometimes start with session-scoped fixtures for speed and only discover the isolation cost when order-dependent failures appear weeks later. The discipline is not to avoid all broad scopes — it is to choose them with explicit awareness of what independence you are trading away.

## Key points

- Test isolation is not housekeeping — it is the mechanism that makes TDD's feedback signal trustworthy.
- Function-scoped fixtures (the pytest default) give each test its own independent environment at the cost of re-running setup on each test.
- Yield fixtures colocate setup and teardown, ensuring cleanup runs even when tests fail.
- Shared fixtures should be a deliberate choice, not a default, because their hidden coupling can make failures unpredictable and order-dependent.
- Both `pytest` and `unittest` converge on the same underlying discipline: default to the smallest unit of shared state that keeps the suite practically fast.

## Go deeper

- [S001](../../research/test-driven-development-in-python/01-sources/web/S001-unittest.md) — Python docs on `unittest` fixtures, cleanup hooks, and the specific warning about shared class/module fixtures breaking isolation
- [S004](../../research/test-driven-development-in-python/01-sources/web/S004-pytest-fixtures.md) — pytest fixture documentation covering scope, yield teardown, dependency injection, and safe fixture design
- [S015](../../research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md) — event-loop scope as an isolation concern in async test suites
- [S016](../../research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md) — transaction rollback as an isolation mechanism for database-backed tests

---

*← [Previous lesson](./L02-refactor-timing-and-small-step-control.md)* · *[Next lesson](./L04-async-loops-and-transaction-rollbacks-in-real-test-suites.md) →*