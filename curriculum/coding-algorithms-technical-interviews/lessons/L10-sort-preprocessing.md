# Sort Preprocessing — Unlock Binary Search and Two Pointers

**Module**: M03 · Linear Traversal Patterns — Arrays, Pointers, and Windows
**Type**: applied
**Estimated time**: 12 minutes
**Claim**: C14 from Strata synthesis

---

## The situation

You encounter a problem that involves finding pairs, ranges, or relationships among array elements — and the brute-force is O(n²). Before reaching for a hash map, ask one question first: **does the problem permit sorting the input?**

When input order is irrelevant to the answer (the problem asks about elements, not positions), sorting in O(n log n) often unlocks a clean O(n) or O(log n) downstream algorithm. The net cost — O(n log n) total — beats O(n²) brute force and is often simpler than the hash map alternative.

The sort-preprocessing heuristic: **if order doesn't matter, sort first** ([S026](../../research/coding-algorithms-technical-interviews/01-sources/web/S026-array-cheatsheet-tih.md), [S030](../../research/coding-algorithms-technical-interviews/01-sources/web/S030-sorting-searching-tih.md)).

## When it applies

After sorting:
- **Two pointers become correct**: sorted array allows the left-right convergence invariant to hold.
- **Binary search becomes possible**: sorted values satisfy the monotonicity condition binary search requires.
- **Duplicates become adjacent**: deduplication or duplicate detection becomes O(n) instead of O(n² ).
- **Greedy passes become valid**: many greedy problems require sorted input to prove the greedy choice is optimal.

Sorting itself is O(n log n) for Python's Timsort, Java's Timsort for objects / Dual-Pivot Quicksort for primitives, and JavaScript's V8 Timsort. The constant factors are small — sorting a 10⁵-element array takes milliseconds.

## Three Sum — the canonical example

**Brute force**: three nested loops = O(n³). **Sort first + two pointers**: O(n²) with O(n log n) overhead — net O(n²).

```python
def three_sum(nums: list[int]) -> list[list[int]]:
    nums.sort()                            # O(n log n) preprocessing
    result = []
    
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue                        # skip duplicate outer element
        
        # Two-pointer convergence for the remaining pair
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                result.append([nums[i], nums[left], nums[right]])
                while left < right and nums[left] == nums[left + 1]:
                    left += 1              # skip duplicate left
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1             # skip duplicate right
                left += 1; right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1
    
    return result
```

**Why sorting enables this**: With a sorted array, the two-pointer correctness argument holds (Variant 1 from L07). Without sorting, there is no cheap way to decide which pointer to advance — you would need to check all pairs for the complement, reverting to O(n²).

## Finding Intervals — Merge Overlapping Intervals

Sort by start time → merge in a single linear pass:

```python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    intervals.sort(key=lambda x: x[0])    # O(n log n) sort by start
    merged = [intervals[0]]
    
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:          # overlaps with last merged interval
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    
    return merged
```

Without sorting, detecting overlaps requires checking all O(n²) interval pairs. After sorting by start, only adjacent intervals can overlap — one linear scan suffices.

## Sorting as a binary search prerequisite

Sorted arrays are a precondition for binary search (covered in L15). The recognition signal: "sorted input → first check whether binary search applies" ([S030](../../research/coding-algorithms-technical-interviews/01-sources/web/S030-sorting-searching-tih.md)).

If the problem doesn't give sorted input but you need binary search: sort first (O(n log n)), then binary search (O(log n) per query). Net cost O(n log n + k log n) for k queries — beats O(nk) brute force when k is large.

## When sort preprocessing does NOT apply

Sorting is irrelevant or harmful when:
1. **The problem requires preserving original indices** (which pairs, "return indices", "original positions"). Sorting loses index information. Use a hash map instead.
2. **The input is a stream** — you cannot sort elements that have not arrived yet. Use a heap for dynamic ordering.
3. **O(n) is achievable without sorting** — if a linear-time algorithm exists (e.g., counting sort for bounded integers), sorting adds unnecessary log-factor overhead.

The UMPIRE Match step helps: if the problem says "return the indices of the two numbers" (Two Sum), sort-preprocessing is out — use complement lookup. If it says "return the three numbers" (Three Sum), sorting is in.

## Recognising sort-eligible problems

| Problem asks for | Sort applies? |
|---|---|
| "Return the values" / "return count" | ✓ Usually yes |
| "Return the indices" | ✗ Sorting destroys original positions |
| "K closest elements" | ✓ Sort by distance, take first K |
| "Longest consecutive sequence" | ✗ Use hash set — sorting is O(n log n) but O(n) exists |
| "Merge / detect overlap in intervals" | ✓ Sort by start, linear merge |
| "Group anagrams" | ✓ Sort each string as key; group by canonical key |

## Key points

- Sort preprocessing converts O(n²) brute force to O(n log n) when downstream work is O(n) (two pointers) or O(n log n) (binary search).
- The condition: problem asks for values (not indices), and input order is irrelevant to the answer.
- Sorting makes duplicates adjacent (deduplication becomes O(n)), satisfies two-pointer invariants, and enables binary search.
- Do NOT sort when the problem requires returning original indices — sort on `(value, original_index)` pairs if you need both.
- The trade-off: sorting costs O(n log n); it is worth it when it replaces an O(n²) or worse downstream algorithm.

## Go deeper

- [S026](../../research/coding-algorithms-technical-interviews/01-sources/web/S026-array-cheatsheet-tih.md) — TIH array cheatsheet with the "sort first" heuristic explicitly stated
- [S030](../../research/coding-algorithms-technical-interviews/01-sources/web/S030-sorting-searching-tih.md) — TIH sorting and searching cheatsheet with "sorted input → binary search" signal

---

*← [Previous lesson](./L09-prefix-sum.md)* · *[Next lesson: Tree Traversal Templates](./L11-tree-traversal.md) →*
