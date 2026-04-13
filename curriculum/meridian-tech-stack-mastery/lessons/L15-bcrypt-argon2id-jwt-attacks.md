# bcrypt vs Argon2id and the JWT Attacks That Actually Happen

**Module**: M08 · Security: Four Independent Layers
**Type**: debate
**Estimated time**: 15 minutes
**Claim**: C14 — bcrypt at cost factor 12 is correct for Meridian today; Argon2id is the upgrade path; specific JWT attacks are preventable with two middleware options

---

## The core idea

Two credential security questions for Meridian: (1) bcrypt at cost factor 12 vs Argon2id for password hashing, and (2) which JWT attacks actually happen in production and which two code changes prevent them. Neither of these are academic — OWASP's password storage cheat sheet, RFC 8725, and real deployment data all inform the decision. The answer for Meridian is: bcrypt cost 12 is sufficient today but Argon2id is the better hash when migrating; the two JWT options `algorithms: ["HS256"]` and explicit expiry are mandatory, not optional.

## Why it matters

Credential hashing is one of those security decisions that's invisible until it's catastrophically wrong. Understanding the specific attack scenarios — not just "use bcrypt" but *why* cost factor matters and *what* the alg:none attack looks like — means you can defend the current implementation and know when to upgrade it.

## A concrete example

**bcrypt cost factor: what it controls**

bcrypt's `cost` parameter (also called `rounds` or `work factor`) is a power of two. `cost: 12` means $2^{12}$ = 4,096 iterations of bcrypt's key schedule. On a 2024-era server, hashing one password at cost 12 takes approximately 250–400ms. This is the target: slow enough that offline brute-force is impractical, fast enough that login latency is acceptable.

```typescript
// server/src/auth/password.ts
import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12 // OWASP minimum: 10, recommended: 12-14

export async function hashPassword(plaintext: string): Promise<string> {
  // bcrypt.hash() generates a random salt automatically
  // The salt is embedded in the returned hash string
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  // bcrypt.compare() extracts the salt from the hash and re-hashes
  // Returns true only if the hash matches
  return bcrypt.compare(plaintext, hash)
}

// What the hash looks like:
// $2b$12$<22-char salt><31-char hash>
//  ↑    ↑
//  version cost factor
```

**Why not cost 14 or 16?**

At cost 14: ~1s per hash. For a login endpoint with 10 concurrent users: potential 10s queue. At cost 16: ~4s, unacceptable latency. The tradeoff is real. OWASP's current recommendation is cost 12 as the minimum for bcrypt — cost 12 is where Meridian is.

**bcrypt vs Argon2id — the upgrade scenario**

```
                bcrypt (cost 12)    Argon2id (recommended params)
──────────────────────────────────────────────────────────────────
Algorithm age   1999 (stable)       2015, PHC winner (modern)
GPU resistance  Moderate (bcrypt    High (memory-hard: fills RAM,
                fits in SRAM)       makes GPU parallelism costly)
Memory usage    ~4KB                Configurable, recommended: 19MB
Parameters      1 (cost factor)     3 (memory, iterations, parallelism)
Node.js         bcrypt package      argon2 package (requires native)
OWASP rating    Acceptable          Preferred
When to migrate When GPU hashing    If threat model includes GPU
                cost drops enough   cracking farm attacks
                to make cost 12
                too fast
```

```typescript
// Argon2id implementation (upgrade path)
import argon2 from "argon2"

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,  // 19 MB — OWASP recommendation
  timeCost: 2,        // 2 iterations
  parallelism: 1,
}

export async function hashPasswordArgon2(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTIONS)
}
```

**The two JWT attacks from RFC 8725**

**Attack 1: alg:none**

```
Attacker crafts a JWT:
  Header: { "alg": "none" }
  Payload: { "userId": "admin", "workspaceId": "any-uuid" }
  Signature: (empty)

If jwt.verify() is called without specifying algorithms,
some implementations accept "none" as a valid algorithm
and skip signature verification entirely.

Prevention: always specify algorithms: ["HS256"]
```

**Attack 2: RS256 → HS256 confusion (RSA-to-HMAC)**

```
Server uses RS256 (asymmetric). Public key is published.
Attacker uses the PUBLIC KEY as the HMAC SECRET for a new HS256 token.

If jwt.verify() accepts both RS256 and HS256 without restriction,
it might verify the attacker's HS256 token using the public key as the
HMAC secret — and accept it as valid.

Prevention: always specify exactly ONE algorithm
           jwt.verify(token, secret, { algorithms: ["HS256"] })
```

**Meridian's implementation — both attacks prevented**

```typescript
// server/src/auth/jwt.ts
import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable required")
if (JWT_SECRET.length < 32) throw new Error("JWT_SECRET too short — minimum 32 chars")

const SIGN_OPTIONS: SignOptions = {
  algorithm: "HS256",
  expiresIn: "15m",      // Short-lived access tokens
}

const VERIFY_OPTIONS: VerifyOptions = {
  algorithms: ["HS256"], // EXPLICIT — prevents alg:none and algorithm confusion
  // clockTolerance: 0 — strict expiry check (default)
}

export function signAccessToken(payload: { userId: string; workspaceId: string }): string {
  return jwt.sign(payload, JWT_SECRET, SIGN_OPTIONS)
}

export function verifyAccessToken(token: string): { userId: string; workspaceId: string } {
  // Throws on: invalid signature, expired, wrong algorithm, malformed
  return jwt.verify(token, JWT_SECRET, VERIFY_OPTIONS) as {
    userId: string
    workspaceId: string
  }
}
```

[S013](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S013-jwt-rfc8725.md), [S014](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S014-owasp-password.md)

## Key points

- bcrypt cost 12 is OWASP-compliant today; Argon2id is the upgrade path when either GPU cracking costs fall enough to make cost 12 insufficient or when Argon2's memory-hardness is needed for the threat model
- The two JWT options that prevent real attacks: `algorithms: ["HS256"]` in `jwt.verify()` prevents both alg:none and RSA-to-HMAC confusion; `expiresIn: "15m"` limits the window for stolen tokens
- Minimum JWT secret length is 32 characters — shorter secrets are brute-forceable with HMAC-SHA256

## Go deeper

- [S013](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S013-jwt-rfc8725.md) — RFC 8725: JWT Best Current Practices — the full taxonomy of JWT attacks
- [S014](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S014-owasp-password.md) — OWASP Password Storage Cheat Sheet: cost factor recommendations and Argon2id migration path

---

*[← Previous: Four-Layer Security](./L14-four-layer-security.md)* · *[Next: pnpm + Docker + Turborepo →](./L16-pnpm-docker-turborepo.md)*
