# L15 — React Router, Protected Routes, and the Workspace Shell

**Module**: M06 — Frontend Foundation  
**Type**: Applied  
**Estimated time**: 25 minutes

---

## The Route Architecture

Meridian's routing has three tiers:

1. **Public routes** — accessible without authentication (`/login`, `/register`)
2. **Workspace routes** — require authentication + active workspace context
3. **Page routes** — nested inside workspace routes, require a `pageId` param

The route structure expresses this hierarchy directly:

```
/login                          → LoginPage (public)
/register                       → RegisterPage (public)
/workspaces/:workspaceId        → WorkspaceShell (auth required)
/workspaces/:workspaceId/p/:pageId  → EditorPage (auth + page required)
```

---

## The `WorkspaceShell` Layout

The workspace shell is the persistent UI frame that wraps all workspace-level pages:

```typescript
// client/src/layouts/WorkspaceShell.tsx
import { Outlet, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useAuthStore } from '../store/authStore'
import { apiRequest } from '../api/client'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'

export function WorkspaceShell() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace)
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    if (!workspaceId || !user) return

    apiRequest<{ workspace: { id: string; name: string; slug: string; role: string } }>(
      `/api/workspaces/${workspaceId}`
    ).then(({ workspace }) => {
      setActiveWorkspace({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        role: workspace.role as 'owner' | 'admin' | 'member' | 'viewer'
      })
    }).catch(() => {
      // Workspace not found or no access — redirect
      window.location.href = '/workspaces'
    })
  }, [workspaceId, user])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar />
        <Outlet />  {/* Child routes render here */}
      </main>
    </div>
  )
}
```

`<Outlet />` is React Router v6's way of rendering the matched child route. The shell provides the persistent sidebar and top bar; the page content (a specific page, settings, etc.) renders via `<Outlet />`.

---

## Protected Routes with Loading State

The `RequireAuth` guard must handle three states, not two:

```typescript
// client/src/components/RequireAuth.tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: React.ReactNode
}

export function RequireAuth({ children }: Props) {
  const { accessToken, isLoading } = useAuthStore(s => ({
    accessToken: s.accessToken,
    isLoading: s.isLoading
  }))

  // State 1: Still checking (token refresh in progress)
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent" />
    </div>
  }

  // State 2: Not authenticated
  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  // State 3: Authenticated
  return <>{children}</>
}
```

Without the `isLoading` state, users with valid sessions would see a flash of the login page on every page load while the token refresh is in progress.

---

## Nested Routes and the `WorkspaceShell`

```typescript
// client/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { WorkspaceShell } from './layouts/WorkspaceShell'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { WorkspaceDashboard } from './pages/WorkspaceDashboard'
import { EditorPage } from './pages/EditorPage'
import { WorkspaceListPage } from './pages/WorkspaceListPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/workspaces"
        element={
          <RequireAuth>
            <WorkspaceListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/workspaces/:workspaceId"
        element={
          <RequireAuth>
            <WorkspaceShell />
          </RequireAuth>
        }
      >
        {/* These are nested — rendered inside WorkspaceShell's <Outlet /> */}
        <Route index element={<WorkspaceDashboard />} />
        <Route path="p/:pageId" element={<EditorPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  )
}
```

Nested routes are declared as children of the parent `<Route>`. React Router v6 renders them into the parent's `<Outlet />`. The `index` route renders when the parent path matches exactly (no additional segments).

---

## Reading Route Params Safely

```typescript
// client/src/pages/EditorPage.tsx
import { useParams } from 'react-router-dom'

export function EditorPage() {
  // pageId is string | undefined — useParams returns all params as string | undefined
  const { workspaceId, pageId } = useParams<{
    workspaceId: string
    pageId: string
  }>()

  if (!pageId || !workspaceId) {
    // This should never happen if routing is correct,
    // but TypeScript requires handling the undefined case
    return <div>Page not found</div>
  }

  // Now workspaceId and pageId are string (not undefined)
  return <Editor workspaceId={workspaceId} pageId={pageId} />
}
```

`useParams` always returns params as `string | undefined` — even for required params — because TypeScript has no way to know if the route was matched correctly. The `if (!pageId)` guard narrows the type and also handles any edge case where the route structure changes.

---

## Key Points

- Three route tiers: public, workspace-auth, nested page routes.
- `RequireAuth` has three states: loading (show spinner), unauthenticated (redirect), authenticated (render).
- `WorkspaceShell` is a layout component — it fetches workspace context and renders `<Outlet />` for child routes.
- Nested routes in React Router v6 are declared as children of the parent `<Route>` and render into `<Outlet />`.
- `useParams()` returns `string | undefined` for all params — always guard against undefined before use.
- The `isLoading` state on the auth store prevents the login redirect flash during initial token refresh.
