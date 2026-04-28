# L03 — pnpm Workspaces and TypeScript Strict Config

**Module**: M02 — Monorepo and Infrastructure  
**Type**: Core  
**Estimated time**: 20 minutes

---

## The Foundation You Can't Skip

TypeScript strict mode and pnpm workspaces are not configuration details. They are the technical contracts that every library in the Meridian stack relies on. Getting them wrong early means debugging confusing type errors later — errors that look like library bugs but are actually strict-mode violations.

---

## pnpm Workspace Structure

Meridian is a monorepo with three packages managed by pnpm:

```yaml
# pnpm-workspace.yaml
packages:
  - client
  - server
  - db
```

Each package has its own `package.json` and can declare its own dependencies. pnpm hoists shared dependencies to the root `node_modules` but keeps per-package lockfile entries separate. This means:

- `client/` and `server/` can share types without a separate `@types/` package
- `db/` contains migration scripts and schema without being bundled into either app
- Adding a dependency to `server/` does not affect the client build

### The root `package.json`

```json
{
  "name": "meridian",
  "private": true,
  "scripts": {
    "dev": "docker compose -f infra/docker-compose.yml up",
    "stop": "docker compose -f infra/docker-compose.yml down"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

The root package has no source code — it is an orchestration layer for Docker and tooling scripts. Shared dev dependencies (TypeScript, ESLint) live here.

---

## TypeScript Strict Mode — Not Optional

Both `client/` and `server/` are separate TypeScript programs with separate `tsconfig.json` files. Both must have `"strict": true`. This activates nine sub-flags simultaneously:

| Sub-flag | What it enforces |
|---|---|
| `strictNullChecks` | `null` and `undefined` are separate types; you cannot pass `null` where `string` is expected |
| `noImplicitAny` | Variables must have explicit types; implicit `any` is an error |
| `strictFunctionTypes` | Function parameter types are checked contravariantly |
| `strictBindCallApply` | `bind`, `call`, `apply` are type-checked correctly |
| `strictPropertyInitialization` | Class properties must be initialized in the constructor |
| `noImplicitThis` | `this` must be typed in function contexts |
| `alwaysStrict` | Emits `"use strict"` in all compiled files |
| `useUnknownInCatchVariables` | `catch(e)` gives `e` as `unknown`, not `any` |
| `exactOptionalPropertyTypes` | Optional properties cannot be set to `undefined` explicitly |

### Why This Matters for Every Library

The Meridian stack depends on strict mode in specific, testable ways:

**Zod without strict mode:**
```typescript
// Without strict: true, z.infer<> may produce incorrect types
const schema = z.object({ workspaceId: z.string().uuid() })
type Payload = z.infer<typeof schema>
// Payload.workspaceId is `string` with strictNullChecks
// Without strictNullChecks, Payload.workspaceId could be `string | null`
```

**Zustand without strict mode:**
```typescript
// Zustand's curried create pattern requires strict mode for correct inference
const useStore = create<WorkspaceState>()((set) => ({
  workspaces: [],
  loadWorkspaces: async () => { /* ... */ }
}))
// Without strict mode, the generic inference breaks and `set` loses type information
```

**Anthropic SDK without strict mode:**
```typescript
// The SDK exports typed MessageParam — strictNullChecks is required
const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: userInput } // content must be string | ContentBlock[]
]
// Without strictNullChecks, null values can sneak into the content array
```

---

## Client `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Key points:
- `"lib": ["DOM", "DOM.Iterable"]` — gives access to browser APIs that Lexical needs
- `"isolatedModules": true` — required by Vite/esbuild; each file must be independently parseable
- `"noEmit": true` — Vite handles compilation; TypeScript is type-checking only

## Server `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Key points:
- `"lib": ["ES2022"]` — server, no DOM APIs
- `"module": "NodeNext"` — required for native ESM with `.js` extensions on imports
- `outDir`/`rootDir` — server compiles to `dist/`; client does not (Vite handles it)

### The `isolatedModules` Gotcha

`isolatedModules: true` means type-only imports must use `import type`:

```typescript
// ❌ Fails with isolatedModules
import { Request, Response } from 'express'

// ✅ Correct
import type { Request, Response } from 'express'
```

Vite will error at build time (not runtime) if you forget this. It is a common first-day mistake.

---

## Key Points

- pnpm workspaces separate client, server, and db into independent packages with shared tooling.
- TypeScript strict mode activates nine sub-flags. All are needed for the Meridian stack.
- Client and server have separate `tsconfig.json` files with different `lib` targets (DOM vs Node).
- `isolatedModules: true` is required by Vite — use `import type` for type-only imports.
- Setting up the TypeScript config correctly is not a configuration detail — it is the technical contract that Zod, Zustand, and the Anthropic SDK all depend on.
