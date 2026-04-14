# DP State Design — Defining the Right Subproblem

**Module**: M08 · Dynamic Programming — The Three-Stage Pipeline
**Type**: applied
**Estimated time**: 40 minutes
**Claim**: C9 from Strata synthesis

---

## The situation

Most DP bugs and design failures trace to one root cause: **the subproblem state is wrong**. Either it captures too little information (solutions can't be reconstructed from it) or too much (the state space explodes). Getting the state definition right is the skill that distinguishes someone who can solve LeetCode Hard DP from someone who only solves Medium.

## The State Design Process

**Step 1: What decision is made at each step?**
DP fills a table of decisions. At each cell, you're answering: "what's the optimal outcome if I'm at state s?"

**Step 2: What information must be known to make a decision?**
Everything that affects future decisions must be encoded in the state. If two situations have the same state but different optimal decisions ahead, the state is insufficient.

**Step 3: What is the minimum state?**
Fewer dimensions = smaller table = faster runtime. Remove state variables whose values can be inferred from others.

## Worked Example 1: House Robber

"Rob houses along a street (array). Adjacent houses can't both be robbed. Maximise total."

**Naive state attempt**: `dp[i]` = max money from first i houses.

**Does it work?** We need to know if house i-1 was robbed to decide whether to rob house i. If we only store the maximum, we can't tell. But:
- `dp[i] = max(dp[i-1], dp[i-2] + nums[i])` — we choose: don't rob house i (use dp[i-1]) OR rob house i (use dp[i-2] + nums[i]).

**The insight**: we don't need to know IF i-1 was robbed to compute dp[i] — we just need dp[i-1] (the best if we skip i) and dp[i-2] (the best two steps back, since we robbed something before that gap isn't adjacent). The state `dp[i]` IS sufficient here because the recurrence correctly handles the adjacency constraint.

```python
def rob(nums: list[int]) -> int:
    if len(nums) == 1:
        return nums[0]
    dp = [0] * len(nums)
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    for i in range(2, len(nums)):
        dp[i] = max(dp[i-1], dp[i-2] + nums[i])
    return dp[-1]
```

Optimised to O(1) space:
```python
def rob_optimised(nums: list[int]) -> int:
    prev2, prev1 = 0, 0
    for num in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + num)
    return prev1
```

## Worked Example 2: Longest Increasing Subsequence (LIS)

"Find the length of the longest strictly increasing subsequence."

**State attempt 1**: `dp[i]` = LIS length ending at index i.

**Recurrence**: `dp[i] = 1 + max(dp[j] for j < i if nums[j] < nums[i])`.

This works! Time O(n²), space O(n).

```python
def length_of_lis(nums: list[int]) -> int:
    n = len(nums)
    dp = [1] * n
    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)
```

Can LIS be solved in O(n log n)? Yes — using a patience sorting / binary search technique that maintains a "tails" array. But the DP formulation is more natural and is what most interviewers expect unless they ask for O(n log n).

## Worked Example 3: 0/1 Knapsack

"Given items with weights and values and a capacity, maximise value without exceeding capacity."

**State attempt 1**: `dp[i]` = max value with capacity i (no index dimension).

**Problem**: when we process each item, we need to know which items are already included. Without an item dimension, we'll accidentally reuse the same item.

**State attempt 2**: `dp[i][cap]` = max value using first i items with capacity cap.

**Recurrence**:
- Don't take item i: `dp[i][cap] = dp[i-1][cap]`
- Take item i (if weight[i] ≤ cap): `dp[i][cap] = dp[i-1][cap - weight[i]] + value[i]`
- `dp[i][cap] = max(both options)`

```python
def knapsack_01(weights: list[int], values: list[int], W: int) -> int:
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for cap in range(W + 1):
            dp[i][cap] = dp[i-1][cap]        # don't take item i
            if weights[i-1] <= cap:
                dp[i][cap] = max(dp[i][cap],
                                 dp[i-1][cap - weights[i-1]] + values[i-1])
    return dp[n][W]
```

**Space optimised to O(W)**: Critical change — iterate `cap` in **reverse** when using a 1D array, to prevent reusing item i in the same pass (0/1 constraint).
```python
def knapsack_01_optimised(weights: list[int], values: list[int], W: int) -> int:
    dp = [0] * (W + 1)
    for i in range(len(weights)):
        for cap in range(W, weights[i] - 1, -1):    # ← reverse iteration!
            dp[cap] = max(dp[cap], dp[cap - weights[i]] + values[i])
    return dp[W]
```

**Unbounded knapsack** (item can be reused): iterate `cap` **forward** — allows the same item to be used multiple times in one pass. This is exactly Coin Change.

## State Design Heuristics

| Pattern | State | Dimensions |
|---|---|---|
| Choose/skip each element | `dp[i]` or `dp[i][cap]` | 1D or 2D |
| Two sequences (LCS, edit distance) | `dp[i][j]` | 2D |
| Partition / "can split" | `dp[i]` boolean | 1D |
| State machine (buy/sell/hold) | `dp[i][state]` | 2D |
| Intervals (palindromes, burst balloons) | `dp[i][j]` | 2D by span |
| Grid path | `dp[r][c]` | 2D |

## Key State Design Mistakes

1. **Ambiguous state**: "maximum profit" — profit doing what exactly? Up to index i? Including today? Max on any single day?
2. **Missing dimension**: House Robber variant where cooldown exists (Stock with Cooldown) — need `dp[i][holding/not]` state machine
3. **Too many dimensions**: Track entire sequence in the state — exponential explosion

## Key points

- DP state = the minimum information needed to make an optimal decision at each step.
- If two situations have the same state but require different future decisions, the state is insufficient — add a dimension.
- 0/1 knapsack: 2D state `dp[i][cap]`; use reverse iteration when collapsing to 1D.
- Unbounded knapsack (Coin Change): 1D `dp[amount]`; forward iteration allows item reuse.
- State machine DP (Stock problems): add a dimension for the current "phase" (holding/not holding stock, cooldown).

## Go deeper

- [S012](../../research/coding-algorithms-technical-interviews/01-sources/web/S012-dp-patterns-neetcode.md) — NeetCode DP patterns: knapsack, state machine, interval DP with state design analysis
- [S011](../../research/coding-algorithms-technical-interviews/01-sources/web/S011-dynamic-programming-fundamentals.md) — DP state design principles and worked examples

---

*← [Previous lesson](./L26-tabulation.md)* · *[Next lesson: Python Hidden Costs — List, Dict, and String Traps](./L28-python-hidden-costs.md) →*
