# Ephemeral Keys and Why Forward Secrecy Is Non-Negotiable

**Module**: M04 · Forward Secrecy, KDFs, and PKI
**Type**: core
**Estimated time**: 13 minutes
**Claim**: C12 — Forward secrecy is non-negotiable; ephemeral key exchange is industry consensus across IETF, OWASP, and NIST

---

## The core idea

Imagine every TLS session you have had in the last five years has been recorded by a passive wiretapper. Today, a law enforcement agency seizes the server's private RSA key. In a system using static RSA key exchange, all recorded sessions can now be decrypted retroactively. Every password you typed, every bank transfer you confirmed, every message you sent.

This is the threat model that forward secrecy solves. In static RSA key exchange, the session key is derived by encrypting it with the server's long-term public key. Whoever holds the private key can decrypt any session. Forward secrecy means the session key cannot be decrypted even if the long-term key is compromised later.

The mechanism: Ephemeral Diffie-Hellman (specifically ECDHE — Elliptic Curve Diffie-Hellman Ephemeral). Both client and server generate a fresh key pair for each TLS session. The session key is derived from these ephemeral values. The ephemeral private keys are discarded after the session ends. There is nothing to seize later. Sessions are cryptographically independent. (S012)

## Why it matters

Forward secrecy is not theoretical. Nation-state actors are documented to record encrypted traffic at scale with the expectation of decrypting it later — either "harvest now, decrypt later" with quantum computers, or simply by waiting for a key compromise event. The ROBOT attack (2017) demonstrated that many major web servers still had exploitable RSA key exchange code paths years after ECDHE became standard.

For penetration testing: a TLS configuration without forward secrecy is a finding. NIST SP 800-52r2 explicitly prohibits static RSA key exchange in federal deployments. OWASP's TLS Cheat Sheet marks it as disabled-unconditionally. (S013, S017)

## A concrete example

**The ROBOT attack**: In 2017, researchers discovered that a class of RSA padding vulnerabilities from 1998 (Bleichenbacher's attack) had been incompletely patched in TLS implementations including F5, Cisco, Radware, and others. An attacker who could send millions of crafted TLS handshake messages could recover the session key from servers using static RSA key exchange. The attack worked against TLS 1.2 servers that hadn't disabled static RSA cipher suites. Servers using only ECDHE were immune because no static RSA code path was exercised. (S012)

This illustrates the second benefit of forward secrecy beyond historical traffic protection: eliminating the long-term private key as a session decryption path shrinks the attack surface for any future vulnerability in RSA implementations.

---

## ECDHE vs DHE: the practical preference

| | ECDHE | DHE |
|---|---|---|
| Key exchange curve/group | x25519 (preferred), P-256 | 2048-bit minimum groups |
| Performance | Fast | Slower at equivalent security |
| IETF preference | Required in TLS 1.3 | Available in TLS 1.2 |

TLS 1.3 uses ECDHE exclusively. For TLS 1.2, ECDHE with x25519 or P-256 is preferred. DHE requires 2048-bit groups minimum to provide equivalent security to ECDHE — many older DHE implementations used 1024-bit groups (Logjam attack). (S012, S013)

## Key points

- Forward secrecy means compromise of the long-term key does not decrypt past sessions — each session's key material is independent and ephemeral
- Static RSA key exchange is the opposite: one key compromise decrypts all recorded sessions; NIST and OWASP prohibit it
- ECDHE with x25519 or P-256 is the correct implementation; TLS 1.3 enforces this by removing all non-ECDHE options

## Go deeper

- [S012 — RFC 8446 TLS 1.3](https://tools.ietf.org/html/rfc8446) — Section 1.2 documents ROBOT and static RSA removal rationale
- [S017 — NIST SP 800-52r2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-52r2.pdf) — Federal prohibition of static RSA key exchange

---

*← [Previous: Choosing Cipher Suites](./L06-cipher-suite-selection.md)* · *[Next: Passwords, Hashing, and Certificate Chain Validation](./L08-passwords-pki.md) →*
