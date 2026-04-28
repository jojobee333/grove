# L13 — React 18 + Vite + TypeScript: The Frontend Foundation

**Module**: M06 — Frontend Foundation  
**Type**: Core  
**Estimated time**: 25 minutes

---

## The Constraint That Drives the Choice

Meridian is a browser-only SPA. There is no server-side rendering requirement, no need for file-based routing, no need for server components. The constraint ("browser-only editor with client-side state") rules out Next.js (which is optimized for SSR/SSG) and points directly to Vite — a pure client-side bundler with excellent HMR and TypeScript support.

---

## The Vite Configuration

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

**The proxy is essential.** Without it, `fetch('/api/workspaces')` from the client would go to `localhost:5173/api/...` — the Vite dev server, not the Express API at `localhost:3001`. The proxy rewrites the target.

In production, a reverse proxy (nginx) handles this routing. The Vite dev proxy is a development-only convenience that matches the production topology.

---

## The Application Entry Point

```typescript
// client/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

**`React.StrictMode`** is important in development — it intentionally invokes effects and renders twice to surface bugs that depend on render order or side effects. Do not remove it. It is development-only and has no production impact.

**`BrowserRouter`** must wrap the entire application, not just the routes. This provides the routing context that `useNavigate`, `useParams`, and `<Link>` all depend on.

---

## The `App.tsx` Route Structure

```typescript
// client/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { WorkspaceShell } from './layouts/WorkspaceShell'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/workspaces/:workspaceId/*"
        element={
          <RequireAuth>
            <WorkspaceShell />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
```

The `RequireAuth` component reads the access token from the auth store. If no token exists, it redirects to `/login`. This guard is the only place this check is needed — all authenticated routes are children of `RequireAuth`.

---

## React 18 Concurrent Mode: The Immutability Requirement

React 18's concurrent rendering mode can interrupt and restart renders. If state updates mutate objects in place, interrupted renders see inconsistent snapshots. The constraint is:

> **Never mutate state directly. Always create new objects/arrays for state updates.**

This is enforced by TypeScript's `readonly` and by Zustand's design:

```typescript
// ❌ Mutation — breaks React 18 concurrent mode
state.pages.push(newPage)

// ✅ Immutable update
set(state => ({
  pages: [...state.pages, newPage]
}))
```

Lexical (the editor) also relies on this. The `EditorState` is immutable — updates create new state objects rather than modifying existing ones. This is not a Lexical quirk; it is a prerequisite for React 18 concurrent mode integration.

---

## Key Points

- Vite is the correct choice for a browser-only SPA — it does not add SSR complexity that the constraints don't require.
- The Vite proxy (`/api → localhost:3001`) is required in dev. Without it, API calls go to the wrong server.
- `React.StrictMode` is development-only but important — keep it.
- `BrowserRouter` wraps the entire app, not just route definitions.
- `RequireAuth` is the single guard for all authenticated routes.
- React 18 concurrent mode requires immutable state updates — never mutate arrays or objects in state.
