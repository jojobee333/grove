# L16 — Lexical Architecture: EditorState and the Plugin Model

**Module**: M07 — The Editor Layer  
**Type**: Core  
**Estimated time**: 30 minutes

---

## Why Lexical, Not a Simple `<textarea>`

A `<textarea>` stores a plain string. Meridian needs:
- Rich formatting (bold, italic, code blocks, headings)
- Block-level types (todo, numbered list, toggle)
- Real-time collaboration (Yjs CRDT integration)
- AI-aware editing (AI responses injected at cursor position)
- Version history (serializable state snapshots)

Lexical provides all of these through its extensible plugin architecture and immutable `EditorState` model — which is directly compatible with React 18 concurrent mode.

---

## The Core Concept: Immutable `EditorState`

Lexical's `EditorState` is **immutable**. Every change creates a new `EditorState` snapshot. This is the same model as React state:

```
EditorState_1 (initial)
    │ user types
    ▼
EditorState_2 (with new character)
    │ user applies bold
    ▼
EditorState_3 (with bold text)
```

You can serialize any `EditorState` to JSON, store it, and recreate the exact editor state later. This is how Meridian implements page saving and version history.

---

## Mounting the Editor

```typescript
// client/src/editor/MeridianEditor.tsx
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import type { EditorState } from 'lexical'
import { editorConfig } from './config'

interface Props {
  initialState?: string  // Serialized EditorState JSON
  onChange: (editorState: EditorState) => void
}

export function MeridianEditor({ initialState, onChange }: Props) {
  const config = {
    ...editorConfig,
    editorState: initialState ?? null  // null = empty state
  }

  return (
    <LexicalComposer initialConfig={config}>
      <div className="editor-container relative">
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input outline-none p-4" />}
          placeholder={<div className="editor-placeholder absolute top-4 left-4 text-gray-400">
            Start writing...
          </div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin onChange={onChange} />
        <HistoryPlugin />
        <AutoFocusPlugin />
      </div>
    </LexicalComposer>
  )
}
```

`LexicalComposer` provides the editor context. All plugins are registered as children. Each plugin hooks into the editor lifecycle via Lexical's command and listener system.

---

## The Editor Config

```typescript
// client/src/editor/config.ts
import type { InitialConfigType } from '@lexical/react/LexicalComposer'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode, CodeHighlightNode } from '@lexical/code'
import { TodoCheckboxNode } from './nodes/TodoCheckboxNode'

export const editorConfig: InitialConfigType = {
  namespace: 'MeridianEditor',
  theme: {
    paragraph: 'editor-paragraph',
    heading: {
      h1: 'editor-heading-h1',
      h2: 'editor-heading-h2',
      h3: 'editor-heading-h3'
    },
    code: 'editor-code',
    list: {
      listitem: 'editor-listitem',
      nested: { listitem: 'editor-nested-listitem' }
    }
  },
  nodes: [
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    CodeHighlightNode,
    TodoCheckboxNode  // Custom node
  ],
  onError: (error) => {
    console.error('[Lexical Error]', error)
  }
}
```

Every node type that will appear in the editor must be registered in `nodes`. Forgetting to register a node type and then trying to deserialize saved content that contains that node type will throw.

---

## Reading EditorState for Persistence

```typescript
// client/src/editor/MeridianEditor.tsx — onSave callback
function handleChange(editorState: EditorState) {
  // Serialize the EditorState to JSON for persistence
  const serialized = JSON.stringify(editorState.toJSON())
  onChange(editorState)  // Parent receives the EditorState object

  // For saving, serialize to string:
  // await savePageContent(pageId, serialized)
}
```

`editorState.toJSON()` produces a plain object. `JSON.stringify(...)` converts it for storage. To restore:

```typescript
// Restore from stored JSON
const config = {
  ...editorConfig,
  editorState: savedJson  // string or EditorState object
}
```

---

## Programmatic Editor Updates

Plugins and external code interact with the editor via `editor.update()`:

```typescript
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'

// Called from an AI response plugin to insert AI-generated text
editor.update(() => {
  const root = $getRoot()
  const paragraph = $createParagraphNode()
  const text = $createTextNode('AI-generated content here')
  paragraph.append(text)
  root.append(paragraph)
})
```

`editor.update()` runs a transaction. Inside the callback, you use `$`-prefixed functions (Lexical's convention for functions that must run inside an update). The update is batched and applied to produce a new `EditorState`.

---

## Key Points

- Lexical's `EditorState` is immutable — every change creates a new state snapshot. This is required for React 18 concurrent mode.
- All registered node types must be listed in the editor config `nodes` array. Missing a node type causes deserialization failures.
- `LexicalComposer` provides the editor context. Plugins are registered as child components.
- `editorState.toJSON()` serializes the state for persistence. Pass the string back as `initialConfig.editorState` to restore.
- External code modifies the editor via `editor.update()` with `$`-prefixed Lexical functions — never by mutating state directly.
- The `OnChangePlugin` fires on every `EditorState` change and is the correct hook for autosave.
