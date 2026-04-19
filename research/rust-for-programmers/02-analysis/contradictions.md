# Contradictions — Rust for Programmers

_Cross-source conflicts and tensions identified during analysis._

---

## C1: State.json shows 6 questions but plan.md defines 7 (RESOLVED)

**Sources**: state.json, 00-intake/plan.md  
**Nature**: Administrative inconsistency — state.json was not updated when Q7 (hands-on curricula) was added during intake.  
**Resolution**: Q7 is valid; state.json updated to reflect 7 questions.

---

## C2: When to Introduce Closures (minor tension)

**Sources**: S006 (RBE places closures in "Functions" ch9), S011 (Rust Book ch13.1 — closures before iterators), S007 (Rustlings: no explicit closures exercise block)  
**Nature**: RBE introduces closures earlier (as part of functions); Rust Book defers to ch13.  
**Assessment**: This is pedagogical preference, not a contradiction. Rust Book's approach is correct for a structured course — closures taught just-in-time before iterators.  
**Curriculum decision**: Closures in the same module as iterators, not with functions.

---

## C3: Lifetimes "everywhere" vs "rarely needed" (apparent contradiction)

**Sources**: S010 notes elision rules cover most cases; but error messages frequently show `'a` annotations  
**Nature**: Learners may encounter lifetime annotations in error messages and ecosystem crates before they understand them.  
**Assessment**: Not a real contradiction — elision is the common case, explicit annotations are needed for `longest`-style multi-reference functions and structs-with-references. The course should frame it as: "compiler handles 95% of cases; here's the 5% where you annotate."  
**No curriculum conflict.**

---

## C4: Async/await Scope (no formal conflict, but tension)

**Sources**: S005 mentions async as the "next chapter" after concurrency; scope-out in brief.md explicitly excludes async.  
**Nature**: Async is deeply connected to concurrency and iterators (Future is essentially an iterator over async steps). Beginners will want to know why async isn't covered.  
**Assessment**: Correct decision to defer — async requires understanding of lifetimes, traits (Future trait), pinning, and the runtime ecosystem (Tokio). It is its own 40+ hour course.  
**Curriculum decision**: Mention async at end of concurrency module as "the next big topic" but explicitly defer. Recommend a follow-up course.

---

## C5: `String` vs `&str` confusion — foundational or advanced?

**Sources**: S001 (mentions `String` as heap-allocated), S008 (says use `String` not `&str` in structs until lifetimes understood), S007 (Rustlings has explicit "strings" exercise block after structs/enums)  
**Nature**: No contradiction, but the `String`/`&str` duality is a perennial beginner confusion that surfaces everywhere: function parameters, structs, collections.  
**Assessment**: Should be treated as a recurring conceptual thread rather than a single lesson. Introduce `String` vs `&str` in the ownership module, revisit in functions, structs, and collections.  
**Curriculum note**: Do not try to fully explain in one lesson. "Use `String` when in doubt, we'll explain `&str` over time."
