# Graceful Shutdown: SIGTERM, CancelledError, and Cleanup

**Module**: M06 · Concurrency and Graceful Shutdown  
**Type**: applied  
**Estimated time**: 14 minutes  
**Claim**: C13 from Strata synthesis

---

## The core idea

Scripts that run in production — in containers, under systemd, or as background workers — receive shutdown signals from the operating system. A script that ignores `SIGTERM` will be forcibly killed (`SIGKILL`) after a grace period, losing any in-flight work and potentially leaving persistent state corrupted. Graceful shutdown means: register signal handlers early, cancel running async tasks, allow their `finally` blocks to run, and let executor context managers drain pending work before exiting.

Three components work together, each documented in an independent stdlib source: [the signal module](../../research/python-scripting-best-practices/01-sources/web/S016-signal.md), [asyncio task cancellation](../../research/python-scripting-best-practices/01-sources/web/S013-asyncio-tasks.md), and [concurrent.futures shutdown](../../research/python-scripting-best-practices/01-sources/web/S019-concurrent-futures.md).

## Why graceful shutdown is a first-class concern

Container orchestrators (Kubernetes, Docker Compose, ECS) send `SIGTERM` before stopping a container. Systemd sends `SIGTERM` before a service restart. The sequence is always: SIGTERM → grace period → SIGKILL. The grace period is typically 30 seconds — enough to finish an in-flight database transaction, flush a write buffer, or close a network connection cleanly.

A script that does not handle `SIGTERM` skips the grace period and is killed immediately when the orchestrator runs out of patience. The result: incomplete database writes, half-written output files, or open connections left dangling in the connection pool.

This is the failure mode that motivates graceful shutdown. Teach it in the context of "what happens to your script in production" rather than as an abstract correctness exercise.

## Signal handler registration

The [signal module](../../research/python-scripting-best-practices/01-sources/web/S016-signal.md) documents two rules: handlers execute in the main thread only, and handlers run at the next bytecode boundary after the signal is received — not immediately in the C signal handler. This means signal handlers must be fast and side-effect-free; doing real work inside a signal handler is unsafe.

The correct pattern for asyncio scripts: use `loop.add_signal_handler()` to set an asyncio event rather than doing work directly:

```python
import asyncio
import logging
import signal
from concurrent.futures import ProcessPoolExecutor

logger = logging.getLogger(__name__)


async def worker(name: str, stop_event: asyncio.Event) -> None:
    """A long-running async worker that responds to a stop signal.

    Args:
        name: Worker identifier for log messages.
        stop_event: Set this event to request a clean shutdown.
    """
    logger.info("Worker %s starting", name)
    try:
        while not stop_event.is_set():
            await asyncio.sleep(1)          # yields to event loop — cancellable
            logger.debug("Worker %s tick", name)
    except asyncio.CancelledError:
        # CancelledError means the task was explicitly cancelled
        logger.info("Worker %s received cancel", name)
        raise   # ← ALWAYS re-raise — never swallow CancelledError
    finally:
        # finally block runs whether completed, cancelled, or raised
        logger.info("Worker %s cleanup complete", name)
```

## A complete graceful shutdown implementation

```python
async def main() -> None:
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _handle_signal(sig: signal.Signals) -> None:
        """Called by the event loop when a signal arrives.

        Sets the stop event — does not perform cleanup directly.
        """
        logger.warning("Received signal %s — requesting shutdown", sig.name)
        stop_event.set()

    # Register handlers — loop.add_signal_handler is safe in async context
    # (signal.signal() works too but is not coroutine-safe)
    loop.add_signal_handler(signal.SIGTERM, _handle_signal, signal.SIGTERM)
    loop.add_signal_handler(signal.SIGINT,  _handle_signal, signal.SIGINT)

    async with asyncio.TaskGroup() as tg:
        worker_task = tg.create_task(worker("primary", stop_event))
        # Wait for the stop event, then cancel running tasks
        await stop_event.wait()
        worker_task.cancel()
    # TaskGroup.__aexit__ waits for all tasks to complete — finally blocks run

    logger.info("All workers shut down cleanly")


if __name__ == "__main__":
    # ProcessPoolExecutor as context manager drains queued work on shutdown
    with ProcessPoolExecutor() as pool:
        asyncio.run(main())
```

The flow: signal arrives → `stop_event.set()` → the `worker_task.cancel()` line executes → `CancelledError` is injected into `worker()` at its next `await` → the `except asyncio.CancelledError` block runs → `finally` block runs → `raise` propagates the cancellation → `TaskGroup` exits cleanly.

## The CancelledError rule

`asyncio.CancelledError` is not a failure — it is cooperative cancellation. The contract: if you catch `CancelledError` in an `except` block (to run cleanup code), **you must re-raise it**. Swallowing `CancelledError` breaks the cancellation protocol: the task appears to finish successfully, TaskGroup thinks the task is done, and shutdown completes without waiting for cleanup.

```python
# ❌ Never swallow CancelledError
try:
    await some_work()
except asyncio.CancelledError:
    cleanup()
    # missing raise — TaskGroup will not know the task was cancelled

# ✅ Always re-raise after cleanup
try:
    await some_work()
except asyncio.CancelledError:
    cleanup()
    raise   # propagate so the caller knows the task was cancelled
```

An equivalent pattern using `finally` is cleaner and recommended:

```python
# ✅ Use finally for cleanup — no need to catch CancelledError at all
try:
    await some_work()
finally:
    cleanup()   # runs whether completed, cancelled, or raised
```

## Windows caveat

`loop.add_signal_handler()` is not available on Windows — it raises `NotImplementedError`. On Windows:
- Use `signal.signal(signal.SIGINT, handler)` for keyboard interrupt (`Ctrl+C`)
- `SIGTERM` exists on Windows as a constant but behaves differently — it terminates the process without running handlers
- For production scripts on Windows, rely on process manager signals (`Ctrl+C`) and Windows-specific shutdown mechanisms; `SIGTERM` cannot be reliably used for graceful shutdown

For cross-platform scripts, wrap the signal registration in a platform check:

```python
import sys

if sys.platform != "win32":
    loop.add_signal_handler(signal.SIGTERM, _handle_signal, signal.SIGTERM)
signal.signal(signal.SIGINT, lambda s, f: _handle_signal_sync(s))
```

## Limitations

The `asyncio.Event`-based approach requires the worker to cooperatively check the event or have `await` points where cancellation can be injected. A worker that runs entirely synchronous CPU-bound code in a tight loop with no `await` cannot be cancelled until it yields. For such workers, use `ProcessPoolExecutor.shutdown(cancel_futures=True)` (Python 3.9+) to cancel pending futures in the process pool's queue.

## Key points

- Register `SIGTERM` and `SIGINT` handlers early in `main()` using `loop.add_signal_handler()` for async scripts — set an event, do not do cleanup work in the handler itself
- Always re-raise `CancelledError` after cleanup — swallowing it breaks cooperative cancellation and causes silent shutdown failures
- Use `finally` blocks for resource cleanup in async tasks — they run whether the coroutine completes, is cancelled, or raises
- `loop.add_signal_handler()` is not available on Windows — handle `SIGINT` only with `signal.signal()` on that platform

## Go deeper

- [S016 — signal module](../../research/python-scripting-best-practices/01-sources/web/S016-signal.md) — `loop.add_signal_handler()` vs `signal.signal()`, platform differences, `SIGPIPE` handling
- [S013 — asyncio task docs](../../research/python-scripting-best-practices/01-sources/web/S013-asyncio-tasks.md) — `CancelledError` semantics, `TaskGroup` cancellation lifecycle, and `Task.cancel()` with a message argument
- [S019 — concurrent.futures](../../research/python-scripting-best-practices/01-sources/web/S019-concurrent-futures.md) — `shutdown(wait=True, cancel_futures=True)`, executor context manager drain behavior

---

*[← L10: Concurrency Decision Matrix](./L10-concurrency-decision-matrix.md)* · *[L12: The Type Annotation Debate →](./L12-type-annotation-debate.md)*

---

## The core idea

Scripts that run in production — in containers, under systemd, or as background workers — receive shutdown signals from the operating system. A script that ignores `SIGTERM` will be forcibly killed (`SIGKILL`) after a grace period, losing any in-flight work and potentially leaving persistent state corrupted. Graceful shutdown means: register signal handlers early, cancel running async tasks, allow their `finally` blocks to run, and let executor context managers drain pending work before exiting.

Three components work together, each documented in an independent stdlib source: [the signal module](../../research/python-scripting-best-practices/01-sources/web/S016-signal.md), [asyncio task cancellation](../../research/python-scripting-best-practices/01-sources/web/S013-asyncio-tasks.md), and [concurrent.futures shutdown](../../research/python-scripting-best-practices/01-sources/web/S019-concurrent-futures.md).

## Why graceful shutdown is a first-class concern

Container orchestrators (Kubernetes, Docker Compose, ECS) send `SIGTERM` before stopping a container. Systemd sends `SIGTERM` before a service restart. The sequence is always: SIGTERM → grace period → SIGKILL. The grace period is typically 30 seconds — enough to finish an in-flight database transaction, flush a write buffer, or close a network connection cleanly.

A script that does not handle `SIGTERM` skips the grace period and is killed immediately when the orchestrator runs out of patience. The result: incomplete database writes, half-written output files, or open connections left dangling in the connection pool.

This is the failure mode that motivates graceful shutdown. Teach it in the context of "what happens to your script in production" rather than as an abstract correctness exercise.

## Signal handler registration

The [signal module](../../research/python-scripting-best-practices/01-sources/web/S016-signal.md) documents two rules: handlers execute in the main thread only, and handlers run at the next bytecode boundary after the signal is received — not immediately in the C signal handler. This means signal handlers must be fast and side-effect-free; doing real work inside a signal handler is unsafe.

The correct pattern for asyncio scripts: use `loop.add_signal_handler()` to set an asyncio event rather than doing work directly:

```python
import asyncio
import logging
import signal
from concurrent.futures import ProcessPoolExecutor

logger = logging.getLogger(__name__)


async def worker(name: str, stop_event: asyncio.Event) -> None:
    """A long-running async worker that responds to a stop signal.

    Args:
        name: Worker identifier for log messages.
        stop_event: Set this event to request a clean shutdown.
    """
    logger.info("Worker %s starting", name)
    try:
        while not stop_event.is_set():
            await asyncio.sleep(1)          # yields to event loop — cancellable
            logger.debug("Worker %s tick", name)
    except asyncio.CancelledError:
        # CancelledError means the task was explicitly cancelled
        logger.info("Worker %s received cancel", name)
        raise   # ← ALWAYS re-raise — never swallow CancelledError
    finally:
        # finally block runs whether completed, cancelled, or raised
        logger.info("Worker %s cleanup complete", name)
```

## A complete graceful shutdown implementation

```python
async def main() -> None:
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _handle_signal(sig: signal.Signals) -> None:
        """Called by the event loop when a signal arrives.

        Sets the stop event — does not perform cleanup directly.
        """
        logger.warning("Received signal %s — requesting shutdown", sig.name)
        stop_event.set()

    # Register handlers — loop.add_signal_handler is safe in async context
    # (signal.signal() works too but is not coroutine-safe)
    loop.add_signal_handler(signal.SIGTERM, _handle_signal, signal.SIGTERM)
    loop.add_signal_handler(signal.SIGINT,  _handle_signal, signal.SIGINT)

    async with asyncio.TaskGroup() as tg:
        worker_task = tg.create_task(worker("primary", stop_event))
        # Wait for the stop event, then cancel running tasks
        await stop_event.wait()
        worker_task.cancel()
    # TaskGroup.__aexit__ waits for all tasks to complete — finally blocks run

    logger.info("All workers shut down cleanly")


if __name__ == "__main__":
    # ProcessPoolExecutor as context manager drains queued work on shutdown
    with ProcessPoolExecutor() as pool:
        asyncio.run(main())
```

The flow: signal arrives → `stop_event.set()` → the `worker_task.cancel()` line executes → `CancelledError` is injected into `worker()` at its next `await` → the `except asyncio.CancelledError` block runs → `finally` block runs → `raise` propagates the cancellation → `TaskGroup` exits cleanly.

## The CancelledError rule

`asyncio.CancelledError` is not a failure — it is cooperative cancellation. The contract: if you catch `CancelledError` in an `except` block (to run cleanup code), **you must re-raise it**. Swallowing `CancelledError` breaks the cancellation protocol: the task appears to finish successfully, TaskGroup thinks the task is done, and shutdown completes without waiting for cleanup.

```python
# ❌ Never swallow CancelledError
try:
    await some_work()
except asyncio.CancelledError:
    cleanup()
    # missing raise — TaskGroup will not know the task was cancelled

# ✅ Always re-raise after cleanup
try:
    await some_work()
except asyncio.CancelledError:
    cleanup()
    raise   # propagate so the caller knows the task was cancelled
```

An equivalent pattern using `finally` is cleaner and recommended:

```python
# ✅ Use finally for cleanup — no need to catch CancelledError at all
try:
    await some_work()
finally:
    cleanup()   # runs whether completed, cancelled, or raised
```

## Windows caveat

`loop.add_signal_handler()` is not available on Windows — it raises `NotImplementedError`. On Windows:
- Use `signal.signal(signal.SIGINT, handler)` for keyboard interrupt (`Ctrl+C`)
- `SIGTERM` exists on Windows as a constant but behaves differently — it terminates the process without running handlers
- For production scripts on Windows, rely on process manager signals (`Ctrl+C`) and Windows-specific shutdown mechanisms; `SIGTERM` cannot be reliably used for graceful shutdown

For cross-platform scripts, wrap the signal registration in a platform check:

```python
import sys

if sys.platform != "win32":
    loop.add_signal_handler(signal.SIGTERM, _handle_signal, signal.SIGTERM)
signal.signal(signal.SIGINT, lambda s, f: _handle_signal_sync(s))
```

## Limitations

The `asyncio.Event`-based approach requires the worker to cooperatively check the event or have `await` points where cancellation can be injected. A worker that runs entirely synchronous CPU-bound code in a tight loop with no `await` cannot be cancelled until it yields. For such workers, use `ProcessPoolExecutor.shutdown(cancel_futures=True)` (Python 3.9+) to cancel pending futures in the process pool's queue.

## Key points

- Register `SIGTERM` and `SIGINT` handlers early in `main()` using `loop.add_signal_handler()` for async scripts — set an event, do not do cleanup work in the handler itself
- Always re-raise `CancelledError` after cleanup — swallowing it breaks cooperative cancellation and causes silent shutdown failures
- Use `finally` blocks for resource cleanup in async tasks — they run whether the coroutine completes, is cancelled, or raises
- `loop.add_signal_handler()` is not available on Windows — handle `SIGINT` only with `signal.signal()` on that platform

## Go deeper

- [S016 — signal module](../../research/python-scripting-best-practices/01-sources/web/S016-signal.md) — `loop.add_signal_handler()` vs `signal.signal()`, platform differences, `SIGPIPE` handling
- [S013 — asyncio task docs](../../research/python-scripting-best-practices/01-sources/web/S013-asyncio-tasks.md) — `CancelledError` semantics, `TaskGroup` cancellation lifecycle, and `Task.cancel()` with a message argument
- [S019 — concurrent.futures](../../research/python-scripting-best-practices/01-sources/web/S019-concurrent-futures.md) — `shutdown(wait=True, cancel_futures=True)`, executor context manager drain behavior

---

*[← L10: Concurrency Decision Matrix](./L10-concurrency-decision-matrix.md)* · *[L12: The Type Annotation Debate →](./L12-type-annotation-debate.md)*

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
