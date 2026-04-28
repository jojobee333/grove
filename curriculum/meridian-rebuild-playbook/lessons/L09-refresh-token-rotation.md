# L09 — Refresh Token Rotation and Redis Session Backing

**Module**: M04 — Authentication Architecture  
**Type**: Applied  
**Estimated time**: 25 minutes

---

## Why Refresh Tokens Need a Server Store

A refresh token is a long-lived credential (7–30 days). If one is stolen, the attacker can silently re-issue access tokens indefinitely. To mitigate this:

1. Refresh tokens are stored in Redis — the server can invalidate them
2. Every use of a refresh token **rotates** it: the old token is deleted, a new one is issued
3. If the old token is used after rotation (replay attack), the server detects the reuse and **revokes the entire session**

This pattern is called **refresh token rotation with reuse detection**.

---

## Redis Key Structure

```
meridian:refresh:<userId>:<tokenId>  →  token_hash  (TTL: 7 days)
```

- The key includes both `userId` and a random `tokenId` so multiple devices can have separate sessions
- The value is the **hash** of the refresh token, not the token itself (defense in depth)
- TTL of 7 days — the token automatically expires even if not explicitly revoked

---

## Issuing a Refresh Token

```typescript
// server/src/auth/refresh.ts
import { randomBytes, createHash } from 'crypto'
import { redis } from '../redis'

const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7  // 7 days

export async function issueRefreshToken(userId: string): Promise<string> {
  const tokenId = randomBytes(16).toString('hex')
  const tokenValue = randomBytes(32).toString('hex')
  const rawToken = `${tokenId}.${tokenValue}`

  // Store the hash of the token, not the raw token
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const key = `meridian:refresh:${userId}:${tokenId}`

  await redis.setex(key, REFRESH_TTL_SECONDS, tokenHash)

  return rawToken  // Return the raw token to the client
}
```

The raw token (`tokenId.tokenValue`) is returned to the client and stored in an HttpOnly cookie. The server stores only the SHA-256 hash. If Redis is compromised, the stored hashes cannot be used directly as tokens.

---

## Consuming a Refresh Token (with Rotation)

```typescript
// server/src/auth/refresh.ts (continued)
import { verifyAccessToken, signAccessToken } from './tokens'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function rotateRefreshToken(rawToken: string, userId: string) {
  const [tokenId, tokenValue] = rawToken.split('.')

  if (!tokenId || !tokenValue) {
    throw new Error('INVALID_REFRESH_TOKEN')
  }

  const key = `meridian:refresh:${userId}:${tokenId}`
  const storedHash = await redis.get(key)

  if (!storedHash) {
    // Token not found — could be expired or previously rotated
    // Revoke ALL sessions for this user (reuse detection)
    await revokeAllSessions(userId)
    throw new Error('REFRESH_TOKEN_REUSE_DETECTED')
  }

  const incomingHash = createHash('sha256')
    .update(rawToken)
    .digest('hex')

  if (incomingHash !== storedHash) {
    throw new Error('INVALID_REFRESH_TOKEN')
  }

  // Delete the old token (rotation)
  await redis.del(key)

  // Fetch user for access token payload
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })

  if (!user) throw new Error('USER_NOT_FOUND')

  // Issue new tokens
  const newRefreshToken = await issueRefreshToken(userId)
  const newAccessToken = signAccessToken(user.id, user.email, user.plan)

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

async function revokeAllSessions(userId: string): Promise<void> {
  // Delete all refresh token keys for this user
  const pattern = `meridian:refresh:${userId}:*`
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
```

### The Reuse Detection Logic

When `redis.get(key)` returns `null`, there are two possibilities:
1. The token expired naturally (TTL elapsed)
2. The token was already rotated — someone used a previously valid token (replay/theft)

Meridian treats both cases the same: revoke all sessions for the user and force re-login. This is aggressive but correct — a legitimate client that loses a refresh token to expiry will simply need to log in again, which is a minor inconvenience. The alternative (allowing replayed tokens) is a session hijack.

---

## Delivering Tokens to the Client

Access tokens and refresh tokens must not be stored in `localStorage` — they are accessible to JavaScript, making them vulnerable to XSS.

```typescript
// server/src/routes/auth.ts (response pattern)
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,        // Not accessible to JS
  secure: true,          // HTTPS only
  sameSite: 'strict',   // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in ms
})

res.json({ accessToken })  // Access token goes in memory, not localStorage
```

The client stores the **access token in memory** (a React state or Zustand store). When the access token expires, the client sends a request to `/api/auth/refresh` — the HttpOnly cookie is sent automatically. If the refresh succeeds, the new access token replaces the one in memory.

---

## The Full Auth Flow

```
1. POST /api/auth/login
   → verifies password
   → issues accessToken (15min JWT) + refreshToken (7d, stored in Redis)
   → response: { accessToken } + Set-Cookie: refreshToken

2. Client: stores accessToken in memory only (Zustand store)
   
3. Every API request: Authorization: Bearer <accessToken>

4. When accessToken expires (React detects 401):
   → POST /api/auth/refresh (no body — refreshToken cookie sent automatically)
   → server verifies token, rotates it, issues new pair
   → response: { accessToken } + new Set-Cookie: refreshToken

5. POST /api/auth/logout
   → server: delete refreshToken key from Redis
   → response: Clear-Cookie
```

---

## Key Points

- Refresh tokens are stored in Redis as SHA-256 hashes with a 7-day TTL. The raw token is never stored server-side.
- Every refresh rotates the token: old token deleted, new token issued. This is non-negotiable.
- Reuse detection: if a previously rotated token is presented, revoke ALL sessions for the user.
- Refresh tokens are delivered as HttpOnly cookies. Access tokens are stored in client memory only.
- `localStorage` is never used for tokens — it is accessible to JavaScript and XSS-vulnerable.
