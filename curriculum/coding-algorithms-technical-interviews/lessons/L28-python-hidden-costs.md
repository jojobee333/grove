# Python Hidden Costs — List, Dict, and String Complexity Traps

**Module**: M09 · Language-Specific Complexity Traps
**Type**: applied
**Estimated time**: 17 minutes
**Claim**: C4 from Strata synthesis

---

## The situation

Python's readable syntax conceals O(n) operations that look like O(1), and O(n log n) operations that look free. A solution with correct algorithmic complexity can still TLE if it accumulates Python-specific hidden costs. This lesson catalogues the most common traps and their O(1) alternatives.

## List Operations

| Operation | Complexity | Notes |
|---|---|---|
| `list.append(x)` | O(1) amortised | ✅ Fast — use freely |
| `list.pop()` | O(1) | ✅ Pop from end |
| `list.pop(0)` | **O(n)** | ❌ Shifts all elements left — use deque |
| `list.insert(0, x)` | **O(n)** | ❌ Shifts all elements right — use deque |
| `list[i]` (indexing) | O(1) | ✅ |
| `x in list` | **O(n)** | ❌ Linear scan — convert to set for O(1) |
| `list.sort()` | O(n log n) | ✅ In-place Timsort |
| `sorted(list)` | O(n log n) | Creates new list |
| `list[a:b]` (slice) | **O(b-a)** | Copies elements — avoid in hot loops |
| `list + list2` | **O(n+m)** | Creates new list — use extend instead |
| `list.extend(iterable)` | O(k) | k = length of iterable |

**The `pop(0)` trap** — classic interview mistake:
```python
# Wrong: BFS with list.pop(0) — O(n²) total
from collections import deque

queue = [root]                        # using list as queue
while queue:
    node = queue.pop(0)               # O(n) per call! — O(n²) total for n nodes
    ...

# Correct: use deque — O(n) total
queue = deque([root])
while queue:
    node = queue.popleft()            # O(1) per call
    ...
```

## Set and Dict Operations

| Operation | Complexity | Notes |
|---|---|---|
| `x in set` | O(1) average | ✅ Hash lookup |
| `set.add(x)` | O(1) average | ✅ |
| `dict[key]` | O(1) average | ✅ |
| `dict.get(key, default)` | O(1) average | ✅ |
| Set/dict construction from list | **O(n)** | One-time cost — acceptable |
| `len(set)` | O(1) | ✅ |

**O(1) average vs. O(n) worst case**: Hash collisions can degrade dict/set operations to O(n). In practice on LeetCode, adversarial hashing is not an issue. In Python 3.6+ dicts are ordered by insertion; sets are unordered.

## String Operations

Python strings are **immutable**. Every string operation that modifies a string creates a new string:

```python
# O(n²) total — classic trap
result = ""
for char in long_list:
    result += char          # creates new string each iteration — O(1+2+3+...+n) = O(n²)

# O(n) — correct pattern
parts = []
for char in long_list:
    parts.append(char)      # O(1) each
result = "".join(parts)     # O(n) one-time join
```

**Why `+=` is O(n²)**: each `result += char` allocates a new string of size `len(result) + 1`, copies the old string, and appends the character. Over n characters: 1 + 2 + 3 + ... + n = n(n+1)/2 = O(n²).

**String membership**: `substring in s` is O(n × m) — substring search, not O(1). Don't use it in hot loops expecting O(1).

## Sorting and Comprehensions

```python
# sorted() with key is O(n log n) — fine
sorted(nums, key=lambda x: -x)

# List comprehension — O(n), equivalent to explicit for loop
squares = [x**2 for x in nums]        # O(n)

# Nested comprehension — O(n²) — can be a surprise
pairs = [(i, j) for i in range(n) for j in range(n)]    # O(n²) items

# min()/max() — O(n) — iterate entire iterable
m = min(nums)                          # O(n) — fine for one call
for _ in range(n):
    m = min(nums)                      # O(n²) total — call min once, store result
```

## deque vs. list — When to Use Which

```python
from collections import deque

d = deque()
d.append(x)         # O(1) — right end
d.appendleft(x)     # O(1) — left end ← only fast with deque
d.pop()             # O(1) — right end
d.popleft()         # O(1) — left end ← only fast with deque
d[0]                # O(1) — peek
d[-1]               # O(1) — peek right

# deque does NOT support efficient random access in middle
d[k]                # O(n) for deque — k away from either end
```

**Rule**: Use `deque` whenever you need O(1) operations on both ends (queues, sliding windows tracking indices). Use `list` when you need frequent indexing.

## Counter — Frequency Counting

```python
from collections import Counter

freq = Counter(nums)            # O(n) construction
freq['x']                       # O(1) — returns 0 for missing keys (unlike dict)
freq.most_common(k)             # O(n log k) — top k elements
```

`Counter` is a subclass of `dict`. Use it for frequency maps — cleaner than manual default dict.

## Quick Reference: O(1) Alternatives

| Slow pattern | O(complexity) | Fast alternative |
|---|---|---|
| `queue.pop(0)` | O(n) | `deque.popleft()` |
| `queue.insert(0, x)` | O(n) | `deque.appendleft(x)` |
| `x in some_list` | O(n) | `x in some_set` |
| `s += char` in loop | O(n²) total | `parts.append(); "".join(parts)` |
| `sorted()` inside loop | O(n log n) × loop | Sort once, loop over sorted result |
| `list[a:b]` in hot loop | O(b-a) per call | Use index variables (lo, hi) |

## Key points

- `list.pop(0)` and `list.insert(0, x)` are O(n) — use `collections.deque` for O(1) queue operations.
- `x in list` is O(n) — convert to `set` for O(1) membership if queried multiple times.
- String concatenation in a loop (`s += x`) is O(n²) — accumulate in list and join once at end.
- `sorted()` / `list.sort()` are O(n log n) — never call in a tight loop where O(n²) would result.
- `deque[k]` is O(n) for middle elements — not a replacement for list indexing.

## Go deeper

- [S022](../../research/coding-algorithms-technical-interviews/01-sources/web/S022-python-time-complexity-wiki.md) — Python wiki: official time complexity table for all built-in data structures

---

*← [Previous lesson](./L27-dp-state-design.md)* · *[Next lesson: Java and JavaScript Pitfalls](./L29-java-js-pitfalls.md) →*
