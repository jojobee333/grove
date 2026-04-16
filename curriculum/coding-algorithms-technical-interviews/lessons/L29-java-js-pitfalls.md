# Java and JavaScript Pitfalls — Integer Overflow, Type Coercion, and Sorting Surprises

**Module**: M09 · Language-Specific Complexity Traps
**Type**: applied
**Estimated time**: 14 minutes
**Claim**: C4, C6 from Strata synthesis

---

## The situation

Python's arbitrary-precision integers and dynamic typing hide problems that Java and JavaScript candidates routinely hit. This lesson covers the pitfalls that cost interviewees correctness points when implementing algorithms in these languages.

## Java: Integer Overflow

Java's `int` is 32-bit signed: range [-2,147,483,648, 2,147,483,647] ≈ ±2.1×10⁹. `long` is 64-bit: range ≈ ±9.2×10¹⁸.

**The midpoint overflow bug:**
```java
// WRONG — can overflow when lo and hi are large positive ints
int mid = (lo + hi) / 2;

// CORRECT — no overflow
int mid = lo + (hi - lo) / 2;
```

When `lo = 2,000,000,000` and `hi = 2,100,000,000`, `lo + hi` = 4.1×10⁹ which exceeds `Integer.MAX_VALUE` → wraps to a negative number → `mid` becomes negative → binary search diverges.

**Other overflow-prone operations:**
```java
// Factorial, power functions — switch to long early
long factorial = 1;
for (int i = 1; i <= n; i++) {
    factorial *= i;    // fine if using long; overflows int at n=13
}

// Two-sum check — intermediate sum can overflow
if ((long) a + b > Integer.MAX_VALUE) { ... }   // cast before arithmetic

// Comparison via subtraction (classic comparator bug)
// WRONG — can overflow
Arrays.sort(arr, (a, b) -> a - b);

// CORRECT
Arrays.sort(arr, Integer::compare);
// or: (a, b) -> Integer.compare(a, b)
```

**The comparator subtraction trap** is particularly dangerous: using `a - b` as a comparator "looks correct" for small values but overflow causes incorrect sort ordering when values are far apart (e.g., `Integer.MIN_VALUE - 1` wraps positive).

**Java overflow summary:**
- Default to `long` when values might exceed 10⁹
- Use `lo + (hi - lo) / 2` for all binary search midpoints
- Never use subtraction as a comparator — use `Integer.compare(a, b)`

## Java: Autoboxing Cost

Switching between primitives (`int`) and boxed types (`Integer`) incurs allocation cost:

```java
// Each element access unboxes Integer to int — O(1) but higher constant
List<Integer> list = new ArrayList<>();
int sum = 0;
for (int x : list) { sum += x; }    // each iteration: Integer.intValue()

// HashMap<Integer, Integer> — boxed, slower than int arrays when possible
HashMap<Integer, Integer> freq = new HashMap<>();

// Prefer primitive arrays when structure allows:
int[] freq = new int[26];           // for lowercase letter frequencies
```

For tight algorithm loops, prefer primitive arrays over `ArrayList<Integer>` and `HashMap<Integer, Integer>` where the key space is bounded.

## JavaScript: Comparison and Sorting Surprises

JavaScript's `==` (loose equality) and `===` (strict equality) trip up algorithmic solutions:

```javascript
// Loose equality coerces types — avoid in algorithms
"1" == 1         // true — string "1" coerced to number
null == undefined // true

// Always use === in algorithm code
"1" === 1        // false — different types, no coercion
```

**The sort() default is lexicographic:**
```javascript
// WRONG default sort — sorts by string representation
[10, 9, 2, 1, 100].sort()    // [1, 10, 100, 2, 9] ← lexicographic!

// CORRECT — numeric comparator
[10, 9, 2, 1, 100].sort((a, b) => a - b)    // [1, 2, 9, 10, 100]
// Descending:
[10, 9, 2, 1, 100].sort((a, b) => b - a)    // [100, 10, 9, 2, 1]
```

This is easily the single most common JavaScript interview bug. The default `.sort()` behavior is correct only for arrays of strings — for numbers, ALWAYS provide a comparator.

## JavaScript: Number Precision

JavaScript uses 64-bit floating-point (IEEE 754 double) for all numbers. Integers are exactly represented up to 2^53 - 1 = 9,007,199,254,740,991:

```javascript
Number.MAX_SAFE_INTEGER    // 9007199254740991 = 2^53 - 1
Number.MIN_SAFE_INTEGER    // -9007199254740991

// Beyond this, precision is lost
9007199254740992 === 9007199254740993    // true!!! — same float value

// For very large integers, use BigInt
const big = BigInt(9007199254740993)     // exact
```

Most algorithm problems on LeetCode keep values within safe integer range, but problems involving products or factorials of large numbers require `BigInt`.

## JavaScript: Map vs. Object for Frequency Counting

```javascript
// Object as frequency map — works for string keys, but:
const freq = {};
freq[key] = (freq[key] || 0) + 1;    // prototype keys can interfere!
// Keys like "constructor", "toString" exist on Object.prototype

// Safer: Map — works for any key type, no prototype interference
const freq = new Map();
freq.set(key, (freq.get(key) ?? 0) + 1);

// Check:
freq.has(key)        // O(1)
freq.get(key)        // O(1)
freq.size            // O(1) — unlike Object.keys(obj).length which is O(n)
```

For algorithm code where key values are known to be simple strings without collision risk (like character frequencies), either works. For general hash map usage, prefer `Map`.

## Cross-Language Comparison

| Issue | Python | Java | JavaScript |
|---|---|---|---|
| Integer overflow | Impossible (arbitrary precision) | `int` overflows at ~2×10⁹ | Number.MAX_SAFE_INTEGER = 2⁵³-1 |
| Default sort order | Numeric for numbers | Natural order for primitives | Lexicographic by default |
| Null/undefined edge cases | `None` type errors | `NullPointerException` | Silent `undefined` coercion |
| Midpoint calculation | No overflow risk | Must use `lo + (hi-lo)/2` | No overflow risk in safe range |

## Key points

- Java: use `lo + (hi - lo) / 2` for binary search midpoints — `(lo + hi) / 2` overflows on large ints.
- Java: never compare with `a - b` in a comparator — use `Integer.compare(a, b)`.
- Java: default to `long` when values could exceed 10⁹.
- JavaScript: ALWAYS provide a numeric comparator to `.sort()` — default is lexicographic.
- JavaScript: use `Map` instead of `{}` for algorithm frequency maps — avoids prototype key collisions.

## Go deeper

- [S022](../../research/coding-algorithms-technical-interviews/01-sources/web/S022-python-time-complexity-wiki.md) — Python time complexity reference (for cross-language comparison)
- [S006](../../research/coding-algorithms-technical-interviews/01-sources/web/S006-complexity-comparison-wiki.md) — algorithm complexity comparison across language implementations

---

*← [Previous lesson](./L28-python-hidden-costs.md)* · *[Next lesson: String Concatenation Trap — O(n²) to O(n)](./L30-string-concat-trap.md) →*
