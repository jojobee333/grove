# Structured Logging Over print()

**Module**: M02 · Script Structure and Observability  
**Type**: core  
**Estimated time**: 14 minutes  
**Claim**: C4 from Strata synthesis

---

## The core idea

Replace every `print()` call used for status or diagnostic output with the standard `logging` module. The pattern is three rules:

1. **One `getLogger` per module**, at module level, named `__name__`
2. **One `basicConfig()` call**, in `main()`, applied once at startup
3. **Level controlled at runtime** via a `--log-level` CLI argument, never by editing source code

All three rules are documented in the [Python Logging HOWTO](../../research/python-scripting-best-practices/01-sources/web/S004-logging-howto.md), reinforced by the [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md), and integrated with [argparse](../../research/python-scripting-best-practices/01-sources/web/S005-argparse.md) through the `--log-level` convention. Together they make scripts *observable* — their internal state is readable without modifying source code.

## Why print() is not a logging system

`print()` is a debugging tool that too often ships to production. Its limitations are categorical, not matters of degree:

- Cannot be silenced without deleting or commenting out lines
- Cannot be redirected to a file without shell redirection (`python script.py 2>&1 | tee log.txt`)
- Carries no severity level — `print("ERROR: ...")` is indistinguishable from `print("Starting...")` to any downstream system
- Produces no timestamp, no source location, and no module context
- Cannot be filtered by severity or module name

The [logging HOWTO](../../research/python-scripting-best-practices/01-sources/web/S004-logging-howto.md) is explicit about when `print()` is appropriate: for normal end-user output that is the *result* of the program. Everything else — status updates, diagnostics, warnings, errors — belongs in the logging hierarchy.

The decision table from the logging HOWTO:

| Situation | Use |
|---|---|
| Normal CLI output — the answer the user asked for | `print()` |
| Status during execution | `logger.info()` |
| Detailed internal diagnostics | `logger.debug()` |
| Unexpected event, program still working | `logger.warning()` |
| Function could not complete its work | `logger.error()` |
| Fatal — program cannot continue | `logger.critical()` |
| Inside an `except` block with full traceback | `logger.exception()` |

## The library/script distinction

There is a rule that intermediate developers often get wrong: **libraries and scripts follow different logging rules**.

Scripts are the top-level application. They own the logging configuration — they call `basicConfig()` and decide where log output goes and at what level.

Libraries must never configure logging. A library that calls `logging.basicConfig()` silently changes the logging configuration of every application that imports it. The correct library pattern is:

```python
# In any library module — never configure, only get a named logger
import logging
logger = logging.getLogger(__name__)
logging.getLogger(__name__).addHandler(logging.NullHandler())
```

The `NullHandler` ensures that if no application has configured logging, the library's log records are silently discarded rather than generating "No handlers could be found for logger X" warnings. This rule is documented in both the [logging HOWTO](../../research/python-scripting-best-practices/01-sources/web/S004-logging-howto.md) and the [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md).

## Complete logging setup for a script

```python
import argparse
import logging
from pathlib import Path

logger = logging.getLogger(__name__)   # module-level, named __name__
                                       # (__name__ = module's dotted path)


def fetch_records(source: Path) -> list[str]:
    """Fetch records from the given file.

    Args:
        source: Path to the data file.

    Returns:
        List of record strings.
    """
    logger.info("Reading records from %s", source)   # note: lazy % formatting
    lines = source.read_text(encoding="utf-8").splitlines()
    logger.debug("Loaded %d lines", len(lines))
    return lines


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("source", type=Path)
    parser.add_argument(
        "--log-level",
        default="WARNING",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Set logging verbosity (default: %(default)s).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    logging.basicConfig(            # one call, in main(), applied once at startup
        level=args.log_level,
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logger.debug("Logging initialised at level %s", args.log_level)

    records = fetch_records(args.source)
    print(f"Found {len(records)} records.")   # print() is fine for the result


if __name__ == "__main__":
    main()
```

Run with `--log-level DEBUG` to see every internal step. Run without it to see only `WARNING` and above. No source edits required — the script's verbosity is a runtime parameter.

Note the format string uses `%s` lazy formatting (not f-strings): `logger.info("Reading %s", source)` rather than `logger.info(f"Reading {source}")`. The lazy form defers string interpolation until the log record is actually emitted, saving CPU cycles when the message level is below the current threshold.

## Rotating file handlers for long-running scripts

For scripts that run continuously or on a schedule, writing to a rotating file prevents unbounded disk usage. The `RotatingFileHandler` is the standard choice:

```python
import logging
from logging.handlers import RotatingFileHandler


def configure_logging(level: str, log_file: str | None = None) -> None:
    """Configure logging to stderr and optionally a rotating file.

    Args:
        level: Log level string, e.g. "DEBUG", "INFO".
        log_file: Optional path for a rotating log file.
    """
    handlers: list[logging.Handler] = [logging.StreamHandler()]
    if log_file:
        handlers.append(
            RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5,              # keep 5 rotated files
                encoding="utf-8",
            )
        )
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
        handlers=handlers,
    )
```

The `backupCount=5` setting keeps `.log`, `.log.1`, `.log.2`, `.log.3`, `.log.4`, `.log.5` — six files maximum, capped at 60 MB total.

## Limitations

`basicConfig()` must be called before any other logging call — including any `logger.info()` or `logger.debug()` in imported modules — or it is silently ignored (the root logger already has a handler). This is the most common logging setup mistake. The fix: always call `basicConfig()` as the *first* statement in `main()`, immediately after argument parsing.

For structured logging with JSON output and correlation IDs — useful in cloud environments where log aggregators parse JSON fields — the standard library is sufficient for basic use but the `structlog` library offers richer context injection, processor pipelines, and native JSON output without requiring a custom formatter.

## Key points

- `logger = logging.getLogger(__name__)` at module level provides automatic source location in log output — use it in every module
- Call `logging.basicConfig()` exactly once, in `main()`, before any domain code runs — subsequent calls are silently ignored
- Libraries must never call `basicConfig()` — they install `NullHandler` only; scripts own the logging configuration
- Use lazy `%s` formatting in log calls, not f-strings — it avoids string interpolation when the message level is filtered out

## Go deeper

- [S004 — Python Logging HOWTO](../../research/python-scripting-best-practices/01-sources/web/S004-logging-howto.md) — the `NullHandler` pattern, the full handler type reference, and `dictConfig()` for complex setups
- [S005 — argparse docs](../../research/python-scripting-best-practices/01-sources/web/S005-argparse.md) — wiring `--log-level` choices to `logging.setLevel()` and using `%(default)s` in help text
- [S003 — Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) — the library/script logging distinction stated explicitly with examples

---

*[← L03: The Universal Script Skeleton](./L03-script-skeleton.md)* · *[L05: Self-Documenting Functions →](./L05-self-documenting-functions.md)*

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
