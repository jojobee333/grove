# Sliding Window — Fixed-Size and Variable-Size Templates

**Module**: M03 · Linear Traversal Patterns — Arrays, Pointers, and Windows
**Type**: core
**Estimated time**: 20 minutes
**Claim**: C3 from Strata synthesis

---

## The core idea

The sliding window maintains a contiguous subarray or substring that satisfies some condition, moving a right "boundary" forward and adjusting a left "boundary" as needed. The key insight is that the window state can be maintained **incrementally**: when the right boundary advances, you add one element; when the left boundary advances, you remove one element. Total work across all window adjustments is O(n), not O(n²) for re-computing the window from scratch each time.

Sliding window has exactly two variants: **fixed-size** (window width is constant) and **variable-size** (window expands and shrinks based on validity). Each has a distinct template. Knowing which recognition signal applies is half the work ([S016](../../research/coding-algorithms-technical-interviews/01-sources/web/S016-sliding-window-lc.md)).

## Fixed-Size Window

**Recognition signal**: "Find the maximum/minimum/average of all subarrays of length k."

**Template**:
```python
def max_sum_subarray(nums: list[int], k: int) -> int:
    if len(nums) < k:
        return 0
    
    # Build initial window of size k
    window_sum = sum(nums[:k])
    max_sum = window_sum
    
    # Slide: add right element, remove left element
    for i in range(k, len(nums)):
        window_sum += nums[i]           # add incoming element
        window_sum -= nums[i - k]       # remove outgoing element (left of window)
        max_sum = max(max_sum, window_sum)
    
    return max_sum
```

**Why O(n)**: Each element is added once (when right passes it) and removed once (when left passes it). Total operations: 2n.

**Canonical problems**: Maximum Average Subarray I (LeetCode 643), Number of Subarrays with Sum Equals K (use prefix sums instead — covered in L09).

## Variable-Size Window (Expand Right, Shrink Left)

**Recognition signal**: "Find the longest/shortest subarray or substring satisfying some condition."

**Template**:
```python
def length_of_longest_substring(s: str) -> int:
    char_count = {}           # window state: character frequencies
    left = 0
    max_len = 0
    
    for right in range(len(s)):          # expand window: add s[right]
        char_count[s[right]] = char_count.get(s[right], 0) + 1
        
        # Shrink window while constraint violated
        while char_count[s[right]] > 1:  # duplicate found
            char_count[s[left]] -= 1
            if char_count[s[left]] == 0:
                del char_count[s[left]]
            left += 1
        
        max_len = max(max_len, right - left + 1)
    
    return max_len
```

**The expand/shrink logic**:
1. **Expand**: always move `right` forward, adding the new character to the window state.
2. **Shrink**: use a `while` loop to move `left` forward *until the window is valid again*. Remove the character that `left` was pointing to from the window state before advancing.
3. **Record**: after shrinking, the window `[left, right]` is valid; record its length/answer.

**Common mistake**: using `if` instead of `while` for the shrink step. If multiple characters violate the constraint, `if` only removes one — you need `while` to keep going until valid.

## Variable-Size Window for String Matching

**Harder variant**: Minimum Window Substring (LeetCode 76) — find the smallest substring of `s` containing all characters of `t`.

```python
from collections import Counter

def min_window(s: str, t: str) -> str:
    if not t or not s:
        return ""
    
    need = Counter(t)              # required character frequencies
    have = {}                      # current window frequencies
    formed = 0                     # count of characters meeting their required frequency
    required = len(need)           # total distinct characters needed
    
    left = 0
    min_len = float("inf")
    result = ""
    
    for right in range(len(s)):
        c = s[right]
        have[c] = have.get(c, 0) + 1
        
        if c in need and have[c] == need[c]:
            formed += 1                # this character now fully satisfied
        
        # Shrink while window is valid (all characters satisfied)
        while formed == required:
            if right - left + 1 < min_len:
                min_len = right - left + 1
                result = s[left:right + 1]
            
            have[s[left]] -= 1
            if s[left] in need and have[s[left]] < need[s[left]]:
                formed -= 1            # losing a required character
            left += 1
    
    return result
```

**Pattern extension**: the variable-size window template generalises to:
- "Longest substring with at most K distinct characters" (LeetCode 340)
- "Max Consecutive Ones III" (sliding window of ones with at most K zeros)
- "Fruits Into Baskets" (longest subarray with at most 2 distinct values)

The only part that changes between these problems is the validity condition in the `while` shrink loop.

## Monotonic Deque: Sliding Window Maximum

A more advanced sliding window variant uses a **monotonic deque** to maintain the maximum element in the current window in O(1) per step.

**Problem**: Find the maximum of each window of size k.
**Naive**: O(nk) — scan each window. **With monotonic deque**: O(n).

```python
from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq = deque()               # stores indices; front is always the window maximum
    result = []
    
    for i in range(len(nums)):
        # Remove indices outside the current window
        if dq and dq[0] <= i - k:
            dq.popleft()
        
        # Remove indices of elements smaller than current (they can never be max)
        while dq and nums[dq[-1]] < nums[i]:
            dq.pop()
        
        dq.append(i)
        
        if i >= k - 1:                 # window is full
            result.append(nums[dq[0]])
    
    return result
```

**Why O(n)**: Each index is added to the deque once and removed once — total 2n operations.

This is a preview of the monotonic stack pattern (covered in detail in L17), applied to a sliding window context.

## Two-template recognition table

| Signal | Template | Time | Space |
|---|---|---|---|
| "max/min/avg of all subarrays of size k" | Fixed-size window | O(n) | O(1) |
| "longest/shortest substring with property X" | Variable-size, shrink while invalid | O(n) | O(k) |
| "window maximum/minimum efficiently" | Monotonic deque | O(n) | O(k) |

## Key points

- Fixed-size window: add one element on the right, remove one element on the left — O(n) total by amortised argument.
- Variable-size window: always expand right; use a `while` loop (not `if`) to shrink left until valid.
- The only problem-specific part is the validity condition — the structural template is always the same.
- Record the answer *after* shrinking, when `[left, right]` is guaranteed valid.
- The monotonic deque variant extends sliding window to track extremes in O(1) per step; it is a prerequisite for understanding the monotonic stack pattern.

## Go deeper

- [S016](../../research/coding-algorithms-technical-interviews/01-sources/web/S016-sliding-window-lc.md) — Sliding window LeetCode pattern guide with recognition signals for fixed vs. variable variants

---

*← [Previous lesson](./L07-two-pointer.md)* · *[Next lesson: Prefix Sums](./L09-prefix-sum.md) →*
