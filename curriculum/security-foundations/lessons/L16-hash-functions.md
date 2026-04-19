# Hash Functions — What SHA-256 Does and Why SHA-1 Is Dead

**Module**: M06 · Hashing, Password Security, and PKI  
**Type**: core  
**Estimated time**: 25 minutes  
**Claim**: C16 from Strata synthesis

---

## The core idea

A **hash function** takes an input of any length and produces a fixed-length output called a **digest** or **hash**. SHA-256 always produces 256 bits (32 bytes) of output, regardless of whether the input is 1 byte or 1 terabyte. This might seem simple, but the security properties that a cryptographic hash function must satisfy — and the consequences when those properties break — are the foundation for digital signatures, certificate validation, password storage, file integrity verification, and much of modern security infrastructure.

**SHA** stands for Secure Hash Algorithm. The SHA-2 family (SHA-256, SHA-384, SHA-512) is the current standard. SHA-1 was the previous standard; it was broken in 2017. SHA-3 is an alternative family with different internal design, specified by NIST as a backup.

## Why it matters

Hash functions are everywhere in security:
- TLS certificates use SHA-256 signatures to prove authenticity
- Git uses SHA-1 (now transitioning to SHA-256) to identify commits and files
- Password databases should store hashes of passwords (but not SHA-256 — a specific point for L17)
- File integrity: malware scanners compare hashes; software downloads provide checksums; forensic imaging tools hash disk images to prove integrity
- HMAC (Hash-based Message Authentication Code) uses a hash function with a key to authenticate messages

Understanding which hash functions are broken — and how "broken" is defined — is prerequisite for understanding why SHA-1-signed certificates must be replaced, why certain legacy systems are vulnerable, and why "just use a hash for passwords" is wrong (even with strong hash functions).

## A concrete example

### The Security Properties

A cryptographic hash function must satisfy three properties:

**1. Pre-image resistance (one-way)**: Given a hash output $H$, it is computationally infeasible to find any input $m$ such that $hash(m) = H$. You cannot "reverse" a hash.

Think of it like a meat grinder: given the ground meat, you cannot reconstruct the original steak. You can try every possible steak (brute force), but for a 256-bit hash, trying all possible inputs is infeasible.

**2. Second pre-image resistance**: Given an input $m_1$ and its hash $H$, it is computationally infeasible to find a different input $m_2$ (where $m_2 \neq m_1$) such that $hash(m_2) = H$. You cannot substitute a different input that produces the same hash as a known input.

This is why hash-based file integrity checks work: an attacker cannot replace a file with a malicious file that produces the same hash without breaking the hash function.

**3. Collision resistance**: It is computationally infeasible to find *any* two inputs $m_1 \neq m_2$ such that $hash(m_1) = hash(m_2)$. This is the hardest property to maintain — and the one that SHA-1 failed.

**Why collision resistance matters for certificates**: A digital certificate is a document that says "this public key belongs to example.com" and is signed by a Certificate Authority (CA). The CA signs the *hash* of the certificate. If an attacker can find two different certificate documents that produce the same SHA-1 hash, they can:
1. Get a CA to sign the hash of a legitimate-looking certificate
2. Substitute the malicious certificate in place of the legitimate one
3. The signature still verifies — both documents produce the same hash

This is a **chosen-prefix collision attack** — the practical attack used against SHA-1.

---

### The SHAttered Attack (2017)

In February 2017, a team from CWI Amsterdam and Google demonstrated the first practical SHA-1 collision: two PDF files with different content that produce exactly the same SHA-1 hash. The two files are visually different and serve different purposes — yet `sha1(file1) == sha1(file2)`.

The work required the equivalent of 6,500 CPU-years of computation — expensive, but within reach of nation-states and well-funded organizations. The attack demonstrated that SHA-1 collision resistance was theoretically broken; SHAttered made it concretely demonstrated.

**Consequences**:
- Browser vendors (Chrome, Firefox) started rejecting SHA-1-signed TLS certificates in 2017
- Git's use of SHA-1 for object integrity was identified as a risk (a collision could allow substituting one Git object for another with the same hash) — Git is transitioning to SHA-256
- Code signing certificates using SHA-1 were revoked and reissued

The current standard (Claim C16): SHA-2 family (SHA-256, SHA-384) is the current standard. SHA-1 is deprecated. MD5 was broken much earlier (collisions demonstrated in 2004) and should not be used for any security purpose.

---

### SHA-256 Internals (High Level)

SHA-256 uses a **Merkle-Damgård construction**: it processes the input in 512-bit (64-byte) chunks through a compression function that maintains a 256-bit internal state. The compression function applies 64 rounds of bitwise operations (AND, OR, XOR, NOT, rotations, shifts) using constants derived from the fractional parts of the square roots of the first 64 prime numbers.

The key security intuition: each bit of the final hash depends on every bit of the input in a complex, non-linear way. Changing one bit of input changes, on average, half the bits of the output (avalanche effect — same as AES). This makes it computationally infeasible to find an input that produces a specific desired output.

**SHA-512** is structurally similar but processes 1024-bit chunks and produces a 512-bit output. It is faster than SHA-256 on 64-bit processors (because it uses 64-bit operations on wider words) and provides a larger security margin.

**SHA-384** is SHA-512 truncated to 384 bits — providing a 192-bit collision resistance security level.

---

### What "Bits of Security" Means

A hash with $n$ bits of output provides:
- **$n$ bits of pre-image resistance**: Finding a pre-image requires $2^n$ hash computations on average
- **$n/2$ bits of collision resistance**: The Birthday Paradox says you can find a collision in $\sqrt{2^n} = 2^{n/2}$ computations

For SHA-256: 256 bits of pre-image resistance, 128 bits of collision resistance. The 128-bit collision resistance level is considered secure against classical computers.

For SHA-1: 160 bits output → 80 bits of collision resistance in theory. SHAttered showed the actual cost was well below $2^{80}$, putting it within reach of strong adversaries.

## Key points

- Cryptographic hash functions: arbitrary input → fixed output (256 bits for SHA-256); one-way, collision resistant, second pre-image resistant
- The three properties: pre-image resistance (one-way), second pre-image resistance (no swapping inputs with same hash), collision resistance (no two different inputs with same hash)
- SHA-1 was broken by the SHAttered collision attack (2017); SHA-1 certificates, SHA-1 code signatures, and SHA-1-based integrity checks are all deprecated
- The SHA-2 family (SHA-256, SHA-384, SHA-512) is the current standard for all hash uses — document integrity, TLS certificate signatures, HMACs
- Hash functions are NOT suitable for password storage by themselves — they are too fast; password hashing requires purpose-built slow KDFs (covered in L17)
- SHA-256 security: 256-bit pre-image resistance, 128-bit collision resistance — secure against classical computers; SHA-3 provides an alternative with different internal design for conservative implementations

## Go deeper

- [S016](../../../../vault/research/security-foundations/01-sources/) — SHA-2 family design, SHAttered collision attack, and transition from SHA-1

---

*[← Previous: TLS Versions](./L15-tls-versions.md)* · *[Next: Password Hashing — Why SHA-256 Is the Wrong Tool for Passwords →](./L17-password-hashing.md)*
