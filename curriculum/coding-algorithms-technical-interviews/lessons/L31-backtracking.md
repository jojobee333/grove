# Backtracking — Template, Pruning, and When It Applies

**Module**: M10 · Backtracking, Union-Find, and Remaining Interview Patterns
**Type**: core
**Estimated time**: 18 minutes
**Claim**: C3 from Strata synthesis

---

## The core idea

**Backtracking** is a systematic search through all possible solutions by exploring a decision tree: at each step, make a choice; recurse on the remaining problem; undo the choice when returning (the "backtrack" step). It's the go-to strategy when the problem asks for **all solutions** (permutations, combinations, subsets) and DP cannot reduce duplicated subproblems because the subproblems are not independent.

Backtracking's worst-case time is exponential (it explores all combinations), but the goal is to prune the search space to make it tractable within the given constraints. An unpruned backtracker that just TLEs is worth partial credit — a cleanly pruned one passes.

## The Core Template

```python
def backtrack(candidates, path, result, start_or_state):
    # Base case: found a complete solution
    if solution_complete(path):
        result.append(path[:])    # snapshot — path is mutable
        return
    
    for choice in generate_choices(candidates, start_or_state):
        if is_valid(choice, path):
            path.append(choice)                          # make choice
            backtrack(candidates, path, result, next_state)  # recurse
            path.pop()                                   # undo choice (backtrack)
```

The three phrases — make, recurse, undo — are invariant across all backtracking problems. The variations are in:
1. What constitutes a "complete solution"
2. What choices are available
3. What pruning conditions cut branches

## Permutations

"All permutations of a list of distinct integers."

```python
def permute(nums: list[int]) -> list[list[int]]:
    result = []
    
    def backtrack(path: list, remaining: list) -> None:
        if not remaining:
            result.append(path[:])    # complete permutation
            return
        for i, num in enumerate(remaining):
            path.append(num)
            backtrack(path, remaining[:i] + remaining[i+1:])
            path.pop()
    
    backtrack([], nums)
    return result
```

**Time**: O(n! × n) — n! permutations, each O(n) to copy.
**Space**: O(n) call stack depth (n levels of recursion).

**With used[] instead of remaining copy** (more efficient):
```python
def permute_efficient(nums: list[int]) -> list[list[int]]:
    result = []
    used = [False] * len(nums)
    
    def backtrack(path: list) -> None:
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i, num in enumerate(nums):
            if not used[i]:
                used[i] = True
                path.append(num)
                backtrack(path)
                path.pop()
                used[i] = False
    
    backtrack([])
    return result
```

No `remaining[:i] + remaining[i+1:]` allocation per step — just a boolean toggle.

## Combinations

"All combinations of k numbers from [1, n]."

```python
def combine(n: int, k: int) -> list[list[int]]:
    result = []
    
    def backtrack(start: int, path: list) -> None:
        if len(path) == k:
            result.append(path[:])
            return
        
        # Pruning: stop early if remaining numbers can't form k-length combo
        for i in range(start, n - (k - len(path)) + 2):    # key pruning
            path.append(i)
            backtrack(i + 1, path)
            path.pop()
    
    backtrack(1, [])
    return result
```

**The pruning condition**: `range(start, n - (k - len(path)) + 2)`. We need `k - len(path)` more elements. The last valid start position is `n - (k - len(path)) + 1` — there must be enough elements remaining to complete the combination. This prune reduces the loop iterations significantly.

## Combination Sum (With Repetition)

"Find all combinations of candidates that sum to target (each number can be used unlimited times)."

```python
def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    result = []
    candidates.sort()    # enables early termination
    
    def backtrack(start: int, path: list, remaining: int) -> None:
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                break    # pruning: sorted, so all subsequent are too big
            path.append(candidates[i])
            backtrack(i, path, remaining - candidates[i])    # i, not i+1 (allow reuse)
            path.pop()
    
    backtrack(0, [], target)
    return result
```

**Key pruning**: sorting allows `break` when `candidates[i] > remaining` — all subsequent candidates are also too large. Without this, the loop must check all remaining candidates.

## Subsets

"All subsets of a set."

```python
def subsets(nums: list[int]) -> list[list[int]]:
    result = []
    
    def backtrack(start: int, path: list) -> None:
        result.append(path[:])    # every partial path is a valid subset
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()
    
    backtrack(0, [])
    return result
```

For n elements: 2^n subsets. Every node in the recursion tree is a valid solution (not just the leaves).

## Pruning Strategies

| Technique | Effect | Applicable when |
|---|---|---|
| Sort candidates + break on overflow | Eliminates branches > remaining target | Combination sum, combination problems |
| `if len(path) < needed: return` | Early termination | Length-constrained problems |
| `used[]` array or bit mask | Prevents reuse | Permutations with distinct elements |
| Constraint propagation | Prune invalid states immediately | Sudoku, N-Queens |

## N-Queens — Constraint Pruning

The classic "hard" backtracking problem — place n queens on n×n board with no two attacking:

```python
def solve_n_queens(n: int) -> list[list[str]]:
    result = []
    cols = set()       # columns occupied
    diag1 = set()      # row - col (NW-SE diagonals)
    diag2 = set()      # row + col (NE-SW diagonals)
    board = [["." for _ in range(n)] for _ in range(n)]
    
    def backtrack(row: int) -> None:
        if row == n:
            result.append(["".join(r) for r in board])
            return
        for col in range(n):
            if col in cols or (row-col) in diag1 or (row+col) in diag2:
                continue                    # pruning: invalid placement
            cols.add(col)
            diag1.add(row-col)
            diag2.add(row+col)
            board[row][col] = "Q"
            backtrack(row + 1)
            board[row][col] = "."
            cols.remove(col)
            diag1.remove(row-col)
            diag2.remove(row+col)
    
    backtrack(0)
    return result
```

The `cols/diag1/diag2` sets perform O(1) conflict checking, pruning invalid placements immediately rather than checking the entire board.

## Key points

- Backtracking = make choice + recurse + undo (the three-phrase template).
- Always copy the path at solution nodes: `result.append(path[:])` — `path` is mutable and will change.
- Sort candidates and `break` (not `continue`) on overflow — eliminates entire branches for combination sum problems.
- "All permutations": use `used[]` flag to track available elements — O(n!) time is unavoidable.
- Pruning is what makes backtracking usable in practice — identify the invariant that eliminates branches.

## Go deeper

- [S016](../../research/coding-algorithms-technical-interviews/01-sources/web/S016-backtracking-patterns-tih.md) — TIH backtracking templates and pruning strategies
- [S003](../../research/coding-algorithms-technical-interviews/01-sources/web/S003-neetcode-roadmap.md) — NeetCode roadmap: backtracking problem progression (Subsets → Combinations → Permutations → N-Queens)

---

*← [Previous lesson](./L30-string-concat-trap.md)* · *[Next lesson: Union-Find — DSU Template](./L32-union-find.md) →*
