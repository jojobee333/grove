# Prefix Sums — O(n) Build, O(1) Query

**Module**: M03 · Linear Traversal Patterns — Arrays, Pointers, and Windows
**Type**: core
**Estimated time**: 30 minutes
**Claim**: C3 from Strata synthesis

---

## The core idea

A prefix sum array `prefix` transforms an array `nums` so that `prefix[i] = nums[0] + nums[1] + ... + nums[i]`. With this precomputed structure, the sum of any subarray `nums[l..r]` is answered in **O(1)** as `prefix[r] - prefix[l-1]`, instead of iterating from `l` to `r` in O(r-l+1).

Build once in O(n), query in O(1) — the classic read-heavy optimisation trade-off.

```python
def build_prefix(nums: list[int]) -> list[int]:
    prefix = [0] * (len(nums) + 1)        # prefix[0] = 0 sentinel makes indexing clean
    for i in range(len(nums)):
        prefix[i + 1] = prefix[i] + nums[i]
    return prefix

def range_sum(prefix: list[int], l: int, r: int) -> int:
    return prefix[r + 1] - prefix[l]      # sum of nums[l..r] inclusive
```

The off-by-one indexing with a leading 0 sentinel (`prefix[0] = 0`) is the standard approach — it avoids the special case of `l == 0` requiring a separate branch.

## Why it matters

Without prefix sums, answering k range-sum queries on an array of size n costs O(nk). With prefix sums, it costs O(n) to build + O(k) to answer all queries = O(n + k). For k >> 1 this is dramatically faster.

In interviews, prefix sums appear most often in:
- **Range Sum Query (LeetCode 303)**: multiple sum-of-range queries on a static array.
- **Subarray Sum Equals K (LeetCode 560)**: count subarrays with sum exactly k — cannot use sliding window because values can be negative.
- **Product of Array Except Self (LeetCode 238)**: uses prefix *products* instead of sums.
- **2D problems**: matrix subgraph sums for "max rectangle in binary matrix" and similar.

## The complement trick for "subarray sum equals K"

The most powerful application of prefix sums is counting subarrays with a target sum. The insight: `nums[l..r]` has sum k if and only if `prefix[r+1] - prefix[l] == k`, i.e., `prefix[l] == prefix[r+1] - k`.

Convert this to a complement-lookup problem:

```python
from collections import defaultdict

def subarray_sum(nums: list[int], k: int) -> int:
    count = 0
    prefix_sum = 0
    seen = defaultdict(int)
    seen[0] = 1                        # empty prefix (sum=0) seen once before any element

    for num in nums:
        prefix_sum += num
        complement = prefix_sum - k    # if we've seen `complement` before, there's a valid subarray
        count += seen[complement]
        seen[prefix_sum] += 1

    return count
```

**Trace through [1, 1, 1], k=2**:
- i=0: prefix_sum=1, complement=-1, seen[-1]=0, no count. seen={0:1, 1:1}
- i=1: prefix_sum=2, complement=0, seen[0]=1, count=1. seen={0:1,1:1,2:1}
- i=2: prefix_sum=3, complement=1, seen[1]=1, count=2. Final: 2 subarrays ([0:1], [1:2])

**Why not use a sliding window here?** Sliding window for variable sums requires that the window can only grow or only shrink — which requires non-negative values. With negative numbers, shrinking the window can *increase* the sum (removing a negative element). Prefix sum + hash map works for arbitrary (positive, negative, zero) values.

## Extension: 2D prefix sums

For matrix problems, build a 2D prefix sum table:

```python
def build_2d_prefix(matrix: list[list[int]]) -> list[list[int]]:
    m, n = len(matrix), len(matrix[0])
    prefix = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            prefix[i][j] = (matrix[i-1][j-1]
                          + prefix[i-1][j]
                          + prefix[i][j-1]
                          - prefix[i-1][j-1])   # inclusion-exclusion
    return prefix

def rect_sum(prefix, r1, c1, r2, c2):
    return (prefix[r2+1][c2+1]
          - prefix[r1][c2+1]
          - prefix[r2+1][c1]
          + prefix[r1][c1])               # add back the double-subtracted corner
```

The 2D case uses inclusion-exclusion: add top-left, subtract top-overlap and left-overlap, add back the doubly-subtracted corner.

## When prefix sums beat sliding window

| Condition | Use sliding window | Use prefix sums |
|---|---|---|
| All values non-negative | ✓ (shrink when too large) | ✓ (either works) |
| Values can be negative | ✗ (shrinking can increase sum) | ✓ (complement lookup) |
| Multiple range queries on static array | — | ✓ (build once, answer many) |
| Online updates to array | — | Use a Fenwick tree (advanced) |

## Product of Array Except Self

A clean interview application of prefix products — no division allowed:

```python
def product_except_self(nums: list[int]) -> list[int]:
    n = len(nums)
    result = [1] * n
    
    # Left pass: result[i] = product of all elements to the LEFT of i
    left_product = 1
    for i in range(n):
        result[i] = left_product
        left_product *= nums[i]
    
    # Right pass: multiply by product of all elements to the RIGHT of i
    right_product = 1
    for i in range(n - 1, -1, -1):
        result[i] *= right_product
        right_product *= nums[i]
    
    return result
```

**Time**: O(n). **Space**: O(1) extra (output array not counted).

## Key points

- Prefix sum: `prefix[i+1] = prefix[i] + nums[i]`; range sum `nums[l..r] = prefix[r+1] - prefix[l]` — always use the +1 sentinel for clean indexing.
- For "count subarrays with sum k": use prefix sum + complement hash map (`seen[prefix - k]`) — this handles negative values which sliding window cannot.
- Initialise `seen[0] = 1` before the loop — this accounts for subarrays starting from index 0.
- 2D prefix sums use inclusion-exclusion: add corner, subtract two sides, add back the doubly-subtracted overlap corner.
- Sliding window works for non-negative values only; prefix sums work for any values.

## Go deeper

- [S026](../../research/coding-algorithms-technical-interviews/01-sources/web/S026-array-cheatsheet-tih.md) — TIH array cheatsheet including prefix sum as one of 6 core array techniques

---

*← [Previous lesson](./L08-sliding-window.md)* · *[Next lesson: Sort Preprocessing](./L10-sort-preprocessing.md) →*
