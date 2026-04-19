# Research Brief — Rust for Programmers

## Main Research Question
What concepts, mental models, and practical skills does a programmer need to become
productive in Rust, and how should a Grove learning curriculum be structured to
teach them effectively?

## Output
A Grove course bundle (course.json, lessons, cards, quizzes, modchecks, code challenges)
for the slug `rust-for-programmers`. Target learner: programmer comfortable in at least
one other language (Python, JS, or Java), zero Rust experience.

## Constraints
- Cover ownership, borrowing, lifetimes, traits, error handling, and concurrency
- Each module must be teachable in ≤90 minutes of active learning
- Content must be grounded in official Rust docs (The Book, Reference, std docs)
- Code examples must compile on stable Rust (no nightly-only features)
- No unsafe Rust in core curriculum (mention it exists; don't teach it)

## Pedagogy Approach
Hands-on, project-driven — modelled on "100 Days of Python" style courses:
- Every lesson ends with a small, runnable mini-project or challenge (not just exercises)
- Mini-projects build on each other where possible (e.g., a CLI tool that grows across modules)
- Theory is introduced just-in-time: concepts are taught because the mini-project needs them
- Each module has a capstone challenge that ties its mini-projects together
- Code challenges in Grove must be solvable in the in-browser runner (Python WASM or JS)
  — for Rust-specific concepts, use equivalent Python or JS code challenges that mirror the pattern

## Success Criteria
A learner who completes the course can:
1. Write and run a Rust program from scratch
2. Explain ownership, borrowing, and the borrow checker's rules
3. Handle errors idiomatically with Result and the ? operator
4. Define and implement traits
5. Write concurrent code using threads or async/await at a basic level
6. Recognise and build the hands-on project patterns taught in each module
