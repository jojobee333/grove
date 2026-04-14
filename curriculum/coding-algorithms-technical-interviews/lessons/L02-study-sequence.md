# The Empirically Validated Study Sequence

**Module**: M01 · The Interview Algorithm Landscape
**Type**: core
**Estimated time**: 25 minutes
**Claim**: C11 from Strata synthesis

---

## The core idea

Four independently-constructed study resources — NeetCode 150, Blind 75, Grind 75, and the Tech Interview Handbook priority matrix — all converge on nearly the same topic ordering. This is not a coincidence. Each resource was built from real interview data at top companies, and the fact that they independently arrive at the same sequence is strong evidence that the ordering reflects genuine **difficulty dependencies** in the algorithm problem space.

The sequence, from first to last, is:

1. **Arrays and Hashing** — foundational; used in nearly every other topic
2. **Two Pointers and Sliding Window** — require sorted/ordered arrays; depend on array fluency
3. **Binary Search** — requires sorted input; benefits from two-pointer intuition
4. **Linked Lists** — pointer manipulation; distinct from arrays but at similar difficulty
5. **Trees (DFS/BFS)** — recursion as primary tool; depend on pointer fluency
6. **Heaps and Stacks** — array-backed priority structures; build on tree intuition
7. **Graphs (DFS/BFS)** — tree traversal generalised to cyclic structures
8. **Backtracking** — DFS with an explicit undo step; builds on graph DFS
9. **Dynamic Programming** — backtracking with memoisation; last because it builds on everything

This is a dependency DAG, not just an arbitrary preference. Binary search requires sorted arrays (covered in step 1–2). Tree DFS requires recursive intuition (developed through step 1–4). Graph BFS/DFS is tree traversal generalised (requires step 5). Backtracking is DFS with state management (requires step 7). DP is backtracking with memoisation (requires step 8).

## Why it matters

Following this sequence means every new topic builds on a solid foundation. Trying to learn DP before you can write a reliable DFS is like trying to run before you can walk — each stumble will feel like a DP problem but will actually be a recursion problem in disguise.

The sequence also optimises for **interview ROI**. Topics earlier in the sequence cover more interview problems per hour of study time. Spending your first 10 hours on arrays, hashing, and two pointers will make you competitive for a significant fraction of real interviews. Spending your first 10 hours on advanced DP will prepare you for a small fraction of rare problems.

For the "apply practically" goal — being able to solve real LeetCode and interview problems confidently — the sequence maps almost exactly to difficulty and frequency ordering on LeetCode itself. Array and hashing problems are typically Easy to Medium. DP problems are typically Medium to Hard. Going in sequence means you build confidence with wins before encountering harder problems.

## The academic vs. community sequence

The MIT 6.006 curriculum ([S004](../../research/coding-algorithms-technical-interviews/01-sources/web/S004-mit-6006-spring2020.md)) uses a different ordering: hashing → trees → heaps → shortest paths → DP. This is theory-first — it introduces data structures before applications, and covers completeness over interview-optimised selection. It is the correct approach for a 6-month deep-learning track.

The community sequence (NeetCode, Blind 75) is practical-first — it introduces the most commonly tested patterns first, deferring low-frequency patterns. It is the correct approach for a 1–3 month interview sprint.

**The choice between them depends on your time horizon.** If you have 3+ months, consider mixing both: use the community sequence for topic order but study the underlying theory from MIT materials. If you have 4–8 weeks, follow the community sequence strictly.

This course follows the interview-optimised community sequence.

## Hash maps as the cross-cutting thread

One pattern appears at every stage of the sequence: the hash map.

- Arrays: Two Sum uses a complement hash map
- Two Pointers/Sliding Window: frequency hash maps for character counts
- Trees: memoisation table is a hash map keyed by node or index
- Graphs: adjacency lists are hash maps of lists
- Backtracking: visited set is a hash map
- DP: memoisation dictionary

Mastering hash maps in module M02 — immediately after this orientation module — is intentional. Hash maps are the enabling technology for almost every subsequent pattern. Strong hash map fluency pays dividends in every topic you touch afterwards.

## A practical 8-week schedule

Based on the learner profile (1 hour/session, 4–5 sessions/week, apply-practically goal):

| Week | Modules | Focus |
|---|---|---|
| 1 | M01, M02 | Orientation + Hash Maps |
| 2 | M03 | Linear Patterns + Two Pointers + Sliding Window |
| 3 | M04 | BFS/DFS + Trees |
| 4 | M05, M06 | Binary Search, Heaps, Stacks + Complexity Analysis |
| 5 | M07 | Space Complexity + Recursion |
| 6 | M08 | Dynamic Programming pipeline |
| 7 | M09 | Language-Specific Traps |
| 8 | M10 | Backtracking + Debates + Gaps + Review |

Add buffer weeks for practice problems between heavy modules — practice solidifies templates faster than re-reading lessons.

## Key points

- The empirically optimal study order is: Arrays/Hashing → Two Pointers/Sliding Window → Binary Search → Linked Lists → Trees → Heaps/Stacks → Graphs → Backtracking → DP.
- This sequence reflects genuine difficulty dependencies — each topic depends on fluency with the previous ones.
- The academic (MIT) sequence and the community sequence cover the same topics in different orders; choose based on your time horizon.
- Hash maps appear at every stage; mastering them early has multiplicative benefit across the entire curriculum.
- For a 1–3 month sprint, follow the community sequence and prioritise the first 6 topics before advancing.

## Go deeper

- [S002](../../research/coding-algorithms-technical-interviews/01-sources/web/S002-neetcode-150-roadmap.md) — NeetCode 150 full category ordering with estimated problem counts per category
- [S023](../../research/coding-algorithms-technical-interviews/01-sources/web/S023-algorithm-priority-tech-interview-handbook.md) — TIH priority matrix showing High / Medium / Low categorisation with explicit reasoning

---

*← [Previous lesson](./L01-templates-pareto-principle.md)* · *[Next lesson: The UMPIRE Interview Communication Framework](./L03-umpire-framework.md) →*
