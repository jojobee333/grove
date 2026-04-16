# Monotonic Stack — Next Greater Element and Range Queries

**Module**: M05 · Binary Search, Heaps, and Monotonic Stacks
**Type**: core
**Estimated time**: 16 minutes
**Claim**: C3 from Strata synthesis

---

## The core idea

A **monotonic stack** is a stack that maintains elements in a strictly increasing or decreasing order. As each new element arrives, elements that violate the monotone property are popped before the new element is pushed. This gives O(1) amortised cost per element (each element is pushed and popped at most once), so the entire algorithm runs in O(n) — compared to the O(n²) naive approach of checking every pair.

Monotonic stacks solve problems that ask, for each element, "what is the nearest element to the left/right that is greater/smaller?" This covers: Next Greater Element, histogram largest rectangle, rain water trapping, and stock span — a cluster of classic medium difficulty problems ([S025](../../research/coding-algorithms-technical-interviews/01-sources/web/S025-monotonic-stack-tih.md)).

## The Core Template

**Decreasing monotonic stack** (for "next greater element" problems — pops when a larger element arrives):

```python
def next_greater_element(nums: list[int]) -> list[int]:
    n = len(nums)
    result = [-1] * n                    # -1 if no greater element to the right
    stack = []                           # stores indices (not values)
    
    for i, val in enumerate(nums):
        # While stack has elements and the top is smaller than current val:
        # current element is the "next greater" for the top of stack
        while stack and nums[stack[-1]] < val:
            idx = stack.pop()
            result[idx] = val            # val is the next greater for nums[idx]
        stack.append(i)
    
    return result
```

**Trace** through `[2, 1, 5, 3, 2, 4]`:
- i=0 (2): stack empty → push 0. Stack: [0]
- i=1 (1): 1 < nums[0]=2, push 1. Stack: [0,1]
- i=2 (5): 5 > nums[1]=1 → pop 1, result[1]=5; 5 > nums[0]=2 → pop 0, result[0]=5; push 2. Stack: [2]
- i=3 (3): 3 < nums[2]=5, push 3. Stack: [2,3]
- i=4 (2): 2 < nums[3]=3, push 4. Stack: [2,3,4]
- i=5 (4): 4 > nums[4]=2 → pop 4, result[4]=4; 4 > nums[3]=3 → pop 3, result[3]=4; 4 < nums[2]=5, push 5. Stack: [2,5]

Result: `[5, 5, -1, 4, 4, -1]`. Remaining elements in stack have no next greater element (result stays -1).

**Why store indices, not values?** To write `result[idx] = val`. Values alone don't tell you which position to update.

## Variant: Circular Array

When the array wraps around (Next Greater Element II, LeetCode 503), simulate by iterating through the array twice:

```python
def next_greater_circular(nums: list[int]) -> list[int]:
    n = len(nums)
    result = [-1] * n
    stack = []
    
    for i in range(2 * n):               # iterate 0..2n-1
        while stack and nums[stack[-1]] < nums[i % n]:
            idx = stack.pop()
            result[idx] = nums[i % n]
        if i < n:                        # only push original indices
            stack.append(i)
    
    return result
```

The double pass ensures each element sees elements "after it" in the circular sense.

## Histogram Largest Rectangle

**Problem** (LeetCode 84): Given heights of bars in a histogram, find the largest rectangle that fits within the histogram.

**Key insight**: For each bar, the maximum rectangle using that bar as the shortest bar extends to the first shorter bar on each side. A monotonic increasing stack tracks "pending rectangles whose height has not yet been bounded on the right."

```python
def largest_rectangle_histogram(heights: list[int]) -> int:
    stack = []                           # strictly increasing stack of indices
    max_area = 0
    heights = heights + [0]             # sentinel 0 forces processing all remaining bars
    
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] >= h:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    
    return max_area
```

**The sentinel 0** at the end ensures the stack is fully flushed — when height 0 arrives, all remaining bars are popped and processed. Without it, bars remaining in the stack at the end need separate handling.

**Width calculation**: `width = i - stack[-1] - 1` — the bar extends from `(stack[-1] + 1)` to `(i - 1)` inclusive, because `stack[-1]` is the nearest bar to the left that is shorter (the left boundary) and `i` is the current bar that triggered the pop (the right boundary).

## Daily Temperatures / Stock Span

**Daily Temperatures** (LeetCode 739): For each day, find how many days until a warmer day.

```python
def daily_temperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    result = [0] * n
    stack = []                           # indices, decreasing temperatures
    
    for i, temp in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < temp:
            j = stack.pop()
            result[j] = i - j            # days between j and i
        stack.append(i)
    
    return result
```

The result at position j is simply `i - j` — the difference between current day and the day whose warmer-day we just found.

## Complexity

Every element is pushed exactly once and popped at most once:
- O(n) total push operations
- O(n) total pop operations
- **O(n) total time** (amortised O(1) per element, not O(log n))
- O(n) space for the stack

This is the key selling point: monotonic stack achieves the same result as brute-force O(n²) pairwise comparison, in linear time.

## When to recognise monotonic stack problems

Recognition signal: "For each element, find the nearest element to the left/right that is greater/smaller."

| Problem | Stack type | What gets popped when |
|---|---|---|
| Next Greater Element | Decreasing | Current > top |
| Next Smaller Element | Increasing | Current < top |
| Histogram Largest Rectangle | Increasing | Current < top (bar closes prior rectangles) |
| Trapping Rain Water | Decreasing | Current > top (right boundary found) |
| Stock Span | Decreasing | Current ≥ top |

## Key points

- Monotonic stack: maintain monotone order by popping violating elements before each push.
- Each element is pushed/popped at most once → O(n) total time, O(n) space.
- Store **indices** in the stack, not values — needed to record results and compute widths/distances.
- A sentinel `[0]` appended to histogram heights guarantees a complete flush without special-case code.
- Recognition pattern: "nearest greater/smaller to left/right" → monotonic stack.

## Go deeper

- [S025](../../research/coding-algorithms-technical-interviews/01-sources/web/S025-monotonic-stack-tih.md) — TIH monotonic stack cheatsheet: NGE, histogram, rain water, stock span

---

*← [Previous lesson](./L16-heap-top-k.md)* · *[Next lesson: Big-O Notation — Formal Definition and Growth Hierarchy](./L18-big-o.md) →*
