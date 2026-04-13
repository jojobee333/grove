# Configuration and Secrets

**Module**: M04 · Resource Management and Configuration  
**Type**: applied  
**Estimated time**: 11 minutes  
**Claim**: C6 from Strata synthesis

---

## The core idea

Configuration must never live in source code. Instead, follow a four-tier priority stack — highest to lowest — applied at runtime:

1. **CLI flags** — `argparse` arguments when the user needs per-run control
2. **Environment variables** — `os.environ.get()` for deployment-time values (especially secrets)
3. **Config files** — TOML (`tomllib`, stdlib since 3.11) or INI (`configparser`, stdlib) for persistent settings
4. **Hardcoded defaults** — the minimum safe value assumed when nothing else is set

This priority order is the consensus recommendation from the Real Python guide ([S003](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md)), the argparse docs ([S005](../../research/python-scripting-best-practices/01-sources/web/S005-argparse.md)), and the tomllib addition to the standard library ([S009](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md)).

Secrets are environment variables, never files committed to version control.

## Why it matters when teaching

The most common configuration mistake in scripts is reading a `.env` file and committing it. The second most common is embedding an API key in source code and then rotating it manually after an incident. The four-tier stack is not complex — it is a decision rule that answers "where should this value come from?" for every configuration need.

`tomllib` is the right choice for structured developer configuration: it is read-only (prevents accidental writes), in the standard library since 3.11, and available as `tomli` for 3.8–3.10. `configparser` remains viable for end-user-facing configuration where plain INI files are more approachable.

## A concrete example

```python
import argparse
import logging
import os
import tomllib
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_CONFIG = {"host": "localhost", "port": 8080, "workers": 2}


def load_file_config(path: Path) -> dict[str, object]:
    """Load TOML config file; return empty dict if file absent."""
    if not path.exists():
        return {}
    with path.open("rb") as f:
        return tomllib.load(f)   # read-only by design: tomllib has no dump()


def resolve_config(args: argparse.Namespace) -> dict[str, object]:
    """Merge config from all sources, highest-priority last (wins)."""
    cfg: dict[str, object] = dict(DEFAULT_CONFIG)

    # Tier 3: config file
    file_cfg = load_file_config(Path("config.toml"))
    cfg.update(file_cfg)

    # Tier 2: environment variables
    if host := os.environ.get("APP_HOST"):
        cfg["host"] = host
    if secret := os.environ.get("APP_SECRET"):
        cfg["secret"] = secret          # secrets never in files
    else:
        logger.warning("APP_SECRET not set — features may be limited")

    # Tier 1: CLI (applied last — highest priority)
    if args.host:
        cfg["host"] = args.host

    return cfg
```

Notice: `APP_SECRET` is read from the environment only. There is no TOML key for secrets — if the secret ends up in a file, it is one `git add` away from a leak.

## Key points

- CLI > env vars > config file > hardcoded default: apply them in this order, highest-priority last (so it overwrites)
- Secrets belong in environment variables only — never in config files or source code
- `tomllib` is read-only by design: it parses TOML but cannot write it, preventing accidental config corruption

## Go deeper

- [S009 — tomllib](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md) — standard library since 3.11, `tomli` backport instructions, binary file requirement
- [S008 — configparser](../../research/python-scripting-best-practices/01-sources/web/S008-configparser.md) — INI-format config, interpolation, fallback keys

---

*[← L07: pathlib and Context Managers](./L07-pathlib-context-managers.md)* · *[L09: Serialization →](./L09-serialization.md)*
