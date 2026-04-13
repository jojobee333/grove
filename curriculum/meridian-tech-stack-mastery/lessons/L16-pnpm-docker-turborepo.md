# pnpm + Docker Compose + Turborepo: Three Scopes, Not Three Options

**Module**: M09 · Monorepo Tooling: Three Scopes, One Project
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C15, C16 — pnpm workspaces, Turborepo, and Docker Compose operate at distinct scopes and are complementary, not competing

---

## The core idea

Three tools appear in Meridian's monorepo that developers often conflate: pnpm workspaces manages the *package registry* (which packages exist, how they link to each other, what their dependencies are), Turborepo manages the *task graph* (which build/test/lint tasks depend on each other, what can be cached), and Docker Compose manages the *service runtime* (which processes run in which containers, with which health checks and network rules). They operate at entirely different scopes. You don't choose between them — you add each one when its specific problem appears.

## Why it matters

The common confusion: "we already have pnpm workspaces, why do we need Turborepo?" or "why Docker Compose if we have a monorepo?" Understanding the scope boundaries prevents adding the wrong tool for a problem and helps you identify the right signal that triggers adding the next tool.

## A concrete example

**Scope 1: pnpm workspaces — package registry**

```yaml
# pnpm-workspace.yaml — at repo root
packages:
  - "client"
  - "server"
  - "db"
```

```json
// server/package.json — workspace:* linking
{
  "name": "@meridian/server",
  "dependencies": {
    "@meridian/db": "workspace:*"  // links to the local db/ package
  }
}
```

pnpm workspaces provides:
- A single `node_modules` at the root (hoisted dependencies)
- `workspace:*` links between packages — no publishing needed
- `--filter` to scope commands to specific packages

```bash
# Run only the server package's dev command
pnpm --filter @meridian/server dev

# Install a dependency in the client only
pnpm --filter @meridian/client add @lexical/react

# Type-check all packages simultaneously
pnpm --filter "./packages/**" typecheck
```

What pnpm workspaces does NOT do: it has no concept of task dependencies. Running `pnpm --filter @meridian/server build` does not know to first build `@meridian/db`. That's Turborepo's job.

**Scope 2: Turborepo — task graph and caching**

The observable signal that triggers adding Turborepo: you notice that `pnpm build` runs `db` and `server` and `client` builds sequentially when `db` could finish before `server` starts, saving minutes.

```json
// turbo.json — at repo root
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],  // Run build in dependencies first
      "outputs": ["dist/**", ".next/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]   // Types from db must be built before server typechecks
    },
    "dev": {
      "cache": false,           // Dev servers should not be cached
      "persistent": true        // Long-running processes
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

```bash
# Turborepo runs builds in dependency order, in parallel where possible
# db builds first, then server + client in parallel
turbo build

# Turborepo caches: if source files haven't changed, returns cache hit
# Re-running after no changes: all packages restored from cache instantly
turbo build  # → "cache hit" for unchanged packages
```

**Scope 3: Docker Compose — service runtime**

```yaml
# infra/docker-compose.yml
version: "3.9"

services:
  postgres:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_DB: meridian
      POSTGRES_USER: meridian
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U meridian"]
      interval: 5s
      timeout: 5s
      retries: 10
    ports:
      - "5432:5432"

  yjs:
    image: yjs/y-websocket
    ports:
      - "1234:1234"
    depends_on:
      postgres:
        condition: service_healthy

  server:
    build:
      context: ../server
      dockerfile: Dockerfile.dev
    environment:
      DATABASE_URL: postgresql://meridian:${POSTGRES_PASSWORD}@postgres:5432/meridian
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ../server:/app
      - /app/node_modules
    ports:
      - "3001:3001"

  client:
    build:
      context: ../client
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ../client:/app
      - /app/node_modules

volumes:
  postgres_data:
```

Docker Compose provides:
- Service networking (containers communicate by service name: `postgres`, `server`, `yjs`)
- Health checks — `depends_on: condition: service_healthy` waits for postgres to be ready before starting server
- Volume mounts for hot reload (`/app/node_modules` exclusion prevents host modules from overwriting container modules)

**The three scopes mapped to one question each**

| Tool | Question it answers | When to add it |
|---|---|---|
| pnpm workspaces | "How are my packages linked and installed?" | Day one — before writing any code |
| Turborepo | "Which build tasks depend on each other, and what can be cached?" | When you have ≥2 packages with build steps that depend on each other |
| Docker Compose | "How do I start all services (DB, API, editor server, client) with a single command?" | Day one — when you need postgres + server + client to run together |

**The Makefile as the unified entry point**

```makefile
# infra/Makefile
.PHONY: dev build test migrate seed clean

dev:
	cd infra && docker compose up --build

build:
	turbo build

test:
	turbo test

migrate:
	pnpm --filter @meridian/server db:migrate

seed:
	pnpm --filter @meridian/server db:seed

clean:
	docker compose -f infra/docker-compose.yml down -v
	find . -name "dist" -type d -exec rm -rf {} +
```

Running `make dev` starts Docker Compose (all services with health checks). Running `make build` triggers Turborepo (builds all packages in dependency order). The tools never overlap. [S015](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S015-pnpm-workspaces.md), [S016](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S016-turborepo.md)

## Key points

- pnpm workspaces = package registry (installation, linking); Turborepo = task graph (ordering, caching); Docker Compose = service runtime (health checks, networking) — three non-overlapping scopes
- The signal to add Turborepo: sequential package builds where dependency order matters and build time has become a bottleneck — not a day-one tool, but a natural addition as the monorepo grows
- Docker Compose health checks (`condition: service_healthy`) are required — `depends_on` without a health check condition doesn't wait for the service to be ready, only for the container to start

## Go deeper

- [S015](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S015-pnpm-workspaces.md) — pnpm workspaces: `workspace:*` linking, `--filter`, and hoisting behaviour
- [S016](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S016-turborepo.md) — Turborepo: pipeline configuration, `dependsOn: ["^build"]`, and remote caching

---

*[← Previous: bcrypt vs Argon2id + JWT Attacks](./L15-bcrypt-argon2id-jwt-attacks.md)*

---

**Course complete.** You have covered all 16 lessons across 9 modules. Review the [course outline](../course.json) for the full module and lesson inventory, or return to any lesson for a focused revisit.
