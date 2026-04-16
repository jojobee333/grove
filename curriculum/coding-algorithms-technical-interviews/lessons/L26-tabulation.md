# Tabulation — Bottom-Up DP and Space Optimisation

**Module**: M08 · Dynamic Processing — The Three-Stage Pipeline
**Type**: applied
**Estimated time**: 18 minutes
**Claim**: C9 from Strata synthesis

---

## The situation

Tabulation is "bottom-up DP": you fill a table iteratively, starting from base cases and building up to the final answer. It eliminates recursion entirely — no call stack, no recursion limit risk, and it opens the door to space optimisation using rolling arrays.

## The Core Tabulation Pattern

```python
# Pattern: fill dp array from base case forward
def coin_change_tabulation(coins: list[int], amount: int) -> int:
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0                              # base case: 0 coins needed for amount 0
    
    for a in range(1, amount + 1):
        for coin in coins:
            if a - coin >= 0:
                dp[a] = min(dp[a], dp[a - coin] + 1)
    
    return dp[amount] if dp[amount] != float('inf') else -1
```

**Time**: O(amount × len(coins)) — same as memoised version.
**Space**: O(amount) — one 1D array, no call stack.
**Key**: the inner loop updates `dp[a]` based on previously computed `dp[a - coin]` — guaranteed already filled since `a - coin < a` and we iterate `a` in increasing order.

## Determining Fill Order

The most important step in tabulation: **ensure dependencies are filled before they're needed**.

For 1D DP where `dp[i]` depends on `dp[j]` for all `j < i`: iterate forward (0 to n).
For longest palindromic subsequence where `dp[i][j]` depends on `dp[i+1][j-1]`: iterate by span length (short spans before long spans).

**General rule**: draw the dependency arrows first. Fill in opposite direction of arrows.

## Fibonacci — Tabulation with Space Optimisation

```python
# Full table O(n) space
def fib_table(n: int) -> int:
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]

# Space-optimised to O(1)
def fib_optimised(n: int) -> int:
    if n <= 1:
        return n
    prev2, prev1 = 0, 1
    for _ in range(2, n + 1):
        prev2, prev1 = prev1, prev1 + prev2
    return prev1
```

The observation: `dp[i]` only looks at `dp[i-1]` and `dp[i-2]` — only two previous values matter. Replacing the full array with two variables reduces space from O(n) to O(1) with no change to time complexity.

## Climbing Stairs — O(1) Space

```python
def climb_stairs(n: int) -> int:
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
```

Same rolling two-variable pattern as Fibonacci. O(n) time, O(1) space.

## Unique Paths (Grid DP) — Rolling Row

Grid DP: `dp[r][c]` = number of paths from (0,0) to (r,c) moving only right or down.

```python
# Full 2D table — O(m × n) space
def unique_paths_2d(m: int, n: int) -> int:
    dp = [[1] * n for _ in range(m)]
    for r in range(1, m):
        for c in range(1, n):
            dp[r][c] = dp[r-1][c] + dp[r][c-1]
    return dp[m-1][n-1]

# Rolling row — O(n) space
def unique_paths_rolling(m: int, n: int) -> int:
    dp = [1] * n                           # represents previous row
    for r in range(1, m):
        for c in range(1, n):
            dp[c] += dp[c-1]               # dp[c] += dp[c-1] because dp[r][c] = dp[r-1][c] + dp[r][c-1]
    return dp[n-1]
```

The rolling row observation: `dp[r][c]` depends on `dp[r-1][c]` (above, stored as `dp[c]` before update) and `dp[r][c-1]` (left, `dp[c-1]` after update). The single row array is reused, reducing space from O(m × n) to O(n).

## Longest Common Subsequence — 2D to O(min(n,m)) Space

```python
# Full 2D — O(n × m) space
def lcs_2d(text1: str, text2: str) -> int:
    n, m = len(text1), len(text2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[n][m]

# Rolling two rows — O(m) space
def lcs_rolling(text1: str, text2: str) -> int:
    n, m = len(text1), len(text2)
    prev = [0] * (m + 1)
    
    for i in range(1, n + 1):
        curr = [0] * (m + 1)
        for j in range(1, m + 1):
            if text1[i-1] == text2[j-1]:
                curr[j] = prev[j-1] + 1
            else:
                curr[j] = max(prev[j], curr[j-1])
        prev = curr
    return prev[m]
```

## Space Optimisation Decision Tree

```
Can dp[i] be computed from just dp[i-1] (and constants)?
  YES → use two variables (O(1) space) — Fibonacci, Climbing Stairs
  NO ↓

Can dp[r][c] be computed from only dp[r-1][:] and dp[r][0..c-1]?
  YES → rolling row (O(n) or O(m) space) — Unique Paths, LCS
  NO → need full table or creative restructuring
```

## Tabulation vs. Memoisation Summary

| Property | Tabulation (bottom-up) | Memoisation (top-down) |
|---|---|---|
| Stack overhead | None (iterative) | O(recursion depth) |
| Space optimisable | ✅ Rolling array easy | ❌ Cache hard to prune |
| Sparse subproblems | ❌ Fills entire table | ✅ Only computes needed |
| Code complexity | Higher (fill order) | Lower (add @lru_cache) |
| Python recursion risk | None | Yes (> 1000 depth) |

## Key points

- Tabulation fills a dp table iteratively from base cases; no recursion, no stack overhead.
- Fill order must respect dependencies: compute `dp[i]` after all `dp[j]` it depends on.
- Rolling array optimisation: when `dp[i]` only depends on the previous row/value, discard earlier rows.
- 1D DP with two-step lookback → O(1) space (Fibonacci pattern).
- 2D DP where each row uses only the previous row → O(n) space (rolling row).

## Go deeper

- [S012](../../research/coding-algorithms-technical-interviews/01-sources/web/S012-dp-patterns-neetcode.md) — NeetCode DP patterns: 1D, 2D grid DP, unbounded knapsack with tabulation
- [S011](../../research/coding-algorithms-technical-interviews/01-sources/web/S011-dynamic-programming-fundamentals.md) — DP tabulation fill order derivation

---

*← [Previous lesson](./L25-memoization.md)* · *[Next lesson: DP State Design — Defining the Right Subproblem](./L27-dp-state-design.md) →*
