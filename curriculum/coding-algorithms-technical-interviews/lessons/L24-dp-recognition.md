# DP Recognition — Optimal Substructure and Overlapping Subproblems

**Module**: M08 · Dynamic Programming — The Three-Stage Pipeline
**Type**: core
**Estimated time**: 16 minutes
**Claim**: C9 from Strata synthesis

---

## The core idea

Dynamic programming solves problems by combining answers to **smaller subproblems**, reusing each subproblem's result rather than recomputing it. Two conditions must hold for DP to apply:

1. **Optimal substructure**: an optimal solution to the problem contains optimal solutions to its subproblems
2. **Overlapping subproblems**: the same subproblems are solved repeatedly in a naive recursive approach

If both hold, DP can reduce exponential naive recursion to polynomial time by memoising (or tabuliating) subproblem answers.

Recognising that a problem has these properties — before writing any DP code — is the most valuable interview skill this module teaches ([S033](../../research/coding-algorithms-technical-interviews/01-sources/web/S033-dp-intro-cp-algorithms.md), [S006](../../research/coding-algorithms-technical-interviews/01-sources/web/S006-dp-is-simple-safronov.md)).

## Optimal Substructure

**The formal test**: Does the optimal solution to problem P of size n always include optimal solutions to subproblems of size < n?

**Positive example — Shortest Path (Bellman-Ford / Dijkstra)**:
The shortest path from A to C through B consists of the shortest path from A to B plus the shortest path from B to C. You can't have a shorter A→C path that uses a non-shortest A→B segment.

**Negative example — Longest Simple Path**:
The longest simple path from A to C does NOT necessarily contain the longest simple path from A to some intermediate B. Taking a detour might be globally better, violating subproblem independence. Longest simple path is NP-hard — DP doesn't apply.

**Greedy algorithms also have this property** — the difference is that greedy makes locally optimal choices without exploring alternatives, while DP explores all (or memoises all explored) subproblem choices.

## Overlapping Subproblems

**The test**: If you draw the recursion tree for the problem, do you see the same subproblem computed multiple times at different nodes?

Fibonacci recursion tree:
```
fib(5)
├── fib(4)
│   ├── fib(3)
│   │   ├── fib(2)
│   │   └── fib(1)
│   └── fib(2)          ← fib(2) computed again
└── fib(3)              ← fib(3) computed again
    ├── fib(2)          ← fib(2) computed again
    └── fib(1)
```

`fib(2)` is computed 3 times. `fib(3)` twice. This exponential blowup collapses to O(n) with memoisation — each subproblem computed exactly once.

**No overlapping subproblems — Merge Sort**: Each recursive call operates on a distinct subarray. `merge_sort([4,2])` and `merge_sort([1,3])` solve different problems — no memoisation opportunity. This is divide-and-conquer, not DP.

## DP Recognition Checklist

Before writing code, ask:

1. **"Can I define this problem as a function of a smaller version of itself?"**
   - YES: the problem has recursive structure
2. **"Does the optimal answer for size n depend on optimal answers for smaller sizes?"**
   - YES: optimal substructure present
3. **"If I recurse naively, will the same sub-sizes appear multiple times?"**
   - YES: overlapping subproblems → use DP

If all three answer YES, DP is applicable.

## DP vs. greedy vs. divide-and-conquer

When you are unsure whether a problem is DP, compare the subproblem structure directly:

| Pattern | Subproblems overlap? | Local greedy choice safe? | Typical signal |
|---|---|---|---|
| DP | Yes | Not necessarily | same state reappears; need best value over many choices |
| Greedy | Often irrelevant | Yes, and you can justify it | sort-and-scan, earliest finish, local choice provably safe |
| Divide-and-conquer | No | No single local choice | split into independent halves and combine |

This table prevents a common interview mistake: seeing recursion and assuming the answer must be DP. Recursive structure alone is not enough.

**Common DP patterns by subproblem structure**:

| Problem class | Subproblem state | Typical shape |
|---|---|---|
| 1D array | `dp[i]` | "best ending at index i" |
| 2D grid | `dp[r][c]` | "min cost to reach (r,c)" |
| Two sequences | `dp[i][j]` | "answer for prefix i of seq1, prefix j of seq2" |
| Unbounded choices | `dp[i]` | "fewest coins for amount i" |
| Subsequences | `dp[i]` | "answer for first i elements" |

## Classic Problem — Climbing Stairs

"How many distinct ways to climb n stairs if you can take 1 or 2 steps at a time?"

**Recursive formulation**:
```python
def climb_stairs_naive(n: int) -> int:
    if n <= 2:
        return n
    return climb_stairs_naive(n-1) + climb_stairs_naive(n-2)    # O(2^n)
```

**Identify DP structure**:
- Optimal substructure: ways(n) = ways(n-1) + ways(n-2) — the recurrence itself IS the substructure
- Overlapping subproblems: ways(n-2) is computed by both ways(n-1) branch and directly

Both conditions met → DP applies. This is Fibonacci in disguise.

## Classic Problem — Coin Change

"Given coin denominations and an amount, find the minimum number of coins."

**Identify DP structure**:
- State: can we define f(amount) = minimum coins for `amount`?
- Recurrence: `f(amount) = min(f(amount - coin) + 1)` for each coin ≤ amount
- Optimal substructure: yes — you can't have a more optimal coin combo for a sub-amount and a worse global combo
- Overlapping: yes — multiple coin paths lead to the same amount

Both conditions met → DP. (This is a classic unbounded knapsack variant.)

## Classic Problem — Longest Common Subsequence

"Find the length of the longest subsequence common to two strings."

**State**: `dp[i][j]` = LCS length of `text1[:i]` and `text2[:j]`

**Recurrence**:
- If `text1[i-1] == text2[j-1]`: `dp[i][j] = dp[i-1][j-1] + 1`
- Else: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`

**Optimal substructure**: LCS for full strings contains LCS for prefixes. **Overlapping**: many (i,j) pairs share sub-computations.

Both met → 2D DP, O(n × m) time and space.

## What DP is NOT

- **Greedy**: makes one locally optimal choice at each step without reconsidering — no table needed
- **Divide and conquer**: splits into independent non-overlapping subproblems — no memoisation
- **Brute-force with memoisation on a non-DP problem**: if subproblems don't overlap, memoisation gives no speedup

## Key points

- DP requires two conditions: optimal substructure AND overlapping subproblems.
- Optimal substructure: optimal solution contains optimal solutions to subproblems.
- Overlapping subproblems: same sub-sizes appear repeatedly in naive recursion (unlike divide-and-conquer).
- The recognition checklist: "function of smaller self?" → "optimal answers compose?" → "sub-sizes repeat?" → use DP.
- Fibonacci, Coin Change, Climbing Stairs, LCS — all share this structure. Recognise the pattern in new problems before coding.

## Go deeper

- [S033](../../research/coding-algorithms-technical-interviews/01-sources/web/S033-dp-intro-cp-algorithms.md) — optimal substructure, overlapping subproblems, and DP state design
- [S006](../../research/coding-algorithms-technical-interviews/01-sources/web/S006-dp-is-simple-safronov.md) — the practical brute-force → memoisation → tabulation pipeline

---

*← [Previous lesson](./L23-bfs-dfs-space.md)* · *[Next lesson: Memoisation — Top-Down DP with Cache](./L25-memoization.md) →*
