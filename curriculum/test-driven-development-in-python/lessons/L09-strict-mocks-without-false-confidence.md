# Strict Mocks Without False Confidence

**Module**: M05 · Use Mocks, Fakes, and Contracts Intentionally
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C5 from Strata synthesis

---

## The core idea

The research does not reject mocks. It narrows their job. In Python TDD, mocks are most useful when they stand in for a collaborator your application owns, when they are constrained to resemble the real interface, and when they are placed where the code under test actually looks the collaborator up. That combination is what keeps a mock from becoming false confidence [S002](../../research/test-driven-development-in-python/01-sources/web/S002-unittest-mock.md) [S013](../../research/test-driven-development-in-python/01-sources/web/S013-why-your-mock-still-doesnt-work.md).

Python's `unittest.mock` module is flexible to the point of danger. A plain `MagicMock()` accepts any attribute access and any call, so a test can stay green even after the real interface it is supposed to simulate has changed significantly. If you rename a method on the real class, the mock does not know — it simply invents a new `MagicMock` attribute for the new name, and the old assertion never runs. The test passes, the real behavior is broken, and you do not find out until the code hits something real.

Three practices guard against this. First, use `create_autospec()` to lock the mock to the shape of the real object — it will raise `TypeError` if your test calls a method with the wrong signature. Second, patch at the lookup location, not the definition location — if the code under test does `from myapp.services import Notifier`, patch `myapp.module_under_test.Notifier`, not `myapp.services.Notifier`. Third, keep the mock scope narrow: assert one behavioral outcome, not an implementation path through multiple internal calls.

## Why it matters

Bad mocks create a class of bug that is invisible until production. The test is green, the assertion is passing, but the mock is not actually simulating anything real. Teams that use permissive mocks heavily often find that their test suite does not catch regressions introduced by dependency updates or interface refactoring.

TDD's value is that it catches misunderstandings early. An unconstrained mock short-circuits that: it will agree with any misunderstanding. `autospec` restores the feedback loop by making the mock behave like a real object at the signature level.

The equally common failure — patching at the wrong location — is invisible in the same way. The test feels right, the mock gets called, the assertion passes, but the code under test is using the original unpatched version because the patch replaced something in a namespace the code never looks at [S013](../../research/test-driven-development-in-python/01-sources/web/S013-why-your-mock-still-doesnt-work.md).

## Example 1 — unconstrained mock vs autospec

The danger with a plain mock:

```python
from unittest.mock import MagicMock

class Ledger:
    def record(self, invoice_id: str, amount_cents: int) -> None:
        ...

# Unconstrained — dangerous
ledger = MagicMock()
# This call has the wrong argument name but the test still passes:
ledger.record(invoice="INV-1", amount=200)   # wrong kwargs
ledger.record.assert_called_once()           # green — but the real call would fail
```

With `create_autospec`, the wrong call raises immediately:

```python
from unittest.mock import create_autospec

ledger = create_autospec(Ledger, instance=True)
# This now raises TypeError: unexpected keyword argument 'invoice'
ledger.record(invoice="INV-1", amount=200)
```

The test fails at the call site with a clear error, rather than silently passing against a wrong call. The fix is to use the correct signature:

```python
ledger = create_autospec(Ledger, instance=True)

service = BillingService(ledger=ledger)
service.record_payment("INV-1", 200)

ledger.record.assert_called_once_with("INV-1", 200)
```

This is a narrow, honest test: it verifies that `BillingService.record_payment` delegates to the owned `Ledger` collaborator with the correct arguments.

## Example 2 — patching at the right location

The classic mistake: patching where something is defined instead of where the code under test sees it.

```python
# myapp/notifier.py
class EmailNotifier:
    def notify(self, address: str) -> None:
        ...

# myapp/onboarding.py
from myapp.notifier import EmailNotifier

def onboard(email: str) -> None:
    n = EmailNotifier()
    n.notify(email)
```

Wrong patch (patches the definition module — code under test already has the original):

```python
# WRONG — patches myapp.notifier.EmailNotifier but onboarding.py already imported it
with patch("myapp.notifier.EmailNotifier") as mock_cls:
    onboard("a@b.com")
    mock_cls.return_value.notify.assert_called_once()  # may still fail silently
```

Correct patch (patches where the code under test looks it up):

```python
# CORRECT — patches the name in the module that uses it
with patch("myapp.onboarding.EmailNotifier") as mock_cls:
    onboard("a@b.com")
    mock_cls.return_value.notify.assert_called_once_with("a@b.com")
```

The rule is: patch in the namespace where the code under test resolves the name, not in the namespace where the name was defined [S013](../../research/test-driven-development-in-python/01-sources/web/S013-why-your-mock-still-doesnt-work.md).

## Example 3 — keeping mock scope narrow with monkeypatch

Pytest's `monkeypatch` is ideal for replacing module-level globals or environment state where `patch()` context managers would add noise. The same narrowness principle applies: replace one thing, assert one behavioral outcome.

```python
# config.py
import os

def get_api_key() -> str:
    return os.environ["PAYMENT_API_KEY"]

# test_payment_service.py
def test_service_uses_configured_api_key(monkeypatch):
    monkeypatch.setenv("PAYMENT_API_KEY", "test-key-123")
    service = PaymentService()
    assert service._api_key == "test-key-123"
```

`monkeypatch` automatically restores the original environment after the test ends. No teardown code required, no risk of state leaking into the next test [S008](../../research/test-driven-development-in-python/01-sources/web/S008-pytest-monkeypatch.md). The mock scope is as narrow as possible: one environment variable, one assertion about the effect on configuration.

## Key points

- `create_autospec()` locks a mock to the real interface — it raises on wrong signatures rather than silently agreeing [S002](../../research/test-driven-development-in-python/01-sources/web/S002-unittest-mock.md)
- Patch where the code under test looks up the name, not where the name was defined [S013](../../research/test-driven-development-in-python/01-sources/web/S013-why-your-mock-still-doesnt-work.md)
- Narrow scope: one collaborator, one behavioral assertion, not a trace of every internal call
- Mocks are most useful for owned collaborators; for external boundaries, higher-fidelity alternatives often give better feedback
- A test that stays green after the real interface changes is not a safety net — it is a liability

## Go deeper

- [S002](../../research/test-driven-development-in-python/01-sources/web/S002-unittest-mock.md) — `unittest.mock` reference including `autospec`, `spec`, and correct patch usage
- [S013](../../research/test-driven-development-in-python/01-sources/web/S013-why-your-mock-still-doesnt-work.md) — common mock failures and why your test can pass while the behavior is broken
- [S008](../../research/test-driven-development-in-python/01-sources/web/S008-pytest-monkeypatch.md) — `monkeypatch` for narrow environment and state replacement in pytest

---

*[← Previous lesson](./L08-boundary-decisions-for-apis-services-and-persistence.md)* · *[Next lesson →](./L10-when-to-prefer-verified-fakes-or-contract-checks.md)*