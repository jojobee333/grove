# Configuration and Secrets: Files, Env Vars, Never Source

**Module**: M04 · Resource Management and Configuration  
**Type**: applied  
**Estimated time**: 15 minutes  
**Claim**: C6 from Strata synthesis

---

## The core idea

Configuration must never live in source code. Instead, follow a four-tier priority stack — CLI > env vars > config file > hardcoded default — applied at runtime so the highest-priority source wins. This order is the consensus recommendation across the [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md), [argparse](../../research/python-scripting-best-practices/01-sources/web/S005-argparse.md), [tomllib](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md), and [configparser](../../research/python-scripting-best-practices/01-sources/web/S008-configparser.md).

Secrets are a special case: they belong only in environment variables. Never in TOML files, never in INI files, never in Python source code — because all of those can be committed to version control.

## Why configuration in source code is a security problem, not just a style problem

Hardcoding configuration values in source is a discipline problem. Hardcoding *secrets* in source is a security incident waiting to happen. The sequence: API key hardcoded in `config.py` → developer runs `git add .` → key appears in `git log` forever → key is rotated → hardcoded key is found elsewhere in a fork or another branch → incident repeats.

The [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) is explicit: secrets go in environment variables, not in source or config files. `os.environ.get("APP_SECRET_KEY")` reads from the process environment, which is set by the deployment system (systemd unit, Docker Compose env file, Kubernetes Secret) and never appears in version control.

## The four-tier priority stack

Each tier overrides the one below it. Apply them in this order in code — lowest priority first, then override with higher-priority sources:

| Priority | Source | Use for | How |
|---|---|---|---|
| 1 (highest) | CLI flags | per-run control | `argparse` |
| 2 | Environment variables | deployment-time values, secrets | `os.environ.get()` |
| 3 | Config file | persistent settings | `tomllib` or `configparser` |
| 4 (lowest) | Hardcoded defaults | safe minimum values | dict literal |

## A complete implementation

```python
import argparse
import logging
import os
import tomllib
from pathlib import Path

logger = logging.getLogger(__name__)

# Tier 4: hardcoded defaults — the minimum safe values
_DEFAULTS: dict[str, object] = {
    "host": "localhost",
    "port": 8080,
    "workers": 2,
    "log_level": "WARNING",
}


def load_toml_config(path: Path) -> dict[str, object]:
    """Load a TOML config file; return empty dict if absent.

    Args:
        path: Path to the TOML configuration file.

    Returns:
        Parsed config dict, or empty dict if file does not exist.
    """
    if not path.exists():
        logger.debug("Config file %s not found — using defaults", path)
        return {}
    with path.open("rb") as f:     # tomllib requires binary mode
        data = tomllib.load(f)
    return data.get("tool", {}).get("myapp", {})


def resolve_config(args: argparse.Namespace) -> dict[str, object]:
    """Merge config from all four tiers, highest priority last.

    Args:
        args: Parsed CLI arguments.

    Returns:
        Fully merged configuration dict.
    """
    cfg: dict[str, object] = dict(_DEFAULTS)  # start with defaults

    # Tier 3: config file overrides defaults
    file_cfg = load_toml_config(Path("pyproject.toml"))
    cfg.update(file_cfg)

    # Tier 2: environment variables override file config
    if host := os.environ.get("APP_HOST"):
        cfg["host"] = host

    # Secrets: env only — never in files or defaults
    secret = os.environ.get("APP_SECRET_KEY")
    if not secret:
        logger.warning(
            "APP_SECRET_KEY not set — authenticated features are disabled"
        )
    cfg["secret"] = secret   # may be None — callers must check

    # Tier 1: CLI flags override everything
    if args.host:
        cfg["host"] = args.host
    if args.workers:
        cfg["workers"] = args.workers

    return cfg
```

The pattern: apply tiers in ascending priority order (`cfg.update(...)`) so that the last write wins. The CLI `args` block is last because CLI has the highest priority.

## TOML vs INI: choosing the right format

[S008 (configparser)](../../research/python-scripting-best-practices/01-sources/web/S008-configparser.md) and [S009 (tomllib)](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md) represent two competing standards for file-based configuration, and the research rates C6's confidence on this point as "Moderate" for the TOML vs INI split specifically. The resolution:

**Use TOML when:**
- Configuration is developer-facing or tool-facing
- Native types matter (integers, booleans, arrays without parsing)
- The project already uses `pyproject.toml`

**Use INI when:**
- End users — non-developers — will edit the file by hand
- Tooling must run on Python 3.8–3.10 without the `tomli` backport
- The config is simple key-value pairs with no nested structure

The configparser INI format stores everything as strings and requires explicit type conversion:

```python
import configparser

config = configparser.ConfigParser()
config.read("app.ini")

port = config["server"].getint("port")          # explicit int conversion
debug = config["app"].getboolean("debug",       # explicit bool conversion
                                  fallback=False)
workers = config["app"].getint("workers", fallback=2)  # with fallback
```

TOML produces native types without conversion:

```python
import tomllib

with open("config.toml", "rb") as f:
    config = tomllib.load(f)

port: int = config["server"]["port"]     # already int — no conversion
debug: bool = config["app"]["debug"]     # already bool
```

The type safety advantage of TOML is decisive for developer-facing config. For end-user-editable INI files, the explicit `.getint()` calls are a reasonable tradeoff for simpler file syntax.

## Environment variable hygiene

Three rules for environment variables in production scripts:

1. **Use `os.environ.get("KEY")` not `os.environ["KEY"]`** — the `get()` form returns `None` instead of raising `KeyError` on a missing variable, which you can then detect and log a warning about
2. **Never log secret values** — `logger.debug("Using secret %s", secret)` is a security incident if debug logging is accidentally enabled in production
3. **Document required vs optional env vars** in the module docstring or README** — `os.environ.get()` is silent about missing vars unless you explicitly check and warn

## Limitations

`tomllib` is read-only — it has no `dump()` function. If the script needs to write config back to disk, use `tomli_w` (write-only) or `tomlkit` (style-preserving read+write). For local development, `python-dotenv` can load a `.env` file into environment variables before the script reads `os.environ` — but never commit `.env` to version control. Add `.env` to `.gitignore` as a project-creation step, not an afterthought.

## Key points

- The four-tier priority order is: hardcoded default → config file → env var → CLI; apply them in this order so higher-priority sources override lower ones
- Secrets belong only in environment variables — not in TOML files, INI files, or source code
- TOML (`tomllib`) gives native Python types without conversion; INI (`configparser`) requires `.getint()`/`.getboolean()` — prefer TOML for developer-facing config
- Always use `os.environ.get()` and explicitly check for missing required secrets; never log secret values

## Go deeper

- [S009 — tomllib docs](../../research/python-scripting-best-practices/01-sources/web/S009-tomllib.md) — binary mode requirement, `pyproject.toml` section patterns, and backport instructions for Python 3.8–3.10
- [S008 — configparser docs](../../research/python-scripting-best-practices/01-sources/web/S008-configparser.md) — typed getters, `DEFAULT` section fallbacks, and multi-file config loading
- [S005 — argparse docs](../../research/python-scripting-best-practices/01-sources/web/S005-argparse.md) — reading defaults from environment variables via `parser.set_defaults()` and `default=os.environ.get(...)` patterns

---

*[← L07: pathlib and Context Managers](./L07-pathlib-context-managers.md)* · *[L09: Serialization →](./L09-serialization.md)*

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
