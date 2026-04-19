# Choosing the Right Serialization Format

**Module**: M05 · Data Serialization  
**Type**: core  
**Estimated time**: 13 minutes  
**Claim**: C9 from Strata synthesis

---

## The core idea

Serialization format choice is a security and compatibility decision, not a preference. The rule is based on trust level and edit context:

| Format | Use when | Trust level | Standard library |
|---|---|---|---|
| JSON | External data exchange, APIs, web | Untrusted OK | `json` |
| CSV | Tabular data, spreadsheet exchange | Untrusted OK | `csv` |
| TOML | Developer/tool configuration | Trusted authors | `tomllib` (3.11+) |
| INI | End-user editable configuration | Trusted authors | `configparser` |
| pickle | Internal Python-to-Python caching | Trusted processes only | `pickle` |

The [pickle documentation](../../research/python-scripting-best-practices/01-sources/web/S021-pickle.md) carries an explicit security warning: "Only unpickle data you trust." The [json documentation](../../research/python-scripting-best-practices/01-sources/web/S014-json.md) documents the full Python-to-JSON type mapping. The [csv module](../../research/python-scripting-best-practices/01-sources/web/S015-csv.md) is the standard for tabular text exchange. Three independent stdlib sources converge on the same trust-based decision rule.

## Why pickle is a remote code execution vector

`pickle` executes Python code during deserialization. This is not a theoretical risk — it is documented behavior. The Python pickle documentation includes a demonstration:

```python
import pickle
# This executes os.system("echo hello world") on load
# An attacker can encode arbitrary commands this way
malicious = b"cos\nsystem\n(S'echo hello world'\ntR."
pickle.loads(malicious)   # ← runs a shell command
```

The contrast with JSON is sharp: `json.loads('{"key": "value"}')` parses data and never executes code. `json.loads('malicious_payload')` raises `json.JSONDecodeError` at worst. There is no pickle equivalent of a safe deserialization error — pickle's power to reconstruct arbitrary Python objects is precisely what makes it dangerous.

The correct rule: use pickle *only* for data that your own process wrote, on the same machine, and that never travels over a network or through an untrusted file path. The canonical use case is caching a computed Python object between invocations of the same trusted script — for example, caching a trained scikit-learn model or a large preprocessed numpy array to disk to avoid re-computing it.

## JSON for external data

[The json module](../../research/python-scripting-best-practices/01-sources/web/S014-json.md) is the correct format for any data that crosses a process boundary or a network:

```python
import json
from pathlib import Path


def save_results(results: list[dict[str, str]], path: Path) -> None:
    """Persist results as a JSON file.

    Args:
        results: List of result records to save.
        path: Output file path.
    """
    path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def load_results(path: Path) -> list[dict[str, str]]:
    """Load results from a JSON file.

    Args:
        path: Path to the JSON file.

    Returns:
        List of result records.

    Raises:
        json.JSONDecodeError: If the file contains invalid JSON.
        FileNotFoundError: If path does not exist.
    """
    return json.loads(path.read_text(encoding="utf-8"))
```

The `ensure_ascii=False` flag preserves Unicode characters in the output. The `indent=2` flag makes the file human-readable. Both are best practices for JSON files that a human might inspect.

Note the `Raises: json.JSONDecodeError` in the docstring. This is intentional: callers of `load_results` must decide how to handle a corrupt file. Swallowing `json.JSONDecodeError` silently is a common bug that leads to wrong program behavior with no error signal.

## Pickle for trusted internal caches

When pickle *is* appropriate, use it correctly:

```python
import pickle
from pathlib import Path


def cache_object(obj: object, cache_path: Path) -> None:
    """Cache a Python object to disk using pickle.

    Only use this for objects produced by this script on this machine.
    Never load from user-supplied paths.

    Args:
        obj: The Python object to cache.
        cache_path: Destination path for the cache file.
    """
    with cache_path.open("wb") as f:
        pickle.dump(obj, f, pickle.HIGHEST_PROTOCOL)


def load_cached_object(cache_path: Path) -> object | None:
    """Load a cached Python object, or return None if cache is absent.

    Only safe when cache_path was written by this process on this machine.

    Args:
        cache_path: Path to the pickle cache file.

    Returns:
        The cached object, or None if no cache exists.
    """
    if not cache_path.exists():
        return None
    with cache_path.open("rb") as f:
        return pickle.load(f)  # noqa: S301 — internal cache, trusted path
```

The `# noqa: S301` comment is intentional and load-bearing. Ruff's `S301` rule flags `pickle.load()` as a security warning. Suppressing it with a comment that explains why this specific use is safe is the correct pattern — not disabling the rule project-wide, which would silence legitimate warnings on other pickle calls.

`pickle.HIGHEST_PROTOCOL` uses the most efficient pickle protocol available in the current Python version. Protocol is automatically detected on load, so you can upgrade the writer to a newer Python version without breaking existing cache files (though they may need to be regenerated if the cached class changes).

## Handling CSV

CSV is the correct format for tabular data exchanged with spreadsheets or other systems:

```python
import csv
from pathlib import Path


def write_csv(rows: list[dict[str, str]], path: Path) -> None:
    """Write rows as a CSV file with a header row.

    Args:
        rows: List of dicts; all dicts must have the same keys.
        path: Output path.
    """
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
```

The `newline=""` argument to `open()` is required by the csv module to prevent double newlines on Windows. This is one of the most common CSV bugs in Python scripts.

## Limitations

The security guidance for pickle assumes the pickle file itself is not accessible to untrusted users. On a shared filesystem, a pickle cache file in a world-readable directory could be replaced by an attacker. For sensitive cached objects, store them in a directory with restricted permissions, or use HMAC signing to verify the cache file has not been tampered with before loading.

JSON does not natively serialize `datetime` objects, `Path` objects, or custom Python classes. Use a custom encoder (`json.dumps(obj, default=str)`) or a library like `orjson` for datetime-aware JSON serialization.

## Key points

- JSON and CSV for data crossing process boundaries or trust boundaries — they cannot execute code during parsing
- Pickle only for internal caching of trusted Python objects that never leave the process boundary — never receive pickle over a network
- Suppress `S301` ruff warnings on deliberate safe pickle uses with an explanatory `# noqa: S301` comment; never disable the check project-wide
- The `newline=""` argument is required when opening CSV files for writing on Windows

## Go deeper

- [S021 — pickle documentation](../../research/python-scripting-best-practices/01-sources/web/S021-pickle.md) — the official security warning, protocol versions, `HIGHEST_PROTOCOL`, and `Unpickler.find_class()` for semi-trusted scenarios
- [S014 — json module](../../research/python-scripting-best-practices/01-sources/web/S014-json.md) — `JSONDecodeError`, custom encoders for `datetime`, `ensure_ascii`, and `sort_keys` options
- [S015 — csv module](../../research/python-scripting-best-practices/01-sources/web/S015-csv.md) — `DictReader`, `DictWriter`, dialect handling, and the `newline=""` requirement

---

*[← L08: Configuration and Secrets](./L08-configuration-secrets.md)* · *[L10: Concurrency Decision Matrix →](./L10-concurrency-decision-matrix.md)*

---

## The core idea

Serialization format choice is a security and compatibility decision, not just a preference. The rule is based on trust level and edit context:

| Format | Use when | Trust required | Standard library |
|--------|----------|----------------|-----------------|
| JSON | External data exchange, APIs, logs | Untrusted input OK | `json` |
| CSV | Tabular data, spreadsheet export | Untrusted input OK | `csv` |
| TOML | Developer and tool configuration | Trusted authors | `tomllib` (3.11+) |
| INI | End-user editable config | Trusted authors | `configparser` |
| pickle | Internal caching, IPC between trusted processes | Trusted processes only | `pickle` |

The Python docs ([S021](../../research/python-scripting-best-practices/01-sources/web/S021-pickle.md)), Real Python ([S014](../../research/python-scripting-best-practices/01-sources/web/S014-json-best-practices.md)) and the TOML spec ([S015](../../research/python-scripting-best-practices/01-sources/web/S015-toml-spec.md)) all address this — and the one rule they agree on is: **never deserialize pickle data received over a network or from an unknown file.**

## Why it matters when teaching

`pickle` is the format most likely to cause a security incident in a script. It executes arbitrary Python code on deserialization. A script that caches to pickle and then loads that file later is safe when the file is written and read by the same process on the same machine. But the moment the file is transmitted, shared, or received from a network endpoint, it becomes a remote code execution vector.

The comparison that makes this concrete: `json.loads(data)` on malicious input raises `json.JSONDecodeError`. `pickle.loads(data)` on malicious input executes the attacker's code.

For teaching, the format table is the anchor. Ask learners to categorize their last three serialization choices by that table. Most will find at least one case where they reached for pickle or JSON out of habit rather than reasoning about trust level.

## A concrete example

```python
import json
import pickle
from pathlib import Path


# ✅ JSON for data that may come from outside your process
def save_results(results: list[dict[str, str]], path: Path) -> None:
    path.write_text(json.dumps(results, indent=2), encoding="utf-8")


def load_results(path: Path) -> list[dict[str, str]]:
    return json.loads(path.read_text(encoding="utf-8"))


# ⚠️  pickle for internal caching only — never load from untrusted source
def cache_model(model: object, path: Path) -> None:
    """Cache a trained model locally. Load only from paths you created."""
    with path.open("wb") as f:
        pickle.dump(model, f)


def load_model_cache(path: Path) -> object:
    # Only safe if path was written by this process on this machine
    with path.open("rb") as f:
        return pickle.load(f)  # noqa: S301 — intentional, internal cache only
```

The `# noqa: S301` comment is intentional: ruff's security rules will flag `pickle.load`. Suppress it explicitly with a comment explaining why the use is safe, rather than disabling the rule project-wide.

## Key points

- JSON for external or network data; pickle for trusted-only internal caching — never transmit pickle over a network
- The rule is based on trust level, not file format familiarity
- When suppressing a security linter warning, do it on one line with an explanation — never disable the check project-wide

## Go deeper

- [S021 — pickle security](../../research/python-scripting-best-practices/01-sources/web/S021-pickle.md) — the official warning: "Never unpickle data that could have come from an untrusted source"
- [S014 — JSON best practices](../../research/python-scripting-best-practices/01-sources/web/S014-json-best-practices.md) — datetime serialization, custom encoders, `json.JSONDecodeError` handling

---

*[← L08: Configuration and Secrets](./L08-configuration-secrets.md)* · *[L10: Concurrency Decision Matrix →](./L10-concurrency-decision-matrix.md)*
