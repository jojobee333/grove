# Why CBC Kept Breaking: The Case for AEAD

**Module**: M03 · Symmetric Encryption — From CBC to AEAD
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C11 from Strata synthesis

---

## The core idea

From 2011 to 2014, three major TLS attacks broke production traffic: BEAST (2011), Lucky13 (2013), and POODLE (2014). They targeted different TLS versions, different protocol details, and different implementations. All three exploited the same structural property of CBC mode: encryption and message authentication are separate operations.

In Cipher Block Chaining mode, a message is encrypted by XORing each plaintext block with the previous ciphertext block before encrypting. A MAC (message authentication code) is computed and appended separately. An attacker who can submit manipulated ciphertext to a decryption oracle and observe whether the server returns a MAC error versus a padding error gains information about the decryption output. Over many requests, this leaks the plaintext one byte at a time without ever holding the key. This is the padding oracle attack — and it is not an implementation defect; it is a structural consequence of computing authentication after decryption [S012](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md) [S013](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md).

AEAD (Authenticated Encryption with Associated Data) eliminates this structure. AES-GCM and ChaCha20-Poly1305 compute both confidentiality and integrity in a single operation. The authentication tag is computed over the ciphertext, not the plaintext, and is verified *before any decryption begins*. If the tag is invalid, the decryption never happens. There is no error response distinguishable by padding validity. The oracle disappears by construction.

TLS 1.3 resolved this permanently: RFC 8446 specifies only three cipher suites, all AEAD. There is no CBC option to configure, misconfigure, or fall back to [S012](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md).

## Why it matters

Understanding why CBC was replaced is more useful than knowing it was replaced. If you only know "use AES-GCM, not AES-CBC," you follow that rule without knowing what it protects against. If you understand that the CBC weakness is structural — arising from separating encryption from authentication — you can evaluate any cipher with the same lens: do confidentiality and integrity share a single operation, or are they computed independently? Separate operations create oracle opportunities. Combined operations do not.

This also explains why the attacks kept appearing across different TLS versions: BEAST targeted TLS 1.0 CBC, Lucky13 targeted TLS 1.0-1.2 CBC via timing channels, POODLE targeted SSL 3.0 CBC. Each patch closed the specific variant. AEAD closed the entire class.

## A concrete example

**Example 1 — POODLE (2014): how a padding oracle recovers plaintext**

SSL 3.0's CBC mode defines padding as: the final N bytes of plaintext are all set to the value N-1. Only the padding *length* is validated, not the padding *content* — the content bytes can be anything. An attacker who can force a TLS downgrade to SSL 3.0 (by injecting handshake failures) can then exploit this undefined padding content.

The attack requires the attacker to observe whether the server returns a MAC failure (decryption succeeded, MAC invalid) versus a padding failure (decryption revealed invalid padding). These produce different error codes. With 256 attempts per target byte, the attacker iterates through all possible values, watching for the response that indicates a padding match. Each match reveals one byte of plaintext. For a 32-byte session cookie: roughly 8,192 adaptive requests recover the full cookie. This requires an active network attacker who can inject content into the victim's traffic — the threat model for a coffee shop or compromised network [S013](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md).

**Example 2 — AES-GCM: why the attack class does not apply**

In AES-GCM, every encrypted record has a 128-bit authentication tag appended. The receiver computes the expected tag from the ciphertext, verifies it matches the received tag, and only decrypts if the tags match. Critically: a tampered ciphertext produces a tag mismatch. The decryption does not execute. There is no plaintext to observe padding on, no MAC step to distinguish from a padding step, and no oracle that leaks decryption outcomes. Any adaptive chosen-ciphertext attack against a correctly-implemented AES-GCM implementation receives only one response: tag verification failed. The padding oracle attack class has no applicable structure [S019](../../research/security-foundations/01-sources/web/S019-owasp-cryptographic-storage.md).

## There is a real disagreement here

NIST SP 800-52r2 does not categorically prohibit CBC cipher suites in TLS 1.2. It marks AEAD as "strongly preferred" while listing CBC suites as less preferred but not disallowed for TLS 1.2 legacy deployments. RFC 8446, by contrast, eliminates all CBC suites from TLS 1.3 entirely — they cannot be negotiated regardless of client or server preference. OWASP's TLS Cheat Sheet takes a position between the two: explicitly disable CBC for TLS 1.2 in all new deployments [S017](../../research/security-foundations/01-sources/web/S017-nist-sp800-52r2-tls.md).

The practical resolution: NIST's leniency is bounded to TLS 1.2 *transition* scenarios for legacy infrastructure that cannot upgrade immediately. For any new deployment or any system you control, CBC is deprecated. The cryptographic verdict is not in dispute — only the compliance timeline differs between the standards bodies [S012](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md) [S013](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md).

## Limitations

AES-GCM is secure only when nonces are never reused under the same key. GCM is a stream cipher constructed from a block cipher and a polynomial hash (GHASH). If the same nonce is used twice with the same key, an attacker who can observe both ciphertexts can compute the authentication key H and recover plaintexts from both messages. In TLS 1.3 this is handled automatically by the record layer, which constructs nonces deterministically from a sequence number XORed with the per-session write IV — nonce reuse is impossible by construction. In application-level AES-GCM (encrypting files, records, or arbitrary data outside TLS), nonces must be generated with a cryptographically secure random number generator, and you must never encrypt more than approximately 2^32 records under a single key before rotating [S019](../../research/security-foundations/01-sources/web/S019-owasp-cryptographic-storage.md).

## Key points

- BEAST, Lucky13, and POODLE are all padding oracle attacks — different implementations of the same structural vulnerability in CBC's separation of encryption and authentication
- AEAD eliminates the oracle by combining confidentiality and integrity into one operation; the authentication tag is verified before decryption executes
- TLS 1.3 removed all non-AEAD cipher suites from the specification entirely; no configuration step can enable CBC in TLS 1.3
- AES-GCM requires unique nonces per encryption; TLS handles this automatically, but application-level AES-GCM requires explicit nonce management

## Go deeper

- [S012 — RFC 8446 TLS 1.3](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md) — Appendix C documents BEAST, Lucky13, and POODLE attack mechanics and the rationale for removing CBC
- [S013 — OWASP TLS Cheat Sheet](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md) — Complete list of cipher classes to disable with the attack class each one enables
- [S019 — OWASP Cryptographic Storage](../../research/security-foundations/01-sources/web/S019-owasp-cryptographic-storage.md) — AES-GCM nonce requirements and key management guidance for application-level encryption

---

*← [Previous lesson](./L04-dns-defense.md)* · *[Next lesson →](./L06-cipher-suite-selection.md)*
