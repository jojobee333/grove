# Memoisation — Top-Down DP with Cache

**Module**: M08 · Dynamic Programming — The Three-Stage Pipeline
**Type**: applied
**Estimated time**: 35 minutes
**Claim**: C9 from Strata synthesis

---

## The situation

Once you've recognised that a problem has optimal substructure and overlapping subproblems (L24), the first DP implementation strategy is **memoisation**: add a cache to a recursive solution so each subproblem is computed at most once.

Memoisation is "top-down DP" — you start from the original problem and recurse downward, caching results as you go. It is often the quickest path from correct brute-force recursion to efficient DP, especially when not all subproblems are needed.

## The Three-Step Memoisation Pattern

1. Write the brute-force recursive solution (correct but slow)
2. Identify the unique state that determines each subproblem
3. Add a cache keyed on that state

**Brute force (Fibonacci):**
```python
def fib_brute(n: int) -> int:
    if n <= 1:
        return n
    return fib_brute(n-1) + fib_brute(n-2)    # O(2^n)
```

**With memoisation:**
```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib_memo(n: int) -> int:
    if n <= 1:
        return n
    return fib_memo(n-1) + fib_memo(n-2)      # O(n) time, O(n) space
```

`@lru_cache(maxsize=None)` (or `@cache` in Python 3.9+) adds automatic caching keyed on all function arguments. After first call to `fib_memo(k)`, subsequent calls return the cached value in O(1).

## `lru_cache` vs. Manual Dictionary

Both are correct; `lru_cache` is more concise for interviews:

```python
# Manual cache — more explicit, same performance
def fib_manual(n: int, memo: dict = {}) -> int:
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib_manual(n-1, memo) + fib_manual(n-2, memo)
    return memo[n]
```

**Important**: using a mutable default argument (`memo: dict = {}`) means the cache persists across function calls. In LeetCode where the function is called multiple times, this can cause incorrect results. Safer patterns:
```python
# Safe mutable default approaches:
# 1. Use @lru_cache — manages own cache, cleared on object deletion
# 2. Pass memo as a class attribute
# 3. Use @cache at class method level
```

For interview coding, `@lru_cache(maxsize=None)` on a nested function or module-level function is idiomatic and safe.

## Coin Change — Top-Down DP

```python
from functools import lru_cache

def coin_change_memo(coins: list[int], amount: int) -> int:
    @lru_cache(maxsize=None)
    def dp(remaining: int) -> int:
        if remaining == 0:
            return 0
        if remaining < 0:
            return float('inf')      # impossible
        return 1 + min(dp(remaining - c) for c in coins)
    
    result = dp(amount)
    return result if result != float('inf') else -1
```

**State**: `remaining` — the amount still to cover. There are `amount + 1` distinct states, each computed once → O(amount × len(coins)) time, O(amount) space.

## Word Break — Top-Down DP

```python
from functools import lru_cache

def word_break(s: str, wordDict: list[str]) -> bool:
    words = set(wordDict)
    
    @lru_cache(maxsize=None)
    def can_break(start: int) -> bool:
        if start == len(s):
            return True
        for end in range(start + 1, len(s) + 1):
            if s[start:end] in words and can_break(end):
                return True
        return False
    
    return can_break(0)
```

**State**: `start` — the index from which we're trying to segment. There are n distinct states, each looping over O(n) end positions → O(n²) time and O(n) cache space.

## Complexity of Memoised DP

**Time**: (number of unique states) × (work per state, excluding recursive calls)
**Space**: (number of unique states) for the cache + recursion stack depth

| Problem | States | Work/state | Total time | Cache space | Stack |
|---|---|---|---|---|---|
| Fibonacci | O(n) | O(1) | O(n) | O(n) | O(n) |
| Coin Change | O(amount) | O(coins) | O(amount × coins) | O(amount) | O(amount) |
| LCS | O(n × m) | O(1) | O(n × m) | O(n × m) | O(n + m) |

The stack space is the recursion depth of the top-down calls — for 1D DP, this is O(n). This is the main disadvantage vs. tabulation (bottom-up), which uses O(1) stack.

## When to Use Memoisation vs. Tabulation

| Criterion | Memoisation (top-down) | Tabulation (bottom-up) |
|---|---|---|
| Natural to write | ✅ — just add cache to recursion | ❌ — must determine fill order |
| Only solves needed subproblems | ✅ — sparse access possible | ❌ — fills entire table |
| Stack overhead | ❌ — O(n) call stack | ✅ — O(1) stack |
| Space optimisation (rolling array) | ❌ — cache hard to reduce | ✅ — easy to reduce to O(1) or O(n) |
| Python recursion limit risk | ❌ — may hit 1000-frame limit | ✅ — no recursion |

Recommendation for interviews:
- Start with memoisation (quicker to code, easier to reason about)
- If asked "can you optimise space?" → switch to tabulation with rolling array

## Key points

- Memoisation = brute-force recursion + cache on subproblem state.
- `@lru_cache(maxsize=None)` is idiomatic Python for top-down DP. Use `@cache` in Python 3.9+.
- Time complexity = (unique states) × (work per state). State count is usually O(n), O(n × m), or O(amount).
- Top-down DP uses O(recursion depth) stack space — can hit Python's 1000-frame limit for large n.
- Prefer tabulation when space optimisation is needed or when recursion depth is a concern.

## Go deeper

- [S011](../../research/coding-algorithms-technical-interviews/01-sources/web/S011-dynamic-programming-fundamentals.md) — DP with memoisation pattern, worked examples across problem families
- [S012](../../research/coding-algorithms-technical-interviews/01-sources/web/S012-dp-patterns-neetcode.md) — NeetCode DP patterns: 1D, 2D, and unbounded knapsack

---

*← [Previous lesson](./L24-dp-recognition.md)* · *[Next lesson: Tabulation — Bottom-Up DP and Space Optimisation](./L26-tabulation.md) →*
