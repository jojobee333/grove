# Unified Binary Search Template — Three Modification Points

**Module**: M05 · Binary Search, Heaps, and Monotonic Stacks
**Type**: core
**Estimated time**: 18 minutes
**Claim**: C3 from Strata synthesis

---

## The core idea

Binary search finds a target in a sorted structure in O(log n) by repeatedly halving the search space. The naive "find exact element" version is straightforward, but interview problems rarely ask for that. They ask for things like "first bad version", "minimum element in rotated array", "search insert position" — variants that require careful boundary handling.

There are exactly three modification points in a unified binary search template ([S009](../../research/coding-algorithms-technical-interviews/01-sources/web/S009-binary-search-template-lc.md)):
1. The midpoint calculation
2. The condition that decides which half to keep
3. Whether the loop terminates at `<` or `<=`

Memorise one template, understand the three modification points, and all binary search variants reduce to fills-in rather than new algorithms.

## The Unified Template

```python
def binary_search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    
    while lo <= hi:                            # [lo, hi] inclusive
        mid = lo + (hi - lo) // 2             # avoids integer overflow vs (lo + hi) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1                       # target in right half
        else:
            hi = mid - 1                       # target in left half
    
    return -1                                  # not found
```

**The overflow fix**: `(lo + hi) // 2` can overflow in languages with fixed-width integers (Java, C). Python has arbitrary-precision integers so it never overflows, but `lo + (hi - lo) // 2` is the portable habit.

## Variant 1: Find Leftmost Boundary (First True)

Many problems reduce to: "find the leftmost position where condition(x) is True" — first occurrence of a value, minimum k satisfying some property, first bad version.

```python
def find_leftmost(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums)              # hi = len, not len-1 — one past end
    
    while lo < hi:                     # lo < hi (not <=) — loop exits when lo == hi
        mid = lo + (hi - lo) // 2
        if nums[mid] < target:
            lo = mid + 1               # target must be to the right
        else:
            hi = mid                   # mid could be the answer; keep it in range
    
    return lo                          # lo == hi; this is the leftmost valid position
```

**Invariant**: At termination, `lo == hi` and points to the leftmost position where `nums[x] >= target`. Check if `nums[lo] == target` to confirm the element exists.

**Canonical problem**: First Bad Version (LeetCode 278) — the `isBadVersion(v)` call is the condition function.

## Variant 2: Find Rightmost Boundary (Last True)

```python
def find_rightmost(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    result = -1
    
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            result = mid               # record this; keep searching right
            lo = mid + 1
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    
    return result                      # last occurrence of target
```

## Variant 3: Search in Rotated Array

Array `[4,5,6,7,0,1,2]` is a sorted array rotated at some pivot. Binary search still works because at least one half is always sorted:

```python
def search_rotated(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        
        # One half is always sorted
        if nums[lo] <= nums[mid]:      # left half is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1          # target in sorted left half
            else:
                lo = mid + 1
        else:                          # right half is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1          # target in sorted right half
            else:
                hi = mid - 1
    
    return -1
```

## Binary Search on the Answer Space

The most powerful generalisation: binary search over **possible answers**, not array indices. When you can define a monotone predicate on the answer space, binary search finds the boundary.

**Pattern recognition**: "Find the minimum/maximum X such that Y is achievable" or "Given resources, can you achieve X? Find the largest X for which yes."

**Example: Koko Eating Bananas (LeetCode 875)**

- Answer space: eating speed `k` ∈ [1, max(piles)]
- Predicate: `can_finish(k, h)` — can Koko eat all bananas at speed k in h hours?
- The predicate is monotone: if `can_finish(k)` is True, then `can_finish(k+1)` is also True
- Find: minimum k where `can_finish(k)` is True → leftmost-True binary search

```python
import math

def min_eating_speed(piles: list[int], h: int) -> int:
    def can_finish(k: int) -> bool:
        return sum(math.ceil(p / k) for p in piles) <= h
    
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if can_finish(mid):
            hi = mid               # mid could be the answer; don't exclude it
        else:
            lo = mid + 1           # too slow; need higher speed
    return lo
```

**Time**: O(n log(max_pile)) — O(log) iterations, each O(n) for the sum.

Other answer-space binary search problems: Capacity to Ship Packages (1011), Minimum Number of Days to Make m Bouquets (1482), Split Array Largest Sum (410).

## The three-question checklist

Before implementing binary search, verify:
1. **Is the search space sorted (or monotone)?** Binary search requires a clear ordering — values or a predicate.
2. **Which variant?** Exact match (`lo <= hi`, return -1), leftmost-True (`lo < hi`, `hi = mid`), or rightmost-True.
3. **What does `lo` represent at termination?** For `lo < hi` variants, `lo == hi` at exit — verify the invariant holds.

## Key points

- Midpoint calculation: always use `lo + (hi - lo) // 2` — avoids integer overflow in fixed-width languages.
- `lo <= hi` with `return -1` → exact match. `lo < hi` with `hi = mid` → leftmost boundary. Know which to use before writing.
- Binary search on the answer space applies whenever a monotone predicate can be defined on a numeric range — "minimum speed", "minimum capacity", "maximum profit".
- Search in rotated array: identify the sorted half first, then check if target falls in it.
- The loop condition (`<` vs `<=`) and the boundary update (`hi = mid` vs `hi = mid - 1`) are the two places where bugs concentrate — derive them from the invariant, not from trial-and-error.

## Go deeper

- [S009](../../research/coding-algorithms-technical-interviews/01-sources/web/S009-binary-search-template-lc.md) — unified binary search template with three variant forms and modification points

---

*← [Previous lesson](./L14-topological-sort.md)* · *[Next lesson: Heap and Top-K Pattern](./L16-heap-top-k.md) →*
