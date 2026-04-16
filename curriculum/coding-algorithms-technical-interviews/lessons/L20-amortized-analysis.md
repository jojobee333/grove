# Amortised Analysis — Table Doubling and DSU

**Module**: M06 · Complexity Analysis — Big-O, Master Theorem, Amortised
**Type**: core
**Estimated time**: 20 minutes
**Claim**: C7 from Strata synthesis

---

## The core idea

**Amortised analysis** measures the average cost per operation over a sequence of n operations, even when individual operations vary widely in cost. It is not the same as average-case analysis — there are no probability distributions. Instead, it distributes the cost of rare expensive operations across the many cheap operations that precede them.

The key insight: if an expensive operation can only happen after many cheap operations have "paid into" a cost budget, then averaged over the sequence, each operation is cheap ([S007](../../research/coding-algorithms-technical-interviews/01-sources/web/S007-amortized-analysis-wikipedia.md)).

Three classic examples make this concrete: dynamic array resizing (table doubling), the two-stack queue, and Union-Find's inverse-Ackermann O(α(n)) bound.

## Method 1: Aggregate Analysis (Counting Total Cost)

Compute the total cost of n operations and divide by n.

**Dynamic array (Python list) append:**
- Most appends: O(1) — just set `arr[size] = val` and increment size
- Resizing append: O(current_size) — allocate 2× capacity, copy all elements, then insert

Capacity doubles: 1, 2, 4, 8, 16, ..., n. Copying costs: 1 + 2 + 4 + ... + n = 2n - 1 = O(n).

Over n appends, total work = O(n) + O(n) = O(n). Amortised cost per append = O(n)/n = **O(1)**.

This is why Python `list.append()` is O(1) amortised. An individual append can trigger a resize (O(n)), but that O(n) cost is amortised across all n cheap appends that preceded it.

## Method 2: Accounting (Banker's Method)

Assign each operation a "charge" that may exceed its actual cost. Prepay for future expensive operations using surplus from cheap ones.

**Table doubling accounting:**
- Charge each append $3 (conceptual units): $1 for the insert, $1 for its own future copy, $1 to subsidise copying an old element.
- When resize occurs, all credits have been prepaid — no additional charge needed.
- Total charge: 3n = O(n). Amortised cost per operation: O(1).

The two-stack queue illustrates this cleanly:

**Two-stack queue** — simulating a queue using two stacks:
```python
class TwoStackQueue:
    def __init__(self):
        self.inbox = []              # push to here
        self.outbox = []             # pop from here
    
    def enqueue(self, val: int) -> None:
        self.inbox.append(val)       # always O(1)
    
    def dequeue(self) -> int:
        if not self.outbox:
            # Transfer all from inbox to outbox — O(n) but infrequent
            while self.inbox:
                self.outbox.append(self.inbox.pop())
        return self.outbox.pop()     # O(1) after transfer
```

Each element is pushed to `inbox` once and to `outbox` once — two operations total per element. Over n operations: O(n) total push/pops, O(1) amortised per operation.

## Method 3: Potential Method (Physics Analogy)

Define a "potential function" Φ that measures how much future expensive work the system is "set up to do." The amortised cost = actual cost + ΔΦ.

For table doubling, Φ = 2(number of elements beyond half-capacity). Each cheap insert increases Φ by 2. Each resize sets Φ back to 0. The O(n) resize cost is exactly cancelled by the O(n) potential that was accumulated — amortised cost per operation is O(1).

The potential method is more formal than aggregate or accounting, but overkill for interview settings. Know that it exists; use aggregate analysis in practice.

## Union-Find: O(α(n)) Amortised

**Disjoint Set Union (DSU)** with union-by-rank and path compression has amortised O(α(n)) per operation, where α is the **inverse Ackermann function** — an astronomically slowly growing function. For all practical inputs (n ≤ 10²² ), α(n) ≤ 4.

In interviews: "Union-Find is effectively O(1) per operation amortised" — technically O(α(n)) that behaves as O(1).

```python
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n
    
    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])    # path compression
        return self.parent[x]
    
    def union(self, x: int, y: int) -> bool:
        px, py = self.find(x), self.find(y)
        if px == py:
            return False                                   # already in same set
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px                              # union by rank
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True
```

**Why path compression helps**: On `find(x)`, every node on the path to root is re-linked directly to the root. Future finds from these nodes are O(1). The amortisation: expensive initial finds "pay for" cheap subsequent finds on the same path.

**Union by rank**: Attaches the shorter tree under the taller one, bounding tree height at O(log n). Combined with path compression, depth reduces further over time — the two optimisations together give O(α(n)) ([S008](../../research/coding-algorithms-technical-interviews/01-sources/web/S008-dsu-cp-algorithms.md)).

## When to mention amortised complexity in interviews

Certain data structure complexities are **amortised** by default:
- `list.append()` — O(1) amortised
- `deque.appendleft()` / `deque.popleft()` — O(1) (not amortised — it's truly O(1))
- DSU `find()` / `union()` — O(α(n)) amortised
- Monotonic stack per-element push/pop — O(1) amortised

When describing these, say "O(1) amortised" not just "O(1)" — it signals you understand the distinction. For simple constant-time operations (hash map lookup, array index), "O(1)" without "amortised" is correct.

## Key points

- Amortised analysis distributes the cost of rare expensive operations across the many cheap operations that precede them — no probability, just cost distribution over a sequence.
- Dynamic array append is O(1) amortised: doubling costs O(n) but is paid for by O(n) prior cheap appends.
- Two-stack queue is O(1) amortised: each element is transferred at most once (inbox → outbox).
- DSU with path compression + union by rank: O(α(n)) amortised per operation — effectively O(1) for all practical n.
- In interviews, say "O(1) amortised" for `list.append()` and DSU operations — it shows precision.

## Go deeper

- [S007](../../research/coding-algorithms-technical-interviews/01-sources/web/S007-amortized-analysis-wikipedia.md) — amortised analysis: aggregate, accounting, and potential methods
- [S008](../../research/coding-algorithms-technical-interviews/01-sources/web/S008-dsu-cp-algorithms.md) — CP-Algorithms DSU: path compression, union by rank, O(α(n)) proof sketch

---

*← [Previous lesson](./L19-master-theorem.md)* · *[Next lesson: Space Complexity of Recursion](./L21-recursion-space.md) →*
