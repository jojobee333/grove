# When to Prefer Verified Fakes or Contract Checks

**Module**: M05 · Use Mocks, Fakes, and Contracts Intentionally
**Type**: debate
**Estimated time**: 16 minutes
**Claim**: C6 - For external boundaries, verified fakes, integration checks, and consumer-provider contract tests often provide higher-value feedback than deep mocks, though "contract testing" is used ambiguously across sources

---

## The tension

Once a boundary leaves the part of the system you own directly, mocks start losing some of their value. They can still be useful, but they stop answering the most important question: does your code still speak correctly to the real boundary? The research argues that for many external integrations, higher-fidelity alternatives provide better feedback than deep mocking. At the same time, it also warns that terms like "contract test" are used inconsistently, so you need to know what kind of check you are actually choosing. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/02-analysis/contradictions.md`, `vault/research/test-driven-development-in-python/01-sources/web/S014-verified-fakes.md`, `vault/research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md`.

The core debate is fidelity versus speed and control. Deep mocks are fast and isolated, but they frequently model only your assumptions about the external system. Verified fakes sit in the middle: a simplified implementation that is regularly checked against the real service behavior. Contract checks go after interaction shape between a consumer and provider. Focused integration tests exercise the actual boundary more directly. These are not interchangeable tools, even if teams sometimes talk about them as if they were.

## The two sides

One side says: use mocks because they keep the suite fast and make failures local. That is often true for owned collaborators.

The other side says: for third-party APIs, messaging boundaries, and persistence translation layers, a mock can preserve speed while quietly lying about compatibility. That is also often true.

The research resolves this by changing the question. Instead of asking "mocks or integration tests?" ask "what is the cheapest test that still tells the truth about this boundary?" Sometimes that is a strict mock. Sometimes it is a verified fake. Sometimes it is a Pact-style consumer-provider contract check. Sometimes it is a small number of realistic integration tests.

## A concrete comparison

Imagine an application that calls a shipping API.

A deep mock approach might assert that your code called `client.post()` with a nested JSON body and specific headers. That is fast, but it binds the test to the transport layer and tells you little about whether your application's shipping abstraction still matches the provider.

A verified fake approach might implement a lightweight local stand-in for the shipping service behavior your application depends on, then periodically verify that fake against the real service's observed behavior or shared examples. That buys speed plus more semantic confidence.

A contract-style check might publish consumer expectations and verify that the provider still satisfies the agreed interaction. That is useful when two services evolve independently and the interaction surface itself is what needs protection.

The key nuance from the research is that "contract testing" is ambiguous. Some sources use the term loosely for any agreed interface check. Pact uses it more specifically for consumer-provider interaction verification. When planning a suite, name the exact mechanism, not just the label.

## Decision rules

- Prefer strict mocks for owned collaborators where the question is behavioral coordination.
- Prefer verified fakes when you need speed but also need stronger behavioral truth at an external boundary.
- Prefer contract-style checks when independent services need their interaction expectations verified explicitly.
- Prefer focused integration tests when the real boundary behavior itself is the thing you most need to learn.

## Key points

- External boundaries often need higher-fidelity checks than deep mocks can provide.
- Verified fakes, contract checks, and integration tests solve different problems and should be named precisely.
- The best choice is the cheapest test that still tells the truth about the boundary you care about.

## Go deeper

- `vault/research/test-driven-development-in-python/01-sources/web/S014-verified-fakes.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md`
- `vault/research/test-driven-development-in-python/02-analysis/contradictions.md`

---

*[<- Previous: Strict Mocks Without False Confidence](./L09-strict-mocks-without-false-confidence.md)* · *[Next lesson: Parametrization and Property-Based Testing ->](./L11-parametrization-and-property-based-testing.md)*