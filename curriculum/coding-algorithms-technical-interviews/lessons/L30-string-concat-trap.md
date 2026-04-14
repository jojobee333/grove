# String Concatenation Trap — O(n²) to O(n)

**Module**: M09 · Language-Specific Complexity Traps
**Type**: applied
**Estimated time**: 25 minutes
**Claim**: C4 from Strata synthesis

---

## The situation

String concatenation in a loop is one of the most common hidden O(n²) bugs in interview solutions. It appears in: building reversed strings, constructing results character by character, generating output from algorithm traversals, and formatting strings in loops. The fix is language-specific and must be applied consistently.

## Why Concatenation is O(n²)

Strings are **immutable** in Python, Java, and JavaScript. Every concatenation creates a new string object by copying both operands into a new allocation:

```
Iteration 1: ""  + "a"          → allocate 1 char,  copy 0+1 = 1
Iteration 2: "a" + "b"          → allocate 2 chars, copy 1+1 = 2
Iteration 3: "ab" + "c"         → allocate 3 chars, copy 2+1 = 3
...
Iteration n: s   + char         → allocate n chars, copy (n-1)+1 = n
```

Total copy operations: 1 + 2 + 3 + ... + n = n(n+1)/2 = **O(n²)**.

For n = 10,000 characters (a medium-sized response), O(n²) = 10⁸ operations — too slow.

## Python Fix: Accumulate in List, Join Once

```python
# O(n²) — DO NOT DO THIS
result = ""
for char in input_string:
    result += char

# O(n) — CORRECT
parts = []
for char in input_string:
    parts.append(char)    # O(1) amortised per append
result = "".join(parts)   # O(n) — one allocation, one copy pass
```

**List.append is O(1) amortised** — it writes into pre-allocated backing array. `"".join(parts)` is O(total characters) — one pass to measure size, one pass to copy. Total: O(n).

**Common interview patterns:**
```python
# Reversing a string — O(n) with slicing (creates one copy)
reversed_s = s[::-1]

# Or using list reversal
chars = list(s)
chars.reverse()
reversed_s = "".join(chars)

# Building results from algorithm output:
result_parts = []
for node in traversal:
    result_parts.append(str(node.val))
return " -> ".join(result_parts)    # O(n) not O(n²)
```

## Java Fix: StringBuilder

Java has `StringBuilder` specifically for this:

```java
// O(n²) — WRONG
String result = "";
for (char c : chars) {
    result += c;    // creates new String each time
}

// O(n) — CORRECT
StringBuilder sb = new StringBuilder();
for (char c : chars) {
    sb.append(c);   // O(1) amortised — backed by char array
}
String result = sb.toString();   // O(n) — one final copy
```

`StringBuilder` maintains an internal char array that doubles in size when needed — same as Python's list append. The `toString()` call at the end is the single O(n) allocation.

**Common Java patterns:**
```java
// String join (Java 8+) — O(n), clean
String result = String.join(" -> ", nodeValues);

// When building inside a loop with conditional logic:
StringBuilder sb = new StringBuilder();
for (int i = 0; i < n; i++) {
    if (i > 0) sb.append(", ");
    sb.append(arr[i]);
}
return sb.toString();
```

## JavaScript Fix: Array Join

JavaScript strings are also immutable. The fix mirrors Python:

```javascript
// O(n²) — WRONG
let result = "";
for (const char of input) {
    result += char;    // new string each iteration
}

// O(n) — CORRECT
const parts = [];
for (const char of input) {
    parts.push(char);   // O(1) amortised
}
const result = parts.join("");   // O(n)
```

JavaScript engines like V8 apply some string concatenation optimisations (deferred copy), but these are unreliable. Never depend on engine-specific optimisations in an interview setting — use explicit array accumulation.

## Where This Bug Hides

It doesn't always look like a simple loop. Watch for:

1. **Recursive string building** — each recursive call potentially concatenating with the return value of the child
2. **Building output from tree traversal** — e.g., serialising a tree to a comma-separated string
3. **Multiple concatenations per iteration** — `result += part1 + part2 + part3` (still O(n²) even with triple concatenation)
4. **Path strings in backtracking** — storing partial paths as strings and extending them at each step

```python
# Backtracking with string — O(n² × 2^n) total
def backtrack(path: str, remaining: list) -> None:
    if not remaining:
        results.append(path)
        return
    for i, char in enumerate(remaining):
        backtrack(path + char, remaining[:i] + remaining[i+1:])
        # path + char creates new string each call — O(n) per call

# Better — accumulate in list
def backtrack(path: list, remaining: list) -> None:
    if not remaining:
        results.append("".join(path))    # O(n) only at leaf
        return
    for i, char in enumerate(remaining):
        path.append(char)
        backtrack(path, remaining[:i] + remaining[i+1:])
        path.pop()                        # O(1) backtrack
```

## Summary Table

| Language | O(n²) pattern | O(n) fix |
|---|---|---|
| Python | `s += char` in loop | `parts.append(); "".join(parts)` |
| Java | `String s += x` in loop | `StringBuilder.append(); toString()` |
| JavaScript | `s += x` in loop | `arr.push(); arr.join("")` |
| All | Recursive string concat in tree/backtracking | Accumulate in array, join at leaves |

## Key points

- String concatenation in a loop is O(n²) in Python, Java, and JavaScript — strings are immutable, every `+=` copies.
- Python fix: `list.append()` + `"".join()` — O(n) total.
- Java fix: `StringBuilder.append()` + `.toString()` — O(n) total.
- JavaScript fix: `array.push()` + `.join("")` — O(n) total.
- Special care in backtracking: accumulate path as a list, join only at leaf nodes.

## Go deeper

- [S022](../../research/coding-algorithms-technical-interviews/01-sources/web/S022-python-time-complexity-wiki.md) — Python time complexity table including string and list operations

---

*← [Previous lesson](./L29-java-js-pitfalls.md)* · *[Next lesson: Backtracking — Template and Pruning](./L31-backtracking.md) →*
