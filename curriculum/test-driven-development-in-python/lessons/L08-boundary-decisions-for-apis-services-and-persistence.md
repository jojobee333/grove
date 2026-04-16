# Boundary Decisions for APIs, Services, and Persistence

**Module**: M04 · Design Seams the Tests Can Trust
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C4, C7 - Python test design improves when external boundaries are hidden behind owned seams; advanced Python TDD expertise includes using broader specification techniques than single example-based unit tests

---

## The situation

Knowing that seams are good is not enough. In real systems, you still have to decide where the seam should go. Should you wrap the HTTP client, the service layer, the repository, the ORM session, or all of them? The research points toward a practical answer: create boundaries around places where foreign detail would otherwise distort your business tests, then choose higher-fidelity verification for the boundary itself when needed. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/web/S011-pact-python.md`, `vault/research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md`.

That means boundary design is not purely structural. It is tied to what kind of learning you want from a test. If you want to learn whether business logic decides the right next action, a thin application seam is often enough. If you want to learn whether your service still speaks correctly to another service or a real database transaction boundary, a broader or more realistic test belongs somewhere else in the suite.

## The approach

Use three questions to place seams sensibly.

First, what foreign detail is likely to churn? If the external API request format, ORM wiring, or message envelope is volatile, hide it behind an adapter so that business tests do not encode it everywhere.

Second, where does behavior meaning change? A good seam often sits where raw transport detail becomes domain intent. For example, an HTTP request becomes "fetch customer profile," or a persistence call becomes "save invoice." That is a strong candidate for an owned interface.

Third, what still needs realistic verification? Once you introduce a seam, you have gained clarity at the unit level, but you have also created a translation layer that needs its own checks. That may call for a transactional integration test, a contract-style test, or a focused adapter test that exercises the real protocol.

## A worked example

Imagine an application that charges a card, records the payment, and emits an event.

A brittle design makes the service directly build HTTP payloads, call the payment API, write ORM entities, and publish messages in one place. Domain tests then have to care about all three infrastructures at once.

A seam-oriented design may instead depend on three owned collaborators:

- `PaymentGateway.charge(...)`
- `PaymentStore.record(...)`
- `EventBus.publish_payment_received(...)`

Now unit tests for the service can focus on behavior: when a payment succeeds, does the application record it and publish the right domain event? That test does not need to know the payment provider's JSON structure or the ORM session mechanics.

But the work is not finished. The adapter that translates `charge(...)` into an actual provider request still needs verification. The persistence layer still needs realistic checks to confirm transaction behavior. This is exactly where the source set recommends mixing seam-based unit tests with higher-fidelity checks at the boundary. The seam simplifies domain learning; it does not erase the need to validate translation correctness.

## Decision rules

- Put seams where external detail would otherwise leak into many business tests.
- Keep domain tests at the level of business actions, not transport structures.
- Add higher-fidelity tests at the adapter or persistence boundary when translation correctness matters.
- Do not wrap every line of infrastructure blindly; wrap the boundaries that meaningfully reduce coupling and improve learning.

## Key points

- Boundary placement is driven by learning goals, not abstraction for its own sake.
- Good seams isolate domain behavior from volatile API, message, and persistence details.
- Higher-fidelity tests still belong at the real boundary to verify the translation layer.

## Go deeper

- `vault/research/test-driven-development-in-python/01-sources/web/S011-pact-python.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md`
- `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`

---

*[<- Previous: Adapters, Injection, and Owned Interfaces](./L07-adapters-injection-and-owned-interfaces.md)* · *[Next lesson: Strict Mocks Without False Confidence ->](./L09-strict-mocks-without-false-confidence.md)*