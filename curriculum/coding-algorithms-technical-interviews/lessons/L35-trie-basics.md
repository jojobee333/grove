# Trie Basics — Prefix Matching and StartsWith

**Module**: M10 · Backtracking, Union-Find, and Remaining Interview Patterns
**Type**: core
**Estimated time**: 12 minutes
**Claim**: C16 from Strata synthesis

---

## The core idea

A trie is a prefix tree: instead of storing each word independently, it shares common prefixes across words. That makes tries valuable when the problem is not merely “work with strings,” but specifically “answer many prefix questions efficiently.”

The interview payoff is predictable:

- `insert(word)` in O(m)
- `search(word)` in O(m)
- `starts_with(prefix)` in O(m)

where `m` is the length of the query string, not the total number of stored words ([S035](../../research/coding-algorithms-technical-interviews/01-sources/web/S035-trie-cheatsheet-tih.md)).

## The canonical template

```python
class TrieNode:
	def __init__(self) -> None:
		self.children: dict[str, TrieNode] = {}
		self.is_end = False


class Trie:
	def __init__(self) -> None:
		self.root = TrieNode()

	def insert(self, word: str) -> None:
		node = self.root
		for ch in word:
			if ch not in node.children:
				node.children[ch] = TrieNode()
			node = node.children[ch]
		node.is_end = True

	def search(self, word: str) -> bool:
		node = self.root
		for ch in word:
			if ch not in node.children:
				return False
			node = node.children[ch]
		return node.is_end

	def starts_with(self, prefix: str) -> bool:
		node = self.root
		for ch in prefix:
			if ch not in node.children:
				return False
			node = node.children[ch]
		return True
```

## When to use a trie

Use a trie when the prompt has one or more of these signals:

- repeated prefix checks,
- autocomplete or dictionary suggestions,
- word search with heavy prefix pruning,
- many string lookups against the same dictionary.

If you only need a one-off membership check, a hash set is simpler. The trie becomes worthwhile when **shared prefixes** or repeated prefix queries justify the preprocessing cost.

## Why O(m) matters

The important complexity habit is to express trie work in terms of **query length**. If the word has length `m`, insert/search/prefix-check each walk at most `m` edges.

That is what makes tries attractive for large dictionaries: the lookup cost scales with the word you ask about, not with the number of words already stored.

## Decision rules

- If the task is just exact membership: prefer a hash set.
- If the task is repeated prefix lookup: a trie is a strong candidate.
- If the prompt combines prefix search with backtracking over a board or graph, expect trie + DFS together.
- Keep tries after the first-wave array / tree / graph patterns in a general prep plan.

## Key points

- A trie is the right tool when shared prefixes are the real structure in the problem.
- The canonical interview API is `insert`, `search`, and `starts_with` on top of a TrieNode with `children` and `is_end`.
- Operation cost is O(m), where `m` is the query length.
- Tries are real interview content, but they still belong after the higher-ROI first-wave patterns.

## Go deeper

- [S035](../../research/coding-algorithms-technical-interviews/01-sources/web/S035-trie-cheatsheet-tih.md) — trie template, O(m) operation costs, and recognition cues
- [S002](../../research/coding-algorithms-technical-interviews/01-sources/web/S002-neetcode-150-roadmap.md) — tries positioned after trees in the roadmap
- [S021](../../research/coding-algorithms-technical-interviews/01-sources/web/S021-blind75-grind75-tech-interview-handbook.md) — later-stage trie practice in the common study plan
- [S023](../../research/coding-algorithms-technical-interviews/01-sources/web/S023-algorithm-priority-tech-interview-handbook.md) — trie as a mid-priority interview topic

---

*← [Previous lesson](./L34-coverage-gaps.md)* · *[Next lesson: Greedy Algorithms — Exchange Arguments and Local Choice](./L36-greedy-exchange-arguments.md) →*