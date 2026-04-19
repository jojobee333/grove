# Adapters, Injection, and Owned Interfaces

**Module**: M04 · Design Seams the Tests Can Trust
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C4 from Strata synthesis

---

## The core idea

One of the most consistent findings in the research is that Python tests improve when your business logic depends on interfaces you own rather than on third-party call shapes you merely happen to use. A seam is the right word for this boundary: it is not an abstraction added because architecture diagrams say to. It is a boundary that lets you express your own domain behavior without making every test speak the language of an HTTP client, cloud SDK, ORM detail, or vendor response object.

Why does this matter in Python specifically? Because Python's import system and dynamic dispatch make it very easy to reach directly for external libraries from inside business logic. You can import a third-party client inside a function, call it immediately, and produce working code with minimal ceremony. The cost appears later: every test that touches that function now inherits the vendor API surface, the patch location complexity, the transport behavior, and the response object model. Each change in the vendor library creates test failures that have nothing to do with your application's behavior [S011](../../research/test-driven-development-in-python/01-sources/web/S011-dont-mock-what-you-dont-own.md).

Adapters and dependency injection address this problem by creating a deliberate translation layer. An adapter translates from the external system's shape into your application's shape — it speaks both languages so that the rest of the application only needs to speak one. Dependency injection gives the code a way to receive a collaborator rather than construct it internally, which keeps the test in control of what the code under test actually uses.

## Why it matters

Without owned seams, tests become brittle for the wrong reason. A change to a vendor SDK response structure, import path, or argument shape breaks tests even though the domain behavior has not changed. Teams then patch the mock setup and ship a fix that restores green without improving any real behavior.

TDD works best when the next test can name business intent in your vocabulary. "Send a welcome notification to the new customer" is a good test-level concept. "Call client.messages.create with a template_id, a `to` address, and these specific nested parameters" is infrastructure detail that belongs inside the adapter, not spread across every domain test.

Writing the failing test first helps here too. When you write the test in terms of what the application should do rather than how it will do it, you are forced to design an interface that makes the intention legible. That interface becomes the seam.

## Example 1 — the coupled starting point

A customer onboarding function that calls a mail provider directly:

```python
# tight coupling — the domain function knows the provider's call shape
def onboard_customer(customer_id: int, email: str, db) -> None:
    db.execute(
        "INSERT INTO customers (id, email, status) VALUES (?, ?, ?)",
        (customer_id, email, "active"),
    )
    # ThirdPartyMailer is imported at the top of the file
    provider = ThirdPartyMailer(api_key=os.environ["MAIL_KEY"])
    provider.send(
        template_id="tmpl_welcome",
        to=email,
        params={"customer_id": customer_id},
    )
```

Testing this requires either calling the real mail provider, or carefully patching `ThirdPartyMailer` at exactly the right location with exactly the right attribute path. When the vendor updates their SDK and renames `template_id` to `template`, every test that patches this call breaks immediately — even though the domain behavior (send a welcome message to a new customer) has not changed.

## Example 2 — introducing an owned interface

Introduce an owned interface so the domain code no longer knows which mail provider is in use:

```python
# notifications.py — your application's language
from abc import ABC, abstractmethod


class Notifier(ABC):
    @abstractmethod
    def send_welcome(self, recipient_email: str, customer_id: int) -> None:
        """Send a welcome message to a newly onboarded customer."""


# domain logic no longer knows about ThirdPartyMailer
def onboard_customer(
    customer_id: int,
    email: str,
    db,
    notifier: Notifier,
) -> None:
    db.execute(
        "INSERT INTO customers (id, email, status) VALUES (?, ?, ?)",
        (customer_id, email, "active"),
    )
    notifier.send_welcome(recipient_email=email, customer_id=customer_id)
```

Now the domain test is clean:

```python
from unittest.mock import create_autospec

def test_onboarding_sends_welcome(db):
    notifier = create_autospec(Notifier, instance=True)
    onboard_customer(1, "alice@example.com", db, notifier)
    notifier.send_welcome.assert_called_once_with(
        recipient_email="alice@example.com", customer_id=1
    )
```

The test says nothing about `ThirdPartyMailer`, templates, or API keys. If the vendor changes their SDK, only the adapter class changes — the domain test stays green because the seam it depends on has not moved.

## Example 3 — the adapter that does the translation

The adapter is where the vendor detail lives. The rest of the application never sees it:

```python
# adapters/mail.py
from notifications import Notifier


class ThirdPartyMailAdapter(Notifier):
    def __init__(self, api_key: str) -> None:
        self._client = ThirdPartyMailer(api_key=api_key)

    def send_welcome(self, recipient_email: str, customer_id: int) -> None:
        self._client.send(
            template_id="tmpl_welcome",
            to=recipient_email,
            params={"customer_id": customer_id},
        )
```

At startup the real adapter is injected. In tests a strict mock or a hand-rolled fake takes its place. The domain function `onboard_customer` never changes when the vendor changes; only `ThirdPartyMailAdapter` does.

This pattern follows what the research describes as the "don't mock what you don't own" principle [S011](../../research/test-driven-development-in-python/01-sources/web/S011-dont-mock-what-you-dont-own.md): mock the owned interface, not the vendor's call. The adapter is the one place where the translation happens, and it can have its own focused tests against a real or stubbed version of the vendor.

## Key points

- A seam is valuable when it lets domain behavior depend on application-owned concepts rather than third-party details [S011](../../research/test-driven-development-in-python/01-sources/web/S011-dont-mock-what-you-dont-own.md)
- Adapters translate external systems; injection makes collaborators controllable at test time
- One adapter class can carry all the vendor complexity, leaving domain tests free to stay at the business-intent level
- Better seam design produces both clearer code and less brittle tests — not as a tradeoff, but as the same outcome
- Python's ease of direct import access makes seam discipline especially important to establish deliberately

## Go deeper

- [S011](../../research/test-driven-development-in-python/01-sources/web/S011-dont-mock-what-you-dont-own.md) — the "don't mock what you don't own" principle and why it produces stronger tests
- [S012](../../research/test-driven-development-in-python/01-sources/web/S012-testing-external-api-calls.md) — adapter-based seam design in the context of external API calls
- [S002](../../research/test-driven-development-in-python/01-sources/web/S002-unittest-mock.md) — `create_autospec` and how to lock a mock to the real interface it stands in for

---

*[← Previous lesson](./L06-unittest-fluency-and-incremental-migration.md)* · *[Next lesson →](./L08-boundary-decisions-for-apis-services-and-persistence.md)*