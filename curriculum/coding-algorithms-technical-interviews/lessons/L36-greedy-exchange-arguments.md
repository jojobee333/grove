# Greedy Algorithms — Exchange Arguments and Local Choice

**Module**: M10 · Backtracking, Union-Find, and Remaining Interview Patterns
**Type**: applied
**Estimated time**: 12 minutes
**Claim**: C17 from Strata synthesis

---

## The core idea

Greedy is not “pick what looks best right now and hope.” A greedy solution is credible only when the problem supports two things:

1. **Greedy-choice property** — making the locally best choice now does not block an optimal global solution.
2. **Optimal substructure** — after that choice, the remaining problem still has an optimal solution of the same form.

The standard correctness story is an **exchange argument**: start from an optimal solution, find the first place it differs from the greedy choice, swap in the greedy choice without making the solution worse, and repeat ([S036](../../research/coding-algorithms-technical-interviews/01-sources/web/S036-greedy-algorithm-wikipedia.md)).

## The canonical interview example: activity selection

When intervals overlap, pick the activity that finishes earliest. That leaves the most room for future compatible intervals.

```python
def max_activities(intervals: list[tuple[int, int]]) -> int:
	intervals.sort(key=lambda item: item[1])

	count = 0
	last_finish = float("-inf")

	for start, finish in intervals:
		if start > last_finish:
			count += 1
			last_finish = finish

	return count
```

**Time**: O(n log n) for sorting, then O(n) scan.

**Why earliest finish?** Because any later-finishing compatible interval leaves less remaining room. The exchange argument says that if an optimal schedule chose a later-finishing first interval, we can swap in the earlier-finishing greedy interval and never reduce how many intervals fit overall ([S037](../../research/coding-algorithms-technical-interviews/01-sources/web/S037-activity-selection-gfg.md)).

## Recognition cues

Greedy should come to mind when the prompt looks like one of these:

- choose the maximum number of non-overlapping items,
- always take the earliest finish / smallest cost / largest payoff item,
- sort first, then make one irreversible choice at a time,
- the local choice seems to preserve future flexibility.

That last point matters. Greedy is often really a **sort + scan** algorithm, not a raw local heuristic with no preprocessing.

## Greedy vs. DP quick test

- If you must explore multiple future branches because the local choice may block the optimum, think DP or search.
- If you can argue that one local choice is always safe and shrinks the same problem, think greedy.
- If the proof is missing, do not bluff: say the local rule is plausible, then test whether an exchange argument or invariant exists.

## Decision rules

- Treat greedy as a real interview category, not an afterthought.
- Look for greedy-choice property plus a short exchange/invariant argument before committing.
- If the problem only becomes clean after sorting, that is often part of the intended greedy solution.
- If the local rule cannot be justified, switch mental models before coding the full solution.

## Key points

- Greedy needs a proof burden: greedy-choice property, optimal substructure, and usually an exchange argument or invariant.
- Activity selection is the canonical interview example: sort by finish time, then repeatedly choose the next compatible interval.
- Many greedy solutions are really sort-and-scan algorithms.
- If you cannot justify the local rule, you probably do not have a greedy solution yet.

## Go deeper

- [S036](../../research/coding-algorithms-technical-interviews/01-sources/web/S036-greedy-algorithm-wikipedia.md) — greedy-choice property, optimal substructure, and exchange-argument proof shape
- [S037](../../research/coding-algorithms-technical-interviews/01-sources/web/S037-activity-selection-gfg.md) — earliest-finish interval scheduling as a canonical greedy template
- [S033](../../research/coding-algorithms-technical-interviews/01-sources/web/S033-dp-intro-cp-algorithms.md) — the DP source that explicitly contrasts greedy and DP reasoning

---

*← [Previous lesson](./L35-trie-basics.md)* · *Course complete — return to [course outline](../course.json)*