# asyncio, Threads, or Processes: The Decision Matrix

**Module**: M06 · Concurrency and Graceful Shutdown  
**Type**: applied  
**Estimated time**: 14 minutes  
**Claim**: C12 from Strata synthesis

---

## The core idea

Python offers three concurrency models, and the correct choice is determined by the bottleneck — not by the developer's familiarity with the API. The decision matrix is the consensus from three independent sources: the [asyncio docs](../../research/python-scripting-best-practices/01-sources/web/S012-asyncio.md), the [asyncio task docs](../../research/python-scripting-best-practices/01-sources/web/S013-asyncio-tasks.md), and the [concurrent.futures docs](../../research/python-scripting-best-practices/01-sources/web/S019-concurrent-futures.md).

| Workload type | Primary model | Why |
|---|---|---|
| I/O-bound, async-native libraries | `asyncio` | Single thread handles thousands of concurrent I/O waits |
| I/O-bound, blocking/sync libraries | `ThreadPoolExecutor` | GIL released during I/O; threads are cheap for waiting |
| CPU-bound (computation) | `ProcessPoolExecutor` | Bypasses the GIL by spawning separate OS processes |
| Single blocking call inside async | `asyncio.to_thread()` | Runs one blocking call off the event loop without a full executor |
| Fan-out of concurrent tasks (3.11+) | `asyncio.TaskGroup` | Structured concurrency with automatic cancellation |

The one diagnostic question: **Is the program waiting for I/O, or computing?** Waiting → asyncio or threads. Computing → processes.

## The GIL and why it matters

Python's Global Interpreter Lock (GIL) prevents two threads from executing Python bytecode simultaneously in the same process. This is why threads do not give true parallelism for CPU-bound code — two threads computing on the same process take the same wall-clock time as one thread running sequentially.

For I/O-bound work, the GIL is irrelevant: when a thread blocks waiting for a network response or a disk read, it releases the GIL, allowing another thread to run. This is why `ThreadPoolExecutor` works for I/O-bound tasks.

For CPU-bound work — image processing, numerical computation, parsing large files — `ProcessPoolExecutor` spawns separate OS processes, each with its own GIL. True parallel execution happens across processes.

## asyncio for I/O-bound concurrent scripts

Use asyncio when your libraries support async natively (aiohttp, httpx in async mode, aiofiles, asyncpg):

```python
import asyncio
import httpx


async def fetch(client: httpx.AsyncClient, url: str) -> tuple[str, int]:
    """Fetch a URL and return its URL and response length.

    Args:
        client: Shared async HTTP client.
        url: URL to fetch.

    Returns:
        Tuple of (url, response_body_length).
    """
    response = await client.get(url, timeout=10.0)
    return url, len(response.text)


async def fetch_all(urls: list[str]) -> list[tuple[str, int]]:
    """Fetch all URLs concurrently using TaskGroup.

    Args:
        urls: List of URLs to fetch.

    Returns:
        List of (url, length) tuples in completion order.
    """
    results: list[tuple[str, int]] = []
    async with httpx.AsyncClient() as client:
        async with asyncio.TaskGroup() as tg:    # Python 3.11+ — cancels all on failure
            tasks = [tg.create_task(fetch(client, url)) for url in urls]
    results = [t.result() for t in tasks]
    return results


if __name__ == "__main__":
    import sys
    urls = sys.argv[1:]
    pairs = asyncio.run(fetch_all(urls))
    for url, length in pairs:
        print(f"{url}: {length} chars")
```

`asyncio.TaskGroup` (Python 3.11+) provides *structured concurrency*: if any task raises an exception, all remaining tasks are cancelled and the exceptions are collected into an `ExceptionGroup`. This prevents the silent partial-success behavior of `asyncio.gather()` with `return_exceptions=True`.

For Python 3.10 targets where `TaskGroup` is unavailable, use `gather()` with explicit error handling:

```python
# Python 3.10 fallback
results = await asyncio.gather(*[fetch(client, url) for url in urls],
                               return_exceptions=True)
errors = [r for r in results if isinstance(r, Exception)]
if errors:
    raise ExceptionGroup("fetch errors", errors)
```

## ProcessPoolExecutor for CPU-bound work

```python
from concurrent.futures import ProcessPoolExecutor
import math


def is_prime(n: int) -> bool:
    """Return True if n is prime.

    Args:
        n: Integer to test.

    Returns:
        True if n is prime, False otherwise.
    """
    if n < 2:
        return False
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0:
            return False
    return True


def find_primes(candidates: list[int]) -> list[int]:
    """Find all primes in candidates using parallel processes.

    Args:
        candidates: List of integers to test for primality.

    Returns:
        Subset of candidates that are prime.
    """
    with ProcessPoolExecutor() as pool:   # context manager — waits for workers on exit
        results = list(pool.map(is_prime, candidates))
    return [n for n, prime in zip(candidates, results) if prime]
```

`ProcessPoolExecutor` as a context manager (`with ProcessPoolExecutor() as pool`) calls `shutdown(wait=True)` on exit, which waits for all submitted work to complete before returning. Never leave an executor without this — unfinished futures are silently discarded.

## asyncio.to_thread() for mixing sync and async

When your code is async but one library you depend on is synchronous-only (a legacy database driver, a third-party API client), use `asyncio.to_thread()` to run it without blocking the event loop:

```python
import asyncio
from pathlib import Path


async def process_files(paths: list[Path]) -> list[str]:
    """Process files concurrently, offloading blocking reads to threads.

    Args:
        paths: List of file paths to read.

    Returns:
        List of file contents.
    """
    async def read_one(path: Path) -> str:
        # Path.read_text() is blocking — run it in a thread pool
        return await asyncio.to_thread(path.read_text, encoding="utf-8")

    return list(await asyncio.gather(*[read_one(p) for p in paths]))
```

## Limitations

asyncio requires async-native libraries. If you mix synchronous blocking code directly inside an async function — calling `requests.get()` inside a coroutine without `to_thread()` — you block the entire event loop for every other coroutine during that call. The symptom is poor performance and high latency despite ostensibly using async.

`TaskGroup` requires Python 3.11+. For Python 3.10-only targets, `gather()` with `return_exceptions=True` is the fallback. When targeting 3.11+, always prefer `TaskGroup` — the structured cancellation semantics are significantly safer.

`ProcessPoolExecutor` requires the submitted function to be importable from `__main__` — it cannot be a lambda, a locally-defined function, or a closure that captures local variables. Use module-level functions or staticmethods.

## Key points

- The concurrency decision is based on workload type, not preference: I/O-bound → asyncio or `ThreadPoolExecutor`; CPU-bound → `ProcessPoolExecutor`
- `asyncio.TaskGroup` (3.11+) is preferred over `gather()` — it cancels all siblings if one fails, preventing partial-success silent failures
- `asyncio.to_thread()` is the bridge for calling synchronous library code from inside async functions without blocking the event loop
- Always use executors as context managers — `with ProcessPoolExecutor()` waits for all workers before returning

## Go deeper

- [S013 — asyncio task docs](../../research/python-scripting-best-practices/01-sources/web/S013-asyncio-tasks.md) — `TaskGroup`, `create_task()` reference-keeping pattern, and `ExceptionGroup` semantics
- [S019 — concurrent.futures docs](../../research/python-scripting-best-practices/01-sources/web/S019-concurrent-futures.md) — `ThreadPoolExecutor` vs `ProcessPoolExecutor`, `as_completed()`, `Future.result()`, timeout handling
- [S012 — asyncio docs](../../research/python-scripting-best-practices/01-sources/web/S012-asyncio.md) — `asyncio.run()` lifecycle, event loop primitives, `asyncio.Queue` for producer/consumer patterns

---

*[← L09: Serialization](./L09-serialization.md)* · *[L11: Graceful Shutdown →](./L11-graceful-shutdown.md)*

---

## The core idea

Python offers three concurrency models, and the choice is determined by the bottleneck — not preference:

| Workload | Model | Reason |
|----------|-------|--------|
| I/O-bound (network, disk) | `asyncio` or `ThreadPoolExecutor` | GIL released during I/O waits |
| CPU-bound (heavy computation) | `ProcessPoolExecutor` | Bypasses the GIL by spawning processes |
| Mixing sync and async | `asyncio.to_thread()` | Runs blocking calls off the event loop |
| Fan-out of concurrent tasks | `asyncio.TaskGroup` (3.11+) | Structured concurrency with automatic cancellation |

This matrix is the consensus from the Python asyncio docs ([S012](../../research/python-scripting-best-practices/01-sources/web/S012-asyncio.md)), the concurrent.futures docs ([S013](../../research/python-scripting-best-practices/01-sources/web/S013-concurrent-futures.md)), and Real Python ([S019](../../research/python-scripting-best-practices/01-sources/web/S019-real-python-asyncio.md)).

## Why it matters when teaching

The most common mistake is using `asyncio` for CPU-bound work. `asyncio` is cooperative — tasks yield control voluntarily when doing I/O. A CPU-bound coroutine that never yields will block the entire event loop for every other coroutine. The fix is not "use asyncio better" — it is `ProcessPoolExecutor`, combined with `asyncio.get_event_loop().run_in_executor()` to offload the blocking work.

The second most common mistake is over-threading I/O-bound work. Threads solve the problem (GIL is released during I/O), but `asyncio` can handle thousands of concurrent I/O operations on a single thread, while thousands of threads consume gigabytes of stack space.

When teaching the decision matrix, ask: "Is the program waiting or computing?" That one question eliminates most wrong choices.

## A concrete example

**asyncio for I/O-bound work:**

```python
import asyncio
import httpx


async def fetch(client: httpx.AsyncClient, url: str) -> str:
    response = await client.get(url)
    return response.text


async def fetch_all(urls: list[str]) -> list[str]:
    async with httpx.AsyncClient() as client:
        async with asyncio.TaskGroup() as tg:   # 3.11+ — automatic cancellation on error
            tasks = [tg.create_task(fetch(client, url)) for url in urls]
    return [t.result() for t in tasks]
```

**ProcessPoolExecutor for CPU-bound work:**

```python
from concurrent.futures import ProcessPoolExecutor


def crunch(n: int) -> int:
    return sum(i * i for i in range(n))  # CPU-bound


def run_parallel(values: list[int]) -> list[int]:
    with ProcessPoolExecutor() as pool:   # context manager — waits for all workers
        return list(pool.map(crunch, values))
```

**asyncio.to_thread for mixing sync libraries into async code:**

```python
import asyncio


async def save_to_disk(data: bytes, path: str) -> None:
    # blocking write moved off event loop
    await asyncio.to_thread(open(path, "wb").write, data)
```

## Key points

- I/O-bound → asyncio (thousands of concurrent waits, single thread); CPU-bound → ProcessPoolExecutor (bypasses GIL)
- `asyncio.TaskGroup` (3.11+) is the preferred way to fan out concurrent tasks — it cancels all siblings if one fails
- Use `asyncio.to_thread()` to call synchronous library code from an async function without blocking the event loop

## Go deeper

- [S012 — asyncio docs](../../research/python-scripting-best-practices/01-sources/web/S012-asyncio.md) — TaskGroup, `run_in_executor`, event loop lifecycle
- [S013 — concurrent.futures](../../research/python-scripting-best-practices/01-sources/web/S013-concurrent-futures.md) — `ThreadPoolExecutor` vs `ProcessPoolExecutor`, `as_completed`, timeout handling

---

*[← L09: Serialization](./L09-serialization.md)* · *[L11: Graceful Shutdown →](./L11-graceful-shutdown.md)*
