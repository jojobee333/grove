# Choosing Cipher Suites in Practice

**Module**: M03 · Symmetric Encryption — From CBC to AEAD
**Type**: applied
**Estimated time**: 12 minutes
**Claim**: C11 — AEAD represents the consensus; C15 — TLS 1.2 is acceptable when correctly configured

---

## The situation

You need to configure TLS for a web server or evaluate an existing configuration. You need to know exactly which cipher suites to enable and which to disable — backed by what OWASP and NIST actually say, not vague guidance to "use strong crypto".

---

## TLS 1.3: configuration is simple

TLS 1.3 supports only three cipher suites. All three are AEAD. There is nothing to disable:

| Suite | Notes |
|---|---|
| TLS_AES_128_GCM_SHA256 | Preferred for most deployments |
| TLS_AES_256_GCM_SHA384 | Required for FIPS environments |
| TLS_CHACHA20_POLY1305_SHA256 | Preferred for mobile / low-power clients |

If your server supports TLS 1.3 and the client does too, this negotiation happens automatically. (S012)

---

## TLS 1.2: explicit configuration required

TLS 1.2 permits many cipher suites, including dangerous ones. OWASP's TLS Cheat Sheet defines what to disable explicitly (S013):

**Disable unconditionally:**
- `NULL` cipher suites (no encryption)
- `ANON` (no server authentication)
- `EXPORT` suites (intentionally weakened — legacy US export controls)
- `RC4` suites (statistical biases; broken)
- `3DES` suites (SWEET32 attack; 64-bit block size)
- `CBC` suites (padding oracle class of attacks)

**Enable for TLS 1.2 (AEAD + ECDHE only):**
- `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256`
- `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384`
- `TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256` (if using ECDSA certificates)

NIST SP 800-52r2 prohibits static RSA key exchange in federal TLS 1.2 deployments and requires ECDHE. (S017)

---

## The TLS 1.2 nuance: "obsoleted" ≠ "prohibited"

RFC 8446 (TLS 1.3) states it "obsoletes" TLS 1.2. In IETF terminology, "obsoletes" means the previous document receives no further development — not that it is operationally forbidden. NIST SP 800-52r2 and OWASP both explicitly permit TLS 1.2 for deployments that cannot upgrade immediately.

The operative rule: **TLS 1.2 + ECDHE + AEAD = cryptographically sound.** TLS 1.2 + static RSA or CBC = a misconfiguration that is finding-worthy in any security assessment, regardless of whether TLS 1.3 is available.

This distinction matters in practice because many legacy applications cannot enable TLS 1.3 immediately. "TLS 1.2 is deprecated" is a misreading of the standards. "TLS 1.2 with CBC is deprecated" is correct.

---

## AES-GCM nonce requirements

AES-GCM is secure only when nonces are never reused under the same key. A single nonce reuse under the same key leaks the authentication key and enables plaintext recovery of both messages that used that nonce. In TLS this is handled automatically by the record layer. If you are using AES-GCM outside of TLS (e.g., encrypting files at rest), generate each nonce using a cryptographically secure random number generator and never reuse it. (S019)

---

## Key points

- TLS 1.3 cipher suites are fixed and all AEAD — no configuration needed beyond enabling TLS 1.3
- TLS 1.2 requires explicitly disabling NULL/ANON/EXPORT/RC4/3DES/CBC and enabling only ECDHE+AEAD suites
- "TLS 1.2 obsoleted" ≠ "TLS 1.2 prohibited" — TLS 1.2 with correct config is still acceptable; TLS 1.2 with CBC is not

## Go deeper

- [S013 — OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html) — Complete cipher suite disable/enable list with rationale
- [S017 — NIST SP 800-52r2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-52r2.pdf) — Federal TLS configuration requirements

---

*← [Previous: Why CBC Kept Breaking](./L05-cbc-to-aead.md)* · *[Next: Ephemeral Keys and Forward Secrecy](./L07-forward-secrecy.md) →*
