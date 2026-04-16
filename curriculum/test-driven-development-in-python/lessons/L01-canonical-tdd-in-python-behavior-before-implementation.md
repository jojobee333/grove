# Canonical TDD in Python: Behavior Before Implementation

**Module**: M01 · Drive Design with Red-Green-Refactor
**Type**: core
**Estimated time**: 12 minutes
**Claim**: C1 - TDD in Python is best understood as a disciplined, incremental behavior-design workflow, not merely a habit of writing tests before code

---

## The core idea

Canonical TDD is not just "write a test first." It is a way to drive software design through behavior. The core loop is simple to state but easy to dilute in practice: decide the next behavior you need, write a failing test for that behavior, write the smallest useful code that makes the test pass, and then clean up the design so the next change is easier rather than harder. The research base treats that sequence as the defining mechanism of TDD, not as optional ceremony. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/claims.md`, `vault/research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md`, `vault/research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md`.

That emphasis on behavior matters in Python because the language makes it easy to move quickly and equally easy to accumulate loose, implicit structure. A developer can write code fast, patch a test later, and still feel productive. Canonical TDD pushes in the other direction. It asks you to expose the next needed behavior first so the interface, call shape, and success condition become visible before the implementation starts growing. In the research narrative, that is why TDD is described as a design discipline rather than a testing habit.

The other part people often miss is sequencing. Beck's test-list framing matters because TDD is not "write all the tests up front." It is "pick the next useful test." Fowler reinforces the same pattern from a slightly different angle: the loop stays useful only if each cycle is small enough to guide design without turning into speculative architecture. Together the sources make a practical rule: if your next test requires you to imagine half the system before you can write it, the step is too large.

## Why it matters

If you have some exposure to tests already, the most likely mistake is not ignorance of syntax. It is collapsing all of TDD into the word "test." Once that happens, developers keep the word but lose the discipline. They write implementation-heavy code first, then add tests that merely confirm what already exists. Or they write a big batch of tests based on assumptions that the final design will not actually keep. Both patterns still produce tests, but neither uses tests to steer design.

For practical Python work, this difference changes how you approach a feature. A TDD-oriented developer asks, "What is the next observable behavior I can specify?" A non-TDD but test-aware developer often asks, "How should I build this, and how will I verify it afterward?" The second question is not useless, but it makes it much easier to overbuild or to hide design decisions until later. The first question keeps design pressure close to the behavior the code must expose.

## A concrete example

Imagine you want a small Python function that normalizes user-entered tags before saving them.

Shallow test-first thinking often looks like this:

- define a `normalize_tags()` function
- write logic for trimming whitespace, lowercasing, and deduplicating
- add tests after the function exists

Canonical TDD starts smaller:

- write one failing test that says a single tag like `"  Python  "` becomes `"python"`
- make that test pass with the smallest change
- pick the next behavior, such as preserving input order while removing duplicates
- refactor only when the code starts getting awkward

That step order changes the design. Instead of building a whole "tag normalization system" in your head, you let behavior expose what is actually needed. Maybe the second test reveals you need a list out, not a set. Maybe a third test shows empty strings should be discarded. The point is not that tag normalization is a hard problem. The point is that small behavioral steps produce a clearer interface and fewer speculative choices.

This example is illustrative, not a sourced case study. The factual rule underneath it comes from the research: TDD works best when each test drives one meaningful step of behavior and the sequence of tests shapes the code a little at a time. Source trail: `vault/research/test-driven-development-in-python/03-synthesis/narrative.md`, `vault/research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md`, `vault/research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md`.

## Recognition cues

- You are probably doing canonical TDD when you can name the next behavior before you name the full implementation plan.
- Your step is probably too large when the next test forces you to invent several future abstractions at once.
- You are drifting away from TDD when tests mostly confirm code you already designed in detail before writing them.

## Key points

- Canonical TDD is a behavior-design loop, not just a rule to write tests before code.
- The loop depends on small steps, explicit sequencing, and visible behavioral intent.
- In Python, the main value is not extra ceremony but earlier design feedback on interface and structure.

## Go deeper

- `vault/research/test-driven-development-in-python/03-synthesis/claims.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S006-fowler-tdd.md`
- `vault/research/test-driven-development-in-python/01-sources/web/S007-canon-tdd.md`

---

*[Next lesson: Refactor Timing and Small-Step Control ->](./L02-refactor-timing-and-small-step-control.md)*