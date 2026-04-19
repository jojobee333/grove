# Composing Editor and Workflow Patterns

**Module**: M09 · Composition Studios
**Type**: applied
**Estimated time**: 24 minutes
**Claim**: C6 from Strata synthesis

---

## The core idea

The enterprise stack from the previous lesson teaches composition through an application layer that handles data and persistence. This lesson teaches the same principle through a different domain: **interaction-heavy software** — editors, workflow tools, and interfaces where actions need history, notifications need decoupling, and mode-based behavior needs explicit management.

The three behavioral patterns from Module 6 compose naturally here because they each answer a different interaction pressure:
- **Command** handles the need for undo, replay, and deferred execution [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md)
- **Observer** handles the need to notify unrelated subsystems without the core knowing about them [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md)
- **State** handles the need to manage how legal behavior shifts as the editor changes modes [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md)

The research notes that dedicated editor-architecture case studies are thinner in this source set than the enterprise examples, so this lesson is taught with appropriate confidence limits [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md).

## Why it matters

Without this lesson, learners who study the enterprise stack might assume pattern composition only applies to data-heavy backend code. Interaction-heavy software like text editors, design tools, and workflow applications have distinct composition needs. Seeing the same principle — "one pattern per pressure" — apply in a second domain reinforces that composition is about pressures, not about one industry-specific recipe.

## Example 1 — Command + undo history in an editor

```python
from abc import ABC, abstractmethod
from collections import deque

class EditorCommand(ABC):
    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...


class InsertTextCommand(EditorCommand):
    def __init__(self, doc: "Document", pos: int, text: str):
        self._doc  = doc
        self._pos  = pos
        self._text = text

    def execute(self) -> None:
        self._doc.insert(self._pos, self._text)

    def undo(self) -> None:
        self._doc.delete(self._pos, len(self._text))


class FormatCommand(EditorCommand):
    def __init__(self, doc: "Document", start: int, end: int, style: str):
        self._doc   = doc
        self._start = start
        self._end   = end
        self._style = style
        self._prev: str | None = None

    def execute(self) -> None:
        self._prev = self._doc.get_style(self._start, self._end)
        self._doc.set_style(self._start, self._end, self._style)

    def undo(self) -> None:
        if self._prev is not None:
            self._doc.set_style(self._start, self._end, self._prev)


class Editor:
    def __init__(self):
        self._history:   list[EditorCommand]  = []
        self._redoStack: list[EditorCommand]  = []

    def execute(self, cmd: EditorCommand) -> None:
        cmd.execute()
        self._history.append(cmd)
        self._redoStack.clear()    # new action invalidates the redo stack

    def undo(self) -> None:
        if self._history:
            cmd = self._history.pop()
            cmd.undo()
            self._redoStack.append(cmd)

    def redo(self) -> None:
        if self._redoStack:
            cmd = self._redoStack.pop()
            cmd.execute()
            self._history.append(cmd)
```

Command owns the action history pressure. The editor itself has no special undo logic — it delegates everything to the command objects [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md).

## Example 2 — Observer for decoupled notifications (with safe teardown)

```python
from typing import Callable

class DocumentChangeEvent:
    def __init__(self, doc_id: str, change_type: str, position: int):
        self.doc_id      = doc_id
        self.change_type = change_type
        self.position    = position

class Document:
    def __init__(self, doc_id: str):
        self.doc_id = doc_id
        self._handlers: list[Callable[[DocumentChangeEvent], None]] = []

    def on_change(self, handler: Callable[[DocumentChangeEvent], None]) -> None:
        self._handlers.append(handler)

    def off_change(self, handler: Callable[[DocumentChangeEvent], None]) -> None:
        self._handlers = [h for h in self._handlers if h != handler]

    def insert(self, pos: int, text: str) -> None:
        # ... core insert logic ...
        self._notify(DocumentChangeEvent(self.doc_id, "insert", pos))

    def _notify(self, event: DocumentChangeEvent) -> None:
        for handler in list(self._handlers):  # copy: handlers may unsubscribe during iteration
            handler(event)


class WordCountWidget:
    def __init__(self, doc: Document):
        self._doc = doc
        doc.on_change(self._on_change)

    def _on_change(self, event: DocumentChangeEvent) -> None:
        # update word count display
        pass

    def close(self) -> None:
        self._doc.off_change(self._on_change)  # required: prevent lapsed listener


class VersionTracker:
    def __init__(self, doc: Document):
        self._doc = doc
        doc.on_change(self._record)

    def _record(self, event: DocumentChangeEvent) -> None:
        # append to version history
        pass

    def close(self) -> None:
        self._doc.off_change(self._record)
```

Observer owns the cross-cutting notification pressure. `Document` knows nothing about word counts or version tracking. Both subscribers manage their own lifecycle correctly by calling `close()` when they are removed [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md).

## Example 3 — State for editor mode management

An editor often operates in distinct modes — insert, selection, command — where the same key can mean different things:

```python
from enum import Enum, auto
from abc import ABC, abstractmethod

class EditorState(ABC):
    @abstractmethod
    def handle_key(self, editor: "Editor", key: str) -> None: ...

    @abstractmethod
    def handle_selection(self, editor: "Editor", start: int, end: int) -> None: ...


class InsertMode(EditorState):
    def handle_key(self, editor: "Editor", key: str) -> None:
        if key == "ESCAPE":
            editor.set_mode(CommandMode())
        elif key == "CTRL+A":
            editor.select_all()
        else:
            editor.execute(InsertTextCommand(editor.doc, editor.cursor, key))

    def handle_selection(self, editor: "Editor", start: int, end: int) -> None:
        editor.set_mode(SelectionMode(start, end))


class SelectionMode(EditorState):
    def __init__(self, start: int, end: int):
        self.start = start
        self.end   = end

    def handle_key(self, editor: "Editor", key: str) -> None:
        if key == "ESCAPE":
            editor.set_mode(InsertMode())
        elif key == "CTRL+B":
            editor.execute(FormatCommand(editor.doc, self.start, self.end, "bold"))
        elif key == "DELETE":
            editor.execute(DeleteCommand(editor.doc, self.start, self.end))

    def handle_selection(self, editor: "Editor", start: int, end: int) -> None:
        self.start = start
        self.end   = end


class CommandMode(EditorState):
    def handle_key(self, editor: "Editor", key: str) -> None:
        if key == "i":
            editor.set_mode(InsertMode())
        elif key == "u":
            editor.undo()

    def handle_selection(self, editor: "Editor", start: int, end: int) -> None:
        pass  # selection has no meaning in command mode


class Editor:
    def __init__(self, doc: "Document"):
        self.doc    = doc
        self.cursor = 0
        self._mode: EditorState = InsertMode()
        self._history: list[EditorCommand] = []

    def set_mode(self, mode: EditorState) -> None:
        self._mode = mode

    def handle_key(self, key: str) -> None:
        self._mode.handle_key(self, key)

    def handle_selection(self, start: int, end: int) -> None:
        self._mode.handle_selection(self, start, end)

    def execute(self, cmd: EditorCommand) -> None:
        cmd.execute()
        self._history.append(cmd)

    def undo(self) -> None:
        if self._history:
            self._history.pop().undo()
```

Each pattern owns a different concern. Command owns the action + undo pressure. Observer owns the notification pressure. State owns the mode-transition pressure. Together they produce a design where none of the three layers intrudes on the others [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md).

## Key points

- Command, Observer, and State compose coherently in interaction-heavy software because they each answer a different interaction pressure [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md)
- Command owns action history; Observer owns decoupled notifications; State owns mode-based behavior
- The lapsed listener rule applies here too — subscribers must unsubscribe when their lifecycle ends [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md)
- State prevents the same key from doing the wrong thing in the wrong mode — without scattered `if self.is_selecting` checks
- The composition lesson is the same as in the enterprise stack: one pattern per pressure, no pattern claiming another's responsibility

## Go deeper

- [S007](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S007-nystrom-command.md) — undo, replay, and action reification; the strongest source on Command in editors
- [S008](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S008-nystrom-observer.md) — full treatment of notification decoupling with caveats on hidden flow and lapsed listeners
- [S009](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S009-nystrom-state.md) — FSM-to-State progression and mode-based behavior management

---

*[← Previous lesson](./L25-enterprise-stack.md)* · *[Next lesson: From Naive Design to Coherent Pattern Stack →](./L27-naive-to-pattern-stack.md)*
