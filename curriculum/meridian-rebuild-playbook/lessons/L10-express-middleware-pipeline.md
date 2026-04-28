# L10 — The Express Middleware Pipeline

**Module**: M05 — Server Architecture  
**Type**: Core  
**Estimated time**: 30 minutes

---

## The Pipeline Determines Everything

The order of middleware in Express is not a style choice — it determines what is protected, how errors propagate, and what every handler can assume. The Meridian server has a specific, deliberate pipeline order:

```
Helmet → CORS → Rate Limiter → JSON Parser → Auth → Workspace → Zod → Handler → Error Handler
```

Each middleware's position is defined by what it needs to know and what later middleware depends on.

---

## The Complete `app.ts`

```typescript
// server/src/app.ts
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { json } from 'express'
import { authMiddleware } from './middleware/auth'
import { requireWorkspace } from './middleware/tenant'
import { authRouter } from './routes/auth'
import { workspaceRouter } from './routes/workspace'
import { pageRouter } from './routes/page'
import { aiRouter } from './routes/ai'
import { errorHandler } from './middleware/errorHandler'

const app = express()

// 1. Security headers first — applied to every response
app.use(helmet())

// 2. CORS — defines what origins can call this API
app.use(cors({
  origin: process.env.CLIENT_ORIGIN,
  credentials: true  // Required for cookies (refresh tokens)
}))

// 3. Rate limiting — stops brute force before request body is parsed
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api/', limiter)

// 4. Body parser — JSON parsing after security and rate checks
app.use(json())

// 5. Auth routes — these do NOT require authMiddleware
//    (login, register, refresh are the unauthenticated entry points)
app.use('/api/auth', authRouter)

// 6. Authentication middleware — all routes below require a valid JWT
app.use('/api', authMiddleware)

// 7. Workspace and page routes — require auth + workspace context
app.use('/api/workspaces', workspaceRouter)
app.use('/api/workspaces/:workspaceId/pages', requireWorkspace, pageRouter)
app.use('/api/workspaces/:workspaceId/ai', requireWorkspace, aiRouter)

// 8. Error handler — always last
app.use(errorHandler)

export { app }
```

---

## Why Each Position Matters

### 1. Helmet before everything

Helmet sets HTTP security headers on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Content-Security-Policy`. If Helmet is placed after routes, any route that responds before Helmet runs would send headers without these protections.

### 2. CORS before rate limiting

CORS preflight requests (OPTIONS) must receive the correct `Access-Control-Allow-Origin` header. If CORS is after rate limiting, a high volume of preflight requests could trip the rate limiter, blocking legitimate browser requests.

### 3. Rate limiting before JSON parsing

Parsing the request body is work. If an attacker sends a flood of requests with large JSON bodies, parsing all of them consumes CPU and memory. Rate limiting before JSON parsing means malicious requests are rejected before any parsing work happens.

### 4. Auth routes before `authMiddleware`

`/api/auth/login`, `/api/auth/register`, and `/api/auth/refresh` are the unauthenticated entry points. They must be registered **before** the `authMiddleware` is applied to `/api`. Otherwise, even login would require a valid JWT to proceed.

### 5. `requireWorkspace` at the route level, not globally

`requireWorkspace` sets the RLS context in PostgreSQL. Not every route needs it (workspace list routes don't belong to a specific workspace). Applying it globally would cause DB errors on routes that don't have a `workspaceId` param.

### 6. Error handler absolutely last

Express identifies a 4-argument function `(err, req, res, next)` as an error handler. It only receives control if a previous middleware or route handler calls `next(err)` or throws. If the error handler is not last, subsequent routes can execute after an error occurs.

---

## The Error Handler

```typescript
// server/src/middleware/errorHandler.ts
import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      details: err.flatten().fieldErrors
    })
    return
  }

  if (err.message === 'UNAUTHORIZED') {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return
  }

  if (err.message === 'WORKSPACE_ACCESS_DENIED') {
    res.status(403).json({ error: 'FORBIDDEN' })
    return
  }

  // Log unexpected errors (do not expose internals to client)
  console.error('[Server Error]', err)
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' })
}
```

All routes can call `next(err)` with a known error message or throw a typed error. The error handler provides one place to convert error types to HTTP status codes. This avoids duplicating `res.status(400).json(...)` calls across every route handler.

---

## The Auth Middleware

```typescript
// server/src/middleware/auth.ts
import type { RequestHandler } from 'express'
import { verifyAccessToken } from '../auth/tokens'

export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    next(new Error('UNAUTHORIZED'))
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, email: payload.email, plan: payload.plan }
    next()
  } catch {
    next(new Error('UNAUTHORIZED'))
  }
}
```

The middleware attaches `req.user` so every downstream handler knows the authenticated user without re-reading the token. The TypeScript `req.user` property is declared in a type augmentation:

```typescript
// server/src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; plan: string }
      workspace?: { id: string; role: string }
    }
  }
}
```

---

## Key Points

- Middleware pipeline order: Helmet → CORS → Rate Limiter → JSON → Auth routes → authMiddleware → Routes → Error Handler
- Helmet must be first — it sets security headers on every response.
- Rate limit before JSON parsing — reject flood requests before doing CPU/memory work.
- Register auth routes (`/api/auth`) before applying `authMiddleware` to `/api`.
- Apply `requireWorkspace` at the route level, not globally — only workspace-scoped routes need it.
- The error handler must be the last registered middleware — four-argument `(err, req, res, next)` signature is how Express identifies it.
