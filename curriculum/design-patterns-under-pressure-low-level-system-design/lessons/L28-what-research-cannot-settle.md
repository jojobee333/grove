# What This Research Still Cannot Settle

**Module**: M10 · Limits, Gaps, and Honest Uncertainty
**Type**: gap
**Estimated time**: 20 minutes
**Claim**: G005, G006, G007 from Strata synthesis

---

## The core idea

A course that ends by pretending it answered every question teaches false confidence. The research behind this course is strong — 22 active sources, six well-supported claims, two resolved contradictions — but it also has three real limits. This final lesson names them explicitly, not as a disclaimer, but as a precision tool: understanding what the evidence cannot settle helps you calibrate how much to trust the conclusions.

The three open gaps are:

**G005**: The source base never directly quotes from the original Gang of Four book. Adjacent primary sources from Ward Cunningham and Martin Fowler, plus later practitioner literature, cover the same conceptual ground. But there are no verbatim excerpts from Design Patterns (1994) in this research set.

**G006**: The most important practical threshold in the course remains context-dependent and unresolved. Exactly when does extra indirection start paying for itself? The evidence provides practitioner heuristics — strong ones — but not a universal empirical rule. The threshold varies by team size, reversibility, integration surface, and domain volatility. No source in this set settles it.

**G007**: The editor and interaction-heavy composition story (Lesson 26) rests on a thinner source foundation than the enterprise examples. Sources S007, S008, and S009 strongly suggest the applicability of Command, Observer, and State to editor-style systems, but none of them presents a dedicated single-system case study showing all three in combination.

## Why it matters

Calibrated confidence is more valuable than false certainty. If you finish this course knowing what it can and cannot prove, you will apply the findings appropriately — as judgment rules supported by practitioner evidence — rather than as formulas to apply mechanically.

Research limitations are not reasons to distrust the main findings. The six claims in this course are well-supported. The limitations show where the evidence is strong versus where it tapers off. That taper is information.

## Gap 1: Missing GoF canonical text

The Gang of Four book introduced the original pattern vocabulary that every source in this course builds on. Ward Cunningham's C2 wiki (S012), Fowler's enterprise patterns (S015, S016, S018, S019, S020, S021, S022), and Nystrom's game programming patterns (S007, S008, S009, S011) all speak directly to the original pattern ideas — but they do so from the perspective of practitioners extending or reacting to GoF, not from the original text.

What this means practically: the force-response framing this course uses ("patterns answer pressures, not pattern names") is strongly supported by the practitioner literature. Whether the original authors framed it that way is less certain. Some GoF critics argue the original presentation was more catalog-like and that the pressure-first reading is a later refinement. This course teaches the pressure-first view because the practitioner evidence is compelling, not because the GoF text confirms it directly.

## Gap 2: The indirection threshold

The most important unresolved question in this course is also the most practical one: how much of a given pressure does a codebase need to feel before adding a pattern is the right call?

The evidence supports strong heuristics:
- One database query with no duplication → a repository is probably ceremony
- Three interfaces all duplicating orchestration logic → a service layer is probably justified
- Business rules scattered across four service methods for the same concept → domain model is probably needed

But "probably" is carrying work in those sentences. The threshold is real but context-dependent. A team with high discipline, strong tests, and an active refactoring culture can tolerate more complexity in a flat structure than a team with weaker practices. A domain with very low change rates may never need the abstraction even if the complexity is technically present.

No source in this research set gives a formula. They give experienced judgment. This course teaches that judgment as faithfully as possible, but cannot convert it into a threshold you can measure.

## Gap 3: Editor case study depth

The composition lesson on editor and interaction-heavy patterns (Lesson 26) is built on three strong individual pattern sources: Nystrom on Command (S007), Nystrom on Observer (S008), and Nystrom on State (S009). Each source makes a strong case for its pattern in editor-like contexts.

What is missing is a source that shows all three patterns working together in a single real editor or tool, with the tradeoffs and failure modes of their combination described from direct experience. The enterprise stack story has that: Fowler's pattern catalog describes the Service Layer, Data Mapper, Repository, Unit of Work, and Domain Model as a documented combination with known integration patterns. The editor-stack story is inferential — assembled from compatible individual sources rather than from a case study that integrated them directly.

This does not make Lesson 26 wrong. It makes it less firmly grounded than Lesson 25. If you apply those patterns together in a real editor and encounter a problem not covered by the individual source materials, that is the expected edge of the evidence.

## Key points

- Strong research still has defined limits; naming them is a form of intellectual honesty, not weakness
- The missing GoF text means the pressure-first framing comes from practitioner reinterpretation, not from the original presentation — which may itself have been more catalog-like
- The indirection threshold is the most practically important open question: no universal empirical rule exists, only experienced judgment calibrated to context [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md)
- The editor composition story is inferential — assembled from compatible sources — rather than based on a dedicated case study [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md)
- Using these findings as judgment rules grounded in practitioner evidence, not formulas, is the appropriate epistemic stance

## Go deeper

- [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md) — Ward Cunningham's wiki: the strongest canonical-adjacent source that partially substitutes for missing GoF excerpts
- [S001](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S001-fowler-injection.md) — a good example of why indirection thresholds remain contextual even in one of the best-documented pattern choices
- [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md) — the anchor source for the thinner editor-side evidence; worth reading alongside S008 and S009 to see what the inferential case is actually built on

---

*[← Previous lesson](./L27-naive-to-pattern-stack.md)*
