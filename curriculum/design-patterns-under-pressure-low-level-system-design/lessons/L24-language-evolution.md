# When Languages Outgrow Pattern Templates

**Module**: M08 · Criticism, Overuse, and Pattern Economics
**Type**: debate
**Estimated time**: 20 minutes
**Claim**: Contradiction 2 from Strata synthesis

---

## The core idea

Some classic design patterns were originally documented in object-oriented languages that lacked closures, first-class functions, and powerful type systems. As languages evolved, the canonical class-heavy forms of some patterns became unnecessary, awkward, or more expensive than the underlying problem warranted.

The research resolves this apparent contradiction clearly: the **underlying problem** and the **canonical implementation form** are not the same thing [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md). A design pressure can persist even when the class diagram that once solved it is no longer the best vehicle. The enduring lesson is not the implementation shape. It is the force-and-response insight.

This matters for how you study patterns. If you memorize the class diagram, you may either over-apply it in a language where something lighter works better, or dismiss the pattern entirely as "old-fashioned." Both are mistakes. The goal is to keep the design knowledge while allowing the implementation to modernize [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md).

**There is a real disagreement here.** Fowler and Cunningham frame patterns as enduring design knowledge that transcends specific language forms [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md) [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md). Critics such as the sources behind S006 and S011 argue that at least some canonical forms have genuinely become workarounds for language weaknesses, and that teaching them as universal templates produces cargo-cult design. The research resolution: the critics are right about the forms, the foundational authors are right about the problems.

## Why it matters

For a practical engineer, this distinction prevents two failure modes. The first is applying a class-heavy Command or Observer hierarchy in a language that has closures, when a simpler function-based form would do the same work with less machinery. The second is dismissing patterns as obsolete and missing the real design insight behind them. Deep study means knowing what part of the knowledge is permanent and what part is language-era artifact.

## Example 1 — Command: class hierarchy vs closure

**Classic form** (written for a language without first-class functions):

```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...

class MoveForwardCommand(Command):
    def __init__(self, player): self.player = player
    def execute(self) -> None: self.player.move_forward()

class AttackCommand(Command):
    def __init__(self, player): self.player = player
    def execute(self) -> None: self.player.attack()

# Input map: string → Command object
input_map = {
    "W": MoveForwardCommand(player),
    "Q": AttackCommand(player),
}
```

**Modern equivalent** in Python, where functions are first-class objects:

```python
# Same design intent — actions are assignable and storable — but no class hierarchy needed
input_map: dict[str, Callable[[], None]] = {
    "W": player.move_forward,
    "Q": player.attack,
}

# Calling is identical in use:
action = input_map.get(key)
if action:
    action()
```

The pressure — "actions must be assignable and rebindable separately from their target" — is the same. The implementation using closures or bound methods is lighter. The design insight is not gone; the class boilerplate is [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md).

When does the full class hierarchy still pay off? When commands need undo, serialization, queueing, or macro replay. A closure does not carry its own `undo()` method. When those requirements are real, the richer object form earns its keep again.

## Example 2 — Prototype: clone hierarchies vs other construction forms

The Prototype pattern's canonical form involves a `clone()` method on every class in a hierarchy, enabling configured variants to be copied cheaply. Nystrom shows that this becomes awkward when languages offer lighter alternatives:

```python
# Classic Prototype: every variant class implements clone
class Monster:
    def __init__(self, health: int, speed: float, sprite: str):
        self.health = health
        self.speed  = speed
        self.sprite = sprite

    def clone(self) -> "Monster":
        return Monster(self.health, self.speed, self.sprite)

# Prototypes as configured instances:
ghost_proto   = Monster(health=50,  speed=1.5, sprite="ghost.png")
zombie_proto  = Monster(health=100, speed=0.5, sprite="zombie.png")

# Modern equivalent using dataclasses with replace:
from dataclasses import dataclass, replace

@dataclass
class Monster:
    health: int
    speed:  float
    sprite: str

ghost_proto  = Monster(health=50,  speed=1.5, sprite="ghost.png")
zombie_proto = Monster(health=100, speed=0.5, sprite="zombie.png")

# Spawning a faster ghost variant:
fast_ghost = replace(ghost_proto, speed=2.5)
```

The pressure — "reuse a configured object as a template for cheap variant creation" — is still real in games with many enemy types. But `dataclasses.replace()` or `copy.copy()` handles it without a `clone()` method on every class. The pattern problem persists; the canonical form is no longer necessary in Python [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md).

## Example 3 — Observer: typed event classes vs simple callable subscriptions

```python
# Classic Observer: typed event objects and formal handler interface
class EventHandler(ABC):
    @abstractmethod
    def on_entity_fallen(self, entity: Entity, new_pos: Position) -> None: ...

class PhysicsEngine:
    def __init__(self):
        self._handlers: list[EventHandler] = []

    def add_handler(self, h: EventHandler) -> None:
        self._handlers.append(h)

    def _notify_fallen(self, entity, new_pos) -> None:
        for h in self._handlers:
            h.on_entity_fallen(entity, new_pos)

# Modern equivalent: callable subscriptions with no interface requirement
class PhysicsEngine:
    def __init__(self):
        self._on_fallen: list[Callable[[Entity, Position], None]] = []

    def on_fallen(self, handler: Callable[[Entity, Position], None]) -> None:
        self._on_fallen.append(handler)

    def _notify_fallen(self, entity: Entity, new_pos: Position) -> None:
        for h in self._on_fallen:
            h(entity, new_pos)
```

The design insight — "the physics engine should not need to know about every system that cares when something falls" — is unchanged. The implementation in a language with typed callables eliminates the abstract base class while keeping the notification decoupling fully intact.

## Key points

- The enduring part of pattern knowledge is the force-and-response relationship, not the class diagram [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md)
- Closures, first-class functions, and richer type systems eliminate the need for some class-heavy pattern forms without eliminating the underlying problems
- Command, Prototype, and Observer all have lighter modern implementations when the full original power is not required
- The full class-based form remains justified when additional requirements appear (undo, serialization, typed event contracts)
- Dismissing patterns as obsolete because their classic form looks verbose is as much a mistake as rigidly applying that form [S012](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S012-c2-pattern-languages.md)

## Go deeper

- [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md) — clearest source on pattern idea versus implementation form, with Prototype as the central case
- [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md) — patterns as evolving tools, not fixed templates tied to a language era

---

*[← Previous lesson](./L23-dependency-strategy-debate.md)* · *[Next lesson: Composing the Enterprise Stack →](./L25-enterprise-stack.md)*
