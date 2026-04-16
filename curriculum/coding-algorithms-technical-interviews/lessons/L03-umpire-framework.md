# The UMPIRE Interview Communication Framework

**Module**: M01 · The Interview Algorithm Landscape
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C10 from Strata synthesis

---

## The situation

Most developers focus entirely on finding the correct algorithm solution — and entirely neglect the communication layer. This is a mistake. In a coding interview, **the process you demonstrate matters as much as whether you reach the correct solution** ([S012](../../research/coding-algorithms-technical-interviews/01-sources/web/S012-umpire-interview-strategy-codepath.md)). An interviewer who sees you navigate a hard problem systematically — even if you don't fully solve it — will rate you higher than a candidate who silently stares at the screen and then writes a correct solution with no commentary.

The UMPIRE framework is a six-step scaffold that structures your communication during a coding interview. It was developed by CodePath to make the problem-solving process explicit and communicable. The six steps are:

- **U** — Understand
- **M** — Match
- **P** — Plan
- **I** — Implement
- **R** — Review
- **E** — Evaluate

## The approach

### U — Understand (2–3 minutes)

Before writing any code, restate the problem in your own words and ask clarifying questions.

- What are the input types and constraints? (integers, strings, lists? negative numbers allowed? empty input?)
- What is the expected output format?
- What edge cases should be explicitly handled? (empty array, single element, n=1, all duplicates)
- What are the input size constraints? (n ≤ 10³, n ≤ 10⁶? This affects your complexity target)

Do not skip this step even for "easy" problems. Interviewers expect clarifying questions. Candidates who write code immediately look hasty and overconfident.

**Sample for Two Sum:** "So I'm given an array of integers and a target value, and I need to return the indices of two numbers that sum to the target. I can assume exactly one valid answer exists. The array could contain negatives. Input size — is n up to 10⁴ or larger? What if there are duplicate values — should I consider the same element twice?" (Answer: no, distinct indices required.)

### M — Match (1–2 minutes)

Identify which pattern family this problem belongs to. Say it out loud.

"This looks like a [pattern name] problem because [recognition signal]."

The recognition signals come from L01:
- "Find two elements that sum to X" → two pointers (sorted input) or hash map (unsorted)
- "Subarray/substring with constraint" → sliding window
- "Find minimum/maximum in sorted structure or decision space" → binary search
- "Tree path / depth / inversion" → DFS recursion
- "Shortest path / level order" → BFS

This is the most commonly skipped step. Candidates jump from Understand to Plan without naming the pattern. The Match step forces you to connect the problem to your template library, which is exactly how the fastest solutions are produced.

### P — Plan (2–3 minutes)

Describe your approach in pseudocode or plain English before writing the actual implementation.

"I'll maintain a hash map of {value: index}. For each element, I'll check if target - element is already in the map. If yes, return [map[complement], i]. If no, add element: i to the map."

State the time and space complexity of your plan: "This will be O(n) time and O(n) space." If you can see a way to improve it, say so: "I could also sort and use two pointers for O(n log n) time and O(1) space — I'll go with the hash map approach since it's faster."

This step also helps you catch plan flaws before you commit to code.

### I — Implement (10–20 minutes)

Write the code. Talk while you write — narrate your logic.

"I'm initialising the map here. Now entering the loop. For each index i, I compute the complement. I check if complement is in seen — if so I've found my answer and return the indices. Otherwise I add the current element to seen."

Narrating helps the interviewer follow your logic and spots bugs you might miss silently. It also buys you time — speaking slows your writing speed slightly and triggers more careful thinking.

```python
def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}                          # value -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []                          # problem guarantees one answer, never reached
```

### R — Review (2–3 minutes)

After writing the code, **trace through it manually** with a small example. Do not just re-read the code — run a concrete test case step by step.

"Running [2, 7, 11, 15], target=9. i=0, num=2, complement=7, seen={}. 7 not in seen. Add 2→0 to seen. i=1, num=7, complement=2, 2 in seen! Return [0, 1]. Correct."

Then check your edge cases:
- Empty array: loop never executes, returns [] — acceptable since problem guarantees a solution.
- Single element: loop runs once, complement not in seen, adds element, returns [] — acceptable.
- Duplicate values: [3, 3], target=6. i=0, 3 not in seen, add 3→0. i=1, complement=3, in seen, return [0, 1]. Correct — distinct indices.

This step is the second most commonly skipped. Candidates who trace their code catch bugs before the interviewer does, which looks dramatically better than the interviewer having to point out the error.

### E — Evaluate (1–2 minutes)

Summarise your solution's complexity and any known limitations.

"This solution is O(n) time — one pass through the array. O(n) space for the hash map in the worst case where no valid pair is found until the last elements. The trade-off vs. the brute-force O(n²) solution is that we use extra space to eliminate the nested loop."

If there is a clearly better solution you didn't implement (e.g., you did O(n log n), an O(n) exists): name it and explain why you chose the approach you did.

## Worked example: communicating under real time pressure

The UMPIRE scaffold works even when you are not sure of the solution. Suppose you are given a graph problem you have not seen before:

- **U**: "I'm given a directed graph. I need to detect if a cycle exists. Input is an adjacency list with V vertices and E edges. Can vertices have self-loops? Can there be isolated vertices?"
- **M**: "This looks like a DFS cycle-detection problem. On directed graphs, cycle detection uses three-colour marking — white (unvisited), grey (in current DFS path), black (fully processed). A back edge — reaching a grey node — indicates a cycle."
- **P**: "I'll run DFS from every unvisited vertex. Mark each node grey when entered, black when fully processed. If DFS reaches a grey node, return True."
- **I**: Write the code with narration.
- **R**: Trace a simple cyclic graph: 0→1→2→0. DFS from 0: mark 0 grey, go to 1, mark 1 grey, go to 2, mark 2 grey, from 2 visit 0 — 0 is grey → cycle detected. Correct.
- **E**: "O(V+E) time, O(V) space for the colour array. Could also use Kahn's BFS for topological sort — if result size < V, a cycle exists."

A candidate who cannot solve the problem but communicates at this level will often pass — because the interviewers are watching you think, not just watching you type.

## Key points

- UMPIRE stands for Understand, Match, Plan, Implement, Review, Evaluate — a six-step communication scaffold for coding interviews.
- The **Match** step (naming the pattern family) is the most commonly skipped and most directly impacts solution speed.
- The **Review** step (tracing with a concrete test case) is the second most commonly skipped and most directly catches bugs before the interviewer does.
- Narrating your logic during Implement slows hasty coding and gives the interviewer signal about your process.
- A well-communicated partial solution often scores higher than a silently-produced correct solution.

## Go deeper

- [S012](../../research/coding-algorithms-technical-interviews/01-sources/web/S012-umpire-interview-strategy-codepath.md) — CodePath UMPIRE methodology with detailed examples

---

*← [Previous lesson](./L02-study-sequence.md)* · *[Next lesson: Hash Map and Set — The Interview Foundation](./L04-hash-map-foundation.md) →*
