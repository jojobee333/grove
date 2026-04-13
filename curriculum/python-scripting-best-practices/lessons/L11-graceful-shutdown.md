# Graceful Shutdown: SIGTERM, CancelledError, and Cleanup

**Module**: M06 · Concurrency and Graceful Shutdown  
**Type**: applied  
**Estimated time**: 13 minutes  
**Claim**: C13 from Strata synthesis

---

## The core idea

Scripts that run in production — in containers, under systemd, or as background workers — receive shutdown signals. A script that ignores `SIGTERM` will be forcibly killed after a timeout, losing in-flight work. Graceful shutdown means: handle the signal, cancel running tasks, and run cleanup code before exiting.

Three components work together ([S016](../../research/python-scripting-best-practices/01-sources/web/S016-signal-handling.md), [S013](../../research/python-scripting-best-practices/01-sources/web/S013-concurrent-futures.md), [S019](../../research/python-scripting-best-practices/01-sources/web/S019-real-python-asyncio.md)):

1. **Signal handler** — registers callback for `SIGTERM`/`SIGINT`
2. **CancelledError + finally** — async tasks clean up resources when cancelled
3. **Executor context managers** — `with ProcessPoolExecutor()` drains queued work before exiting

## Why it matters when teaching

Graceful shutdown is a topic most script authors encounter only after their first production incident: a containerized script killed mid-transaction, leaving corrupted state. The pattern must be taught before that incident, not learned from it.

The `signal` module is the right tool — not `atexit`, which runs only on normal interpreter exit and not on all platforms for `SIGTERM`. On Windows, `SIGTERM` is not a real signal — it is emulated, and `SIGINT` (`Ctrl+C`) is the primary keyboard interrupt. Teach this caveat explicitly so learners cross-platform code correctly.

The mental model: `finally` blocks in `async` functions run even when the coroutine is cancelled. That is where database commits, file flushes, and connection closes belong.

## A concrete example

```python
import asyncio
import logging
import signal
from concurrent.futures import ProcessPoolExecutor

logger = logging.getLogger(__name__)


async def worker(name: str) -> None:
    """A long-running async task that handles cancellation cleanly."""
    try:
        logger.info("Worker %s starting", name)
        while True:
            await asyncio.sleep(1)    # yields to event loop — cancellable here
            logger.debug("Worker %s tick", name)
    except asyncio.CancelledError:
        logger.info("Worker %s received cancel — running cleanup", name)
        raise   # always re-raise CancelledError so the event loop knows
    finally:
        logger.info("Worker %s cleaned up", name)   # always runs


async def main() -> None:
    loop = asyncio.get_running_loop()
    shutdown_event = asyncio.Event()

    def handle_signal(sig: signal.Signals) -> None:
        logger.warning("Received %s — initiating shutdown", sig.name)
        shutdown_event.set()

    # Register signals (SIGTERM from container orchestrators, SIGINT from Ctrl+C)
    loop.add_signal_handler(signal.SIGTERM, handle_signal, signal.SIGTERM)
    loop.add_signal_handler(signal.SIGINT, handle_signal, signal.SIGINT)

    async with asyncio.TaskGroup() as tg:
        task = tg.create_task(worker("main"))
        await shutdown_event.wait()   # block until signal received
        task.cancel()                 # triggers CancelledError in worker


if __name__ == "__main__":
    # ProcessPoolExecutor as context manager drains queued CPU tasks on exit
    with ProcessPoolExecutor() as pool:
        asyncio.run(main())
```

> **Windows caveat**: `loop.add_signal_handler()` is not available on Windows. Use `signal.signal(signal.SIGINT, handler)` and handle only keyboard interrupt. `SIGTERM` cannot be registered on Windows — rely on platform process management instead.

## Key points

- Register `SIGTERM` and `SIGINT` handlers early in `main()` to respond to container orchestrator signals
- Always re-raise `CancelledError` in an `except` block — catching and swallowing it breaks cooperative cancellation
- `with ProcessPoolExecutor()` and `with ThreadPoolExecutor()` wait for queued tasks to complete on `__exit__`

## Go deeper

- [S016 — signal module](../../research/python-scripting-best-practices/01-sources/web/S016-signal-handling.md) — `loop.add_signal_handler`, platform differences, `asyncio.Event` vs threading.Event
- [S019 — asyncio shutdown patterns](../../research/python-scripting-best-practices/01-sources/web/S019-real-python-asyncio.md) — task cancellation lifecycle, `TaskGroup` cancellation semantics

---

*[← L10: Concurrency Decision Matrix](./L10-concurrency-decision-matrix.md)* · *[L12: The Type Annotation Debate →](./L12-type-annotation-debate.md)*
