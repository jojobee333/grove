# Choosing Cipher Suites in Practice

**Module**: M03 · Symmetric Encryption — From CBC to AEAD
**Type**: applied
**Estimated time**: 12 minutes
**Claim**: C11 from Strata synthesis

---

## The situation

You are evaluating a TLS configuration — reviewing a web server setup, checking a penetration test finding, or hardening a deployment. You need to know exactly which cipher suites to enable and which to disable, and why the specific choices matter. "Use strong crypto" is not an action. This lesson gives you the specific configuration decisions backed by OWASP and NIST guidance.

---

## Approach: TLS 1.3 by default; TLS 1.2 with explicit controls

The decision tree is:
1. Enable TLS 1.3 everywhere — it is AEAD-only by spec, nothing to disable
2. If TLS 1.2 must coexist, apply the explicit cipher suite allow-list below
3. Disable TLS 1.1, TLS 1.0, SSL 3.0, and SSL 2.0 unconditionally
4. Verify with a scanner (testssl.sh, SSL Labs, NMAP ssl-enum-ciphers)

---

## Worked example 1 — TLS 1.3 configuration

TLS 1.3 defines exactly five cipher suites (RFC 8446 Section 9.1). Three are widely supported [S012](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md):

| Suite | Key | Notes |
|---|---|---|
| `TLS_AES_128_GCM_SHA256` | Mandatory per RFC 8446 | Preferred for most deployments |
| `TLS_AES_256_GCM_SHA384` | Required in FIPS environments | Larger key, higher computational cost |
| `TLS_CHACHA20_POLY1305_SHA256` | Optional | Preferred for mobile/ARM clients without AES hardware acceleration |

All three are AEAD. There are no CBC, RC4, or NULL options. Cipher suite negotiation in TLS 1.3 is automatic — if both client and server support TLS 1.3, a correct suite will be selected without any operator intervention. The configuration effort for TLS 1.3 is: enable it and ensure TLS 1.1/1.0 are disabled.

---

## Worked example 2 — TLS 1.2 cipher suite hardening

TLS 1.2 permits over 300 cipher suites, many of which are cryptographically broken. Explicit allow-listing is required. OWASP's TLS Cheat Sheet specifies the disable list [S013](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md):

**Disable unconditionally in TLS 1.2:**

| Category | Example | Why |
|---|---|---|
| `NULL` ciphers | `TLS_RSA_WITH_NULL_SHA` | No encryption; data transmitted in plaintext |
| `ANON` ciphers | `TLS_DH_anon_WITH_AES_128_GCM` | No server authentication; trivial MitM |
| `EXPORT` ciphers | `TLS_RSA_EXPORT_WITH_RC4_40_MD5` | Intentionally weakened for US export law; FREAK/Logjam attacks |
| `RC4` ciphers | `TLS_RSA_WITH_RC4_128_SHA` | Statistical keystream bias; plaintext recovery possible |
| `3DES` ciphers | `TLS_RSA_WITH_3DES_EDE_CBC_SHA` | SWEET32 birthday attack on 64-bit block cipher |
| `CBC` ciphers | `TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA` | Padding oracle class: BEAST, Lucky13 |
| Static RSA key exchange | `TLS_RSA_WITH_AES_128_GCM_SHA256` | No forward secrecy; retroactive decryption possible |

**Enable only these TLS 1.2 cipher suites (OWASP + NIST compliant):**

```
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
TLS_DHE_RSA_WITH_AES_128_GCM_SHA256
TLS_DHE_RSA_WITH_AES_256_GCM_SHA384
```

All six use ECDHE or DHE (forward secrecy) and GCM (AEAD). This is the NIST SP 800-52r2 compliant cipher list for federal TLS 1.2 deployments [S017](../../research/security-foundations/01-sources/web/S017-nist-sp800-52r2-tls.md).

**nginx configuration string:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
```

---

## The "TLS 1.2 is obsoleted" nuance

RFC 8446 states that it "obsoletes" TLS 1.2. In IETF terminology, "obsoletes" means the prior document receives no further development — not that it is operationally forbidden. NIST SP 800-52r2 and OWASP both explicitly permit TLS 1.2 in deployments where TLS 1.3 adoption is blocked by legacy constraints [S017](../../research/security-foundations/01-sources/web/S017-nist-sp800-52r2-tls.md).

The operative rule for security assessments:
- **TLS 1.2 + ECDHE + GCM** = cryptographically sound; not a finding
- **TLS 1.2 + static RSA or CBC** = misconfiguration; severity High in any security assessment
- **TLS 1.1 or TLS 1.0** = definite finding; severity High regardless of cipher suite
- **TLS 1.3 always preferred** = correct direction for any new deployment

A practitioner who reports TLS 1.2 with ECDHE+GCM as a critical finding has misread the standards. A practitioner who approves TLS 1.2 with CBC as acceptable has also misread them [S013](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md).

## Limitations

AES-GCM nonce reuse is catastrophic: a single nonce reuse under the same key allows recovery of the authentication key (GHASH key H) and enables plaintext recovery from both records that used that nonce. TLS handles nonce management automatically using sequence-number-based IV construction. If you are using AES-GCM outside TLS — encrypting database records, files, or API payloads — you must generate a fresh 96-bit random nonce for every encryption operation and must never reuse a key for more than approximately 2^32 records without rekeying [S019](../../research/security-foundations/01-sources/web/S019-owasp-cryptographic-storage.md).

## Key points

- TLS 1.3 cipher suites are fixed and all AEAD; configure it and forget the cipher list
- TLS 1.2 requires explicitly disabling NULL/ANON/EXPORT/RC4/3DES/CBC/static-RSA and enabling only ECDHE+GCM suites
- "RFC 8446 obsoletes TLS 1.2" means no further development, not operational prohibition; TLS 1.2 with ECDHE+GCM is a valid assessment outcome
- AES-GCM outside TLS requires explicit per-encryption nonce generation; the TLS record layer handles this automatically

## Go deeper

- [S013 — OWASP TLS Cheat Sheet](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md) — Complete cipher suite disable/enable list with rationale for each disabled category
- [S017 — NIST SP 800-52r2](../../research/security-foundations/01-sources/web/S017-nist-sp800-52r2-tls.md) — Federal TLS configuration requirements; approved TLS 1.2 cipher suite list
- [S012 — RFC 8446 TLS 1.3](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md) — Section 9.1 mandatory cipher suites; Appendix B for removed cipher suite categories

---

*← [Previous lesson](./L05-cbc-to-aead.md)* · *[Next lesson →](./L07-forward-secrecy.md)*
