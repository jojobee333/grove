# L05 — Schema Design: Tables, Constraints, and Relationships

**Module**: M03 — Database Architecture  
**Type**: Core  
**Estimated time**: 30 minutes

---

## Why Schema First?

The schema is the most durable artifact in your codebase. Application code changes frequently — the schema defines what can change and what cannot. Writing the schema first forces you to think through the domain model, the business rules, and the data relationships before any code is written. Changes to the schema later are migrations — more expensive, more risky, and harder to reverse.

In Meridian, the schema also encodes security policy (workspace isolation), domain rules (block types, roles, memory tiers), and the AI memory model (vector embeddings). All of these are easier to design correctly from the start than to retrofit.

---

## Required PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
```

- `uuid-ossp`: provides `uuid_generate_v4()` for random UUID generation as default column values
- `vector`: provides the `vector(N)` column type and the `<=>` cosine distance operator for pgvector

These must be the first statements in your schema file.

---

## Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Design decisions**:
- `UUID PRIMARY KEY` — UUIDs are non-sequential and non-guessable, unlike integer auto-increment IDs. An attacker who knows one user's ID cannot enumerate adjacent IDs.
- `password_hash TEXT NOT NULL` — Never store plaintext passwords. The column stores a bcrypt hash string.
- `plan CHECK` — The allowed plan values are enforced at the database level. An application bug that sets `plan = 'superuser'` fails with a constraint violation.
- `TIMESTAMPTZ` — Always use timezone-aware timestamps. `TIMESTAMP` (without timezone) stores local time and causes bugs in multi-timezone deployments.

---

## Workspaces and Members

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);
```

**Design decisions**:
- `owner_user_id REFERENCES users(id) ON DELETE RESTRICT` — Prevents deleting a user who owns a workspace. The workspace must be deleted or transferred first.
- `ON DELETE CASCADE` on `workspace_members` — When a workspace is deleted, all membership records are removed automatically.
- `UNIQUE (workspace_id, user_id)` — A user can only have one role per workspace. The `CHECK` on `role` ensures the role is always a valid value.

---

## Pages and Blocks

```sql
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  yjs_state BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `parent_id UUID REFERENCES pages(id)` — Self-referential FK enables nested page hierarchy.
- `yjs_state BYTEA` — The serialized Yjs document state. Stored as binary for efficient read/write of the CRDT state.
- `workspace_id NOT NULL` — Every page belongs to a workspace. This is the tenant isolation column.

```sql
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  block_type TEXT NOT NULL CHECK (block_type IN (
    'paragraph', 'heading1', 'heading2', 'heading3',
    'todo', 'code', 'bullet', 'numbered', 'toggle'
  )),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Design decisions**:
- `block_type CHECK` — Block type is a first-class database column with a constraint. You cannot create a block with an invalid type.
- `content JSONB` — The rich-text payload is stored as JSONB. The specific structure (inline styles, attributes) is defined by the application, but the column is flexible enough to evolve without schema changes.
- `workspace_id NOT NULL` on blocks — Even though blocks belong to pages, they also have a direct workspace_id FK. This is required for RLS to work correctly on blocks without needing a JOIN to pages.

---

## Block Versions (Audit Trail)

```sql
CREATE TABLE block_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  editor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content JSONB NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (block_id, version_number)
);
```

`UNIQUE (block_id, version_number)` — Prevents two edits from being recorded as the same version number. The application must increment version numbers atomically (using a sequence or `SELECT MAX(version_number) + 1 ... FOR UPDATE`).

---

## Audit Log (Required from Day One)

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `ON DELETE SET NULL` — Audit records are preserved even if the workspace or user is deleted. The log is a compliance record, not application state.
- The `audit_log` table must exist before you write any AI action handler. The non-negotiable rule is that every AI action writes an entry here.

---

## Key Points

- Write the schema before application code. The schema's constraints drive what the application needs to enforce.
- UUID primary keys are non-guessable and non-sequential — prefer them over integer IDs for all user-facing entities.
- `workspace_id NOT NULL` on every workspace-scoped table is the structural tenant isolation guarantee, not a query convention.
- CHECK constraints encode business rules at the database level — `block_type`, `role`, `tier`, `plan` are all DB-enforced.
- `TIMESTAMPTZ` always. Never use `TIMESTAMP`.
- `audit_log` must be created on day one — AI action logging is non-negotiable.
