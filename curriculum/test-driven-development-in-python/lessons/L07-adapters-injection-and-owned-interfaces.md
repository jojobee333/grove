# Adapters, Injection, and Owned Interfaces

**Module**: M04 · Design Seams the Tests Can Trust
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C4 - Python test design improves when external boundaries are hidden behind owned seams

---

## The core idea

One of the strongest design lessons in the research is that Python tests improve when your business logic depends on interfaces you own rather than on third-party call shapes you merely happen to use. This is the real point of seams. A seam is not "an abstraction because architecture likes abstractions." It is a boundary that lets you express your own domain behavior without making every test speak the language of an HTTP client, cloud SDK, ORM detail, or vendor response object. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/web/S010-sandi-metz-testable.md`, `vault/research/test-driven-development-in-python/01-sources/web/S012-obey-the-testing-goat-chapter-20.md`.

Adapters and dependency injection are useful here because they reduce the amount of foreign detail that leaks into the code under test. An adapter translates from the external system's shape to your application's shape. Injection gives your code a way to receive that collaborator instead of constructing it deep inside a function where the test cannot steer it cleanly. Together they let tests focus on decisions your code owns.

This is especially helpful in Python because the language makes direct access to external libraries very easy. You can import a third-party client inside a function, call it immediately, and ship working code quickly. But that convenience often hides a cost: every test that touches the function now inherits the vendor API surface, patch location, transport behavior, or object model. Seam design reduces that cost by giving the domain code something smaller and more stable to depend on.

## Why it matters

Without owned seams, tests often become brittle for the wrong reason. A change in the vendor SDK, response wrapper, or import structure breaks tests even though the domain behavior has not changed. Developers then blame mocking, or Python, or the test framework, when the real problem is that the domain logic never got its own boundary.

TDD improves when the next test can name business intent in your vocabulary. "Send a welcome notification" is a better test-level concept than "call client.messages.create with these nested transport options." Owned interfaces make that possible.

## A concrete example

Suppose you need a service that creates a customer record and sends a welcome message through a third-party email provider.

The coupled version might do this directly:

```python
def onboard_customer(email):
    provider = ThirdPartyMailer(api_key=...)
    provider.send(template="welcome", recipient=email)
```

That works, but it makes your tests care about how the provider is constructed and how it expects arguments.

An owned seam version might look like this:

```python
class Mailer:
    def send_welcome(self, recipient: str) -> None:
        raise NotImplementedError


def onboard_customer(email: str, mailer: Mailer) -> None:
    mailer.send_welcome(email)
```

Now the application owns the meaning of "send welcome." A real adapter can translate that call to the external provider. The domain test only needs to verify that onboarding triggers the expected business action through an interface the application controls.

This example is illustrative, but it reflects the seam-design lesson in the source set: hide external boundaries behind application-owned collaborators so tests can stay focused on business behavior. Source trail: `vault/research/test-driven-development-in-python/01-sources/web/S010-sandi-metz-testable.md`, `vault/research/test-driven-development-in-python/01-sources/web/S012-obey-the-testing-goat-chapter-20.md`, `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`.

## Recognition cues

- If your test assertions mention vendor-specific request structures, the seam is probably too weak.
- If code constructs its own external collaborators deep inside business logic, injection is probably missing.
- If changing providers would require rewriting many domain tests, the interface is probably not owned by your application.

## Key points

- A seam is valuable when it lets domain behavior depend on application-owned concepts rather than third-party details.
- Adapters translate external systems; injection makes those collaborators controllable.
- Better seam design usually produces both clearer code and less brittle tests.

## Go deeper

- `vault/research/test-driven-development-in-python/01-sources/web/S010-sandi-metz-testable.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S012-obey-the-testing-goat-chapter-20.md`
- `vault/research/test-driven-development-in-python/03-synthesis/claims.md`

---

*[<- Previous: unittest Fluency and Incremental Migration](./L06-unittest-fluency-and-incremental-migration.md)* · *[Next lesson: Boundary Decisions for APIs, Services, and Persistence ->](./L08-boundary-decisions-for-apis-services-and-persistence.md)*