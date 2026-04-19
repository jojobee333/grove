# Pattern Languages and Design Vocabulary

**Module**: M01 · Pressure-First Foundations  
**Type**: core  
**Estimated time**: 20 minutes  
**Claim**: C1, C6 from Strata synthesis

---

## The core idea

A pattern is rarely the end of a design conversation. It is usually the beginning of the next one. Ward Cunningham's framing is important: patterns form *languages*. That means one design move often suggests another. If you isolate application orchestration with a service layer, you may then need a richer domain model beneath it. If you isolate persistence with a data mapper, a repository may become a natural query boundary above it. If you centralize a global service with a locator, you may need a Null Object to reduce temporal coupling for callers [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md) [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md).

The term "pattern language" matters because it prevents the most common beginner mistake: studying patterns as isolated tricks. Real systems do not say "today we use Repository and nothing else." They say "we need a query boundary here, a domain behavior home here, and a transaction coordination mechanism here." That is a composed, pressure-aware design vocabulary in use.

This view has a practical implication: when you study a single pattern in this course, also ask what pressure sits next to it and which neighboring pattern that pressure might call for. The whole course is structured this way — each module focuses on one pattern family, but every lesson points toward where the composition reaches.

## What a pattern language looks like in practice

Think of it like a natural language. In English, when you use the word "order," the sentence creates expectations: there is something being ordered, a person doing the ordering, and probably a recipient. Words in a sentence activate meaning through their relationships.

Patterns work similarly. When a design introduces a **Service Layer** (which handles application-boundary orchestration), the layer immediately raises two questions: what lives *above* it (UI, APIs, jobs) and what lives *below* it (domain behavior). The answer below often points toward a **Domain Model**. And if that domain model needs persistent storage, the boundary between the domain objects and the database creates a natural home for a **Data Mapper**. And if the domain model needs query access, a **Repository** concentrates that access cleanly. And if multiple domain objects change together as one business action, a **Unit of Work** coordinates that writeback.

Each of those five patterns addresses a different pressure. None of them overlaps. Together they form a coherent stack — not because someone stacked them deliberately, but because each one answered the pressure that appeared at its layer.

## Why it matters

Without the language view, pattern study produces fragments that do not transfer to real systems. A developer who memorizes Service Layer in isolation may correctly identify where to put orchestration but miss the domain model question entirely. That leads to thin service layers that accumulate business logic by accident — the "anemic domain model" anti-pattern covered in L21.

The language view also explains why this course is structured as individual deep-dive lessons rather than one big survey. You need to understand each pattern individually (one lesson per pattern) *and* how it connects to the patterns adjacent to it (composition lessons in M09). Both views are necessary [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md).

## Example 1 — order processing pattern composition

Consider an order-processing system. How do five patterns divide the responsibility?

```
[HTTP Request] 
    → OrderService.place_order()     ← Service Layer (orchestration boundary)
        → Order.apply_discounts()    ← Domain Model (business behavior lives here)
        → OrderMapper.insert(order)  ← Data Mapper (translates domain → relational)
            via OrderRepository      ← Repository (centralizes query access)
        → UnitOfWork.commit()        ← Unit of Work (coordinates writeback)
```

No single pattern explains this design. It works because five patterns divide five distinct pressures:
- Service Layer absorbs duplicated application coordination
- Domain Model absorbs business rule density
- Data Mapper absorbs object-relational mismatch
- Repository absorbs query duplication
- Unit of Work absorbs coordinated writeback timing

Remove any one of them and a different pressure becomes unmanaged. Add a sixth without a new pressure and you are adding ceremony.

## Example 2 — following the language from one pattern to the next

Imagine you start with only a Transaction Script (a simple procedural handler for each request). As the business rules grow, you notice they are duplicating logic across scripts. That is the signal that a **Domain Model** would help. Once the domain model exists, the relational schema starts to leak into it. That is the signal for a **Data Mapper**. Once multiple queries are scattered across handlers, a **Repository** concentrates them. The pattern language follows the pressure curve — each step is a response to a new cost that appeared, not a speculative stack built upfront [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md).

**There is a real disagreement here.** The same composability that makes pattern languages powerful can become a trap. Convenience-oriented composition — for example, building a full enterprise stack because it looks complete — can collapse into a hidden dependency web [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md). And prebuilt abstraction stacks that arrive before their pressures are real create speculative complexity instead of solving actual problems [S014](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S014-fowler-yagni.md). The composition principle is not "use more patterns." It is "each pattern in the composition must own a distinct pressure." That constraint keeps the language coherent.

## Example 3 — behavioral composition in a text editor

The pattern-language principle is not limited to enterprise persistence stacks. It applies equally in interaction-heavy systems. Consider a text editor that grows in capability over time:

```
[User keypress: "x"]
    → TypingCommand.execute()           ← Command  (makes the action undoable)
        → Document.insert_char("x")     ← Domain Model (document state)
        → EditorMode.on_input("x")      ← State  (insert mode vs. command mode)
        → EventBus.notify(listeners)    ← Observer (syntax highlight, spell-check, co-cursor)
```

Each pattern enters for a different reason, at a different moment in the editor's evolution:

- **Command** is added when undo/redo becomes a real product requirement. Before that, direct mutation of the document is simpler [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md).
- **Domain Model** emerges when the document state grows complex enough to have rules — cursor constraints, formatting invariants, selection semantics — that do not belong in the input handler.
- **State** is added when the input handler starts branching heavily on *mode* (insert mode, visual mode, dialog mode). A state machine makes those transitions explicit instead of scattering `if mode == "insert"` checks everywhere [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md).
- **Observer** enters when multiple subsystems — syntax highlighting, spell-checking, collaborative cursor rendering — need to react to document changes without being directly coupled to the input handler [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md).

At no point was the full composition designed upfront. Each pattern appeared because a new pressure appeared. The language told the designer what to listen for next. This is the same principle as the persistence stack in Example 2, applied to a different domain with a different pattern family.

The practical takeaway: when you study an individual pattern lesson in this course, ask which pressure sits adjacent to it and which neighboring pattern that pressure calls for. The composition picture emerges from understanding each pattern's pressure-response role, not from memorizing a recommended stack.

## Key points

- Patterns form languages because one design move often suggests the next pressure to address [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md)
- Composition works when each pattern owns a different pressure — not when several abstractions compete for the same responsibility
- The language view prevents two failure modes: isolated pattern memorization and speculative stack building
- Real compositions emerge one pressure at a time, not as a complete upfront blueprint [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md)

## Go deeper

- [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md) — Ward Cunningham on the pattern-language idea and how patterns recall each other
- [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md) — the broad field-observed corpus showing how enterprise patterns naturally compose
- [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md) — a practical example of one pattern (Service Locator) combining naturally with Null Object and Decorator

---

*[← Previous lesson](./L02-diagnosing-pressure.md)* · *[Next lesson: Dependency Injection as a Construction Boundary →](./L04-dependency-injection.md)*
