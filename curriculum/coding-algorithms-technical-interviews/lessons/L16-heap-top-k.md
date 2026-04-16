# Heap and Top-K Pattern

**Module**: M05 · Binary Search, Heaps, and Monotonic Stacks
**Type**: core
**Estimated time**: 15 minutes
**Claim**: C3 from Strata synthesis

---

## The core idea

A **heap** (priority queue) is a complete binary tree that maintains the heap property: in a min-heap, every parent is smaller than its children. The minimum element is always at the root, accessible in O(1). Inserting or removing the minimum takes O(log n) by bubbling up or down.

The **top-K pattern** is the canonical interview application: find the K largest (or smallest) elements from a collection of n elements in O(n log K) — faster than sorting all n elements (O(n log n)) when K is small.

## Python Heaps — `heapq`

Python only provides a min-heap via the `heapq` module:

```python
import heapq

# Building a heap
nums = [3, 1, 4, 1, 5, 9, 2, 6]
heapq.heapify(nums)                    # O(n) in-place — NOT O(n log n)
print(nums[0])                         # minimum element — O(1)

# Push and pop
heapq.heappush(nums, 7)                # O(log n)
minimum = heapq.heappop(nums)          # O(log n) — removes and returns minimum

# Push then pop (more efficient than separate push+pop)
result = heapq.heappushpop(nums, 7)    # pushes 7, pops minimum — O(log n)

# K largest / K smallest
k_smallest = heapq.nsmallest(k, nums)  # O(n log k)
k_largest = heapq.nlargest(k, nums)    # O(n log k)
```

**Why `heapify` is O(n)**: Building a heap bottom-up processes nodes from the lowest non-leaf level upward. The mathematical analysis (geometric series of sifting costs per level) gives total cost T(n) = O(n) — a non-obvious but provable result from MIT 6.006 ([S004](../../research/coding-algorithms-technical-interviews/01-sources/web/S004-mit-6006-spring2020.md)).

**Max-heap in Python**: Negate values. `heapq` only provides min-heap; negate all values to simulate a max-heap.
```python
max_heap = [-x for x in nums]
heapq.heapify(max_heap)
maximum = -heapq.heappop(max_heap)    # negate back to get original value
```

## The Top-K Pattern

**Problem**: Find the K largest elements from array `nums`.

**Naive**: sort descending → take first K = O(n log n).
**Heap approach**: maintain a size-K min-heap = O(n log K). For large n and small K, this is substantially faster.

**Template — K largest elements**:
```python
def top_k_largest(nums: list[int], k: int) -> list[int]:
    min_heap = []                          # keeps the K largest seen so far
    
    for num in nums:
        heapq.heappush(min_heap, num)
        if len(min_heap) > k:
            heapq.heappop(min_heap)        # discard the smallest of the K+1
    
    return min_heap                        # contains K largest elements (unordered)
```

**Why a min-heap for K largest?** The min-heap's root is the smallest element in our "top K so far" buffer. When a new element arrives that is larger than this minimum, we pop the minimum and push the new element in. The invariant: our heap always contains the K largest elements seen so far. At the end, the heap contains exactly the K largest.

**Kth largest element** (the single Kth largest, not all K):
```python
import heapq

def find_kth_largest(nums: list[int], k: int) -> int:
    return heapq.nlargest(k, nums)[-1]    # O(n log k) — simplest correct answer

# Or maintain size-k min-heap manually:
def find_kth_largest_manual(nums: list[int], k: int) -> int:
    heap = nums[:k]
    heapq.heapify(heap)
    for num in nums[k:]:
        if num > heap[0]:
            heapq.heapreplace(heap, num)  # heapreplace is slightly faster than pop+push
    return heap[0]
```

**Canonical problems**: Kth Largest Element in an Array (LeetCode 215), Top K Frequent Elements (LeetCode 347), K Closest Points to Origin (LeetCode 973).

## Top K Frequent Elements — Combining Heap with Frequency Map

A classic heap + hash map combination:

```python
from collections import Counter

def top_k_frequent(nums: list[int], k: int) -> list[int]:
    freq = Counter(nums)                   # O(n) frequency map
    # nlargest by frequency value
    return [num for num, _ in Counter(nums).most_common(k)]  # O(n log k)

# Manual equivalent:
def top_k_frequent_manual(nums: list[int], k: int) -> list[int]:
    freq = Counter(nums)
    # Build min-heap of (frequency, element); keep K largest by frequency
    heap = []
    for num, count in freq.items():
        heapq.heappush(heap, (count, num))
        if len(heap) > k:
            heapq.heappop(heap)            # remove lowest-frequency element
    return [num for _, num in heap]
```

**Bucket sort alternative for O(n)**: If frequencies are bounded by n, use bucket sort indexed by frequency — O(n) time and space. This is the optimal solution when asked to avoid sorting.

```python
def top_k_frequent_bucket(nums: list[int], k: int) -> list[int]:
    freq = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]  # bucket[i] = elements with freq i
    for num, count in freq.items():
        buckets[count].append(num)
    
    result = []
    for i in range(len(buckets) - 1, 0, -1):      # iterate from highest freq
        for num in buckets[i]:
            result.append(num)
            if len(result) == k:
                return result
    return result
```

## When heap beats sorting

| Scenario | Heap O(n log K) | Sort O(n log n) | Heap wins when |
|---|---|---|---|
| K = n | O(n log n) | O(n log n) | Tied |
| K = 1 (min/max) | O(n) | O(n log n) | Always |
| K = 10, n = 10⁶ | O(10⁶ × log 10) ≈ 3×10⁶ | O(10⁶ × 20) = 2×10⁷ | K << n |
| K = n/2 | O(n log n/2) ≈ O(n log n) | O(n log n) | Roughly tied |

For K substantially smaller than n, heap dominates. For K close to n, just sort.

## Complexity Summary

| Operation | Time |
|---|---|
| heapify (build) | O(n) |
| heappush | O(log n) |
| heappop | O(log n) |
| Peek minimum (heap[0]) | O(1) |
| Top-K using size-K heap | O(n log K) |

## Key points

- Python `heapq` is a min-heap only — negate values to simulate a max-heap.
- `heapify` is O(n) (not O(n log n)) — bottom-up heap construction via geometric series argument.
- Top-K largest: maintain a **size-K min-heap**; evict the minimum when size exceeds K — heap[0] is the Kth largest at the end.
- Top K Frequent: combine Counter frequency map (O(n)) with size-K heap (O(n log K)); or use bucket sort for O(n).
- Heap beats sort when K << n; use `heapq.nlargest(k, iterable)` for a clean one-liner.

## Go deeper

- [S024](../../research/coding-algorithms-technical-interviews/01-sources/web/S024-heap-priority-queue-tih.md) — TIH heap and priority queue cheatsheet with top-K pattern and interview problems

---

*← [Previous lesson](./L15-binary-search.md)* · *[Next lesson: Monotonic Stack](./L17-monotonic-stack.md) →*
