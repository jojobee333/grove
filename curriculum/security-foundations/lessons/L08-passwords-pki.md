# Passwords, Hashing, and Certificate Chain Validation

**Module**: M04 · Forward Secrecy, KDFs, and PKI
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C13 from Strata synthesis

---

## The situation

Two applied cryptography problems appear in every production security deployment: choosing how to store user passwords and validating certificate chains correctly. Both are misimplemented far more often than they should be, both have well-specified correct solutions, and both have a common failure mode — applying a general-purpose cryptographic primitive in a context it was not designed for.

---

## Part 1: Password hashing with purpose-built KDFs

### Why general-purpose hash functions are wrong for passwords

SHA-256 processes over 100 million hashes per second on a single consumer GPU. MD5 processes over 1 billion. These are design features: hash functions are engineered to be fast for bulk computation. Fast is the opposite of what password storage requires.

NIST FIPS 180-4 specifies SHA-256 for integrity verification, digital signatures, and key derivation in protocols. It does not address password storage, and no current standard recommends SHA-256 for passwords [S021](../../research/security-foundations/01-sources/web/S021-nist-fips180-4-sha.md). NTLM, Microsoft's legacy authentication protocol, stores passwords as unsalted MD4 hashes. MD4 is a general-purpose hash function from 1990. An attacker who extracts an NTLM hash from Active Directory can run it through a GPU cluster at billions of candidates per second, crack common passwords in seconds, and replay the recovered hash for authentication without needing the plaintext — this is the Pass-the-Hash attack [S016](../../research/security-foundations/01-sources/web/S016-ad-security-best-practices.md).

### OWASP password storage recommendations

OWASP Password Storage Cheat Sheet specifies three current password hashing algorithms in preference order [S018](../../research/security-foundations/01-sources/web/S018-owasp-password-storage.md):

| Algorithm | Recommended parameters | Notes |
|---|---|---|
| **Argon2id** | m=19456 KiB, t=2 iterations, p=1 | First choice for all new deployments |
| **scrypt** | N=2^17, r=8, p=1 | Acceptable where Argon2id is unavailable |
| **bcrypt** | cost factor ≥10 | Legacy compatibility only; see limitation below |

All three are slow by design. They can be tuned to take 100-300ms on server hardware, making GPU cracking approximately 10,000x slower than SHA-256 cracking without changing the user experience. All three are salted automatically — rainbow table attacks are not applicable.

OWASP explicitly prohibits MD5, SHA-1, SHA-256, SHA-512, and all unsalted hashes for password storage, regardless of iteration count [S018](../../research/security-foundations/01-sources/web/S018-owasp-password-storage.md).

### Limitations

**bcrypt silently truncates inputs at 72 bytes.** This is a known limitation inherited from bcrypt's Blowfish key scheduling algorithm. If a user sets a password longer than 72 bytes, only the first 72 bytes are hashed. Two passwords that share identical first 72 bytes authenticate as the same credential, regardless of what follows. For systems that accept arbitrary passphrases or API key-style passwords, the truncation creates silent authentication equivalence that bypasses uniqueness assumptions.

The mitigation: HMAC-SHA256 prehash the password before passing to bcrypt. `bcrypt(HMAC-SHA256(password, pepper), cost)` produces a 256-bit input to bcrypt regardless of original password length, eliminating the truncation boundary and adding a server-side pepper factor. Store the pepper separately from the database — in an environment variable or hardware security module — so that a database dump alone is insufficient to begin cracking [S018](../../research/security-foundations/01-sources/web/S018-owasp-password-storage.md).

---

## Part 2: Certificate chain validation

RFC 5280 defines four verification steps that every TLS implementation must perform when validating a certificate chain. Omitting any step creates a specific exploitable weakness.

**Step 1 — Signature at each level**: verify the cryptographic signature on each certificate using the public key of the certificate immediately above it in the chain. A leaf certificate is signed by an intermediate CA; the intermediate is signed by the root CA; the root is self-signed and must match a trusted root in the trust store. Any broken signature invalidates the chain.

**Step 2 — Validity period**: verify that the current time is between `notBefore` and `notAfter` for every certificate in the chain. An expired certificate — even one with a valid signature — must be rejected. This step prevents continued use of keys after certificate expiry.

**Step 3 — Revocation via CRL or OCSP**: check whether any certificate in the chain has been revoked by its issuing CA. Revocation can occur if the certificate's private key is compromised, if the subject's identity changes, or at CA request. A certificate that passes signature and expiry checks but is on the CRL must still be rejected. Many implementations have historically made revocation checking optional or fail-open (accepting the certificate if the CRL cannot be fetched) — this means a compromised key can remain trusted until certificate expiry unless revocation is enforced.

**Step 4 — Basic constraints CA flag**: verify that each non-leaf certificate in the chain has the `cA` basic constraint set to `TRUE`. This prevents a leaf (end-entity) certificate from being used to sign other certificates. Without this check, an attacker who obtains a leaf certificate could use it to issue fraudulent certificates for any domain, constructing a chain that validates signature checks but violates issuance hierarchy.

A TLS implementation that performs all four steps correctly is resistant to forged chains, expired credentials, compromised CA keys (via revocation), and unauthorized intermediate CA certificates.

## Key points

- SHA-256 and MD5 are wrong for password storage because they are designed to be fast; GPU cracking at >100M hashes/second makes them inadequate; use Argon2id, scrypt, or bcrypt
- bcrypt silently truncates at 72 bytes; use HMAC-SHA256 prehashing with a server-side pepper before bcrypt for systems accepting arbitrary-length passwords
- RFC 5280 requires four chain validation steps: signature, validity period, revocation, and basic constraints CA flag; omitting any one creates a specific exploitable weakness
- Revocation checking (Step 3) is the most commonly omitted step; a fail-open implementation means a compromised certificate remains trusted until expiry

## Go deeper

- [S018 — OWASP Password Storage](../../research/security-foundations/01-sources/web/S018-owasp-password-storage.md) — Argon2id/scrypt/bcrypt parameters, the 72-byte truncation problem, and pepper guidance
- [S021 — NIST FIPS 180-4 SHA](../../research/security-foundations/01-sources/web/S021-nist-fips180-4-sha.md) — SHA design goals; why SHA speed is a feature for integrity but a liability for passwords
- [S016 — AD Security Best Practices](../../research/security-foundations/01-sources/web/S016-ad-security-best-practices.md) — NTLM/MD4 as the canonical example of wrong hash algorithm; Pass-the-Hash mechanics

---

*← [Previous lesson](./L07-forward-secrecy.md)* · *[Next lesson →](./L09-linux-permissions.md)*
