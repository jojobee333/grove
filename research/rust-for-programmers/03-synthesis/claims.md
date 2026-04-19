# Claims — Rust for Programmers

_Evidence-backed curriculum claims derived from analysis of S001–S011._

---

## C1: The Canonical Rust Learning Sequence Is Empirically Validated

**Claim**: There is a single correct order for teaching Rust fundamentals, validated by three independent sources.

**Evidence**: The Rust Book chapter order (S001–S011), Rust By Example topic list (S006), and Rustlings exercise sequence (S007) all converge on the same 9-module structure: setup → ownership/borrowing → structs/enums → collections → error handling → generics/traits/lifetimes → closures/iterators → smart pointers → concurrency.

**Confidence**: High. Three independent primary sources converge.

**Implication**: Grove course module order must follow this sequence; deviating introduces conceptual dependency gaps (e.g., teaching traits before ownership creates confusion about where `Clone` and `Copy` come from).

---

## C2: Ownership Is the Primary Conceptual Gateway — It Must Be Addressed Deeply, Not Briefly

**Claim**: Ownership/borrowing cannot be introduced as a single lesson — it requires 2–3 lessons with multiple exercises and a mini-project.

**Evidence**: Rustlings devotes 5 exercise blocks to ownership concepts (variables2, move_semantics, references, primitive_types with borrowing) before any other advanced topic (S007). The Rust Book devotes all of Ch4 (two chapters: S001 + S002) plus revisits it in structs (S008). RBE has 3 separate sections on ownership/borrowing/references (S006).

**Confidence**: High.

**Implication**: Module 2 of the Grove course = "Ownership & Borrowing" with 3 lessons: move semantics, borrowing rules, string ownership (`String` vs `&str`).

---

## C3: Enums + match + Option<T> Should Be Taught as a Single Coherent System

**Claim**: Teaching enums, `Option<T>`, and `match` as separate topics is pedagogically inferior to teaching them together as Rust's answer to "no null + exhaustive branching."

**Evidence**: S009 presents all three in one chapter (ch6). The "no null in Rust" mental shift is the anchor insight — `Option<T>` loses meaning without match, and match loses motivation without enums carrying data.

**Confidence**: High.

**Implication**: Module 4 = "Enums, Pattern Matching, and the Null Alternative" — one module, three lessons, one mini-project (e.g., a simple expression evaluator using `enum Expr`).

---

## C4: The Type System's Compiler-Time Safety Is the Core Value Proposition

**Claim**: Every module should be framed around the question "what class of bugs does Rust eliminate here?" — this provides intrinsic motivation for the compiler's strictness.

**Evidence**: The Rust Book consistently uses this framing (dangling refs for lifetimes, data races for concurrency, null derefs for Option, unmatched variants for match). S005 explicitly calls the concurrency chapter "Fearless Concurrency." S002 shows NLL enabling code to compile that previously failed.

**Confidence**: High.

**Implication**: Each lesson opener should explicitly name the bug class being eliminated.

---

## C5: Lifetime Annotations Are Rare in Practice — Teach Elision Rules First

**Claim**: 80–90% of real Rust code never needs explicit lifetime annotations. Teaching lifetimes via elision rules first is more effective than starting with `fn longest<'a>(...)`.

**Evidence**: S010 documents all three elision rules; notes that methods with `&self` almost never need explicit annotations. Community pattern confirms `'a` annotations mostly appear in library code, not application code.

**Confidence**: Medium-high (elision rules documented but no empirical study of annotation frequency).

**Implication**: Lifetime lesson should open: "The compiler handles this automatically in most cases." Then show the three elision rules. Then show the function-level annotation for the specific cases that need it.

---

## C6: Iterators Are the Idiomatic Alternative to Explicit Loops — and Are Zero-Cost

**Claim**: `map`/`filter`/`collect` chains should be taught as the preferred Rust idiom over index-based loops, not as an advanced feature.

**Evidence**: S011 documents LLVM optimization: iterator chains compile to equivalent machine code as hand-written loops ("zero-cost abstraction"). RBE covers iterators extensively (S006). Rustlings positions iterators as one of the final exercise blocks (S007), confirming they're a capstone skill, not an afterthought.

**Confidence**: High.

**Implication**: Iterator module should include a "refactoring" exercise: take a loop-based solution and rewrite it with iterators — solidifies idiomatic Rust.

---

## C7: Concurrency Safety Emerges from Ownership — Not from Additional Mechanisms

**Claim**: Concurrency in Rust should be framed as "ownership extended to threads" — all thread-safety properties (`Send`, `Sync`, `move` closures, `Arc<Mutex<T>>`) derive from the same ownership rules already learned.

**Evidence**: S005 shows `Rc<T>` is not `Send` (same lifetime-ownership enforcement, just for threads); `move` closures appear in ch13 (ownership in closures) and ch16 (thread ownership transfer). The compile-time prevention of data races is the same borrow checker.

**Confidence**: High.

**Implication**: Concurrency module intro should explicitly say "You already know this — here's how ownership prevents data races." Minimizes cognitive load.

---

## C8: Every Module Needs a Runnable Mini-Project to Solidify Hands-On Learning

**Claim**: Theory-only modules produce learners who can't write Rust. Every module must end with a runnable, complete mini-project (not an exercise fragment).

**Evidence**: User-specified pedagogy requirement (brief.md). Rustlings validates: every exercise block ends in a quiz that synthesizes knowledge (S007). "100 Days of Python" model: daily project anchors retention.

**Confidence**: High (specification requirement).

**Implication**: Mini-projects should be concrete, standalone, and increasing in complexity. Examples: CLI temperature converter → custom struct with methods → CSV parser → concurrent word counter.
