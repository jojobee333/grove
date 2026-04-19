# The Universal Script Skeleton

**Module**: M02 · Script Structure and Observability  
**Type**: core  
**Estimated time**: 15 minutes  
**Claim**: C5 from Strata synthesis

---

## The core idea

Every Python script should follow a fixed structural pattern: define a `main()` function, call it from an `if __name__ == "__main__"` guard, and execute its body in a strict four-step sequence. This is not a personal style choice — [the Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md), [the argparse docs](../../research/python-scripting-best-practices/01-sources/web/S005-argparse.md), [the logging HOWTO](../../research/python-scripting-best-practices/01-sources/web/S004-logging-howto.md), and [the asyncio docs](../../research/python-scripting-best-practices/01-sources/web/S012-asyncio.md) all independently document this as the standard entry pattern.

The four-step sequence inside `main()` is fixed and non-negotiable:

1. **Parse arguments** (`argparse`) — determine what the user wants
2. **Configure logging** (`logging.basicConfig()`) — set up observability before anything else runs
3. **Validate inputs** — catch bad inputs before any expensive or side-effecting work starts
4. **Dispatch to domain functions** — the actual work of the script

This order is load-bearing. If you configure logging *after* the first domain function call, any logging from that function is silently swallowed (or sent to the root logger with the wrong format). If you validate inputs *after* making a network call or writing to a file, you have already done side-effecting work with invalid inputs.

## Why the `if __name__ == "__main__"` guard matters

This guard is one of the most-copied Python idioms and one of the least-explained. The reason it matters: when Python imports a module, it executes all module-level code. Without the guard, `import myscript` in a test file runs the entire script — opens files, makes network calls, parses production arguments. That makes the module untestable in isolation.

With the guard, `import myscript` in a test file imports all the functions without executing them. Tests can call `myscript.process()` directly, pass controlled inputs, and assert on controlled outputs. The script becomes a collection of testable functions plus a thin entry-point wrapper. This is the primary reason [the Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) marks this pattern mandatory for all scripts: it is the structural precondition for testability.

## A complete script skeleton

```python
"""Process records from a CSV file and write a summary report.

Usage:
    python process_records.py input.csv --output report.txt --log-level INFO
"""
import argparse
import logging
from pathlib import Path

logger = logging.getLogger(__name__)   # module-level, named __name__


def load_records(path: Path) -> list[dict[str, str]]:
    """Load records from a CSV file.

    Args:
        path: Path to the input CSV file.

    Returns:
        List of row dicts with string keys and values.

    Raises:
        FileNotFoundError: If path does not exist.
    """
    import csv
    logger.info("Loading records from %s", path)
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def summarise(records: list[dict[str, str]]) -> str:
    """Produce a one-line summary of loaded records.

    Args:
        records: Rows from the input CSV.

    Returns:
        A human-readable summary string.
    """
    return f"Processed {len(records)} records."


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="Input CSV file.")
    parser.add_argument("--output", type=Path, default=None,
                        help="Output file for the report.")
    parser.add_argument(
        "--log-level",
        default="WARNING",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging verbosity.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()                                   # Step 1: parse

    logging.basicConfig(                                  # Step 2: logging
        level=args.log_level,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )

    if not args.input.exists():                           # Step 3: validate
        raise SystemExit(f"Input file not found: {args.input}")

    records = load_records(args.input)                    # Step 4: dispatch
    summary = summarise(records)

    if args.output:
        args.output.write_text(summary, encoding="utf-8")
        logger.info("Report written to %s", args.output)
    else:
        print(summary)


if __name__ == "__main__":
    main()
```

Notice what this structure buys: every function (`load_records`, `summarise`) is independently importable and testable. A test file can call `load_records(Path("fixtures/test.csv"))` without triggering argument parsing or logging setup. The entry point (`main()`) is thin — it is just the glue connecting parsed arguments to domain functions.

## The async entry point

For async scripts (Python 3.10+), the pattern is identical — only the entry point changes:

```python
import asyncio

async def main() -> None:
    args = parse_args()                    # Step 1: parse (sync — fine here)
    logging.basicConfig(level=args.log_level)  # Step 2: logging (sync)
    # ... Steps 3 and 4 use await
    results = await fetch_all(args.urls)

if __name__ == "__main__":
    asyncio.run(main())                    # creates, runs, and closes the event loop
```

The [asyncio docs](../../research/python-scripting-best-practices/01-sources/web/S012-asyncio.md) are explicit: `asyncio.run()` is the canonical top-level entry point. Do not call `loop.run_until_complete()` in new code. Do not call `asyncio.run()` inside a function that is already running in an event loop — it will raise `RuntimeError`.

## Limitations

The fixed sequence assumes synchronous argument parsing, which is always the case with `argparse`. The only scenario requiring adjustment: if the script loads config from a file before logging setup (for example, to determine the log level from config rather than CLI), the sequence becomes parse-args → load-config → configure-logging → validate → dispatch. The principle remains the same — logging is configured from the parsed values before any domain work begins.

## Key points

- `if __name__ == "__main__": main()` makes every function importable and testable without side effects — without it, `import myscript` in a test runs the whole script
- The execution sequence is fixed: parse → configure logging → validate → dispatch; logging must be configured before domain functions so their log output is correctly routed
- For async scripts, `asyncio.run(main())` is the canonical entry point; `main()` must be `async def` and the sequence inside it is identical

## Go deeper

- [S003 — Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) — the mandatory `if __name__ == "__main__"` rule, `main()` return type convention, and import ordering
- [S005 — argparse docs](../../research/python-scripting-best-practices/01-sources/web/S005-argparse.md) — `ArgumentDefaultsHelpFormatter`, `BooleanOptionalAction`, and the subcommand pattern for multi-command scripts
- [S012 — asyncio docs](../../research/python-scripting-best-practices/01-sources/web/S012-asyncio.md) — `asyncio.run()` lifecycle, why `loop.run_until_complete()` is deprecated for new code

---

*[← L02: pyproject.toml](./L02-pyproject-toml.md)* · *[L04: Structured Logging →](./L04-structured-logging.md)*

---

## The core idea

Every Python script should follow a fixed structural pattern: define a `main()` function that executes in a specific sequence, and call it from an `if __name__ == "__main__"` guard at the bottom of the file. This is not style preference — the Google Style Guide ([S003](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md)), the argparse docs ([S005](../../research/python-scripting-best-practices/01-sources/web/S005-argparse.md)), the logging HOWTO ([S004](../../research/python-scripting-best-practices/01-sources/web/S004-logging-howto.md)), and the asyncio docs ([S012](../../research/python-scripting-best-practices/01-sources/web/S012-asyncio.md)) all independently converge on this structure.

The execution sequence inside `main()` must follow a fixed order:
1. Parse arguments (argparse)
2. Configure logging (`basicConfig()`)
3. Validate inputs
4. Dispatch to domain functions

This order is not arbitrary. Logging must be configured *before* domain functions run so their log output is correctly routed. Arguments must be parsed before logging configuration so the `--log-level` flag can be applied.

## Why it matters when teaching

The `if __name__ == "__main__"` guard is widely known but rarely explained. The payoff: it makes the script *importable* in tests without triggering execution. Without it, `import myscript` in a test file runs the entire script. With it, tests can import and call individual functions in isolation.

The fixed execution sequence matters for a different reason: it creates a predictable mental model. Anyone reading an unfamiliar script knows exactly where to look for CLI behaviour, where to look for log configuration, and where the "real work" starts. This is leverage when teaching onboarding — every script in the codebase is structured the same way.

## A concrete example

```python
import argparse
import logging

logger = logging.getLogger(__name__)


def process(data: str) -> str:
    logger.debug("Processing: %s", data)
    return data.upper()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="My script")
    parser.add_argument("data", help="Input string to process")
    parser.add_argument(
        "--log-level",
        default="WARNING",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()                          # 1. parse
    logging.basicConfig(level=args.log_level)    # 2. configure logging
    result = process(args.data)                  # 3+4. validate + dispatch
    print(result)


if __name__ == "__main__":
    main()
```

For async scripts, only the entry point changes — the sequence is identical:

```python
import asyncio

async def main() -> None:
    ...

if __name__ == "__main__":
    asyncio.run(main())
```

## Key points

- `if __name__ == "__main__": main()` enables test imports with zero side effects
- The execution order is fixed: parse → configure logging → validate → dispatch
- All domain logic lives in importable functions, never at module level

## Go deeper

- [S003 — Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) — the `main()` pattern and entry guard requirement
- [S005 — argparse docs](../../research/python-scripting-best-practices/01-sources/web/S005-argparse.md) — argument definition, subparsers, and env var defaults

---

*[← L02: pyproject.toml](./L02-pyproject-toml.md)* · *[L04: Structured Logging →](./L04-structured-logging.md)*
