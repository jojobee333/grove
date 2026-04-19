# Command: Reified Actions, Undo, and Replay

**Module**: M06 · Behavioral Patterns One by One  
**Type**: core  
**Estimated time**: 24 minutes  
**Claim**: C4 from Strata synthesis

---

## The core idea

Command makes an action into an object. Nystrom describes it as a reified method call: instead of executing behavior immediately as a plain call, the system packages that behavior so it can be stored, queued, passed around, replayed, or undone later [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md).

This is one of the clearest behavioral patterns because the pressure it answers is concrete. Direct function calls are rigid. They work well when behavior should happen now, once, and in place. They start to strain when the system needs configurable input bindings, undo/redo, macro recording, delayed execution, queued work, or any form of action history. Command exists because actions sometimes need to be treated as data — things you can store, inspect, and replay rather than merely trigger.

## Why it matters

For practical system design, Command matters most in editors, tools, workflow engines, and any subsystem that cares about history. If a learner only studies the class diagram, the pattern feels abstract. If they study the pressure, it becomes obvious: the system needs to talk *about* actions, not just perform them.

## Example 1 — the problem: input directly wired to behavior

```python
# Without Command: input handling directly calls behavior
def handle_input(key: str, player) -> None:
    if key == "W":
        player.move_forward()
    elif key == "S":
        player.move_backward()
    elif key == "SPACE":
        player.jump()
    elif key == "Q":
        player.attack()
```

This works for a fixed key layout. But what happens when the user wants to remap controls? Or when the game needs to replay the last five inputs? Or when a demo mode needs to execute a saved script of player actions? The `if/elif` chain is wired directly to behavior — it cannot be stored, queued, or replayed.

## Example 2 — Command objects for configurable, undoable actions

```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...


class TypeTextCommand(Command):
    def __init__(self, document, text: str, position: int):
        self.document = document
        self.text = text
        self.position = position

    def execute(self) -> None:
        self.document.insert(self.position, self.text)

    def undo(self) -> None:
        self.document.delete(self.position, len(self.text))


class DeleteTextCommand(Command):
    def __init__(self, document, position: int, length: int):
        self.document = document
        self.position = position
        self.length = length
        self._deleted: str = ""          # captured on execute for undo

    def execute(self) -> None:
        self._deleted = self.document.read(self.position, self.length)
        self.document.delete(self.position, self.length)

    def undo(self) -> None:
        self.document.insert(self.position, self._deleted)


class Editor:
    def __init__(self):
        self._history: list[Command] = []

    def do(self, cmd: Command) -> None:
        cmd.execute()
        self._history.append(cmd)

    def undo(self) -> None:
        if self._history:
            self._history.pop().undo()
```

Each command is a self-contained record of one action. `execute()` performs it; `undo()` reverses it. The editor's history list is just a stack of command objects. Undoing the last five actions is five `pop().undo()` calls. No special logic is needed in the editor itself — undo behavior is fully encapsulated inside each command class [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md).

## Example 3 — command queue for deferred execution and macro replay

```python
from collections import deque

class CommandQueue:
    """Decouples when commands are issued from when they are executed."""

    def __init__(self):
        self._queue: deque[Command] = deque()

    def enqueue(self, cmd: Command) -> None:
        self._queue.append(cmd)

    def process_one(self) -> None:
        if self._queue:
            self._queue.popleft().execute()

    def process_all(self) -> None:
        while self._queue:
            self._queue.popleft().execute()


# A macro is just a saved list of commands:
def record_macro(editor: Editor, commands: list[Command]) -> list[Command]:
    for cmd in commands:
        editor.do(cmd)
    return commands          # save the list for replay


def replay_macro(editor: Editor, saved: list[Command]) -> None:
    for cmd in saved:
        editor.do(cmd)      # fresh execute on new objects if needed
```

The queue separates when commands are enqueued from when they are executed. This enables frame-by-frame pacing in game engines, rate-limited execution in workflow systems, and offline queuing in distributed systems. The macro example shows the simplest form of replay: a macro is just a list of command objects. Recording captures the commands; replay executes them again.

## Limitations

Not every action deserves a class. Nystrom is explicit that closures or function references may be enough in simpler systems. Command should answer a real need for reification — undo, queueing, macro replay, or serialization — not a reflexive desire to object-wrap everything. If actions are fire-and-forget and the system has no history requirements, a direct function call is cleaner [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md).

## Key points

- Command makes behavior assignable, queueable, serializable, and undoable by treating actions as objects [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md)
- Undo is naturally supported: each command captures the state it needs to reverse its own effect
- A command queue separates issuance from execution, enabling pacing, rate limiting, and offline batching
- Macros and replays are just saved lists of command objects — no special replay infrastructure is required
- The pattern is justified when the system needs to talk *about* actions, not just perform them; closures suffice otherwise

## Go deeper

- [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md) — strongest source on reified actions, undo, and replay
- [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md) — useful neighbor when actions interact with state changes

---

*[← Previous lesson](./L15-unit-of-work.md)* · *[Next lesson: Observer: Notifications, Fan-Out, and Hidden Flow →](./L17-observer.md)*