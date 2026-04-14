# Passwords, Hashing, and Certificate Chain Validation

**Module**: M04 · Forward Secrecy, KDFs, and PKI
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C13 — KDFs required for password storage; C14 — PKI requires four-check chain validation; C16 — SHA-2 standard, SHA-1 deprecated

---

## The situation

Three applied cryptography problems that come up constantly: which hash function to use for passwords, how browsers validate certificates, and when SHA-256 is appropriate vs a dedicated KDF. These are practical decisions with specific correct answers.

---

## Passwords: why SHA-256 is wrong and bcrypt/Argon2id is right

**The problem with fast hashes**: SHA-256 was designed to be fast. A modern GPU can compute roughly 10 billion SHA-256 operations per second. A database breach of SHA-256 hashed passwords can be brute-forced at ~10 billion guesses per second — a cracking rig will exhaust the entire `rockyou.txt` wordlist plus common mangling rules in under a second.

**KDFs (Key Derivation Functions) are intentionally slow**: bcrypt and Argon2id are designed to take tens or hundreds of milliseconds per hash operation, regardless of hardware improvements.

**bcrypt parameters**: cost factor 12 is the current minimum recommended by OWASP. Cost factor is a power of 2 — cost 12 means 2^12 iterations. Each increment doubles computation time. Cost factor 12 takes roughly 250ms on typical server hardware — acceptable for login but prohibitively slow for brute-force at scale. (S018)

**The bcrypt 72-byte truncation caveat**: bcrypt silently truncates input at 72 bytes. A user with a password longer than 72 bytes gets the same stored hash as if their password were the first 72 bytes. This is a spec-level limitation. For systems that need to support passwords longer than 72 bytes: HMAC-SHA256 the password first (using a server-side secret as the HMAC key), then feed the 32-byte output to bcrypt. The truncation issue disappears and server-side HMAC adds key stretching. (S018)

**Argon2id parameters** (OWASP recommended minimum): `m=19456` (19 MB memory), `t=2` (2 iterations), `p=1` (1 thread). The memory parameter defeats GPU-based cracking because modern GPUs have limited per-core memory — a high-memory KDF brings cracking speed down to CPU-rate even on GPU arrays.

---

## Hashing for data integrity: SHA-2 is correct; SHA-1 is deprecated

**SHA-1** is deprecated. Researchers demonstrated a practical SHA-1 collision in 2017 (SHAttered) costing roughly $100K in cloud compute. Modern collision attacks cost less. SHA-1 must not be used for: digital signatures, certificate fingerprints, or file integrity. (S021)

**SHA-2** (SHA-256, SHA-384, SHA-512) is current for all integrity and signature applications. SHA-256 is standard for HMAC-based signatures. SHA-512 is preferred where larger output provides additional security margin (e.g., signing keys). (S021, S012, S020)

**Do not use SHA-256 directly for passwords** — use it only as input to a KDF or as the HMAC key in the bcrypt prehash pattern above.

---

## Certificate chain validation: RFC 5280's four checks

When a browser connects to `https://example.com`, it does not simply check "is there a certificate?" It performs a chain validation following RFC 5280 (S020). The four required checks:

1. **Signature validation**: each certificate in the chain must be signed by the certificate above it. The root CA's certificate is self-signed and must appear in the OS/browser trust store. Any broken link in the chain = validation failure.

2. **Validity period**: each certificate has `notBefore` and `notAfter` fields. Any certificate outside its valid period causes validation to fail, even if everything else checks out.

3. **Revocation status**: each certificate must not appear in a Certificate Revocation List (CRL) or return an OCSP (Online Certificate Status Protocol) stapled response indicating revocation. If a private key is compromised, the certificate is revoked — a still-validly-signed certificate that is revoked must be rejected. OCSP stapling allows servers to attach fresh revocation proofs to the handshake rather than forcing clients to make a separate revocation lookup.

4. **Path length constraint**: CA certificates include a `pathLenConstraint` field specifying how many intermediate CAs may appear below them. This limits how deeply a sub-CA can delegate trust — preventing a compromised intermediate from issuing unlimited sub-CAs that the root CA never intended.

Any one of these checks failing terminates the handshake with a certificate error.

## Key points

- Use bcrypt (cost ≥ 12) or Argon2id (m=19456, t=2, p=1) for passwords — never SHA-256 alone; SHA-256 is for data integrity, not password storage
- bcrypt truncates at 72 bytes — use HMAC-SHA256 prehash for longer passwords
- RFC 5280 chain validation has four required checks: signature, validity period, revocation, and path length — all four must pass

## Go deeper

- [S018 — OWASP Password Storage](../../../../../vault/research/security-foundations/01-sources/web/S018-owasp-password-storage.md) — bcrypt, Argon2id parameters and the 72-byte issue
- [S020 — RFC 5280 X.509 PKI](../../../../../vault/research/security-foundations/01-sources/web/S020-rfc5280-x509-pki.md) — Certificate chain validation rules in full
- [S021 — NIST FIPS 180-4 SHA](../../../../../vault/research/security-foundations/01-sources/web/S021-nist-fips180-4-sha.md) — SHA-2 standards and SHA-1 deprecation timeline

---

*← [Previous: Ephemeral Keys and Forward Secrecy](./L07-forward-secrecy.md)* · *[Next: The Linux Permission Model](./L09-linux-permissions.md) →*
