# Strict Mocks Without False Confidence

**Module**: M05 · Use Mocks, Fakes, and Contracts Intentionally
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C5 - Mocks are still useful in Python TDD when they are narrow, strict, and aimed at owned collaborators rather than deep third-party behavior

---

## The core idea

The research does not reject mocks. It narrows their job. In Python TDD, mocks are most useful when they isolate a collaborator your application already owns, when they are constrained to the real interface, and when they are patched at the place the code actually looks them up. That combination is what keeps a mock from becoming false confidence. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/web/S002-unittest-mock.md`, `vault/research/test-driven-development-in-python/01-sources/web/S013-why-your-mock-still-doesnt-work.md`.

This matters because Python makes mocking both powerful and easy to misuse. You can patch attributes, replace functions, and assert calls with very little code. But that same flexibility can let tests drift away from behavior and toward implementation trivia. A test starts asserting that three internal calls happened in a specific order, even though the only real requirement is that the application asked a collaborator to perform one business action. Or a mock accepts any attribute access because it is unconstrained, so the test stays green after the real API has changed.

Strictness is the answer here. `autospec` and `create_autospec()` matter because they force the mock to resemble the real callable or object. "Patch where looked up" matters because patching the definition site instead of the lookup site often means you are not changing the object the code under test will actually use. Narrow scope matters because the more of a system you replace with mocks, the more likely it is that the test verifies your imagination instead of the real behavior boundary.

## Why it matters

Many teams swing between two bad extremes: mock everything, or mock nothing. The research supports neither. If you never mock, you may make small behavioral tests too slow or too infrastructure-heavy to drive design effectively. If you mock too deeply, you stop learning whether the real collaboration still works.

Good TDD judgment is learning where a mock provides a clean behavioral question. "Did the service ask the owned notifier to send a welcome message?" is a good mock question. "Did the nested SDK object build this exact provider-specific transport payload through three internal layers?" is usually a sign that the seam is wrong or the test is too deep into infrastructure detail.

## A concrete example

Suppose your `BillingService` depends on an injected `Ledger` collaborator that your application owns.

That is a strong place for a strict mock:

```python
from unittest.mock import create_autospec


ledger = create_autospec(Ledger, instance=True)
service = BillingService(ledger=ledger)

service.record_payment("INV-1", 200)

ledger.record.assert_called_once_with("INV-1", 200)
```

This test asks a focused question about business collaboration. The mock is constrained to the real `Ledger` interface and the assertion is small.

Now compare that to directly mocking a third-party payment SDK with nested return values and transport-specific configuration. That usually produces more setup, more brittle patching, and less clarity about business behavior. If you feel forced into that style, the research suggests re-examining the seam before adding more mock machinery.

Pytest's `monkeypatch` supports a similar principle for environment and module state: keep the patch targeted and let pytest undo it automatically. The tool is useful, but only when the scope is narrow and the reason is explicit. Source trail: `vault/research/test-driven-development-in-python/01-sources/web/S008-pytest-monkeypatch.md`, `vault/research/test-driven-development-in-python/01-sources/web/S002-unittest-mock.md`.

## Recognition cues

- A mock is probably helping when it stands in for an owned collaborator with a clear business role.
- A mock is probably too loose when it would stay green after the real interface changed.
- Patch mistakes are likely when you patch where something is defined instead of where the code under test imports or looks it up.

## Key points

- Mocks are useful when they isolate owned collaborators cleanly and narrowly.
- Strictness tools like `autospec` reduce the risk of tests passing against unreal interfaces.
- Correct patch location is a design detail that directly affects whether the test is even exercising what you think it is.

## Go deeper

- `vault/research/test-driven-development-in-python/01-sources/web/S002-unittest-mock.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S008-pytest-monkeypatch.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S013-why-your-mock-still-doesnt-work.md`

---

*[<- Previous: Boundary Decisions for APIs, Services, and Persistence](./L08-boundary-decisions-for-apis-services-and-persistence.md)* · *[Next lesson: When to Prefer Verified Fakes or Contract Checks ->](./L10-when-to-prefer-verified-fakes-or-contract-checks.md)*