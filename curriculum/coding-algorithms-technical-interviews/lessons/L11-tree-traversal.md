# Tree Traversal Templates — Pre, In, Post, and Level-Order

**Module**: M04 · Tree and Graph Traversal — BFS/DFS Duality
**Type**: core
**Estimated time**: 35 minutes
**Claim**: C12 from Strata synthesis

---

## The core idea

A binary tree is a connected acyclic graph where every node has at most two children. Recursion is the natural technique for trees — the tree's recursive structure (a root plus two subtrees) maps directly to a recursive function ([S031](../../research/coding-algorithms-technical-interviews/01-sources/web/S031-tree-binary-search-tree-tih.md)).

There are four canonical traversal orders, each with a specific use case:

| Traversal | Order | Primary use |
|---|---|---|
| Pre-order | Root → Left → Right | Copy/serialize a tree; prefix expression |
| In-order | Left → Root → Right | **BST sorted output** |
| Post-order | Left → Right → Root | Delete tree; postfix expression; subtree size |
| Level-order | Level by level (BFS) | Shortest path; level-specific operations |

The first three are DFS traversals — they go deep before wide. Level-order is BFS — it goes wide before deep.

## The four templates

### Pre-order (root first)

```python
def preorder(root: TreeNode) -> list[int]:
    if not root:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)

# Iterative (avoids recursion limit for large trees)
def preorder_iterative(root: TreeNode) -> list[int]:
    if not root:
        return []
    stack, result = [root], []
    while stack:
        node = stack.pop()
        result.append(node.val)
        if node.right:
            stack.append(node.right)   # right first so left is processed first
        if node.left:
            stack.append(node.left)
    return result
```

### In-order (left, root, right)

```python
def inorder(root: TreeNode) -> list[int]:
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)
```

**Critical BST property**: In-order traversal of a Binary Search Tree produces a **sorted sequence**. This is one of the most frequently tested tree facts in FAANG interviews. Any problem asking for "kth smallest in BST" or "validate BST" uses in-order traversal.

### Post-order (children before root)

```python
def postorder(root: TreeNode) -> list[int]:
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]
```

Post-order is used when a node's answer depends on its children's answers — for example, computing subtree sizes, finding the diameter of a tree, or computing the height of a tree bottom-up.

### Level-order (BFS)

```python
from collections import deque

def level_order(root: TreeNode) -> list[list[int]]:
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level_size = len(queue)        # number of nodes at this level
        level = []
        for _ in range(level_size):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
```

The `level_size = len(queue)` trick is key: it freezes the count of nodes at the current level before processing them, so when those nodes add their children to the queue, those children are counted for the *next* level.

## BST operations

A Binary Search Tree maintains the invariant: **all values in the left subtree < root < all values in the right subtree** (technically, for every node, not just root). This enables O(h) time for search, insert, and delete where h = tree height.

```python
def search_bst(root: TreeNode, target: int) -> TreeNode | None:
    if not root or root.val == target:
        return root
    if target < root.val:
        return search_bst(root.left, target)   # go left
    return search_bst(root.right, target)       # go right

def insert_bst(root: TreeNode, val: int) -> TreeNode:
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = insert_bst(root.left, val)
    else:
        root.right = insert_bst(root.right, val)
    return root
```

**Complexity**: O(h) for all BST operations.
- **Balanced BST**: h = O(log n) — all operations O(log n).
- **Skewed BST** (sorted insertions): h = O(n) — degenerates to O(n) linked list.

Self-balancing BSTs (AVL, Red-Black) maintain O(log n) height but are rarely asked to implement in interviews — just know they exist and why they're needed.

## Space complexity of tree traversals

Recursion space = call stack depth = tree height h:
- **Balanced tree**: h = O(log n) → O(log n) space.
- **Skewed tree** (worst case): h = O(n) → O(n) space.

Level-order BFS uses O(w) space where w = maximum level width. For a complete binary tree, the bottom level has `n/2` nodes → O(n) space. For a tall narrow tree, each level has 1 node → O(1) space.

Neither DFS nor BFS dominates the other in space — it depends on tree shape.

## Five essential tree interview problems

These five problems cover the core techniques and appear across almost every company's interview set ([S031](../../research/coding-algorithms-technical-interviews/01-sources/web/S031-tree-binary-search-tree-tih.md)):

1. **Maximum Depth** (LeetCode 104) — post-order: `return 1 + max(depth(left), depth(right))`
2. **Invert Binary Tree** (LeetCode 226) — pre-order: swap left and right at each node
3. **Lowest Common Ancestor** (LeetCode 236) — return the first node where both targets are found in different subtrees
4. **Binary Tree Level Order Traversal** (LeetCode 102) — level-order BFS with level_size trick
5. **Validate BST** (LeetCode 98) — in-order DFS with min/max bounds propagated down

## Key points

- Pre-order processes root first; in-order processes root between children; post-order processes root last — learn the mnemonics.
- **In-order traversal of a BST produces a sorted sequence** — most-tested BST fact.
- Level-order uses BFS with a queue; the `level_size = len(queue)` trick separates levels cleanly.
- BST all-operations cost O(h): O(log n) balanced, O(n) skewed.
- Recursion space for tree DFS = O(h) = O(log n) balanced, O(n) skewed.

## Go deeper

- [S031](../../research/coding-algorithms-technical-interviews/01-sources/web/S031-tree-binary-search-tree-tih.md) — TIH tree and BST cheatsheet with traversal templates and essential problem list

---

*← [Previous lesson](./L10-sort-preprocessing.md)* · *[Next lesson: BFS — Shortest Path and Level-Order](./L12-bfs.md) →*
