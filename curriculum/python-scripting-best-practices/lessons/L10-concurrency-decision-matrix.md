# asyncio, Threads, or Processes: Decision Matrix

**Module**: M06 · Concurrency and Graceful Shutdown  
**Type**: applied  
**Estimated time**: 13 minutes  
**Claim**: C12 from Strata synthesis

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
