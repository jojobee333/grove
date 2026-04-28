# L17 — Block Model: Types, Content, and Versioning

**Module**: M07 — The Editor Layer  
**Type**: Applied  
**Estimated time**: 25 minutes

---

## Two Representations of Content

Meridian stores page content in two representations:

1. **Yjs state** (`pages.yjs_state BYTEA`) — the collaborative CRDT state for real-time editing. This is the authoritative state during an active session.
2. **Block records** (`blocks` table) — the relational representation of content for querying, search, and version history.

The Yjs state enables real-time collaboration. The block records enable SQL queries like "find all TODO blocks in workspace X" and "show me version history for this block."

This is not redundant — they serve different purposes. The Yjs state is the editing surface; the blocks table is the query surface.

---

## Block Types

The `block_type` column has a CHECK constraint:

```sql
CHECK (block_type IN (
  'paragraph', 'heading1', 'heading2', 'heading3',
  'todo', 'code', 'bullet', 'numbered', 'toggle'
))
```

These map directly to Lexical node types. Adding a new block type requires:
1. A new Lexical node class
2. Adding the type string to the DB CHECK constraint (a migration)
3. Adding render logic in the editor theme

The constraint prevents drift between what the editor supports and what the database accepts.

---

## The `content` JSONB Column

The `content` column stores the block's rich-text payload as JSONB. The structure is defined by the application, not the database:

```json
{
  "text": "This is a paragraph with some formatting",
  "inlines": [
    { "text": "some formatting", "bold": true }
  ]
}
```

For a code block:
```json
{
  "language": "typescript",
  "code": "const x: string = 'hello'"
}
```

For a todo block:
```json
{
  "text": "Complete the RLS setup",
  "checked": false
}
```

JSONB was chosen over separate columns because:
- Block types have different content shapes — a heading has text and level; a code block has language and code; a todo has text and a checked state
- Storing each as a separate column would require a table for each block type (too many tables) or nullable columns (messy schema)
- JSONB is indexable and queryable in PostgreSQL when needed

---

## Synchronizing Yjs State to Block Records

The synchronization flow:

```
User edits in Lexical editor
     │
     ▼
Yjs document receives updates (real-time)
     │
     ▼
WebSocket broadcasts to collaborators
     │ (on save or periodic flush)
     ▼
Server: deserialize Yjs state → extract blocks → upsert blocks table
```

The server-side sync function:

```typescript
// server/src/sync/yjsToBlocks.ts
import * as Y from 'yjs'
import { db } from '../db'
import { blocks, block_versions } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export async function syncPageBlocks(
  pageId: string,
  workspaceId: string,
  yjsState: Uint8Array,
  editorUserId: string
) {
  const ydoc = new Y.Doc()
  Y.applyUpdate(ydoc, yjsState)

  // Extract blocks from the Yjs document
  const yBlocks = ydoc.getArray<Y.Map<unknown>>('blocks')

  for (let i = 0; i < yBlocks.length; i++) {
    const yBlock = yBlocks.get(i)
    const blockId = yBlock.get('id') as string
    const blockType = yBlock.get('type') as string
    const content = yBlock.get('content') as Record<string, unknown>

    // Upsert the block record
    await db.insert(blocks).values({
      id: blockId,
      workspace_id: workspaceId,
      page_id: pageId,
      author_user_id: editorUserId,
      block_type: blockType,
      content,
      position: i
    }).onConflictDoUpdate({
      target: blocks.id,
      set: {
        content,
        position: i,
        updated_at: new Date()
      }
    })

    // Record a version
    const maxVersion = await db.select({ max: sql<number>`MAX(version_number)` })
      .from(block_versions)
      .where(eq(block_versions.block_id, blockId))

    const nextVersion = (maxVersion[0]?.max ?? 0) + 1

    await db.insert(block_versions).values({
      workspace_id: workspaceId,
      block_id: blockId,
      editor_user_id: editorUserId,
      content,
      version_number: nextVersion
    }).onConflictDoNothing()
  }
}
```

---

## Version History

The `block_versions` table records every content change per block:

```typescript
// Retrieve version history for a block
const history = await db.select()
  .from(block_versions)
  .where(eq(block_versions.block_id, blockId))
  .orderBy(desc(block_versions.created_at))
  .limit(20)
```

Each version record contains:
- `version_number` — sequential within the block
- `content` — the complete JSONB content at that version
- `editor_user_id` — who made the change
- `created_at` — when the change was recorded

Restoring a version: fetch the target version's `content` and write it back to `blocks.content`, then increment `version_number`.

---

## Key Points

- Meridian maintains two content representations: Yjs state (collaboration) and blocks table (queries/search).
- The `block_type` CHECK constraint in SQL and the Lexical node type registry must stay in sync.
- `content JSONB` stores different structures per block type — JSONB is flexible but the application defines the shape.
- Yjs state is synced to block records server-side on save or periodic flush via `Y.applyUpdate()`.
- The `block_versions` table provides a complete change log per block. Restoring a version writes the archived content back to the active block record.
