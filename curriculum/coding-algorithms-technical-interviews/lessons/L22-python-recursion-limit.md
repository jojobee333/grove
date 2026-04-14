# Python Recursion Limit — Practical Fixes for Deep Recursion

**Module**: M07 · Space Complexity and Recursion Depth
**Type**: applied
**Estimated time**: 25 minutes
**Claim**: C5 from Strata synthesis

---

## The situation

Python's default recursion limit is 1000 frames. If your recursive algorithm's depth exceeds this, Python raises `RecursionError: maximum recursion depth exceeded`. Common triggers in LeetCode / competitive programming:

- DFS or BFS on a grid with 10⁵+ cells
- DFS on a tree with n=10⁵ nodes that could be a degenerate linked list
- Recursive DP where n=10³ and base case is n=0

This lesson covers three practical fixes and when to use each.

## Diagnosing the Problem

A deep recursion error on a tree/graph problem is almost always because:
1. The input is larger than assumed (skewed tree, chain-like graph)
2. Your recursive solution is missing an iterative alternative

Run Python with a small contrived input to verify recursion depth:
```python
import sys
print(sys.getrecursionlimit())    # default 1000
```

## Fix 1: Temporarily Increase the Limit

The quickest fix — works for local testing, sometimes acceptable in contest environments:

```python
import sys
sys.setrecursionlimit(300000)     # increase to 300,000 frames

def dfs(node):
    # ...
```

**Caveats**:
- Increasing the limit does not increase the OS stack size. The actual stack size limit is determined by the OS (typically 8MB on Linux). Approximately 1 frame ≈ 200-400 bytes, so 8MB ≈ ~20,000-40,000 frames in practice.
- Setting limit to 10⁶ does not actually give you 10⁶ usable frames — you may hit a segfault (OS stack overflow) before Python's limit fires.
- **Not recommended on production code**. Acceptable quick fix for competitive programming only.

## Fix 2: Convert to Iterative with Explicit Stack

The robust fix — eliminates the recursion limit entirely:

**Recursive DFS (risks limit):**
```python
def dfs_recursive(node: TreeNode | None) -> int:
    if node is None:
        return 0
    return 1 + max(dfs_recursive(node.left), dfs_recursive(node.right))
```

**Iterative equivalent using explicit stack:**
```python
def max_depth_iterative(root: TreeNode | None) -> int:
    if root is None:
        return 0
    
    stack = [(root, 1)]               # (node, depth)
    max_d = 0
    
    while stack:
        node, depth = stack.pop()
        max_d = max(max_d, depth)
        if node.left:
            stack.append((node.left, depth + 1))
        if node.right:
            stack.append((node.right, depth + 1))
    
    return max_d
```

The `stack` list here lives on the heap (Python's memory), not the OS call stack. It can grow to millions of elements without hitting any recursion limit.

**When to prefer this fix**: Any time input constraints allow degenerate tree depth (n ≤ 10⁵ and no guarantee of balance).

## Fix 3: Python Stack Size Manipulation (Advanced)

For competitive programming where you need recursion and large depth — run the recursive code in a new thread with a larger stack size:

```python
import sys
import threading

def solve():
    sys.setrecursionlimit(500000)
    # ... your recursive solution here
    result = dfs(root)
    print(result)

# Run solve() in a thread with 256MB stack
thread = threading.Thread(target=solve)
thread.daemon = True
thread.start()
thread.join()
```

`threading.stack_size(256 * 1024 * 1024)` sets the stack size for new threads. New threads get their own OS stack, separate from the main thread's stack. This effectively gives you a larger call stack for deep recursion.

**Warning**: This pattern is rarely needed. Use iterative DFS (Fix 2) first — it is cleaner and more portable.

## Recognising When Recursion Depth is a Risk

Check these conditions before writing a recursive solution:
1. **n > 1000** and the recursion depth is proportional to n (e.g., tree height, DFS depth in worst case)
2. **Tree problems with no balance guarantee** — a binary tree of n nodes can be a chain of depth n
3. **Grid DFS on large grids** — a 300×300 grid could cause 90,000-deep recursion

When in doubt: write iterative.

## Comparison Table

| Fix | Where stack lives | Limit | Best for |
|---|---|---|---|
| `sys.setrecursionlimit(n)` | Call stack (OS) | ~20,000-40,000 real | Quick tests, small depth |
| Explicit stack list | Heap | Millions | Production, interviews |
| Thread with large stack | New thread's OS stack | Hours / GB | Contest programming only |

## Key points

- Python's default recursion limit is 1000. Exceeding it raises `RecursionError`.
- `sys.setrecursionlimit(n)` raises the Python-level limit but doesn't expand the OS stack — real limit is ~20,000-40,000 frames before segfault.
- The correct fix is converting to iterative DFS with an explicit stack list (lives on heap, not call stack).
- Thread-based stack increase is available for competitive programming but rarely needed in interviews.
- For tree/graph problems with n ≤ 10⁵ and no balance guarantee, always use iterative DFS.

## Go deeper

- [S022](../../research/coding-algorithms-technical-interviews/01-sources/web/S022-python-time-complexity-wiki.md) — Python time/space complexity reference with language-specific constraints

---

*← [Previous lesson](./L21-recursion-space.md)* · *[Next lesson: BFS vs DFS Space — Queue vs Stack Trade-offs](./L23-bfs-dfs-space.md) →*
