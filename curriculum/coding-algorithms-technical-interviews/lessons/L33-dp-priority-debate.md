# The DP-First vs. Greedy-First Debate

**Module**: M10 · Backtracking, Union-Find, Debates, and Gaps
**Type**: debate
**Estimated time**: 25 minutes
**Claim**: C9 from Strata synthesis

---

## The debate

When you see a problem that could be solved by either greedy or dynamic programming, which should you reach for first? Two camps exist in the competitive programming and interview community:

**Camp 1 — Greedy-First**: Start with greedy. It's simpler to code, often O(n) or O(n log n), and if a greedy solution is correct, you're done faster. Only switch to DP if you can construct a counterexample that breaks the greedy approach.

**Camp 2 — DP-First**: Start with DP. It's always correct for problems with optimal substructure — the only question is efficiency. Write the memoised recursion first, then optimise if needed. Greedy requires a correctness proof (exchange argument, matroid theory) that you often can't construct under interview pressure.

Both positions are defended by practitioners. Understanding each camp's reasoning helps you navigate the choice in real interviews ([S011](../../research/coding-algorithms-technical-interviews/01-sources/web/S011-dynamic-programming-fundamentals.md), [S012](../../research/coding-algorithms-technical-interviews/01-sources/web/S012-dp-patterns-neetcode.md)).

## The Case for Greedy-First

**1. Greedy is faster to code**: For problems like interval scheduling (LeetCode 435), activity selection, and Jump Game, the greedy solution is 5-10 lines. The equivalent DP is 15-25 lines.

**2. Greedy often has better time complexity**: Coin change greedily (for canonical coin systems) is O(n log n). The DP solution is O(amount × coins). For amount = 10⁶, the difference matters.

**3. The counterexample test is fast**: For many greedy candidates, you can construct a counterexample in 30 seconds or confirm there isn't one. If greedy holds, you've found the optimal approach quickly.

**The Greedy Correctness Pattern (Exchange Argument)**:
> "Suppose the optimal solution does NOT include the greedy choice. I can modify the optimal solution to include the greedy choice without making it worse — therefore a greedy solution also achieves the optimum."

For interval scheduling (minimum number of intervals to remove to make non-overlapping), sort by end time, greedily keep the interval that ends earliest. Exchange argument: any optimal solution can be transformed to the greedy solution step by step without increasing cost.

**Problems where greedy is provably correct**:
- Interval scheduling / activity selection
- Jump Game I (can you reach the end?)
- Gas Station (can you complete the circuit?)
- Assign Cookies
- Task Scheduler (conceptually greedy)

## The Case for DP-First

**1. Greedy fails silently**: The classic counterexample — coin change with non-canonical denominations (e.g., coins = [1, 3, 4], amount = 6). Greedy: 4 + 1 + 1 = 3 coins. DP: 3 + 3 = 2 coins. Greedy is wrong, and it's easy to miss without trying counterexamples.

**2. Proving greedy correctness is hard under pressure**: Exchange argument proofs require careful construction. Under interview time pressure, you might convince yourself a greedy is correct when it isn't.

**3. DP correctness is mechanical**: If you've verified optimal substructure, DP gives the right answer by construction — no proof needed beyond "this recurrence is correct."

**Problems where greedy fails — DP is required**:
- Coin change (non-canonical denominations)
- Word Breaking
- Longest Increasing Subsequence
- 0/1 Knapsack (fractional knapsack is greedy, but 0/1 is DP)
- Edit distance

## The Empirical Decision Framework

Rather than committing to one camp, use this heuristic:

**Step 1**: Does the problem ask for "minimum number of something" or "maximum profit"?
→ Both DP and greedy are candidates.

**Step 2**: Try a greedy approach. Mentally (or explicitly) try 2-3 counterexamples:
→ If you find a counterexample in under 60 seconds: use DP.
→ If you can't find a counterexample and the exchange argument feels solid: use greedy.

**Step 3**: If uncertain, code DP first. You can always describe the greedy optimisation afterward if asked.

## Jump Game I vs. Jump Game II

These two problems illustrate the debate concretely:

**Jump Game I** (LeetCode 55): Can you reach the last index? Each element is max jump length.
```python
# Greedy — O(n), correct
def can_jump(nums: list[int]) -> bool:
    max_reach = 0
    for i, jump in enumerate(nums):
        if i > max_reach:
            return False        # can't reach here
        max_reach = max(max_reach, i + jump)
    return True
```

Greedy is provably correct: track the farthest reachable index. No DP approach beats this.

**Jump Game II** (LeetCode 45): Minimum number of jumps. This is trickier — a naive greedy of "always jump to the farthest reachable" is correct but requires careful implementation.

The greedy solution for Jump Game II is O(n) and works — but the O(n²) DP solution is substantially easier to reason about. Interviewers accepting either approach.

## Synthesis: The Practical Interview Answer

1. **For competitive programming**: greedy-first, since incorrect solutions are immediately falsified by the judge
2. **For interviews**: DP-first for correctness, then mention the greedy optimisation if it exists — it signals deeper understanding
3. **When asked "can you do better than your DP?"**: this is usually the cue to discuss a greedy or O(n log n) optimisation

## Key points

- Greedy-first is faster to code and often more efficient, but requires a correctness argument (exchange argument).
- DP-first is slower to code but mechanically correct once the recurrence is right — no proof required.
- Classic greedy failures: coin change with non-canonical coins, 0/1 knapsack — use DP for these.
- Classic greedy successes: interval scheduling (sort by end), Jump Game (max reach tracking) — greedy clearly correct.
- Practical interview advice: attempt greedy, quickly test 2-3 counterexamples, switch to DP if any fail or if you can't confirm the exchange argument.

## Go deeper

- [S011](../../research/coding-algorithms-technical-interviews/01-sources/web/S011-dynamic-programming-fundamentals.md) — when DP and greedy overlap, and how to distinguish them
- [S012](../../research/coding-algorithms-technical-interviews/01-sources/web/S012-dp-patterns-neetcode.md) — problem catalog: which NeetCode problems use greedy vs. DP

---

*← [Previous lesson](./L32-union-find.md)* · *[Next lesson: Coverage Gaps — What This Course Does Not Cover](./L34-coverage-gaps.md) →*
