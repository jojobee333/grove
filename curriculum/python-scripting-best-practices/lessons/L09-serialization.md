# Choosing the Right Serialization Format

**Module**: M05 · Data Serialization  
**Type**: core  
**Estimated time**: 12 minutes  
**Claim**: C9 from Strata synthesis

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
