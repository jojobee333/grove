# L14 — Zustand Stores: Single Source of Truth

**Module**: M06 — Frontend Foundation  
**Type**: Core  
**Estimated time**: 25 minutes

---

## Why Zustand Over Context + useState

React Context is appropriate for static or rarely-changing values (theme, locale). For frequently-updated state (pages list, auth tokens, UI state), Context causes every consumer to re-render on every change — even if the consumer only reads one field.

Zustand avoids this by using selectors:

```typescript
// Only re-renders when accessToken specifically changes
const accessToken = useAuthStore(state => state.accessToken)
```

Zustand also:
- Works outside React (you can read or write store state in a non-component function)
- Supports middleware (immer for immutable updates, persist for localStorage)
- Integrates with React 18's concurrent mode without special configuration

---

## The Auth Store

```typescript
// client/src/store/authStore.ts
import { create } from 'zustand'

interface User {
  id: string
  email: string
  displayName: string
  plan: 'free' | 'pro' | 'enterprise'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,  // true on init — token refresh may be in progress

  setAuth: (user, token) => set({ user, accessToken: token, isLoading: false }),
  clearAuth: () => set({ user: null, accessToken: null, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading })
}))
```

**Why `isLoading: true` by default?**

On page load, the client attempts a token refresh (`POST /api/auth/refresh`) using the stored HttpOnly cookie. Until this completes, we don't know if the user is authenticated. Setting `isLoading: true` initially prevents the `RequireAuth` guard from flashing the login page for authenticated users.

---

## The Workspace Store

```typescript
// client/src/store/workspaceStore.ts
import { create } from 'zustand'

interface Workspace {
  id: string
  name: string
  slug: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  setWorkspaces: (workspaces: Workspace[]) => void
  setActiveWorkspace: (workspace: Workspace) => void
  addWorkspace: (workspace: Workspace) => void
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  workspaces: [],
  activeWorkspace: null,

  setWorkspaces: (workspaces) => set({ workspaces }),

  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

  addWorkspace: (workspace) => set((state) => ({
    workspaces: [...state.workspaces, workspace]  // Immutable update
  }))
}))
```

Note `addWorkspace` creates a new array with the spread operator. This is the React 18 immutable update pattern — never `state.workspaces.push(workspace)`.

---

## Reading Store State Outside Components

Zustand stores can be read and written outside React components, which is useful for API calls:

```typescript
// client/src/api/client.ts
import { useAuthStore } from '../store/authStore'

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Read from store directly — not a hook, so no component needed
  const { accessToken } = useAuthStore.getState()

  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    }
  })

  if (response.status === 401) {
    // Token expired — trigger refresh
    const { clearAuth } = useAuthStore.getState()
    clearAuth()
    window.location.href = '/login'
  }

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'API_ERROR')
  }

  return response.json()
}
```

`useAuthStore.getState()` reads the current state synchronously without subscribing. This is for non-component contexts (API helpers, utilities). Inside components, always use the hook: `const token = useAuthStore(s => s.accessToken)`.

---

## Token Refresh Loop

On application load, a `TokenRefresher` component attempts to refresh the access token:

```typescript
// client/src/components/TokenRefresher.tsx
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

export function TokenRefresher() {
  const setAuth = useAuthStore(s => s.setAuth)
  const setLoading = useAuthStore(s => s.setLoading)

  useEffect(() => {
    let active = true

    async function refresh() {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        if (!res.ok) {
          setLoading(false)
          return
        }
        const { accessToken, user } = await res.json()
        if (active) setAuth(user, accessToken)
      } catch {
        setLoading(false)
      }
    }

    refresh()
    return () => { active = false }
  }, [])

  return null  // No UI output
}
```

This component is rendered at the root of the app. It has no UI — it is purely a lifecycle hook that attempts the token refresh and updates the auth store. The `active` flag prevents setting state after unmount (a common React 18 warning source).

---

## Key Points

- Zustand prevents unnecessary re-renders via selectors: `useStore(s => s.specificField)`.
- `isLoading: true` on auth store init prevents the login redirect flash during token refresh.
- All state updates must be immutable — use spread operators or `immer` middleware.
- `useStore.getState()` reads state outside components without subscribing (for API helpers).
- The `TokenRefresher` component handles the initial access token restoration on page load.
- Workspace store separation from auth store follows the single-responsibility principle: auth is identity, workspace is context.
