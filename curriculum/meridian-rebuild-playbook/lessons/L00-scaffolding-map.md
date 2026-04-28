# L00 — Scaffolding Map: The Full File Tree and Wiring Guide

**Module**: M00 — Course Orientation  
**Type**: Reference  
**Estimated time**: 20 minutes

---

## How to Use This Lesson

This is your persistent reference. Every other lesson in this course tells you *what* a piece of code must look like and *why*. This lesson tells you *where* it lives, *what to install* before writing it, and *how it connects* to the surrounding modules.

Bookmark this. Return to it at the start of every module.

---

## The Complete File Tree

Every file you will create across all 10 modules, in its final location.

```
meridian/
├── package.json                          ← pnpm workspace root
├── pnpm-workspace.yaml                   ← M02: declares packages
├── tsconfig.json                         ← M02: root path aliases
├── .env.example                          ← M02: all required env vars
│
├── db/
│   ├── package.json
│   ├── schema.sql                        ← M03: all CREATE TABLE, RLS, indexes
│   └── seed.ts                           ← M03: dev seed data
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                      ← M05: HTTP + WebSocket server entry
│       ├── app.ts                        ← M05: Express app + middleware pipeline
│       ├── redis.ts                      ← M04: Redis client singleton
│       ├── audit.ts                      ← M09: logAuditEvent()
│       │
│       ├── db/
│       │   ├── index.ts                  ← M05: Drizzle db instance (pg pool)
│       │   ├── pool.ts                   ← M05: raw pg.Pool for SET LOCAL
│       │   └── schema.ts                 ← M05: Drizzle table definitions
│       │
│       ├── middleware/
│       │   ├── auth.ts                   ← M04: authMiddleware (JWT verify + attach req.user)
│       │   ├── tenant.ts                 ← M05: requireWorkspace (RLS context + req.workspace)
│       │   └── errorHandler.ts           ← M05: 4-arg Express error handler
│       │
│       ├── auth/
│       │   ├── tokens.ts                 ← M04: signAccessToken, issueRefreshToken
│       │   ├── refresh.ts                ← M04: verifyRefreshToken, rotateRefreshToken
│       │   └── routes.ts                 ← M04: POST /auth/register, /auth/login, /auth/refresh, /auth/me
│       │
│       ├── routes/
│       │   ├── workspaces.ts             ← M05: GET/POST /workspaces, GET /workspaces/:id
│       │   ├── pages.ts                  ← M05: CRUD /workspaces/:workspaceId/pages
│       │   └── ai.ts                     ← M08: POST /workspaces/:workspaceId/ai/complete (SSE)
│       │
│       └── ai/
│           ├── providers.ts              ← M08: LLMProvider interface + LLMMessage types
│           ├── anthropic.ts              ← M08: AnthropicProvider implementation
│           ├── router.ts                 ← M08: LLMRouter (resolves provider by workspace config)
│           ├── memory.ts                 ← M08: retrieveRelevantMemories, writeMemory
│           ├── context.ts                ← M08: buildSystemPrompt, assembleContext
│           └── sanitize.ts              ← M09: sanitizeMemoryValue (injection defense)
│
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts                    ← M06: Vite + /api and /ai proxy config
│   ├── index.html
│   └── src/
│       ├── main.tsx                      ← M06: ReactDOM.createRoot entry
│       ├── App.tsx                       ← M06: React Router root (3-tier route tree)
│       │
│       ├── api/
│       │   └── client.ts                 ← M06: typed fetch wrapper (apiFetch)
│       │
│       ├── stores/
│       │   ├── authStore.ts              ← M06: useAuthStore (user, isLoading, checkSession)
│       │   └── workspaceStore.ts         ← M06: useWorkspaceStore (pages, active page)
│       │
│       ├── components/
│       │   ├── RequireAuth.tsx           ← M06: 3-state route guard
│       │   ├── WorkspaceShell.tsx        ← M06: sidebar + Outlet layout
│       │   └── editor/
│       │       ├── MeridianEditor.tsx    ← M07: LexicalComposer root + plugins
│       │       ├── plugins/
│       │       │   ├── CollaborationPlugin.tsx  ← M07: Yjs Y.Doc binding
│       │       │   ├── OnChangePlugin.tsx       ← M07: persist EditorState on change
│       │       │   └── AIAssistPlugin.tsx       ← M08: slash-command AI trigger
│       │       └── nodes/
│       │           └── index.ts                 ← M07: custom node registry
│       │
│       └── pages/
│           ├── Login.tsx                 ← M06
│           ├── Register.tsx              ← M06
│           └── workspace/
│               ├── WorkspaceDashboard.tsx   ← M06
│               └── PageView.tsx             ← M07: embeds MeridianEditor
│
└── infra/
    ├── docker-compose.yml                ← M02: postgres, redis, server, client services
    ├── Makefile                          ← M02: dev, migrate, seed, test targets
    └── .env.example                      ← M02: all required env var names
```

---

## Per-Module Build Guide

Each module below lists: what you install, what you create, and the wiring step that connects it to what came before.

---

### M02 — Monorepo & Infrastructure

**Install nothing yet** — this is the scaffold.

**Create:**
- `pnpm-workspace.yaml`
- `tsconfig.json` (root)
- `db/package.json`, `server/package.json`, `client/package.json`
- `infra/docker-compose.yml`, `infra/.env.example`, `infra/Makefile`

**Wiring:** None — this is the container for everything else.

**Verify:** `docker compose up` starts postgres on port 5432 and redis on port 6379 with no errors.

---

### M03 — Database Architecture

**Install (db package):**
```bash
cd db
pnpm add -D drizzle-kit
pnpm add drizzle-orm pg
```

**Create:** `db/schema.sql`, `db/seed.ts`

**Run:**
```bash
psql $DATABASE_URL -f db/schema.sql   # apply schema
npx ts-node db/seed.ts                # seed dev data
```

**Wiring:** The schema is used by both `server/src/db/schema.ts` (Drizzle type definitions) and the RLS middleware built in M05. No server code exists yet — just SQL.

---

### M04 — Authentication Architecture

**Install (server package):**
```bash
cd server
pnpm add bcrypt jsonwebtoken ioredis
pnpm add -D @types/bcrypt @types/jsonwebtoken
```

**Create:**
- `server/src/redis.ts`
- `server/src/auth/tokens.ts`
- `server/src/auth/refresh.ts`
- `server/src/auth/routes.ts`
- `server/src/middleware/auth.ts`

**Required env vars:**
```
JWT_SECRET=<minimum 32 random chars>
REDIS_URL=redis://localhost:6379
```

**Wiring:** `authMiddleware` reads `req.headers.authorization`, verifies the JWT with `JWT_SECRET`, and attaches `req.user`. Every subsequent module that needs the authenticated user imports and uses `authMiddleware` as a route-level middleware.

**Verify:** `POST /auth/register` + `POST /auth/login` return a JWT + HttpOnly cookie with the refresh token. `GET /auth/me` returns the user using only the JWT.

---

### M05 — Server Architecture

**Install (server package):**
```bash
pnpm add express zod helmet cors express-rate-limit drizzle-orm pg
pnpm add -D @types/express @types/cors @types/pg tsx
```

**Create:**
- `server/src/db/index.ts`, `server/src/db/pool.ts`, `server/src/db/schema.ts`
- `server/src/middleware/tenant.ts`, `server/src/middleware/errorHandler.ts`
- `server/src/routes/workspaces.ts`, `server/src/routes/pages.ts`
- `server/src/app.ts`, `server/src/index.ts`

**Required env vars:**
```
DATABASE_URL=postgresql://meridian:pass@postgres:5432/meridian
PORT=4000
```

**Middleware pipeline (app.ts — exact order):**
```typescript
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }))
app.use(rateLimit({ windowMs: 60_000, max: 100 }))
app.use(express.json())
app.use('/auth', authRoutes)         // auth routes don't need authMiddleware
app.use(authMiddleware)              // everything below this requires a valid JWT
app.use('/workspaces', workspaceRoutes)
app.use(errorHandler)                // MUST be last, 4 parameters
```

**Wiring:** `requireWorkspace` (tenant.ts) wraps individual workspace routes, not the whole app. Import and apply it per-router:
```typescript
workspaceRouter.use('/:workspaceId/pages', requireWorkspace, pageRoutes)
```

**Verify:** `GET /workspaces/:id/pages` without a JWT returns 401. With a JWT for a non-member returns 403. With a valid JWT + membership returns 200.

---

### M06 — Frontend Foundation

**Install (client package):**
```bash
cd client
pnpm add react react-dom react-router-dom zustand
pnpm add -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss
```

**Create:**
- `client/vite.config.ts`
- `client/src/main.tsx`, `client/src/App.tsx`
- `client/src/api/client.ts`
- `client/src/stores/authStore.ts`, `client/src/stores/workspaceStore.ts`
- `client/src/components/RequireAuth.tsx`, `client/src/components/WorkspaceShell.tsx`
- `client/src/pages/Login.tsx`, `client/src/pages/Register.tsx`
- `client/src/pages/workspace/WorkspaceDashboard.tsx`

**Vite proxy (vite.config.ts) — required for auth cookies to work in dev:**
```typescript
server: {
  proxy: {
    '/api': { target: 'http://localhost:4000', changeOrigin: true },
    '/ai':  { target: 'http://localhost:4000', changeOrigin: true }
  }
}
```

**Wiring:** `apiFetch` in `client.ts` always sends `credentials: 'include'` so cookies travel with requests. `checkSession()` in `authStore.ts` is called from `main.tsx` before the router renders — this is what drives the `isLoading` state in `RequireAuth`.

**Verify:** Navigating to `/` redirects to `/login`. After login, navigating to `/workspaces` renders the shell. Refreshing the page restores the session without a flicker to `/login`.

---

### M07 — The Editor Layer

**Install (client package):**
```bash
pnpm add lexical @lexical/react @lexical/yjs yjs y-websocket
```

**Create:**
- `client/src/components/editor/MeridianEditor.tsx`
- `client/src/components/editor/plugins/CollaborationPlugin.tsx`
- `client/src/components/editor/plugins/OnChangePlugin.tsx`
- `client/src/components/editor/nodes/index.ts`
- `client/src/pages/workspace/PageView.tsx`

**Wiring:**
- `PageView.tsx` fetches the initial block content from `GET /workspaces/:id/pages/:pageId/blocks`, then mounts `MeridianEditor`
- `OnChangePlugin` fires on every editor state change, serializes the blocks, and calls `POST /workspaces/:id/pages/:pageId/blocks` (debounced 500ms)
- `CollaborationPlugin` connects to the WebSocket server at `ws://localhost:4000` and binds the `Y.Doc` to the Lexical editor state

**Verify:** Opening the same page in two browser tabs — typing in one should appear in the other within ~200ms.

---

### M08 — AI Layer Integration

**Install (server package):**
```bash
pnpm add @anthropic-ai/sdk
```

**Create:**
- `server/src/ai/providers.ts`
- `server/src/ai/anthropic.ts`
- `server/src/ai/router.ts`
- `server/src/ai/memory.ts`
- `server/src/ai/context.ts`
- `server/src/routes/ai.ts`

**Install (client package):**
```bash
# No new packages — uses native fetch ReadableStream
```

**Create (client):**
- `client/src/components/editor/plugins/AIAssistPlugin.tsx`

**Wiring — SSE route:**
```
POST /workspaces/:workspaceId/ai/complete
  → requireWorkspace (sets RLS context)
  → Zod validates body
  → logAuditEvent BEFORE provider call
  → llmRouter.stream() — chunks sent via res.write('data: ...\n\n')
  → res.end() when done
```

**Vite proxy addition (for SSE):**
```typescript
'/ai': {
  target: 'http://localhost:4000',
  changeOrigin: true,
  // Required to prevent Vite from buffering SSE chunks:
  configure: (proxy) => {
    proxy.on('proxyRes', (proxyRes) => {
      proxyRes.headers['x-accel-buffering'] = 'no'
    })
  }
}
```

**Verify:** The AI response streams token-by-token into the editor. Checking the `audit_log` table shows a row for every `/ai/complete` call.

---

### M09 — Security Hardening

**No new packages.**

**Create:**
- `server/src/audit.ts` (if not created in M08)
- `server/src/ai/sanitize.ts`

**Hardening checklist — apply to existing files:**
1. `db/schema.sql`: Run the RLS adversarial test (set context to workspace B, query workspace A, expect 0 rows)
2. `server/src/middleware/tenant.ts`: Confirm `set_config(..., true)` not `SET app.current_workspace_id = ...`
3. `server/src/ai/context.ts`: All memory values pass through `sanitizeMemoryValue()` before injection
4. `server/src/ai/memory.ts`: Both `user_id` and `workspace_id` in the WHERE clause
5. `server/src/audit.ts`: `logAuditEvent` called before every LLM provider call, not after

**Wiring:** `sanitizeMemoryValue` is called inside `context.ts` when assembling the system prompt — it is not optional middleware, it is called inline at the injection site.

---

### M10 — Code Efficacy Assessment

**No new packages. No new files.**

Run the Five-Question Framework against your own codebase:

```bash
# Q1: Find workspace_id in handlers — none should come from req.body
grep -rn "req\.body\.workspaceId" server/src/routes/

# Q2: Find routes missing Zod validation
grep -rn "router\.\(post\|put\|patch\)" server/src/routes/ | grep -v "safeParse"

# Q3: Find AI calls without preceding audit log
grep -n "llmRouter\|anthropic\|openai" server/src/ai/

# Q4: Find bcrypt usage — all must use cost 12
grep -rn "bcrypt\.hash" server/src/

# Q5: Find refresh token handling — look for missing reuse detection
grep -rn "refresh" server/src/auth/
```

---

## Module Dependency Graph

```
M02 (infra scaffold)
  └─► M03 (schema — needs postgres running)
        └─► M04 (auth — needs users table)
              └─► M05 (server — needs auth middleware + DB)
                    ├─► M06 (frontend — needs API running)
                    │     └─► M07 (editor — needs pages routes)
                    │           └─► M08 (AI — needs pages + server running)
                    │                 └─► M09 (harden — needs full stack)
                    │                       └─► M10 (audit — needs full stack)
                    └─► M08 (AI server routes — parallel with M06/M07)
```

**What this means for rebuilding:** If you skip M05 and try to build M06, you have no API to talk to. Each module is a genuine prerequisite for the ones below it. M08 server routes can be built alongside M06/M07 since both sit on top of M05.

---

## Environment Variables Reference

All env vars used across the project, where they are consumed:

| Variable | Used In | Example Value |
|---|---|---|
| `DATABASE_URL` | server: db/index.ts | `postgresql://meridian:pass@postgres:5432/meridian` |
| `REDIS_URL` | server: redis.ts | `redis://redis:6379` |
| `JWT_SECRET` | server: auth/tokens.ts | `<32+ random chars>` |
| `ANTHROPIC_API_KEY` | server: ai/anthropic.ts | `sk-ant-...` |
| `PORT` | server: index.ts | `4000` |
| `CLIENT_ORIGIN` | server: app.ts (CORS) | `http://localhost:5173` |
| `VITE_API_URL` | client: api/client.ts | `http://localhost:4000` |

**Rule:** All variables prefixed `VITE_` are inlined at build time by Vite and end up in the browser bundle. Never put secrets in `VITE_` variables.
