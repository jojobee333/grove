# L07 — pgvector and the AI Memory Schema

**Module**: M03 — Database Architecture  
**Type**: Applied  
**Estimated time**: 25 minutes

---

## The AI Memory Requirement

Meridian's AI layer learns who you are. That means it must:

1. Store facts about the user as text ("User prefers concise answers")
2. Store those facts with a vector representation (a 1536-dimension embedding) for semantic retrieval
3. Link related facts in a graph for multi-hop reasoning
4. Query: "What facts are most semantically similar to the current conversation?"

This is Retrieval-Augmented Generation (RAG) at the user-memory level. The database schema must support all four requirements.

---

## The `user_memory` Table

```sql
CREATE TABLE user_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('session', 'medium', 'deep')),
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  source_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id, tier, memory_key)
);
```

### Key columns explained

**`tier TEXT CHECK (tier IN ('session', 'medium', 'deep'))`**

The three tiers have different lifecycle implications:
- `session` — ephemeral, cleared at the end of a conversation or work session
- `medium` — persists for days to weeks, subject to decay-based eviction
- `deep` — permanent learnings about the user's preferences, style, and domain knowledge

The tier must be enforced at write time. Promoting a memory from `session` to `deep` requires an explicit update, not just leaving it in the database.

**`embedding vector(1536)`**

The `vector(N)` type is provided by pgvector. `1536` is the dimension count of OpenAI's `text-embedding-ada-002` and Anthropic's embedding models. This dimension is not arbitrary — the embedding model used to generate the vector must match this dimension count exactly. Using a 768-dimension model to query a 1536-dimension column will fail.

The column is nullable (`embedding vector(1536)` without NOT NULL). Some memories may be stored before their embedding is generated (async embedding generation). The application must handle the case where `embedding IS NULL`.

**`UNIQUE (workspace_id, user_id, tier, memory_key)`**

Memory keys are unique per user per tier per workspace. An `UPSERT` on a memory (update if exists, insert if not) can use `ON CONFLICT (workspace_id, user_id, tier, memory_key) DO UPDATE`.

---

## The HNSW Index

```sql
CREATE INDEX ON user_memory 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

HNSW (Hierarchical Navigable Small World) is the index algorithm for Approximate Nearest Neighbor search. Without this index, pgvector performs an exact linear scan — O(n) over all vectors. With the HNSW index, searches are O(log n) for approximate results.

- `vector_cosine_ops` — use cosine distance (`<=>`) as the distance metric. Cosine distance is appropriate for normalized embedding vectors.
- `m = 16` — number of bi-directional links per node. Higher m = better recall, more memory.
- `ef_construction = 64` — size of the candidate list during index construction. Higher = better quality, slower build.

For Meridian's expected scale (thousands to tens of thousands of memories per user), these defaults are appropriate.

---

## The `memory_graph` Table

```sql
CREATE TABLE memory_graph (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  from_memory_id UUID NOT NULL REFERENCES user_memory(id) ON DELETE CASCADE,
  to_memory_id UUID NOT NULL REFERENCES user_memory(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'supports', 'contradicts', 'caused_by', 'related_to'
  )),
  weight NUMERIC(5,4) NOT NULL DEFAULT 0.5 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_memory_id, to_memory_id, relation_type)
);
```

The memory graph enables multi-hop reasoning: "This memory supports that memory, which is related to this preference." The `weight` column (0.0 to 1.0) represents relationship strength.

**Why `UNIQUE (from_memory_id, to_memory_id, relation_type)`?**

Two memories can have multiple relationship types (a memory can both `support` and be `related_to` another), but cannot have duplicate entries for the same relationship type.

---

## Writing a RAG Query (Preview)

The full RAG query is covered in L20. Here is what the schema enables:

```sql
-- Find the 10 memories most similar to a query embedding,
-- scoped to a specific user and workspace
SELECT memory_key, memory_value, tier,
       embedding <=> $3 AS distance
FROM user_memory
WHERE user_id = $1
  AND workspace_id = $2  -- BOTH filters required
  AND embedding IS NOT NULL
ORDER BY embedding <=> $3
LIMIT 10;
```

The `$3` parameter is the query embedding vector. The `<=>` operator computes cosine distance. Lower values = more similar.

---

## Why pgvector Over a Dedicated Vector Database

For this use case:

| Property | pgvector | Pinecone / Weaviate |
|---|---|---|
| Same transaction as relational data | ✅ | ❌ |
| RLS applies automatically | ✅ | ❌ (separate isolation) |
| Operational complexity | Low (one database) | High (two services) |
| Network latency | Zero (same DB call) | ~5-20ms extra |
| Scale ceiling | ~10M vectors before HNSW memory concern | Designed for 100M+ |

At Meridian's expected scale, the single-database advantages win. If the memory corpus grows to millions of vectors per user, the migration path is to abstract the vector search behind a repository interface — which the code already does.

---

## Key Points

- `vector(1536)` columns require the pgvector extension to exist before the table is created.
- The embedding dimension (1536) must match the embedding model used to generate vectors. Mixing dimensions causes errors.
- The HNSW index is required for sub-second search performance. Without it, search is a full table scan.
- `tier` (session/medium/deep) is a DB-level constraint that enforces memory lifecycle semantics at write time.
- `UNIQUE (workspace_id, user_id, tier, memory_key)` enables UPSERT on memory writes.
- All vector searches MUST filter by both `user_id` AND `workspace_id` — RLS enforces workspace isolation, but the `user_id` filter is the application's responsibility.

---

## Exercise

Write the `user_memory` table from memory, then add the HNSW index. Check your work against the reference above. Then answer: why is `embedding` nullable? What happens if a memory is searched before its embedding is generated?
