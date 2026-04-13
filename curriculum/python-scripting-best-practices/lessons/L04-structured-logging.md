# Structured Logging Over print()

**Module**: M02 · Script Structure and Observability  
**Type**: core  
**Estimated time**: 10 minutes  
**Claim**: C4 from Strata synthesis

---

## The core idea

Replace every `print()` call used for status or diagnostic output with the standard `logging` module. The pattern has three rules:

1. **One `getLogger` per module**, at module level, named `__name__`
2. **One `basicConfig()` call**, in `main()`, applied once at startup
3. **Level controlled at runtime** via a `--log-level` CLI argument, not by editing source code

This pattern is documented in the Python logging HOWTO ([S004](../../research/python-scripting-best-practices/01-sources/web/S004-logging-howto.md)) and is the baseline across every professional Python codebase.

## Why it matters when teaching

`print()` is a debugger that shipped to production. It cannot be silenced without deleting it. It cannot be redirected to a file. It cannot carry severity levels. It produces no timestamps or source location. When you teach someone to reach for `logger.info()` instead of `print("Starting...")`, you are teaching them to write observable code — code that can be monitored, filtered, and retained without modification.

There is one important distinction to teach clearly: **scripts and libraries follow different rules**. Scripts configure logging (they are the application). Libraries must never configure logging — they emit log records and install a `NullHandler`. This prevents silent log pollution when a library is imported into a larger application.

```python
# ✅ Correct: in a library module
import logging
logging.getLogger(__name__).addHandler(logging.NullHandler())
```

## A concrete example

Complete logging setup for a script:

```python
import argparse
import logging

logger = logging.getLogger(__name__)   # module-level, named __name__


def fetch_data(url: str) -> bytes:
    logger.info("Fetching %s", url)
    # ...
    return b""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--log-level", default="WARNING")
    args = parser.parse_args()

    logging.basicConfig(            # one call, in main(), never elsewhere
        level=args.log_level,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )

    data = fetch_data(args.url)
    logger.debug("Got %d bytes", len(data))


if __name__ == "__main__":
    main()
```

Run with `python fetch.py https://example.com --log-level DEBUG` to see all output. Without `--log-level`, only `WARNING` and above appears. No source edits required.

## Key points

- `logger = logging.getLogger(__name__)` at module level provides automatic source location in logs
- Call `logging.basicConfig()` exactly once, in `main()`, never inside imported library code
- Export a `--log-level` argument so callers can change verbosity without touching source code

## Go deeper

- [S004 — Python logging HOWTO](../../research/python-scripting-best-practices/01-sources/web/S004-logging-howto.md) — `NullHandler` pattern, structlog integration, and handler configuration
- [S003 — Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) — the library/script distinction stated explicitly

---

*[← L03: Script Skeleton](./L03-script-skeleton.md)* · *[L05: Self-Documenting Functions →](./L05-self-documenting-functions.md)*
