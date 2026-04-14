# Frequency Counting, Complement Lookup, and Index-as-Key

**Module**: M02 · Hash Maps — The Universal Speed-Up
**Type**: applied
**Estimated time**: 40 minutes
**Claim**: C13 from Strata synthesis

---

## The situation

You know hash maps provide O(1) lookups. The next step is recognising *which type of hash map pattern* applies to a given problem. Three patterns appear across a large fraction of FAANG interview problems involving arrays and strings: **frequency counting**, **complement lookup**, and **index-as-key**. Mastering all three — including the exact implementation shape — gives you a toolkit that solves a significant percentage of Easy and Medium array problems.

## Pattern 1: Frequency Counting

**Recognition signal**: You need to count occurrences of elements, detect duplicates, or check if two collections have the same element frequencies.

**Template**:
```python
from collections import Counter

# Build frequency map from any iterable
freq = Counter(iterable)          # or defaultdict(int) + loop

# Check if two strings are anagrams
def is_anagram(s: str, t: str) -> bool:
    return Counter(s) == Counter(t)        # O(n) time, O(1) space (26 chars)

# Manual version (what Counter does internally)
def is_anagram_manual(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    for c in t:
        freq[c] = freq.get(c, 0) - 1
        if freq[c] < 0:
            return False              # t has more of char c than s
    return True
```

**Why it works**: Instead of sorting both strings — O(n log n) — we count character frequencies in O(n) and compare. For 26-character lowercase strings, the space is O(1).

**Canonical problem**: Valid Anagram (LeetCode 242). Also appears in: Group Anagrams, Find the Duplicate, Top K Frequent Elements.

**Variation — sliding window with frequency map** (covered in full in the Sliding Window lesson):
```python
# Maintain character counts for a variable-size window
window = {}
for c in window_chars:
    window[c] = window.get(c, 0) + 1
# When shrinking window:
window[c] -= 1
if window[c] == 0:
    del window[c]                     # keep window map clean
```

## Pattern 2: Complement Lookup

**Recognition signal**: Find two (or more) elements that satisfy a condition involving their combined value — sum equals target, product equals target, etc.

**Template**:
```python
def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}                          # value → index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:         # O(1) lookup
            return [seen[complement], i]
        seen[num] = i
    return []
```

**Why it works**: For each element, we ask "what value would pair with me to reach the target?" — the complement. We check if that complement has already been seen in O(1) instead of scanning the remaining array in O(n).

**Time**: O(n) — one pass. **Space**: O(n) for the `seen` map.

**Canonical problem**: Two Sum (LeetCode 1). Appears in variations throughout the problem set: Three Sum (sort first + two pointers + complement), 4Sum, Two Sum II (sorted array — use two pointers instead for O(1) space).

**Important nuance**: When the input is sorted, complement lookup becomes unnecessary — use two pointers instead for O(1) space. Two Sum II uses sorted input, so the hash-map version is correct but suboptimal. The UMPIRE M-step (Match) catches this.

**Extension to Three Sum**:
```python
def three_sum(nums: list[int]) -> list[list[int]]:
    nums.sort()                        # O(n log n) preprocessing
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i-1]:
            continue                   # skip duplicate starting elements
        left, right = i + 1, len(nums) - 1
        while left < right:
            s = nums[i] + nums[left] + nums[right]
            if s == 0:
                result.append([nums[i], nums[left], nums[right]])
                while left < right and nums[left] == nums[left+1]:
                    left += 1          # skip duplicates
                while left < right and nums[right] == nums[right-1]:
                    right -= 1
                left += 1; right -= 1
            elif s < 0:
                left += 1
            else:
                right -= 1
    return result
```
Three Sum illustrates how **sort preprocessing** + **two pointers** replaces a full complement hash map when the input can be sorted.

## Pattern 3: Index-as-Key

**Recognition signal**: Values in the input are integers in a known range `[1..N]` or `[0..N-1]`, and you want to track presence or perform lookups without extra space.

**Template — use the input array itself as a hash map**:
```python
def find_duplicate(nums: list[int]) -> int:
    # nums contains n+1 integers in range [1, n]
    # Use array indices as implicit keys: "visit" index nums[i]-1
    for num in nums:
        idx = abs(num) - 1             # map value to 0-based index
        if nums[idx] < 0:
            return abs(num)            # already visited → duplicate
        nums[idx] = -nums[idx]         # negate to mark as visited
    return -1
```

**Why it works**: Values in `[1..N]` map directly to indices `[0..N-1]`. Use sign-flipping (or modulo encoding for non-destructive) to record "visited" without extra space. **Space: O(1)** — no hash map allocated.

This pattern achieves O(1) extra space by exploiting the constraint that values are bounded. It only works when values can serve as valid array indices — i.e., they are positive integers in a known range.

**Canonical problems**: Find the Duplicate Number (LeetCode 287), Set Mismatch, First Missing Positive.

**When to prefer this over a real hash map**:
- The problem says "O(1) extra space" or "in-place" — use index-as-key.
- The problem says nothing about space — default to a real hash map for simplicity.
- The problem involves general keys (strings, arbitrary integers) — you must use a real hash map.

## Summary table

| Pattern | Recognition signal | Time | Space | Canonical problem |
|---|---|---|---|---|
| Frequency counting | "count occurrences", "same frequency", "anagram" | O(n) | O(k) — k = alphabet | Valid Anagram |
| Complement lookup | "find two elements summing to X" | O(n) | O(n) | Two Sum |
| Index-as-key | values in [1..N], O(1) extra space required | O(n) | O(1) | Find Duplicate |

## Key points

- Frequency counting with `Counter` solves all "same element distribution" problems in O(n) time and O(k) space where k is the alphabet size.
- Complement lookup (`complement = target - num; if complement in seen`) converts O(n²) brute force to O(n) for "two elements summing to target" problems.
- Index-as-key uses the input array itself as a hash map when values are in `[1..N]` — achieves O(1) extra space by exploiting the constraint.
- For sorted inputs, two pointers replaces complement lookup for O(1) space — apply the UMPIRE Match step to catch this.
- Three Sum combines sort preprocessing + two pointers; it is not complement lookup on an unsorted array.

## Go deeper

- [S032](../../research/coding-algorithms-technical-interviews/01-sources/web/S032-string-array-cheatsheet-tih.md) — TIH string/array cheatsheet with the `Counter(a) == Counter(b)` pattern and anagram template
- [S026](../../research/coding-algorithms-technical-interviews/01-sources/web/S026-array-cheatsheet-tih.md) — TIH array cheatsheet including index-as-hash-key technique

---

*← [Previous lesson](./L04-hash-map-foundation.md)* · *[Next lesson: Hash Map Language Traps](./L06-hash-map-language-traps.md) →*
