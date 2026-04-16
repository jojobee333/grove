# Hash Map Language Traps — Python, Java, JavaScript

**Module**: M02 · Hash Maps — The Universal Speed-Up
**Type**: applied
**Estimated time**: 14 minutes
**Claim**: C4, C6 from Strata synthesis

---

## The situation

You can know hash maps conceptually and still produce wrong or suboptimal solutions in interviews because of language-specific traps. These are not corner cases — they are operations that look standard, produce no syntax errors, but give you either incorrect behaviour or unexpected complexity.

This lesson covers three traps that come up specifically in hash map usage: Python's dict bracket access, Java's HashMap worst-case history, and JavaScript's silent Map-bypassing bug.

## Trap 1: Python — bracket access raises KeyError

**Wrong pattern**:
```python
freq = {}
for c in "hello":
    freq[c] += 1        # KeyError: 'h' — key doesn't exist yet, can't increment
```

**Correct patterns**:
```python
# Option 1: .get() with default
freq = {}
for c in "hello":
    freq[c] = freq.get(c, 0) + 1    # .get(key, default) returns default if missing

# Option 2: defaultdict
from collections import defaultdict
freq = defaultdict(int)              # int() returns 0 — the default for missing keys
for c in "hello":
    freq[c] += 1                     # safe: missing key is initialised to 0

# Option 3: Counter (best for counting)
from collections import Counter
freq = Counter("hello")              # {'l': 2, 'h': 1, 'e': 1, 'o': 1}
```

**Why it happens**: Python `dict` does not auto-initialise missing keys. `dict[key]` raises `KeyError` if key is absent. `dict.get(key, default)` is the idiomatic safe accessor. This is unlike JavaScript object access, which returns `undefined` for missing properties.

**Interview consequence**: Bracket-access bugs in frequency counters are among the most common Python errors in interviews. The solution is internalising `defaultdict(int)` or `Counter` as your default for counting problems.

## Trap 2: Java — HashMap worst case pre-JDK 8

**The history**: Before JDK 8, Java `HashMap` handled hash collisions with a linked list per bucket. In the worst case — all keys hashing to the same bucket — lookup degraded to O(n) as you scanned the entire collision chain.

JDK 8 (Java 8, 2014) changed the collision bucket structure: when a bucket's linked list grows beyond 8 entries, it converts to a **red-black BST**. This caps worst-case lookup at **O(log n)** instead of O(n).

**This is not a constant-factor difference** — it is an order-class change from O(n) to O(log n). It matters for adversarial inputs and large datasets.

```java
// Modern Java — use HashMap safely
Map<Character, Integer> freq = new HashMap<>();
for (char c : s.toCharArray()) {
    freq.put(c, freq.getOrDefault(c, 0) + 1);    // getOrDefault is the Java equivalent of .get(key, default)
}
```

**Interview points**:
- If asked about HashMap complexity in Java: state O(1) average, O(log n) worst case (JDK 8+), O(n) worst case (pre-JDK 8).
- For competitive coding on older Java versions: consider using `TreeMap` (O(log n) guaranteed) if collision attacks are a concern.
- `LinkedHashMap` maintains insertion order, `TreeMap` maintains sorted order — both O(log n) for core operations.

**Java's other "gotcha"**: `HashSet` and `HashMap` require boxed types for primitives:
```java
Map<int, int> wrong = new HashMap<>();           // compile error — int is not a type parameter
Map<Integer, Integer> correct = new HashMap<>(); // boxing/unboxing overhead, but correct
```

## Trap 3: JavaScript — silent Map-vs-object bug

This is the most insidious trap because it produces **no error and silently wrong behaviour**.

**Wrong pattern** (using object assignment to "use" a Map):
```javascript
const freq = new Map();
freq["a"] = 1;           // This does NOT call Map.set(). It adds a property to the Map object.
console.log(freq.has("a"));  // false — Map.has() checks Map entries, not object properties
console.log(freq.get("a"));  // undefined — same reason
```

**Correct pattern**:
```javascript
const freq = new Map();
freq.set("a", (freq.get("a") ?? 0) + 1);     // correct: use .set() and .get()
freq.has("a");                                  // true
freq.get("a");                                  // 1
freq.size;                                      // 1 (not freq.length — Maps use .size)
```

**Why it happens**: JavaScript `Map` is an object. Objects allow property assignment via `[]` notation. But `Map`'s data structure is separate from its object properties — using `map[key]` sets an object property, completely bypassing the Map data structure. The resulting object behaves in confusing ways: `.has()`, `.get()`, and `.size` all operate on the Map data structure and see nothing.

**Correct JS idioms for frequency maps**:
```javascript
// Increment with null-coalescing
const freq = new Map();
for (const c of s) {
    freq.set(c, (freq.get(c) ?? 0) + 1);
}

// Iterate
for (const [key, val] of freq) { ... }         // destructured iteration
for (const [key, val] of freq.entries()) { ... } // explicit .entries()
freq.forEach((val, key) => { ... });             // callback style

// Convert to/from array
const keys = [...freq.keys()];
const entries = [...freq.entries()];
```

**When to use `{}` (plain object) vs `Map`**:
- `{}`: keys are strings/symbols, you don't need `.size`, your keys are static — idiomatic JavaScript since forever.
- `Map`: keys are any type (numbers, objects, complex keys), you need `.size`, performance matters for large maps.

In interviews, use `Map` for all hash map patterns — it has cleaner semantics and matches the intent. Just always use `.set()` / `.get()` / `.has()`.

## Summary: the three traps

| Language | Trap | Symptom | Fix |
|---|---|---|---|
| Python | `dict[key] += 1` on missing key | `KeyError` at runtime | Use `defaultdict(int)` or `.get(key, 0)` |
| Java (pre-JDK 8) | HashMap collision chain | O(n) worst-case lookup | Use JDK 8+; know the history |
| JavaScript | `map[key] = val` on a `Map` | Silent wrong: `.has()` returns false | Always use `.set()` / `.get()` / `.has()` |

## Key points

- Python `dict[key]` raises `KeyError` for missing keys — use `dict.get(key, 0)` or `defaultdict(int)` for safe frequency counting.
- Java `HashMap` worst case changed from O(n) (pre-JDK 8) to O(log n) (JDK 8+) due to BST bucket upgrade — an order-class change, not a constant factor.
- JavaScript `map[key] = val` silently assigns an object property, not a Map entry — `.has()` and `.get()` will return wrong results; always use `.set()` / `.get()`.
- These are not edge cases — they are triggered by the most natural-looking syntax in each language.

## Go deeper

- [S014](../../research/coding-algorithms-technical-interviews/01-sources/web/S014-java-collections-complexity-baeldung.md) — Java collection complexity including the JDK7 vs JDK8 HashMap change
- [S015](../../research/coding-algorithms-technical-interviews/01-sources/web/S015-javascript-map-set-mdn.md) — MDN Map and Set documentation with explicit `.set()` / `.get()` API

---

*← [Previous lesson](./L05-hash-map-patterns.md)* · *[Next lesson: Two-Pointer Pattern](./L07-two-pointer.md) →*
