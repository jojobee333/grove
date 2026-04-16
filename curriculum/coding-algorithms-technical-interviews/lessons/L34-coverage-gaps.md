# Linked List Pointer Patterns — Reversal, Dummy Head, and Slow/Fast

**Module**: M10 · Backtracking, Union-Find, and Remaining Interview Patterns
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C15 from Strata synthesis

---

## The core idea

Linked-list questions are rarely about fancy asymptotics. They are about pointer hygiene under pressure. The good news is that the interview surface is compact: most linked-list problems reduce to four routines you can internalise and reuse.

1. Use a **dummy / sentinel node** when an operation might touch the head.
2. Reverse a list in place with the `prev / curr / nxt` pattern.
3. Use **slow / fast pointers** for middle, cycle, and kth-from-end style tasks.
4. Merge two sorted lists by walking two cursors and attaching the smaller node each step.

That is why linked lists sit in the second wave of study: they recur often enough to matter, but they do not require a huge template library once the core routines are automatic ([S034](../../research/coding-algorithms-technical-interviews/01-sources/web/S034-linked-list-cheatsheet-tih.md), [S021](../../research/coding-algorithms-technical-interviews/01-sources/web/S021-blind75-grind75-tech-interview-handbook.md), [S023](../../research/coding-algorithms-technical-interviews/01-sources/web/S023-algorithm-priority-tech-interview-handbook.md)).

## Routine 1: Dummy node for head-edge cases

Whenever insertion, deletion, or merging might change the head, a dummy node removes special cases.

```python
def merge_two_lists(l1: ListNode | None, l2: ListNode | None) -> ListNode | None:
	dummy = ListNode(0)
	tail = dummy

	while l1 and l2:
		if l1.val <= l2.val:
			tail.next = l1
			l1 = l1.next
		else:
			tail.next = l2
			l2 = l2.next
		tail = tail.next

	tail.next = l1 if l1 else l2
	return dummy.next
```

**Why it matters**: without the dummy, you constantly branch on “am I updating the true head?” With the dummy, every attach operation has the same shape.

## Routine 2: In-place reversal

```python
def reverse_list(head: ListNode | None) -> ListNode | None:
	prev = None
	curr = head

	while curr:
		nxt = curr.next
		curr.next = prev
		prev = curr
		curr = nxt

	return prev
```

**Invariant**: `prev` is the already-reversed prefix, `curr` is the next node to process, and `nxt` preserves the remainder before the pointer flip.

This routine powers full reversal, partial reversal, reorder-list style tasks, and several palindrome-on-linked-list variants.

## Routine 3: Slow / fast traversal

```python
def middle_node(head: ListNode | None) -> ListNode | None:
	slow = head
	fast = head

	while fast and fast.next:
		slow = slow.next
		fast = fast.next.next

	return slow
```

This same shape solves:

- middle of linked list,
- cycle detection,
- kth node from the end when one pointer starts ahead, and
- several split-the-list problems.

**Recognition cue**: if the prompt asks for “middle”, “cycle”, or “relative distance between two positions in one list”, think slow / fast before you think hash set.

## Routine 4: Merge as a pointer-attachment problem

Many linked-list prompts are really “attach the next correct node and advance that pointer.” Merge Two Sorted Lists is the cleanest example, but the same mindset appears in partitioning and stable re-linking problems.

The key habit is to think in terms of **next-pointer rewiring**, not array-style overwriting.

## Common mistakes

- Forgetting to save `curr.next` before reversing a node.
- Solving head-touching problems without a dummy node and drowning in special cases.
- Marking linked lists as “easy” because the asymptotics are simple, then dropping points on pointer order.
- Reaching for a hash set first on middle / kth-from-end tasks where slow / fast gives O(1) extra space.

## Decision rules

- If the head may change: start with a dummy node.
- If you need the middle, a cycle check, or a distance offset: start with slow / fast.
- If the prompt says reverse, reorder, or splice: sketch the pointer states before coding.
- If the input is already two sorted linked lists: think merge routine, not array conversion.

## Key points

- Linked-list interview performance comes from four compact routines: dummy node, reversal, slow / fast, and merge.
- Dummy nodes remove head-edge special cases and often produce the cleanest code.
- Reversal depends on preserving `next` before changing `curr.next`.
- Slow / fast pointers are the default tool for middle, cycle, and offset-traversal problems.

## Go deeper

- [S034](../../research/coding-algorithms-technical-interviews/01-sources/web/S034-linked-list-cheatsheet-tih.md) — linked-list routines, complexity table, and dummy-node guidance
- [S023](../../research/coding-algorithms-technical-interviews/01-sources/web/S023-algorithm-priority-tech-interview-handbook.md) — linked lists as a mid-priority interview topic
- [S021](../../research/coding-algorithms-technical-interviews/01-sources/web/S021-blind75-grind75-tech-interview-handbook.md) — linked-list presence in the common interview-problem set

---

*← [Previous lesson](./L33-dp-priority-debate.md)* · *[Next lesson: Trie Basics — Prefix Matching and StartsWith](./L35-trie-basics.md) →*
