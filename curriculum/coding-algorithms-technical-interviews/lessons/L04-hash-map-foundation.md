# Hash Map and Set: The Interview Foundation

**Module**: M02 · Hash Maps — The Universal Speed-Up
**Type**: core
**Estimated time**: 15 minutes
**Claim**: C13 from Strata synthesis

---

## The core idea

The hash map is the most commonly used data structure for improving time complexity in coding interviews ([S023](../../research/coding-algorithms-technical-interviews/01-sources/web/S023-algorithm-priority-tech-interview-handbook.md)). The pattern is always the same: **replace an O(n) scan or an O(n²) nested loop with an O(1) hash map lookup**, at the cost of O(n) extra space.

This is the classic space-time tradeoff made concrete. Whenever you see a solution that searches for a value inside a loop — `if target in array` inside a `for i in range(len(array))` loop — you have an O(n²) solution. Replace the array lookup with a hash map lookup, and you have an O(n) solution.

A **hash map** (Python `dict`, Java `HashMap`, JavaScript `Map`) stores key-value pairs with O(1) average-case lookup, insertion, and deletion. A **hash set** (Python `set`, Java `HashSet`, JavaScript `Set`) stores keys only, also with O(1) average operations. Together they are the enabling infrastructure for the largest category of interview optimisations.

## Why it matters

You will use hash maps in almost every subsequent module of this course:

- Two Sum: complement lookup in a dict
- Anagram detection: character frequency in a Counter
- Sliding window: character counts in a dict for substring validity
- Memoisation: DP results cached in a dict keyed by state
- Graph adjacency: dict of lists for adjacency representation
- Top-K words: frequency map fed into a heap

If hash map operations are not automatic for you — if you need to think about the syntax, the semantics of `.get()` vs bracket access, or whether sets have `.add()` or `.append()` — you will lose cognitive capacity during interviews for exactly the operations that should be trivial.

This lesson ensures hash map mechanics are fully automatic before the subsequent modules build on them.

## The mechanics

### Python dict (most common in interviews)

```python
# Create
freq = {}
freq = dict()

# Insert / update
freq["a"] = freq.get("a", 0) + 1    # safe increment — get with default
freq["a"] = freq.setdefault("a", 0) + 1  # equivalent but less idiomatic
from collections import defaultdict
freq = defaultdict(int)               # auto-initialises missing keys to 0
freq["a"] += 1                        # cleaner with defaultdict

# Lookup
if "a" in freq:                       # O(1) membership test
    print(freq["a"])
val = freq.get("a", 0)               # O(1) lookup with default if missing

# Iterate
for key in freq:                      # iterate keys
for key, val in freq.items():         # iterate key-value pairs
for val in freq.values():             # iterate values only

# Delete
del freq["a"]                         # KeyError if missing
freq.pop("a", None)                   # safe delete — None if missing

# Size
len(freq)                             # O(1)
```

### Python set

```python
seen = set()
seen.add(3)          # O(1)
3 in seen            # O(1) — NOT 3 in list (which is O(n))
seen.discard(3)      # O(1), no error if missing
seen.remove(3)       # O(1), KeyError if missing
```

### The critical distinction: `in set` is O(1), `in list` is O(n)

```python
arr = [1, 2, 3, ..., 1000000]
seen_list = arr            # checking 'x in seen_list' is O(n) — scans entire list
seen_set = set(arr)        # checking 'x in seen_set' is O(1) — hash lookup

# In a loop: the difference is O(n) vs O(n²) total
for x in arr:              # O(n) iterations
    if x in seen_list:     # O(n) per check → O(n²) total
        pass
for x in arr:              # O(n) iterations
    if x in seen_set:      # O(1) per check → O(n) total
        pass
```

This single substitution — `list` → `set` for membership checks — is the most common O(n) → O(1) transformation in coding interviews.

## Complexity: average vs. worst case

Hash maps provide **O(1) average case** for all operations, but this depends on low collision rates. Worst case — when many keys hash to the same bucket — degrades to O(n) for lookup and insertion. In practice, with Python dicts, Java HashMaps on JDK 8+, and JavaScript Maps, this worst case is extremely rare on typical interview inputs.

| Language | Avg lookup | Worst lookup | Notes |
|---|---|---|---|
| Python dict | O(1) | O(n) | Rare in practice; Python rehashes at 2/3 load factor |
| Java HashMap (JDK 8+) | O(1) | O(log n) | JDK 8 added BST buckets for collision chains |
| JavaScript Map | O(1) | O(n) | ECMAScript spec requires "sub-linear" but not guaranteed O(1) |

The Java JDK 8 improvement matters: before JDK 8, a deliberate hash-collision attack could make a HashMap behave O(n) per operation. JDK 8's BST bucket upgrade caps this at O(log n). This is not a constant-factor difference — it is an order-class difference. Module M09 covers these traps in detail.

For interview purposes: assume O(1) average, acknowledge O(n) worst case if asked directly, note JDK 8 improvement if interviewing for a Java position.

## When hash map space is bounded: the 26-character alphabet trick

A common interview pattern involves character frequency counts for lowercase English strings. Naively, this uses O(n) space for the hash map. But:

- The alphabet has exactly 26 lowercase characters.
- A frequency map for lowercase strings therefore has at most 26 entries.
- 26 entries is **O(1) space**, not O(n).

```python
from collections import Counter
freq = Counter("anagram")           # {'a': 3, 'n': 1, 'g': 1, 'r': 1, 'm': 1}
# Space: O(26) = O(1) for lowercase English
```

This matters when an interviewer asks about space complexity for string problems. The answer is not "O(n) for the hash map" — it is "O(1) because the alphabet size is a constant 26."

## Key points

- Hash maps and sets provide O(1) average-case lookup, insertion, and deletion — the foundation of the space-time tradeoff.
- `x in set` is O(1); `x in list` is O(n) — this single substitution converts O(n²) loops to O(n).
- Python `dict.get(key, default)` is the correct idiom for safe lookups — bracket access raises `KeyError` on missing keys.
- Character frequency maps for lowercase English strings use O(1) space (at most 26 entries), not O(n).
- Java HashMap worst case improved from O(n) to O(log n) in JDK 8 — a meaningful order-class change for collision-heavy inputs.

## Go deeper

- [S001](../../research/coding-algorithms-technical-interviews/01-sources/web/S001-python-time-complexity-wiki.md) — Python time complexity wiki with dict and set operation costs
- [S014](../../research/coding-algorithms-technical-interviews/01-sources/web/S014-java-collections-complexity-baeldung.md) — Java collections complexity including HashMap JDK7 vs JDK8 analysis
- [S015](../../research/coding-algorithms-technical-interviews/01-sources/web/S015-javascript-map-set-mdn.md) — MDN JavaScript Map and Set documentation

---

*← [Previous lesson](./L03-umpire-framework.md)* · *[Next lesson: Frequency Counting, Complement Lookup, and Index-as-Key](./L05-hash-map-patterns.md) →*
