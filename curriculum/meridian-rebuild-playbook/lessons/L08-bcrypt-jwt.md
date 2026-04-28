# L08 — bcrypt and JWT: Password Storage and Token Issuance

**Module**: M04 — Authentication Architecture  
**Type**: Core  
**Estimated time**: 30 minutes

---

## Why Authentication Is a Four-Component System

Authentication in Meridian is not just "check the password and return a token." It is a four-component system where each component has specific constraints:

1. **Password hashing** — bcrypt with cost factor 12 (not MD5, not SHA256, not bcrypt cost 10)
2. **Access token** — short-lived JWT, signed with `JWT_SECRET`, not stored server-side
3. **Refresh token** — long-lived opaque token, stored in Redis, rotated on every use
4. **Workspace authorization** — after identity is verified, verify the user has a valid membership role

Missing any one component creates a different vulnerability. The components must be implemented in order.

---

## Component 1: Password Hashing with bcrypt

```typescript
// server/src/auth/password.ts
import bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 12

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash)
}
```

**Why cost factor 12?**

bcrypt is intentionally slow. The cost factor (work factor) controls how slow:
- Cost 10: ~100ms per hash
- Cost 12: ~400ms per hash
- Cost 14: ~1600ms per hash

The non-negotiable rule is cost factor 12. This is the current industry standard for protecting against offline brute-force attacks. An attacker who steals the `users` table and tries to crack hashes at 2.5 hashes/second per GPU faces:

At 8-character random password with bcrypt-12:
- 10 GPU machines: ~12 years for full space

Lower cost factors make this window shorter. Do not use cost 10 or below for user passwords.

**What bcrypt stores:**

```
$2b$12$saltsaltsaltsaltsaltsahashhashhashhashhashhashhash
 |   |  |----22 chars salt----|-----31 chars hash---------|
 |   |
 |   cost factor (12)
 bcrypt version (2b)
```

The entire string (`$2b$12$...`) is stored in `password_hash`. The salt is embedded in the output. `bcrypt.compare()` extracts the salt from the stored hash and applies it to the plaintext for comparison.

---

## Component 2: Access Token (JWT)

```typescript
// server/src/auth/tokens.ts
import jwt from 'jsonwebtoken'
import type { StringValue } from 'ms'

const ACCESS_TOKEN_EXPIRY: StringValue = '15m'

export interface AccessTokenPayload {
  sub: string      // user ID
  email: string
  plan: string
  iat: number
  exp: number
}

export function signAccessToken(userId: string, email: string, plan: string): string {
  return jwt.sign(
    { sub: userId, email, plan },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  )
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as AccessTokenPayload
}
```

**Access token design decisions:**

- **15-minute expiry** — If an access token is stolen (via XSS or log leak), it is usable for at most 15 minutes. The refresh token mechanism silently issues new access tokens before expiry, so users do not notice.
- **`sub` claim = user ID** — The `sub` (subject) is the standard JWT claim for the principal. Use it consistently; don't invent a custom `userId` claim.
- **No workspace context in the access token** — The workspace is resolved per-request by the tenant middleware, not stored in the token. This allows a user to switch workspaces without re-authenticating.

**What the JWT does NOT contain:**

- No refresh token (refresh tokens are server-stored, not in JWTs)
- No workspace ID (resolved per-request)
- No role (resolved per-request from `workspace_members`)
- No IP address binding (would break mobile clients)

---

## Component 3: Registration Handler

```typescript
// server/src/auth/register.ts
import { db } from '../db'
import { users } from '../db/schema'
import { hashPassword } from './password'
import { signAccessToken } from './tokens'

export async function registerUser(
  email: string,
  password: string,
  displayName: string
) {
  // Check for existing user BEFORE hashing to avoid doing work on duplicates
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim())
  })

  if (existing) {
    throw new Error('EMAIL_TAKEN')
  }

  const passwordHash = await hashPassword(password)

  const [user] = await db.insert(users).values({
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    display_name: displayName
  }).returning()

  const accessToken = signAccessToken(user.id, user.email, user.plan)

  return { user, accessToken }
}
```

**Why normalize the email before storage?**

`email.toLowerCase().trim()` ensures `User@Example.com` and `user@example.com` refer to the same account. Without normalization, the UNIQUE constraint on `users.email` would allow duplicate accounts differing only by case.

---

## Component 4: Login Handler

```typescript
// server/src/auth/login.ts
import { db } from '../db'
import { users } from '../db/schema'
import { verifyPassword } from './password'
import { signAccessToken } from './tokens'
import { eq } from 'drizzle-orm'

export async function loginUser(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim())
  })

  // Constant-time comparison path: always call verifyPassword
  // even when user is not found, to prevent user enumeration
  const dummyHash = '$2b$12$invalidhashfortimingnormalizat'
  const passwordHash = user?.password_hash ?? dummyHash

  const isValid = await verifyPassword(password, passwordHash)

  if (!user || !isValid) {
    throw new Error('INVALID_CREDENTIALS')  // same error for both cases
  }

  const accessToken = signAccessToken(user.id, user.email, user.plan)
  return { user, accessToken }
}
```

**Timing attack prevention:**

If the login handler returns immediately when a user is not found, an attacker can distinguish "user does not exist" (fast response) from "wrong password" (slow response due to bcrypt). This is a user enumeration vulnerability.

The solution: always call `verifyPassword()`, even when the user is not found (using a dummy hash). This makes both paths take approximately the same time. Both failure cases return the same error message `INVALID_CREDENTIALS`.

---

## Key Points

- bcrypt cost factor 12 is non-negotiable. Do not use cost 10.
- Access tokens expire in 15 minutes. Refresh tokens handle re-issuance silently.
- `sub` claim = user ID. No workspace ID in the access token — it is resolved per-request.
- Always normalize emails to lowercase + trim before storage and lookup.
- Always call `verifyPassword()` even when the user is not found — prevents timing-based user enumeration.
- Registration: check for duplicate email before hashing to avoid unnecessary work.
