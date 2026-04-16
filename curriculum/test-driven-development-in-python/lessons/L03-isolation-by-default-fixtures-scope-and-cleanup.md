# Isolation by Default: Fixtures, Scope, and Cleanup

**Module**: M02 · Control State, Isolation, and Cleanup
**Type**: core
**Estimated time**: 13 minutes
**Claim**: C2 - Strong Python TDD depends on explicit isolation, deterministic cleanup, and careful control of shared state

---

## The core idea

In Python TDD, isolation is not a nice-to-have. It is part of what makes test feedback trustworthy. The research consistently treats setup, cleanup, and scope as design choices that affect whether a passing test actually gives you confidence. The official `unittest` and `pytest` sources agree on the main pattern even though their mechanics differ: shared state should be limited, cleanup should be deterministic, and broad fixtures should be chosen deliberately rather than by habit. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/web/S001-unittest.md`, `vault/research/test-driven-development-in-python/01-sources/web/S004-pytest-fixtures.md`.

This matters because TDD relies on short, believable cycles. If one test leaves state behind for the next test, the red-green-refactor loop starts lying. A failing test might fail for the wrong reason. A passing test might pass because the environment was accidentally prepared by an earlier test. Once that happens, the design signal becomes noisy, and the developer starts compensating with reruns, ad hoc resets, or defensive debugging instead of trusting the suite.

Pytest's fixture model makes this especially visible. Fixture scope is a performance and isolation tradeoff, not just a convenience setting. Function scope gives the strongest default independence. Broader scopes can reduce setup cost, but they also increase the chance that tests start depending on hidden order or stale state. `unittest` exposes the same tension through `setUp`, `tearDown`, and class or module fixtures. The framework details differ, but the research conclusion is the same: default to the smallest unit of shared state that still keeps the suite practical.

## Why it matters

If you already have some testing exposure, you have probably seen this failure mode: a test suite that is green when run together and red when a single test is run alone, or the reverse. That is usually not a "test runner problem." It is a sign that the isolation model is weak.

In TDD, weak isolation damages two things at once. First, it damages feedback quality. Second, it damages design judgment. Developers stop asking whether the code structure is clear and start asking how to keep the environment from wobbling. That is why the research treats isolation as part of Python TDD expertise rather than as low-level test housekeeping.

## A concrete example

Suppose you are driving a small repository layer that reads and writes tasks from an in-memory collection.

The brittle version uses one shared list for a whole module and mutates it across tests. Test A appends an item. Test B assumes the repository starts empty. Whether Test B passes now depends on whether the shared list was reset correctly, and whether any future test accidentally changes it.

The stronger version gives each test its own fresh repository fixture:

```python
import pytest


@pytest.fixture
def repo():
    return TaskRepository(items=[])


def test_new_repo_is_empty(repo):
    assert repo.all() == []


def test_added_task_is_returned(repo):
    repo.add("write lesson")
    assert repo.all() == ["write lesson"]
```

Nothing here is advanced. That is the point. A good fixture is often small and boring. It creates the minimum state each test needs and lets teardown happen naturally because there is nothing persistent to clean up. When the system becomes more complex, the same idea still applies: use the narrowest fixture that gives the test honest control over its environment.

This example is illustrative, not a sourced code sample. The underlying factual lesson is directly supported by the fixture and framework guidance in the source set: colocated teardown, limited scope, and careful handling of shared fixtures preserve trust in test outcomes. Source trail: `vault/research/test-driven-development-in-python/01-sources/web/S001-unittest.md`, `vault/research/test-driven-development-in-python/01-sources/web/S004-pytest-fixtures.md`, `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`.

## Recognition cues

- If a test behaves differently depending on run order, isolation is probably leaking.
- If a fixture sets up many unrelated objects at once, it is probably too broad.
- If cleanup lives far away from setup, teardown mistakes become harder to spot.

## Key points

- Passing tests are only useful TDD signals when each test can trust its own environment.
- Smaller fixture scope and deterministic cleanup are the default reliability posture.
- Shared fixtures can be useful, but they should be an explicit tradeoff, not the starting point.

## Go deeper

- `vault/research/test-driven-development-in-python/01-sources/web/S001-unittest.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S004-pytest-fixtures.md`
- `vault/research/test-driven-development-in-python/03-synthesis/claims.md`

---

*[<- Previous: Refactor Timing and Small-Step Control](./L02-refactor-timing-and-small-step-control.md)* · *[Next lesson: Async Loops and Transaction Rollbacks in Real Test Suites ->](./L04-async-loops-and-transaction-rollbacks-in-real-test-suites.md)*