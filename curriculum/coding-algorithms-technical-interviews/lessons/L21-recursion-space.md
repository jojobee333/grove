# Space Complexity of Recursion — Call Stack Accounting

**Module**: M07 · Space Complexity and Recursion Depth
**Type**: core
**Estimated time**: 12 minutes
**Claim**: C5 from Strata synthesis

---

## The core idea

Every function call occupies a **stack frame**: local variables, parameters, return address. Recursive algorithms accumulate frames — the deepest recursion determines the maximum stack usage. Space complexity for recursive algorithms therefore includes both the **explicit data structures** you allocate and the **implicit call stack**.

Candidates frequently nail time complexity but understate space complexity by omitting the call stack. "O(1) extra space" is only correct for iterative solutions — a recursive solution that recurses to depth d uses O(d) stack space at minimum.

## What lives in a stack frame

```python
def factorial(n: int) -> int:
    if n <= 1:
        return 1
    return n * factorial(n - 1)    # recursive call; n-1 frame stacked below
```

Calling `factorial(5)` creates 5 frames stacked simultaneously:
```
factorial(5)
  factorial(4)
    factorial(3)
      factorial(2)
        factorial(1)   ← deepest frame; base case
```

Peak stack depth = n. Space: **O(n)** for the call stack alone, even though no list or dict is allocated.

If no tail-call optimisation is applied (Python does not do TCO), each frame stays alive until its child returns. The peak stack usage occurs at maximum recursion depth.

## Tree Recursion and Space

For a balanced binary tree with height h:

```python
def max_depth(node: TreeNode | None) -> int:
    if node is None:
        return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))
```

DFS on a tree recurses to depth h (the height). At any moment, only one path root-to-leaf is active on the call stack. Space = O(h).
- **Balanced BST**: h = O(log n) → O(log n) space
- **Skewed tree (linked list)**: h = O(n) → O(n) space

This is a common interview gotcha: "What's the space complexity?" Answer: "The call stack uses O(h) space where h is the tree height — O(log n) for balanced, O(n) worst case." Don't just say "O(1) extra" — there's no extra allocation, but the stack is not free.

## Fibonacci — Exponential Stack Frames (Warning Pattern)

Naive Fibonacci:
```python
def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
```

Time: O(2^n) — exponential tree. Space: **O(n)** — the maximum depth of the recursion tree is n (fib(n) → fib(n-1) → fib(n-2) → ... → fib(1)), not 2^n. At any point, only one root-to-leaf path is on the stack. However, the O(2^n) time makes this approach unusable for n > 35.

With memoisation (`@functools.lru_cache`), time drops to O(n) and space becomes O(n) for the memo dict plus O(n) call stack at depth n — total O(n) space.

## Recursion vs. Iteration: Space Trade-offs

| Approach | Time | Stack space | Extra space |
|---|---|---|---|
| Recursive DFS tree (balanced) | O(n) | O(log n) | O(1) |
| Recursive DFS tree (skewed) | O(n) | O(n) | O(1) |
| Iterative DFS with explicit stack | O(n) | O(1) | O(h) stack data structure |
| Recursive memoised Fibonacci | O(n) | O(n) | O(n) memo |
| Iterative DP Fibonacci | O(n) | O(1) | O(n) or O(1) (rolling) |

Converting recursion to iteration eliminates the call stack overhead but substitutes it with an explicit stack data structure — same asymptotic cost, but avoids language-level recursion limits.

## Space Complexity of Merge Sort

```python
def merge_sort(arr: list[int]) -> list[int]:
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)
```

- **Time**: O(n log n) — log n levels, O(n) merge per level
- **Space call stack**: O(log n) — maximum recursion depth
- **Space auxiliary**: O(n) — temporary arrays for merge

Total space: O(n). The call stack is O(log n) but the auxiliary merge arrays dominate. When textbooks say "merge sort is O(n) extra space", they mean both the auxiliary and the call stack combined.

## Tail Recursion and Python

**Tail recursion**: when the recursive call is the last operation in a function — no pending computation after it returns. Languages like Scheme automatically optimise tail calls to use O(1) stack space. Python does NOT perform tail-call optimisation.

```python
# This looks tail-recursive but Python won't optimise it
def sum_list(lst: list[int], acc: int = 0) -> int:
    if not lst:
        return acc
    return sum_list(lst[1:], acc + lst[0])    # tail call — but Python still stacks frames
```

For Python, if recursion depth is a concern (n > ~1000), convert to iterative explicitly.

## The Correct Space Complexity Statement

When asked "What is the space complexity?", state both components:
- **Auxiliary space**: data structures explicitly allocated (arrays, hash maps, etc.)
- **Call stack space**: O(recursion depth)
- **Total**: max(auxiliary, call stack) or sum if both are significant

Example: recursive DFS on a graph with V vertices, E edges, depth O(V):
- Auxiliary space: O(V) visited set + O(V+E) graph
- Call stack: O(V)
- **Total: O(V + E)**

## Key points

- Recursive algorithms use O(recursion depth) stack space in addition to any explicit data structures.
- Tree DFS space: O(h) where h is tree height — O(log n) balanced, O(n) skewed.
- Iterative solutions eliminate call stack overhead but may need an explicit stack data structure of the same size.
- Python has no tail-call optimisation — every recursive call adds a frame regardless of call position.
- State both auxiliary and call stack components when reporting space complexity in interviews.

## Go deeper

- [S005](../../research/coding-algorithms-technical-interviews/01-sources/web/S005-mit-6006-fall2011.md) — MIT 6.006 on recursion, call stacks, and space complexity
- [S004](../../research/coding-algorithms-technical-interviews/01-sources/web/S004-mit-6006-spring2020.md) — MIT 6.006 advanced data structures and space analysis

---

*← [Previous lesson](./L20-amortized-analysis.md)* · *[Next lesson: Python Recursion Limit — Practical Fixes](./L22-python-recursion-limit.md) →*
