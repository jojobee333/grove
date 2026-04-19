# Writing Self-Documenting Functions

**Module**: M03 · Documentation and the Type System  
**Type**: core  
**Estimated time**: 15 minutes  
**Claim**: C3 from Strata synthesis

---

## The core idea

Every public function must have three things: a concise summary docstring following [PEP 257](../../research/python-scripting-best-practices/01-sources/web/S002-pep257.md), type annotations on all parameters and return values, and documented raised exceptions when non-obvious. This combination — mandated by [PEP 257](../../research/python-scripting-best-practices/01-sources/web/S002-pep257.md), the [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md), and the [typing module docs](../../research/python-scripting-best-practices/01-sources/web/S010-typing.md) — makes functions legible without running them. ruff enforces both the docstring convention and the type annotation requirement automatically through the `D` and `ANN` rule sets ([S017](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md)).

The critical word is *public*. Functions starting with `_` are internal implementation details; documentation is optional. Functions that form the external interface of a module — anything a caller might import and use — must be fully documented. The test: would a developer using your function as a black box understand it from the signature and docstring alone?

## Two common objections — and why they miss the point

**"Type annotations are redundant if I have docstrings."** They are not. Docstrings describe intent in prose, but prose cannot be checked by a machine. Type annotations are machine-verifiable contracts. Mypy will catch a call to `process("hello")` where `process(42: int)` is expected at development time, before the function is ever run. No docstring does that — a docstring that says "takes an integer" is invisible to mypy if the annotation is missing.

**"I'll add docs when the function is stable."** This is documentation debt accumulating in real time. The most valuable moment to document a function is *when you write it* — before you forget why the design is what it is, why the edge case works the way it does, and what the return value means for the empty input. Teach learners to write the docstring *first*, before the implementation: it forces them to clarify what the function should do before committing to how.

## The Google-style docstring format

[PEP 257](../../research/python-scripting-best-practices/01-sources/web/S002-pep257.md) specifies the structural rules: triple double-quotes, imperative mood for the summary sentence ("Return" not "Returns"), closing `"""` on its own line for multi-line docstrings. The [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) adds the sectioned format with `Args:`, `Returns:`, and `Raises:` blocks, which is the production standard for Python codebases at scale.

```python
from pathlib import Path


def extract_urls(text: str, *, scheme: str = "https") -> list[str]:
    """Extract all URLs with the given scheme from a block of text.

    Scans the text for patterns matching ``scheme://...`` using a simple
    prefix match. Does not validate URL structure beyond the scheme prefix.

    Args:
        text: Raw input text, may include multiple lines and mixed content.
        scheme: URL scheme to filter by (e.g., "https", "ftp", "s3").
            Defaults to "https".

    Returns:
        A list of URL strings found in the text, preserving left-to-right
        order. Returns an empty list if no matching URLs are found.

    Raises:
        ValueError: If ``scheme`` is empty or contains whitespace.
    """
    if not scheme or scheme != scheme.strip():
        raise ValueError(f"Invalid scheme: {scheme!r}")
    prefix = f"{scheme}://"
    return [word for word in text.split() if word.startswith(prefix)]
```

Each section carries specific information that prose prose cannot encode concisely:
- `Args` documents what each parameter *means* and any non-obvious constraints
- `Returns` documents the happy-path return value *and* the empty/zero case
- `Raises` documents which exceptions a caller must be prepared to handle

The function above communicates all of this without being run. A reader — including an IDE, an AI assistant, or a junior teammate — can reason about it completely from the signature and docstring alone.

## Enforcing the standard with ruff

The `D` rule set in ruff enforces PEP 257 compliance. The `convention = "google"` setting switches to the Google-style sectioned format:

```toml
[tool.ruff.lint]
select = ["D", "ANN"]   # pydocstyle + annotation enforcement

[tool.ruff.lint.pydocstyle]
convention = "google"   # enables D400-D418 (Google-style sections)
```

With these rules active, a function missing a docstring produces a lint error (`D100`, `D101`, or `D103`). A function with a return value but no `Returns:` section produces `D415`. A function with `raise` statements but no `Raises:` section produces `D417`. The quality bar becomes automatic rather than relying on code reviewers to catch it.

## When to document classes

The [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) extends the same convention to classes. Class docstrings go immediately after the `class` line and document the class's purpose and public attributes:

```python
from typing import TypedDict


class ReportConfig(TypedDict):
    """Configuration for a single report run.

    Attributes:
        output_dir: Directory where report files will be written.
        max_rows: Maximum number of rows to include per section.
        include_summary: Whether to prepend a summary section.
    """
    output_dir: Path
    max_rows: int
    include_summary: bool
```

The `Attributes:` section documents the fields a consumer of the class will interact with. For `TypedDict` and `dataclass` types, this is particularly valuable because those fields *are* the public API.

## There is a real disagreement here

**[PEP 484](../../research/python-scripting-best-practices/01-sources/web/S022-pep484.md) states explicitly**: "It should also be emphasized that Python will remain a dynamically typed language, and the authors have no desire to ever make type hints mandatory or even ubiquitous."

**The [Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) states**: "Annotate all functions. Annotate module-level variables and class-level variables."

Both documents are authoritative. They are not actually in conflict — PEP 484 describes the *language policy* (the interpreter will never enforce annotations), while the Google Style Guide describes *team practice* (professional codebases should annotate new code). But a learner reading PEP 484 first will find ammunition to argue against annotation requirements, and a teacher who has not addressed this will be caught flat-footed.

The resolution to teach: PEP 484 was written in 2015 to introduce annotations conservatively. Its "never mandatory" language was intended to reassure the community that Python was not becoming statically typed. By 2024, mypy and pyright are mature, IDE support is ubiquitous, and the professional consensus has shifted toward mandatory annotations for new code without PEP 484 being revised. The language policy and the engineering practice operate at different levels.

## Limitations

PEP 257 and the Google Style Guide address *what* to document and *how*. They do not address documentation maintenance: a docstring written at function creation time can drift from the implementation over time. The most reliable mitigation is doctest (executable examples in docstrings) and review practices that treat changed function signatures as triggers for docstring review. Neither ruff nor mypy catches stale docstrings — this remains a human responsibility.

For one-liner utility functions with self-explanatory signatures (`def is_empty(text: str) -> bool: return not text.strip()`), a one-line summary docstring is sufficient. Reserve the full `Args/Returns/Raises` treatment for functions with non-obvious parameters, multiple return scenarios, or documented failure modes.

## Key points

- Write the docstring *before* the implementation — it clarifies the contract and prevents documentation debt
- `Args`, `Returns`, and `Raises` sections are mandatory for any non-trivial public function; one-line summaries suffice for simple utilities
- Type annotations are machine-verifiable; docstrings are human-readable — they serve different audiences and neither replaces the other
- ruff's `D` rule set enforces PEP 257 compliance automatically; `convention = "google"` enables the sectioned format

## Go deeper

- [S002 — PEP 257](../../research/python-scripting-best-practices/01-sources/web/S002-pep257.md) — canonical docstring conventions, one-liner vs multi-line format, and the imperative mood rule
- [S003 — Google Style Guide](../../research/python-scripting-best-practices/01-sources/web/S003-google-style-guide.md) — `Args/Returns/Raises/Attributes` structure, class docstrings, and annotation requirements
- [S017 — ruff docs](../../research/python-scripting-best-practices/01-sources/web/S017-ruff.md) — the `D` and `ANN` rule sets, `pydocstyle` convention options, and how to exempt internal functions

---

*[← L04: Structured Logging](./L04-structured-logging.md)* · *[L06: The Type System →](./L06-type-system.md)*

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
