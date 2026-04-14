# Why CBC Kept Breaking: The Case for AEAD

**Module**: M03 · Symmetric Encryption — From CBC to AEAD
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C11 — AEAD cipher modes represent the cryptographic consensus for symmetric encryption; CBC mode is deprecated

---

## The core idea

From 2011 to 2014, three major TLS attacks hit production traffic: BEAST (2011), Lucky13 (2013), and POODLE (2014). They targeted different TLS versions, different implementations, and different protocol details — but all three exploited the same structural property of CBC mode: encryption and authentication are separate operations.

In CBC mode, a message is encrypted and then a MAC is computed and appended (encrypt-then-MAC is the correct order, but implementations varied). An attacker who can submit crafted inputs and observe error responses can infer whether a given padded block decrypts to valid padding. This is the padding oracle — the MAC check inadvertently leaks decryption information. Every CBC-mode attack in TLS history is some variant of exploiting this oracle.

AEAD (Authenticated Encryption with Associated Data) combines encryption and authentication into a single primitive. There is no separate MAC step. There is no padding in the traditional sense. The authentication tag is computed over the ciphertext, not the plaintext, and is verified before any decryption attempt. The oracle disappears.

## Why it matters

Understanding why CBC was replaced matters more than knowing its replacements. If you only know "use AES-GCM not AES-CBC", you'll follow that rule without knowing when exceptions might apply. If you understand that the CBC weakness is structural — arising from the separation of encryption and authentication — you can evaluate any cipher you encounter using the same lens: *are confidentiality and integrity provided by the same operation, or separate ones?*

## A concrete example

**POODLE (2014)**: SSL 3.0 uses CBC mode. Modern browsers fall back to SSL 3.0 when a TLS handshake fails (the POODLE attack forces the failure). In SSL 3.0 CBC mode, the padding bytes are not authenticated — they only need to be valid padding length, with the content of padding bytes undefined. An attacker who can inject chosen ciphertext blocks and observe whether the server returns a MAC error vs a padding error can distinguish decryption outcomes. By making ~256 requests per byte of ciphertext, an attacker can recover plaintext one byte at a time. Session cookies are typically 32 bytes — roughly 8,192 requests to steal a session cookie over active traffic. (S012, S013, S019)

The fix in TLS 1.3: the spec defines only three cipher suites (AES-128-GCM-SHA256, AES-256-GCM-SHA384, ChaCha20-Poly1305), all AEAD. There is literally no CBC option to configure, misconfigure, or fall back to.

## Key points

- CBC attacks (BEAST, Lucky13, POODLE) all exploit the oracle created when encryption and authentication are separate operations — this is a structural property, not an implementation bug
- AEAD eliminates the oracle by computing authentication over ciphertext atomically; no valid ciphertext can be created without the authentication tag matching
- TLS 1.3 removed all non-AEAD cipher suites from the spec entirely — there is nothing to misconfigure

## Go deeper

- [S012 — RFC 8446 TLS 1.3](../../../../../vault/research/security-foundations/01-sources/web/S012-rfc8446-tls13.md) — Appendix C documents the specific attacks CBC mode enabled
- [S013 — OWASP TLS Cheat Sheet](../../../../../vault/research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md) — Lists all cipher classes to disable and why each one matters
- [S019 — OWASP Cryptographic Storage](../../../../../vault/research/security-foundations/01-sources/web/S019-owasp-cryptographic-storage.md) — Practical guidance on symmetric encryption primitives

---

*← [Previous: Using DNS Records as a Defender](./L04-dns-defense.md)* · *[Next: Choosing Cipher Suites in Practice](./L06-cipher-suite-selection.md) →*
