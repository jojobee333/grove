# Open Limits: Large Systems, Contract Ambiguity, and Next Evidence

**Module**: M07 · Adopt TDD Without Overclaiming It
**Type**: gap
**Estimated time**: 13 minutes
**Claim**: C6, C8 from Strata synthesis

---

## The core idea

A course that ends by pretending it answered every question teaches false confidence. The research behind this course is strong: 19 active sources, 8 claims, 6 research questions answered. But it also has three real limits that stayed open even after the empirical refresh pass. This final lesson names them explicitly. Understanding where the evidence thins out is part of what it means to apply this knowledge responsibly.

The three open limits are:

**Large-system evidence is thin.** Most of what we can say confidently about Python TDD comes from framework documentation, expert practitioner writing, and peer-reviewed experiments on constrained tasks with controlled participants. That is a solid foundation for small-to-medium Python services and libraries. It is not enough to make strong predictions about how the same patterns perform in very large systems with dozens of services, layered organizational constraints, mixed technical debt, and evolving compliance requirements.

**"Contract testing" is still ambiguous.** The source set uses this term in at least two distinct senses that are easy to conflate. Some sources mean a consumer-side test of expected interaction shapes (the Pact meaning). Others use it loosely to mean any kind of realistic interface compatibility check. If your team adopts "contract testing," you need to resolve which mechanism you actually mean before making adoption decisions.

**The empirical evidence is mixed and non-transferable.** The two outcome studies in the research set are real and informative, but they come with important caveats: neither is Python-specific, neither captures the design-level benefits that practitioner sources emphasize, and neither provides guidance on how outcomes might scale with team experience, codebase age, or domain complexity. Transferring their results to your context requires caution.

## Why naming gaps matters

The instinct when teaching is to smooth over uncertainty. It is easier to present confident rules than to hand learners something incomplete. But in engineering, knowing the confidence level of a belief is as important as knowing the belief itself. A practitioner who applies a rule with calibrated uncertainty will observe carefully, gather local evidence, and update their approach. One who applies it with false certainty will explain away disconfirming signals until the system fails.

The gaps in this research are not failures of the project. They are the right endpoint. They tell you where the evidence is strong, where it is reasonable, and where you are in genuinely uncertain territory that your own practice needs to help resolve.

## Gap 1 in practice: operating at larger scale

If you are working in a system with five or more services, significant organizational constraints, or a Python codebase that has grown through multiple technology generations, the lessons in this course give you the right principles — seam design, isolation, boundary coverage, parametrization — but the calibration of how much to invest in each layer, and which layers provide the most return, will require your own empirical work.

Operating constraints for large-system TDD adoption:
- Validate suite design incrementally. Do not assume that a strategy that works for a 3-service system scales unchanged to a 20-service system.
- Track maintenance cost per test layer, not just coverage percentage. A layer that is expensive to maintain relative to the bugs it catches may need to be consolidated.
- Be explicit about where mocking at scale creates synchronization risk — service mocks that fall behind real service behavior are a large-system problem that small-system TDD discipline alone does not prevent.

## Gap 2 in practice: resolving "contract testing" before adopting it

Before committing to "contract testing" as a team practice, answer:

1. **Whose expectations are being verified?** Consumer-driven (Pact) means the consuming service defines the expected interaction and the provider verifies it. Provider-driven means the provider defines the contract and consumers validate against it. These are different tools for different coordination problems.

2. **Where do the contracts live?** In a Pact broker, in a shared repository, in recorded HTTP fixtures, or somewhere else? The answer affects how contract updates propagate across teams.

3. **How are mismatches handled?** When a provider changes an interaction and breaks a consumer contract, what is the process for coordinating the update? Without this, contract tests become a source of friction rather than confidence.

Defining these three points before adoption turns a vague label into an actionable mechanism. Without them, "we do contract testing" may mean something different to every team member.

## Gap 3 in practice: building your own evidence base

Given that the experimental evidence is mixed and not Python-specific, the most defensible approach to TDD outcome claims in your organization is local measurement over time.

A minimal evidence-gathering approach:
- Before full adoption, baseline your current defect rate, change failure frequency, and average time to reproduce production bugs
- Adopt TDD practices in one team or one service for a defined period (six to twelve months minimum — shorter periods are too noisy)
- After the period, compare the same metrics against the baseline and against teams or services that did not change their approach
- Report the comparison with uncertainty bounds, not as a headline figure

This is slower than citing a study, and the sample size will be small. But it produces evidence that is directly relevant to your environment, your team, and your codebase — which is more useful than a controlled study performed on students in a laboratory.

## Key points

- Large-system case studies are thinner in the research base than small-service technique documentation — calibrate accordingly
- "Contract testing" is an overloaded term: define the exact mechanism (consumer-driven, provider-driven, recorded fixtures) before adopting it [S017](../../research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md)
- The empirical outcome studies are mixed, non-Python-specific, and do not transfer cleanly to all contexts [S018](../../research/test-driven-development-in-python/01-sources/papers/S018-tosun-2017-industry-experiment.md) [S019](../../research/test-driven-development-in-python/01-sources/papers/S019-santos-2021-family-experiments.md)
- Build a local evidence base with explicit baselines rather than relying on transferring external results
- Honest adoption means turning open gaps into explicit operating constraints and measurement plans, not ignoring them

## Go deeper

- [S017](../../research/test-driven-development-in-python/01-sources/web/S017-pact-how-it-works.md) — how Pact defines consumer-driven contract testing precisely — useful for resolving the terminology gap
- [S018](../../research/test-driven-development-in-python/01-sources/papers/S018-tosun-2017-industry-experiment.md) — the industry experiment that illustrates why outcome results are task-sensitive and do not transfer cleanly
- [S019](../../research/test-driven-development-in-python/01-sources/papers/S019-santos-2021-family-experiments.md) — the meta-analysis showing context sensitivity and why "TDD is better" is not the finding

---

*[← Previous lesson](./L13-what-the-empirical-evidence-actually-supports.md)*