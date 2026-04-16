# 15–20 Templates Cover 80%+ of FAANG Interview Problems

**Module**: M01 · The Interview Algorithm Landscape
**Type**: core
**Estimated time**: 10 minutes
**Claim**: C1, C2 from Strata synthesis

---

## The core idea

Interview algorithms are not an infinite frontier of novel techniques — they are a compact, learnable set of reusable scaffolds. The evidence from community-validated study lists converges on a striking finding: mastery of approximately **15–20 algorithm templates** is sufficient to solve 80% or more of problems that appear in FAANG-level coding interviews.

This is the Pareto principle applied to technical preparation. Blind 75's top-7 topic categories account for 55 out of its 75 problems ([S021](../../research/coding-algorithms-technical-interviews/01-sources/web/S021-blind75-grind75-tech-interview-handbook.md)). NeetCode 150 organises all 150 problems into exactly 18 ordered categories. The Tech Interview Handbook ([S023](../../research/coding-algorithms-technical-interviews/01-sources/web/S023-algorithm-priority-tech-interview-handbook.md)) identifies 6 high-priority topics that collectively account for the bulk of what companies actually test — arrays, strings, hashing, trees, graphs, and binary search — while explicitly rating adjacent topics like tries, segment trees, and advanced graph algorithms as "medium" or "low" priority.

The practical implication is significant: you do not need to master the entire field of algorithms to perform consistently at FAANG level. You need to master a specific, bounded set of patterns deeply enough to recognise them under pressure and execute them correctly.

## Why it matters

The alternative mental model — that coding interviews require broad, unpredictable algorithmic knowledge — is both demoralising and inefficient. If the problem space is unbounded, preparation is hopeless. If instead the problem space has a clear, empirically validated structure, preparation becomes a project with a realistic scope.

The "apply practically" goal means what matters is not theoretical completeness but **reliable execution**. A developer who can immediately recognise a problem as a sliding window variant, produce the correct template from memory, and fill in the problem-specific parameters will outperform a developer with broader knowledge but slower pattern recognition — especially under interview time pressure. Mastery of the core 15–20 templates is the minimal bar for this kind of reliable execution.

The 20% of problems that fall outside this set are real, but they serve a different purpose in interviews: they are used for differentiation at the senior/staff level, or by companies like Google specifically, not as baseline screening. Building a solid foundation in the core patterns first is the correct sequencing for almost every candidate.

## A concrete example: the Grind 75 distribution

Here is the actual topic distribution for Grind 75 ([S021](../../research/coding-algorithms-technical-interviews/01-sources/web/S021-blind75-grind75-tech-interview-handbook.md)), a community-derived list of 75 high-ROI LeetCode problems:

| Topic | Problems | % of total |
|---|---|---|
| Array | 11 | 14.7% |
| Graph | 10 | 13.3% |
| Binary Tree | 9 | 12.0% |
| String | 8 | 10.7% |
| Dynamic Programming | 5 | 6.7% |
| Binary Search | 5 | 6.7% |
| Stack | 7 | 9.3% |
| Other | 20 | 26.7% |

The top 7 categories cover 55 of 75 problems (73%). Add in the "stack" patterns that substantially overlap with array traversal, and the top patterns cover essentially all the high-priority work. Dynamic Programming — often feared as a sprawling, complex domain — accounts for only 5 problems (7%).

Now look at NeetCode 150 ([S002](../../research/coding-algorithms-technical-interviews/01-sources/web/S002-neetcode-150-roadmap.md)): 18 categories, ordered from high-frequency foundations to low-frequency advanced patterns. The first six categories — Arrays & Hashing, Two Pointers, Sliding Window, Stack, Binary Search, Linked List — cover roughly half the problems and represent patterns with the densest real-world interview usage.

The convergence of these independently-constructed lists on similar distributions is not a coincidence. They were built from community interview reports at companies including Google, Meta, Amazon, Apple, and Microsoft. They reflect what interviewers actually ask.

## What this means in practice

The "template" framing is critical. Each of the 15–20 patterns can be learned as a reusable scaffold with a fixed structure and 2–5 problem-specific fill-in points. Two pointers has a left/right convergence loop. Sliding window has an expand-right/shrink-left loop. Binary search has a unified template with three modification points. Backtracking has a choose/recurse/unchoose scaffold.

This course teaches each pattern as a template. The learning objective for each module is not "understand this pattern conceptually" — it is "reproduce this template from memory and fill in the problem-specific parameters without looking it up."

You will also learn recognition signals: the problem features that indicate a given template applies. The combination of template recall and recognition signal is what allows rapid, reliable problem-solving under interview conditions.

The 20% of problems outside the core set — rare graph algorithms, advanced DP variants, geometric problems — are excluded from this course not because they are unimportant, but because they have poor return on investment for the vast majority of candidates. The final module addresses the gaps explicitly.

## Key points

- Approximately 15–20 algorithm templates are sufficient for 80%+ of FAANG-level coding interview problems — this is empirically validated across Blind 75, Grind 75, NeetCode 150, and TIH.
- The 6 highest-priority topic domains are: Arrays/Hashing, Trees, Graphs, Binary Search, Stacks/Sliding Window, and Two Pointers.
- The goal is not theoretical completeness — it is reliable pattern recognition and template execution under pressure.
- Dynamic Programming accounts for only 5–7% of problems on high-ROI study lists and should be deprioritised relative to the core patterns.
- The 20% remainder includes advanced patterns used for differentiation at senior/staff level and by Google specifically.

## Go deeper

- [S002](../../research/coding-algorithms-technical-interviews/01-sources/web/S002-neetcode-150-roadmap.md) — NeetCode 150 roadmap with full category ordering and problem counts
- [S021](../../research/coding-algorithms-technical-interviews/01-sources/web/S021-blind75-grind75-tech-interview-handbook.md) — Blind 75 and Grind 75 problem distributions with company-tier notes
- [S023](../../research/coding-algorithms-technical-interviews/01-sources/web/S023-algorithm-priority-tech-interview-handbook.md) — TIH priority matrix: High / Medium / Low topic ratings with explicit reasoning

---

*[Next lesson: The Empirically Validated Study Sequence](./L02-study-sequence.md) →*
