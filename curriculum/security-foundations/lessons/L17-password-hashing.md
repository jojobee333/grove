# Password Hashing — Why SHA-256 Is the Wrong Tool for Passwords

**Module**: M06 · Hashing, Password Security, and PKI  
**Type**: core  
**Estimated time**: 25 minutes  
**Claim**: C13 from Strata synthesis

---

## The core idea

The previous lesson established what hash functions do and why SHA-256 is the current standard. Now comes a common and critical misconception: **SHA-256 should NOT be used to store passwords**. Not SHA-256. Not MD5. Not SHA-512. Not any general-purpose hash function.

The reason is speed. SHA-256 can perform billions of hash operations per second on modern hardware. This is a feature for file integrity (you want to hash a 10 GB file quickly) but a catastrophic flaw for password storage (an attacker cracking a database of hashed passwords can try billions of guesses per second).

Password storage requires **purpose-built Key Derivation Functions (KDFs)** designed to be intentionally slow and memory-hard. The current standard is **Argon2id**. The still-acceptable options are **scrypt** and **bcrypt**. All general-purpose hash functions — regardless of how cryptographically strong they are — are inappropriate for password storage.

The research (Claim C13) states this unambiguously: this is not an area of debate. OWASP, NIST, and every major authentication framework agree.

## Why it matters

Password database breaches are among the most common and impactful security incidents. When a database is breached and password hashes are leaked, the security of users' accounts depends entirely on the attacker's inability to recover the original passwords from the hashes. If passwords were hashed with SHA-256 (or MD5, or SHA-1), a modern GPU can try 10 billion guesses per second. A dictionary of the 100 million most common passwords can be exhausted in milliseconds. Adding a salt (a random value mixed with the password before hashing) prevents rainbow table lookups but does not slow down per-hash brute force.

This is why real breaches often result in passwords being cracked within hours — because the systems used fast hash functions.

## A concrete example

### Why Fast Hashes Are Dangerous for Passwords

**Modern cracking hardware benchmarks** (approximate, from public research using high-end GPUs):
- MD5: 100+ billion hashes/second
- SHA-1: 35+ billion hashes/second
- SHA-256: 10+ billion hashes/second
- bcrypt (cost factor 12): ~250,000 hashes/second
- Argon2id (tuned): ~10,000–100,000 hashes/second (memory-bound)

**The math**: If an attacker has a leaked database of SHA-256 hashed passwords and a GPU rig running at 10 billion hashes/second:
- RockYou wordlist (14 million passwords): exhausted in 1.4 milliseconds
- All 8-character lowercase passwords ($26^8 ≈ 208$ billion): exhausted in ~21 seconds
- All 10-character mixed case + digits ($62^{10} ≈ 839$ trillion): exhausted in ~84,000 seconds (23 hours)

For bcrypt at cost 12 (~250,000 hashes/second on the same hardware):
- RockYou wordlist: 56 seconds
- All 8-character lowercase: 97 years
- All 10-character mixed case + digits: effectively infeasible

**The cost factor is the lever**: bcrypt has a configurable "cost factor" that doubles the computation time for every increment. Cost factor 10 ≈ ~100ms per hash; factor 12 ≈ ~400ms; factor 14 ≈ ~1.5 seconds. Higher cost = slower verification for legitimate logins, but also slower cracking. A cost factor that takes 400ms on your server takes 400ms per guess for an attacker too.

---

### Salt — Necessary But Insufficient Alone

Before modern KDFs, a common approach was "salted SHA-256": generate a random value (the salt), concatenate it with the password, then hash the combination. Store the salt alongside the hash.

**Why salting helps**: Without salt, an attacker can precompute a table of hashes for common passwords (a "rainbow table") and look up hashes instantly. Salting ensures that the same password produces a different hash for different users (because different random salts were used), defeating precomputed lookup tables.

**Why salting alone with a fast hash is still insufficient**: Salting prevents rainbow table attacks, but it does not prevent brute-force attacks. The attacker still tries millions of guesses per second, combining each guess with the known salt and computing the fast hash. For each individual user, brute force at 10 billion/second is still devastating.

**Argon2id/bcrypt/scrypt already include salting** — they generate a random salt automatically and embed it in the hash output. You do not manage salts separately.

---

### The Current Standard: Argon2id

Argon2 is the winner of the Password Hashing Competition (PHC, 2015) — a multi-year public competition to identify the best password hashing algorithm. It has three variants:

- **Argon2d**: Memory-hard, optimized against GPU cracking. Vulnerable to side-channel attacks (timing attacks) in some contexts.
- **Argon2i**: Side-channel resistant, but less memory-hard.
- **Argon2id**: Hybrid — first half Argon2i pass, second half Argon2d pass. Provides both memory hardness and side-channel resistance. **This is the recommended variant.**

**Argon2id parameters** (OWASP recommendation):
- `m` = 64 MB of memory (minimum; 128 MB if performance allows)
- `t` = 1 iteration (with 64 MB memory)
- `p` = 1 degree of parallelism (adjust to hardware)
- Output: 32 bytes (256 bits)

The memory requirement is why Argon2id defeats GPU attacks better than bcrypt: GPUs have thousands of cores but limited memory bandwidth. Running Argon2id with 64 MB of memory means each parallel cracking attempt requires 64 MB of GPU memory. A GPU with 24 GB of memory can only run ~375 parallel Argon2id operations — versus billions of SHA-256 operations.

**Implementation example** (Python using argon2-cffi):

```python
from argon2 import PasswordHasher

ph = PasswordHasher(
    time_cost=1,
    memory_cost=65536,  # 64 MB in KiB
    parallelism=1,
    hash_len=32,
    salt_len=16
)

# Hashing a password
hashed = ph.hash("user_password")

# Verifying a password
try:
    ph.verify(hashed, "user_password")
    # Returns True if correct, raises exception if wrong
except Exception:
    # Authentication failed
    pass
```

---

### bcrypt and scrypt — Still Acceptable

**bcrypt** (1999): Designed specifically for password hashing. Uses the Blowfish cipher. Has a cost factor parameter (2^cost iterations). Still secure when used with cost factor ≥ 12 (recalibrate as hardware improves to maintain ~300–400ms per hash). Limitation: 72-byte maximum input length (passwords longer than 72 characters are truncated).

**scrypt** (2009): Memory-hard, designed to require significant RAM per hash. Parameters: N (CPU/memory cost), r (block size), p (parallelism). Used by many cryptocurrency protocols. NIST includes it in SP 800-132.

**Preference order** for new systems:
1. Argon2id (winner of PHC, most modern)
2. scrypt (good memory hardness)
3. bcrypt (widely supported, well-studied, still acceptable)
4. PBKDF2-HMAC-SHA256 (acceptable only where the above are unavailable — NIST-approved but less memory-hard)

---

### What to Never Use

- **MD5** (even salted): Broken for cryptographic purposes; trivially fast
- **SHA-1** (even salted): Broken; trivially fast
- **SHA-256/SHA-512** (even salted): Cryptographically strong, but designed to be fast — wrong tool for this job
- **"Home-brew" schemes**: Multiple rounds of SHA-256, custom combinations, Base64-encoded SHA — all subject to expert analysis finding weaknesses; use established KDFs

## Key points

- General-purpose hash functions (SHA-256, SHA-512, MD5, SHA-1) are designed to be fast — this makes them catastrophically unsuitable for password storage; an attacker can try billions per second
- Password storage requires purpose-built KDFs: Argon2id (preferred), scrypt, or bcrypt — all intentionally slow and/or memory-hard
- Salting (using a random per-password salt) defeats rainbow tables but not brute force; all modern KDFs include automatic salt generation
- Argon2id uses 64+ MB of memory per operation — this defeats GPU-based parallel cracking because GPU memory limits the number of simultaneous operations
- bcrypt cost factor ≥ 12 (recalibrate as hardware improves); Argon2id with 64 MB, 1 iteration, 1 parallelism is the OWASP recommendation
- Never use MD5, SHA-1, or SHA-2 family for password storage regardless of salting or number of rounds

## Go deeper

- [S013](../../../../vault/research/security-foundations/01-sources/) — OWASP Password Storage Cheat Sheet, Argon2id PHC specification

---

*[← Previous: Hash Functions](./L16-hash-functions.md)* · *[Next: PKI — How Certificate Chains Establish Web Trust →](./L18-pki-certificate-chain.md)*
