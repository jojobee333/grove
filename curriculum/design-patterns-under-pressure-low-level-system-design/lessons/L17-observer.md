# Observer: Notifications, Fan-Out, and Hidden Flow

**Module**: M06 · Behavioral Patterns One by One  
**Type**: core  
**Estimated time**: 22 minutes  
**Claim**: C4 from Strata synthesis

---

## The core idea

Observer helps when one subsystem needs to announce something interesting without knowing who will care. The subject publishes an event or notification; observers subscribe and react. That decouples the subject from unrelated concerns such as achievements, logging, or UI reactions [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md).

The pattern is valuable because it connects unrelated concerns cleanly. It is risky because the resulting control flow is harder to see. Nystrom highlights synchronous cost, lapsed listener problems, dynamic registration, and debugging difficulty. Those are not minor caveats. They are the core tradeoff of the pattern [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md).

## Why it matters

This matters in real systems because event-like communication is everywhere. But many teams learn only the benefit side of Observer and then overuse it inside tightly coordinated features where explicit calls would be clearer. Deep study means understanding where notification decoupling is worth the hidden flow cost — and where it is not.

## Example 1 — the problem: direct coupling in the subject

```python
class PhysicsEngine:
    def __init__(self, achievements, analytics, sound_player):
        self.achievements  = achievements
        self.analytics     = analytics
        self.sound_player  = sound_player

    def resolve_collision(self, entity_a, entity_b) -> None:
        # core physics logic
        entity_a.apply_impulse(entity_b)

        # now the physics engine must know about every downstream concern:
        self.achievements.on_collision(entity_a, entity_b)
        self.analytics.track_event("collision", entity_a.id, entity_b.id)
        self.sound_player.play("impact")
```

The physics engine now has three unrelated dependencies. Every new concern that wants to react to a collision requires a change to `PhysicsEngine`. The class is responsible for broadcasting, which has nothing to do with physics.

## Example 2 — Observer pattern with subscriber management

```python
from typing import Callable

# Subject: knows nothing about who is listening
class PhysicsEngine:
    def __init__(self):
        self._collision_observers: list[Callable] = []

    def on_collision(self, handler: Callable) -> None:
        self._collision_observers.append(handler)

    def resolve_collision(self, entity_a, entity_b) -> None:
        entity_a.apply_impulse(entity_b)
        for observer in list(self._collision_observers):  # copy to avoid mutation mid-iteration
            observer(entity_a, entity_b)


# Observers: each concern registers itself
class AchievementSystem:
    def handle_collision(self, entity_a, entity_b) -> None:
        if entity_a.type == "player" and entity_b.type == "enemy":
            self._unlock("first_combat")

    def _unlock(self, achievement_id: str) -> None: ...


class AnalyticsTracker:
    def handle_collision(self, entity_a, entity_b) -> None:
        self._track("collision", {"a": entity_a.id, "b": entity_b.id})

    def _track(self, event: str, data: dict) -> None: ...


# Wiring at startup — the engine stays ignorant of its observers:
engine     = PhysicsEngine()
achieve    = AchievementSystem()
analytics  = AnalyticsTracker()

engine.on_collision(achieve.handle_collision)
engine.on_collision(analytics.handle_collision)
```

The physics engine has no knowledge of achievements or analytics. New observers can be added without touching `PhysicsEngine`. Removing one observer is a `remove()` call [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md).

## Example 3 — the lapsed listener problem

Nystrom dedicates a significant section of the Observer chapter to the lapsed listener — one of the most common production bugs this pattern creates:

```python
class EventBus:
    def __init__(self):
        self._handlers: list[Callable] = []

    def subscribe(self, handler: Callable) -> None:
        self._handlers.append(handler)

    def publish(self, event: dict) -> None:
        for handler in list(self._handlers):
            handler(event)


class OrderNotificationWidget:
    def __init__(self, bus: EventBus, order_id: int):
        self.order_id = order_id
        bus.subscribe(self._on_event)   # registers; never unregisters

    def _on_event(self, event: dict) -> None:
        if event.get("order_id") == self.order_id:
            self._update_display(event)

    def _update_display(self, event: dict) -> None: ...


# After the widget is "closed" or replaced, the bus still holds a reference to it.
# The widget cannot be garbage collected. Every published event still calls it.
# In a long-running application this is a memory and performance leak.

# Fix: always unsubscribe on cleanup
class OrderNotificationWidget:
    def __init__(self, bus: EventBus, order_id: int):
        self.order_id = order_id
        self._bus = bus
        bus.subscribe(self._on_event)

    def close(self) -> None:
        self._bus.unsubscribe(self._on_event)   # critical: release the reference

    def _on_event(self, event: dict) -> None: ...
```

The lapsed listener occurs when an object subscribes but is never removed when its lifecycle ends. The subject keeps a strong reference to the defunct observer. This prevents garbage collection and causes defunct objects to continue receiving and processing events they should no longer see. Every Observer implementation must provide and enforce an unsubscription path [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md).

## Key points

- Observer decouples subjects from unrelated concerns by announcing events rather than calling collaborators directly [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md)
- The main costs are hidden control flow, synchronous blocking by slow observers, and lapsed listener memory leaks
- Observers must be unsubscribed when their lifecycle ends — this is not optional, it is required for correctness
- Default synchronous observer invocation means a slow or failing observer can block or destabilize the subject
- Explicit calls are often clearer when the collaborators are tightly coordinated parts of one feature

## Go deeper

- [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md) — full treatment of notification benefits, hidden flow costs, and lapsed listener
- [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md) — useful comparison when behavior needs to be stored or replayed, not just announced

---

*[← Previous lesson](./L16-command.md)* · *[Next lesson: State: Making Behavioral Change Explicit →](./L18-state.md)*