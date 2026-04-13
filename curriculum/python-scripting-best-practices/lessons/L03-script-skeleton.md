# The Universal Script Skeleton

**Module**: M02 · Script Structure and Observability  
**Type**: core  
**Estimated time**: 12 minutes  
**Claim**: C5 from Strata synthesis

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
