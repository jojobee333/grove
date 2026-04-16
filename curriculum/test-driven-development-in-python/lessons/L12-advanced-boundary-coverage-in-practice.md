# Advanced Boundary Coverage in Practice

**Module**: M06 · Broaden Specification Beyond Single Examples
**Type**: synthesis
**Estimated time**: 17 minutes
**Claim**: C7 - Advanced Python TDD expertise includes using broader specification techniques than single example-based unit tests

---

## The synthesis

By this point, the course has built several separate ideas: fixture isolation, async loop control, transactional persistence testing, seam design, strict mocks, verified fakes, contract-style checks, parametrization, and property-based testing. The synthesis challenge is knowing how to combine them without turning the suite into a pile of overlapping rituals. The research offers a practical answer: choose coverage layers by the kind of truth you need from each boundary. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`, `vault/research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md`, `vault/research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md`, `vault/research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md`.

That means advanced coverage is not "more of every kind of test." It is deliberate layering. Unit-level tests answer whether domain logic makes correct decisions. Boundary-level tests answer whether translations to persistence, async runtimes, or external services are still truthful. Broader specification tools answer whether the behavioral space is wider than your hand-written examples suggest. Each layer earns its place by answering a different question.

## A practical model

Use this decision model when a Python component stops being trivial.

Start with small example-driven tests around domain logic. These keep the design loop tight.

Add parametrization when the same behavior clearly has a family of cases.

Add Hypothesis when you can state a meaningful invariant and want the suite to search for counterexamples you did not think to write manually.

Add strict mocks where owned collaborators coordinate behavior and speed matters.

Add verified fakes, contract checks, or focused integration tests where the real boundary's shape or semantics are what you need to learn from.

Add explicit async-loop or transaction strategies where runtime lifecycle itself can leak between tests or distort realism.

Notice what this model avoids. It does not start from tooling categories. It starts from learning goals.

## A worked scenario

Imagine a background job that receives a message, validates payload fields, stores a record, and calls an external fulfillment service.

One healthy suite might look like this:

- small unit tests drive validation and branching logic
- parametrized tests cover families of payload cases
- a Hypothesis property checks that invalid required fields never produce a persisted record
- a strict mock verifies that the domain service asks an owned fulfillment adapter for the correct business action
- a transactional database test verifies that persistence logic behaves correctly with real session semantics
- a contract or integration-style check verifies that the fulfillment adapter still speaks correctly to the external service

That is not redundancy. Each test type is protecting a different source of error. The domain tests protect logic. The persistence test protects realism. The contract or integration check protects translation. The property-based test protects broader invariants.

## Key points

- Advanced coverage is a strategy for combining layers, not a mandate to use every tool everywhere.
- Each layer should answer a distinct question about logic, invariants, lifecycle, or boundary truth.
- The right suite for a non-trivial Python system is chosen by learning goals, not by attachment to one test style.

## Go deeper

- `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S015-pytest-asyncio-concepts.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S016-sqlalchemy-test-transactions.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md`

---

*[<- Previous: Parametrization and Property-Based Testing](./L11-parametrization-and-property-based-testing.md)* · *[Next lesson: What the Empirical Evidence Actually Supports ->](./L13-what-the-empirical-evidence-actually-supports.md)*