# Writing Self-Documenting Functions

**Module**: M03 · Documentation and the Type System  
**Type**: core  
**Estimated time**: 12 minutes  
**Claim**: C3 from Strata synthesis

---

## The core idea

Every public function must have three things: a one-line summary docstring, type annotations on all parameters and return values, and raised-exception documentation when non-obvious. This combination — mandated by Google Style Guide ([S003](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md)), PEP 257 ([S002](../../research/python-scripting-best-practices/01-sources/web/S002-pep257.md)), and enforced by ruff's pydocstyle plugin ([S017](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md)) — makes functions legible without running them.

The critical word is *public*. Functions starting with `_` are internal; heavy documentation is optional. Functions that form the interface of a module — anything a caller might import — must be fully documented.

## Why it matters when teaching

When teaching this, two objections come up repeatedly. First: *"Type annotations are redundant if I have docstrings."* They are not. Docstrings describe intent in prose. Type annotations are machine-verifiable contracts. Mypy will catch `process("hello")` being called where `process(42)` is expected. No docstring does that.

Second: *"I'll add docs when the function is stable."* This is documentation debt. The function is hardest to document when it was just written, because the details are still fluid. But the *most valuable time* to document it is also right then — before you forget why the design is what it is. Teach learners to write the docstring first, before the implementation: it forces them to clarify what the function does before they write how.

## A concrete example

Google-style docstring with type annotations (the standard for Python professional codebases):

```python
def extract_urls(text: str, *, scheme: str = "https") -> list[str]:
    """Extract all URLs with the given scheme from a block of text.

    Args:
        text: Raw input text, may include multiple lines.
        scheme: URL scheme to filter by (e.g. "https", "ftp").
            Defaults to "https".

    Returns:
        A list of URL strings found in the text, preserving order.
        Returns an empty list if no URLs are found.

    Raises:
        ValueError: If ``scheme`` is an empty string.
    """
    if not scheme:
        raise ValueError("scheme must not be empty")
    # implementation
    return []
```

Notice what this function communicates without running it: what it accepts, what it returns on the happy path, what it returns on the empty case, and what it raises and why. A reader — including a future AI tool — can reason about this function completely from its signature and docstring.

Ruff enforces the docstring rule automatically:

```toml
[tool.ruff.lint]
select = ["D"]   # pydocstyle checks — missing docstring = lint error
```

## Key points

- Write the docstring before the implementation — it clarifies the contract and prevents documentation debt
- `Args`, `Returns`, `Raises` sections are mandatory for non-trivial public functions
- Type annotations are machine-verifiable; docstrings are human-readable — both serve different purposes and neither replaces the other

## Go deeper

- [S002 — PEP 257](../../research/python-scripting-best-practices/01-sources/web/S002-pep257.md) — canonical docstring conventions, one-line vs multi-line format
- [S003 — Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) — Args/Returns/Raises structure and enforcement examples

---

*[← L04: Structured Logging](./L04-structured-logging.md)* · *[L06: The Type System →](./L06-type-system.md)*
