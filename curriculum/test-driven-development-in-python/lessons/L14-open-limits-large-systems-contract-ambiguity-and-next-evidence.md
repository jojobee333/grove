# Open Limits: Large Systems, Contract Ambiguity, and Next Evidence

**Module**: M07 · Adopt TDD Without Overclaiming It
**Type**: gap
**Estimated time**: 13 minutes
**Claim**: C6, C8 - For external boundaries, verified fakes, integration checks, and consumer-provider contract tests often provide higher-value feedback than deep mocks, though contract testing is used ambiguously across sources; empirical evidence on TDD outcomes is mixed and highly context-sensitive

---

## The open gap

The research is strong enough to teach practical Python TDD, but it is not complete enough to remove all uncertainty. Several limits stayed open even after the extra sourcing pass. The biggest ones are large-system evidence, ambiguous use of the term "contract testing," and the fact that many empirical results do not transfer cleanly across teams, domains, and maturity levels. Source trail: `vault/research/test-driven-development-in-python/02-analysis/gaps.md`, `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/papers/S018-tosun-2017-industry-experiment.md`, `vault/research/test-driven-development-in-python/01-sources/papers/S019-santos-2021-family-experiments.md`.

This is not a failure of the project. It is the right end state for honest engineering knowledge. A good practitioner knows not only what the evidence supports, but also where the evidence thins out.

## The main limits

One limit is scale. Much of what we can say confidently about Python TDD comes from framework documentation, expert practice writing, and selected empirical studies. That is enough to build a solid operating model for many teams. It is not enough to guarantee how the same patterns will behave inside very large socio-technical systems with multiple services, layered compliance needs, and heavy organizational constraints.

Another limit is terminology. "Contract testing" is used precisely in some places and loosely in others. If a team says it wants contract tests, it still needs to ask whether that means Pact-style consumer-provider verification, broader interface compatibility checks, or simply realistic integration coverage around a boundary.

A third limit is evidence translation. Even when a study shows a positive or negative effect, you still need to ask whether the participants, tooling, training, and codebase pressures resemble your own environment.

## How to operate with these gaps

Use the open limits as planning constraints.

If you are working in a larger system, validate suite design incrementally rather than assuming small-system lessons will scale untouched.

If your team is choosing contract-oriented checks, define the exact mechanism before adopting the label.

If you are making claims about TDD outcomes, pair them with local measures and review periods instead of one-time adoption rhetoric.

If the evidence is unclear, make the uncertainty explicit in design decisions. That is stronger engineering, not weaker conviction.

## Key points

- The remaining gaps are part of the curriculum, not something to hide.
- Large systems, ambiguous contract terminology, and context transfer remain important limits.
- Honest adoption means turning these gaps into operating constraints and validation plans.

## Go deeper

- `vault/research/test-driven-development-in-python/02-analysis/gaps.md`
- `vault/research/test-driven-development-in-python/03-synthesis/claims.md`
- `vault/research/test-driven-development-in-python/04-output/summary.md`

---

*[<- Previous: What the Empirical Evidence Actually Supports](./L13-what-the-empirical-evidence-actually-supports.md)*