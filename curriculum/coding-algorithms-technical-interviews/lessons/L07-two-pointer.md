# Two-Pointer Pattern — Four Canonical Variants

**Module**: M03 · Linear Traversal Patterns — Arrays, Pointers, and Windows
**Type**: core
**Estimated time**: 18 minutes
**Claim**: C3 from Strata synthesis

---

## The core idea

The two-pointer pattern uses two index variables pointing into a linear data structure (array, string, or linked list) and moves them according to a condition. Instead of a nested loop checking all O(n²) pairs, two pointers traverse the structure in O(n) by exploiting some structural property — usually sortedness, sequence ordering, or distance from ends.

Two pointers alone spans over 117 LeetCode problems ([S003](../../research/coding-algorithms-technical-interviews/01-sources/web/S003-two-pointers-100-days.md)), making it one of the densest single patterns in the problem set. Mastering the four canonical variants and their recognition signals is one of the highest-ROI investments in this curriculum.

## Variant 1: Left-Right Convergence

**When to use**: Finding a pair (or triplet after sorting) with a target property. Requires sorted input.

**Template**:
```python
def two_sum_sorted(numbers: list[int], target: int) -> list[int]:
    left, right = 0, len(numbers) - 1
    while left < right:
        s = numbers[left] + numbers[right]
        if s == target:
            return [left + 1, right + 1]    # 1-indexed per problem
        elif s < target:
            left += 1                        # need larger sum → move left right
        else:
            right -= 1                       # need smaller sum → move right left
    return []
```

**Why sorted input is required**: The correctness argument is a proof by invariant. Left pointer points to the smallest unresolved element; right pointer points to the largest. If their sum is too small, we need a larger element — the only option is left += 1. If it's too large, we need a smaller element — the only option is right -= 1. This logic breaks entirely if the array is not sorted.

**Canonical problems**: Two Sum II (sorted array), Container With Most Water, Three Sum (sort first, then left-right convergence for each fixed outer element).

## Variant 2: Fast-Slow (Floyd's Cycle Detection)

**When to use**: Detecting cycles in linked lists, finding the duplicate in an unsorted array, or finding the middle of a linked list.

**Template — cycle detection**:
```python
def has_cycle(head: ListNode) -> bool:
    slow, fast = head, head
    while fast and fast.next:
        slow = slow.next            # moves 1 step
        fast = fast.next.next       # moves 2 steps
        if slow == fast:
            return True             # they meet inside the cycle
    return False
```

**Template — find middle**:
```python
def find_middle(head: ListNode) -> ListNode:
    slow, fast = head, head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow                     # slow is at the middle when fast reaches the end
```

**Why it works (cycle detection)**: If there is a cycle, fast enters the cycle and slow follows. Fast gains one node per step on slow within the cycle. They will meet after at most cycle-length steps. If there is no cycle, fast reaches `None` and the loop exits.

**Canonical problems**: Linked List Cycle (LeetCode 141), Linked List Cycle II (find cycle start), Find the Duplicate Number, Middle of Linked List (LeetCode 876).

## Variant 3: Same-Direction (Shrink and Grow)

**When to use**: Removing duplicates; maintaining a valid section of processed elements; partitioning in-place.

**Template — remove duplicates in sorted array**:
```python
def remove_duplicates(nums: list[int]) -> int:
    if not nums:
        return 0
    slow = 0                              # slow = cursor for unique elements
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:      # found a new unique element
            slow += 1
            nums[slow] = nums[fast]       # write it into the next unique slot
    return slow + 1                       # length of unique section
```

Here slow trails fast, pointing to the rightmost unique element seen so far. Fast scans forward. When fast finds a new unique element, slow advances one step and records it.

**Template — Dutch national flag / 3-way partition**:
```python
def sort_colors(nums: list[int]) -> None:
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1; mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:                   # nums[mid] == 2
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1           # do NOT increment mid: newly swapped element not yet examined
```

**Canonical problems**: Remove Duplicates from Sorted Array (LeetCode 26), Move Zeroes (LeetCode 283), Sort Colors (LeetCode 75).

## Variant 4: Opposite-End Split (String/Array Based)

**When to use**: Palindrome checking, reversing in place, symmetric property verification.

**Template — is palindrome**:
```python
def is_palindrome(s: str) -> bool:
    # Filter to alphanumeric, lowercase
    filtered = [c.lower() for c in s if c.isalnum()]
    left, right = 0, len(filtered) - 1
    while left < right:
        if filtered[left] != filtered[right]:
            return False
        left += 1; right -= 1
    return True
```

**Why this is two-pointer**: Left starts from the first character, right from the last. They converge, comparing the character at each position. The loop terminates when they meet or cross — O(n).

**Expand-from-center palindrome** (used in Longest Palindromic Substring — a different variant):
```python
def longest_palindrome(s: str) -> str:
    def expand(left: int, right: int) -> str:
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1; right += 1
        return s[left + 1:right]         # last valid window
    
    result = ""
    for i in range(len(s)):
        odd = expand(i, i)               # odd-length palindromes
        even = expand(i, i + 1)          # even-length palindromes
        result = max(result, odd, even, key=len)
    return result
```

## Quick recognition guide

| Problem signal | Variant | Requires sorting? |
|---|---|---|
| "Find pair summing to X", "container with most water" | Left-right convergence | Yes (or sort first) |
| "Detect cycle in linked list", "find duplicate" | Fast-slow | No |
| "Remove duplicates in-place", "move zeroes to end" | Same-direction / slow-fast write | No (but input often sorted) |
| "Is palindrome", "reverse in place" | Opposite-end split | No |

## Key points

- Left-right convergence finds pairs meeting a target condition in O(n) on sorted arrays — the invariant argument proves correctness.
- Fast-slow (Floyd's) detects linked list cycles in O(n) time and O(1) space — no hash set needed.
- Same-direction (slow write / fast scan) removes duplicates or partitions arrays in-place without extra space.
- Opposite-end split checks symmetric properties (palindromes, balanced brackets) in O(n).
- All four variants run in O(n) time and O(1) extra space — the key advantage over naive O(n²) approaches.

## Go deeper

- [S003](../../research/coding-algorithms-technical-interviews/01-sources/web/S003-two-pointers-100-days.md) — Two-pointers interview patterns with 100+ problem examples and variant classification

---

*← [Previous lesson](./L06-hash-map-language-traps.md)* · *[Next lesson: Sliding Window](./L08-sliding-window.md) →*
