# L04 — Docker Compose: Local Multi-Service Topology

**Module**: M02 — Monorepo and Infrastructure  
**Type**: Applied  
**Estimated time**: 30 minutes

---

## Why Docker Compose Matters for Architecture

The Meridian `docker-compose.yml` is not a convenience script for local development — it is a specification of the production service topology. Running it locally means you are developing against the same service graph (postgres, redis, server, client) with the same networking model as production. Deviating from it means your local assumptions may not hold in production.

---

## The Four Services

Meridian runs four containers:

```
┌─────────────────────────────────────────────────────┐
│  client:5173    │  server:3001    │  postgres:5432  │
│  (Vite dev)     │  (tsx watch)    │  (pg + pgvector)│
│                 │       ↑         │       ↑         │
│                 │  redis:6379     │                 │
└─────────────────────────────────────────────────────┘
```

- **postgres** — PostgreSQL 16 with the `pgvector` and `uuid-ossp` extensions
- **redis** — Redis 7 for refresh token storage and rate limiting
- **server** — Express + TypeScript server, run via `tsx watch` for hot reload
- **client** — Vite dev server with HMR for the React frontend

---

## The Docker Compose File

```yaml
# infra/docker-compose.yml
version: "3.9"

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: meridian
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../db:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  server:
    build:
      context: ../server
      dockerfile: Dockerfile.dev
    env_file:
      - ../.env.example
    ports:
      - "3001:3001"
    volumes:
      - ../server/src:/app/src
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  client:
    build:
      context: ../client
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ../client/src:/app/src
      - ../client/index.html:/app/index.html
    depends_on:
      - server

volumes:
  postgres_data:
  redis_data:
```

### Key decisions in this file

**`pgvector/pgvector:pg16` image**: This is not `postgres:16`. The `pgvector/pgvector` image has the extension pre-installed. Using the base `postgres:16` image and installing pgvector manually is possible but more complex.

**`../db:/docker-entrypoint-initdb.d`**: The `db/` folder (containing `schema.sql`) is mounted as the init directory. PostgreSQL automatically runs all `.sql` files in this directory **on first container creation**. This means the schema is applied automatically when you run `docker compose up` for the first time.

> **Warning**: PostgreSQL only runs init scripts on first creation. If you change `schema.sql` after the container exists, you must either `docker compose down -v` (deletes all data) or apply the migration manually.

**`env_file: - ../.env.example`**: The server reads its environment variables from `.env.example`. This is the authoritative template for all required secrets. The convention in Meridian is to edit `.env.example` directly for local dev — no separate `.env` file.

**`depends_on` with healthcheck**: The server only starts after postgres is healthy (`pg_isready` passes). Without this, the server may attempt to connect before PostgreSQL is ready and crash on startup.

---

## Server Dockerfile.dev

```dockerfile
# server/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
CMD ["pnpm", "dev"]
```

The `server/package.json` dev script:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts"
  }
}
```

`tsx watch` is a TypeScript execution engine that watches for file changes and restarts the process. No compilation step — it transpiles on-the-fly. The volume mount (`../server/src:/app/src`) means changes to local files immediately trigger a restart inside the container.

### When `tsx watch` does NOT restart

`tsx watch` restarts when `.ts` files change. It does **not** restart if you:
- Add a new dependency to `package.json` (requires `docker compose up --build server`)
- Change `tsconfig.json` (requires container restart: `docker compose restart server`)

---

## The `.env.example` Convention

```env
# .env.example
DATABASE_URL=postgres://postgres:postgres@postgres:5432/meridian
REDIS_URL=redis://redis:6379
JWT_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
ANTHROPIC_API_KEY=replace-with-your-real-key
CLIENT_ORIGIN=http://localhost:5173
PORT=3001
```

Notice `postgres` in the DATABASE_URL hostname (not `localhost`). Inside Docker Compose, services communicate by service name, not by `localhost`. This is a common first-time mistake: `localhost` in the DATABASE_URL works outside Docker but fails inside the container.

---

## Key Points

- Docker Compose defines the service topology: postgres, redis, server, client.
- Use `pgvector/pgvector:pg16` image — it has the extension pre-installed.
- Mount `db/` as the postgres init directory for automatic schema application on first run.
- `tsx watch` handles hot reload for the server. Volume mounts make local changes immediately visible.
- Database host inside Docker Compose is the service name (`postgres`), not `localhost`.
- The `depends_on` + healthcheck pattern ensures the server doesn't start before postgres is ready.

---

## Exercise

Write the `docker-compose.yml` for Meridian from memory, then compare it to the reference above. Pay attention to:
1. Which service depends on which
2. What the DATABASE_URL hostname is (inside Docker)
3. How the schema gets applied on first run
4. What the server volume mount enables

Common mistakes to check for: using `localhost` in DATABASE_URL, forgetting the healthcheck on postgres, and missing the `../db:/docker-entrypoint-initdb.d` volume.
