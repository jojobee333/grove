# AEAD — Why Authenticated Encryption Won

**Module**: M04 · Symmetric Cryptography — AES, Block Modes, AEAD Won  
**Type**: core  
**Estimated time**: 25 minutes  
**Claim**: C11 from Strata synthesis

---

## The core idea

The fundamental weakness of CBC mode is that it provides **confidentiality without integrity** — it hides the content of messages, but it does not prevent an attacker from modifying the ciphertext in a way that produces a different (but valid-looking) plaintext. AEAD (Authenticated Encryption with Associated Data) solves this by providing both confidentiality and integrity in a single, unified operation.

**AEAD** is a category of encryption modes, not a single algorithm. The most widely deployed AEAD mode is **AES-GCM** (Galois/Counter Mode). Another is **ChaCha20-Poly1305** (used in TLS 1.3 for mobile devices and environments where AES hardware acceleration is unavailable). Both provide the same security property: an encrypted message that has been modified in any way — by any party without the key — will fail decryption with a verification error. There is no "valid ciphertext" an attacker can construct without the key.

**The "A" in AEAD — Associated Data**: Sometimes you have data that needs to be authenticated (verified for integrity) but not encrypted — because it must be readable in transit (like packet headers that routers must read, or metadata that the receiver needs to parse before decryption). AEAD allows this "associated data" to be bound to the authentication tag along with the ciphertext. If the associated data is modified, decryption fails. If the ciphertext is modified, decryption fails. The tag verifies both.

## Why it matters

The research (Claim C11) identifies AEAD modes as the **industry consensus** for symmetric encryption. IETF, NIST, OWASP, and Google all recommend AEAD modes. TLS 1.3 supports *only* AEAD cipher suites — there is no CBC option. Any secure channel, encrypted message, or symmetric cryptography you implement today should use an AEAD mode. This is not a debate or an area of active discussion — it is a settled standard.

Understanding *why* AEAD won (rather than just being told to use it) also helps you evaluate cryptographic libraries and configurations. When you see an old system using AES-CBC, you now understand what class of attacks it is vulnerable to and what "upgrade to AES-GCM" means concretely.

## A concrete example

### How AES-GCM Works

AES-GCM combines two operations:

**1. CTR mode encryption (for confidentiality)**: CTR (Counter) mode turns AES into a stream cipher. Instead of encrypting plaintext blocks directly, you encrypt a counter value (starting at 1, incrementing for each block) to produce a keystream. You XOR the keystream with the plaintext to produce ciphertext. CTR mode has nice properties: it is parallelizable (you can compute keystream blocks in any order), there is no padding needed (the keystream is XORed with arbitrary-length plaintext), and there is no chaining dependency between blocks.

**2. GHASH authentication (for integrity)**: GCM uses a Galois field hash function (GHASH) to compute an authentication tag over the ciphertext and the associated data. The GHASH key is derived from the AES encryption key. The tag is appended to the ciphertext.

The result: sender encrypts and produces `ciphertext || auth_tag`. The receiver decrypts the ciphertext *only after* verifying the auth_tag. If anyone modified a single bit of the ciphertext or the associated data, the tag verification fails and decryption is aborted — no modified plaintext is ever returned.

This last point is critical: **the receiver never returns plaintext from a modified ciphertext**. This is what breaks padding oracle attacks — there is no padding to oracle, and no modified ciphertext can produce valid output.

### What the Nonce Is and Why It Matters

Like CBC needs a random IV, AES-GCM needs a **nonce** (Number Used Once). In AES-GCM, the nonce is 96 bits (12 bytes). It is used to initialize the CTR counter. 

**The nonce uniqueness requirement is strict**: If the same nonce is used with the same key for two different messages, an attacker who observes both ciphertexts can XOR them together to eliminate the keystream, getting the XOR of the two plaintexts. This often allows recovery of both plaintexts (especially if the content type is known). This is called **nonce reuse** and it completely destroys the security of GCM.

The solution: for session-based encryption (like TLS), use an incrementing counter nonce that starts fresh for each session. For general use, use a cryptographically random 96-bit nonce. The probability of a random nonce collision is $\frac{1}{2^{96}}$ — negligible for any realistic number of messages.

**Important caution**: AES-GCM with nonce reuse is catastrophically broken. Libraries that manage encryption automatically (TLS implementations, AWS KMS, libsodium) handle nonce management for you. If you are implementing cryptography directly (which you should almost never do), nonce management is the most likely place to make a mistake.

### ChaCha20-Poly1305

An alternative AEAD construction used in TLS 1.3. ChaCha20 is a stream cipher (no block structure — inherently parallelizable and padding-free) developed by Daniel Bernstein. Poly1305 is a one-time message authentication code.

**Why it exists alongside AES-GCM**: On hardware with AES-NI (hardware acceleration for AES operations — present in all modern x86 processors and most ARM mobile chips), AES-GCM is very fast. On hardware without AES-NI (some low-power IoT devices, older ARM processors), ChaCha20-Poly1305 is faster and provides the same security properties.

TLS 1.3 negotiates between AES-GCM and ChaCha20-Poly1305 based on hardware capability. Both are correct choices; the decision is made automatically by the TLS implementation.

### The Correct Summary of the Shift

| Property | ECB | AES-CBC | AES-GCM (AEAD) |
|----------|-----|---------|-----------------|
| Confidentiality | Poor (ECB) | Good | Good |
| Integrity / Authentication | None | None | Yes (auth tag) |
| Padding required | Yes (exploitable) | Yes (exploitable) | No |
| Nonce/IV requirement | None | Random IV (often mishandled) | Unique nonce (critical) |
| Parallelizable | Yes | Encrypt: No / Decrypt: Yes | Yes |
| TLS 1.3 support | No | No | Yes |

The shift from CBC to AEAD is not incremental improvement — it is a category change. CBC is "encrypt, then separately authenticate (MAC-then-encrypt)" in many deployments, or "encrypt without authentication" in others. AEAD is "encrypt-and-authenticate as a single atomic operation." The atomic property is what eliminates padding oracles, ciphertext modification attacks, and the entire class of "authentication bypassed because check order was wrong" vulnerabilities.

## Key points

- AEAD provides confidentiality (encryption) and integrity (authentication tag) in a single atomic operation — modifying the ciphertext or associated data causes decryption to fail, no modified plaintext is ever returned
- AES-GCM (dominant) and ChaCha20-Poly1305 (mobile/low-power) are the two AEAD modes in TLS 1.3; both are correct choices; TLS negotiates based on hardware capability
- The nonce must be unique per message per key; nonce reuse destroys GCM security; use a random or incrementing counter nonce, never a fixed value
- AEAD eliminates padding (no padding to oracle), eliminates the separate MAC-then-encrypt question (authentication is built in), and allows associated data to be authenticated without being encrypted
- "Use AEAD" is the current industry consensus (IETF, NIST, OWASP, TLS 1.3); CBC is deprecated for new applications

## Go deeper

- [S011](../../../../vault/research/security-foundations/01-sources/) — AES-GCM construction, nonce management, ChaCha20-Poly1305 comparison

---

*[← Previous: CBC Attacks](./L11-cbc-attacks.md)* · *[Next: Key Exchange — How Two Strangers Agree on a Secret →](./L13-key-exchange.md)*
