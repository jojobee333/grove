# Ephemeral Keys and Why Forward Secrecy Is Non-Negotiable

**Module**: M04 · Forward Secrecy, KDFs, and PKI
**Type**: core
**Estimated time**: 13 minutes
**Claim**: C12 from Strata synthesis

---

## The core idea

Forward secrecy is the property that compromise of a long-term private key does not retroactively compromise past session keys. Without it, an adversary can record all encrypted TLS traffic today, wait years for the long-term private key to be stolen or ordered disclosed, then decrypt the archive. This is not a theoretical concern: mass-surveillance systems operate exactly this way, and key compromise events — through breach, legal compulsion, or certificate authority failure — happen routinely.

The mechanism that provides forward secrecy is ephemeral key exchange: (EC)DHE. In an Elliptic Curve Diffie-Hellman Ephemeral handshake, both client and server generate a fresh random key pair for each TLS session. The session key is derived from these ephemeral values. The ephemeral private keys are discarded immediately after the handshake. Even if the server's long-term RSA or ECDSA certificate private key is later compromised, the attacker cannot compute the session key — the ephemeral keys are gone. The shared session secret exists only in volatile memory for the duration of the session [S012](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md).

RFC 8446 (TLS 1.3) mandates ECDHE for all handshakes. Static RSA key exchange — where the session key is encrypted under the server's long-term RSA public key — was removed from the specification entirely. NIST SP 800-52r2 classifies static RSA as "not permitted" for federal TLS 1.2 deployments. OWASP's TLS Cheat Sheet requires disabling static RSA and static DH in TLS 1.2, explicitly citing the retroactive decryption threat [S013](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md) [S017](../../research/security-foundations/01-sources/web/S017-nist-sp800-52r2-tls.md). Three independent standards bodies reached the same conclusion.

## Why it matters

The adversary in this threat model is a nation-state or well-resourced attacker with the capability to collect and store encrypted traffic at scale. NSA PRISM, GCHQ TEMPORA, and similar programs demonstrated this is not theoretical. The adversary does not need to break the encryption in real time — they need to collect it and wait. Forward secrecy eliminates the value of the stored ciphertext archive because there is no long-term key that decrypts it.

For enterprise environments, forward secrecy also applies to the legal threat model: a court order compelling disclosure of a private key after an incident cannot decrypt past communications if forward secrecy was in use. This is relevant for attorney-client communications, healthcare data, and any data subject to confidentiality requirements.

For penetration testing, a TLS configuration without forward secrecy is a High severity finding: NIST SP 800-52r2 explicitly prohibits static RSA key exchange in federal deployments and OWASP marks it as disabled-unconditionally [S017](../../research/security-foundations/01-sources/web/S017-nist-sp800-52r2-tls.md).

## A concrete example

**Static RSA key exchange: the retroactive decryption problem**

In TLS using static RSA key exchange (pre-TLS 1.3 default for many servers), the client generates a random pre-master secret and encrypts it under the server's RSA public key. The server decrypts it with its private key. The session key is derived from this pre-master secret.

An attacker who records this handshake and later obtains the server's RSA private key — through breach, subpoena, or CA compromise — can decrypt the pre-master secret and derive the complete session key. Every past session key encrypted under that server certificate is retroactively compromised. If the server ran for five years and rotated its certificate annually, five years of recorded traffic becomes decryptable the moment one certificate's private key is obtained [S012](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md).

The ROBOT attack (2017) demonstrated that this threat is active rather than theoretical: researchers found that a class of RSA padding vulnerabilities from Bleichenbacher (1998) had been incompletely patched across major TLS implementations including F5, Cisco, and Radware. Servers using only ECDHE cipher suites were immune because no static RSA code path was exercised — the attack surface did not exist.

**ECDHE key exchange: ephemeral values close the window**

With ECDHE, the server generates a fresh P-256 or x25519 private key scalar for each new TLS handshake. This ephemeral private key is never written to disk. The client similarly generates a fresh scalar. The shared session key is derived from both ephemeral public keys via the Diffie-Hellman group operation. After the handshake, both sides discard their private scalars.

An attacker who records this handshake and later obtains the server's long-term ECDSA private key (the certificate key) gains nothing. The certificate key was never involved in computing the session key. The ephemeral scalars that were involved no longer exist in any recoverable form. The session is permanently forward-secret [S013](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md).

## Limitations

Forward secrecy protects the confidentiality of past sessions if a long-term private key is later compromised. It does not protect against compromise of the session key itself during the active session — if a client or server host is compromised in real time, the session key is accessible in memory regardless of how it was derived. Forward secrecy is a protection against retroactive key disclosure, not against active compromise of the endpoints involved in the session.

## Key points

- Forward secrecy prevents retroactive decryption of recorded traffic after a long-term private key is compromised; it is the protection against collect-now-decrypt-later surveillance
- (EC)DHE makes forward secrecy possible by generating fresh ephemeral key pairs per session, then discarding them immediately
- RFC 8446 mandates ECDHE for TLS 1.3; NIST marks static RSA as "not permitted"; OWASP requires disabling it — three bodies, same conclusion
- Forward secrecy protects past sessions only; active compromise of a session endpoint exposes the in-memory session key regardless

## Go deeper

- [S012 — RFC 8446 TLS 1.3](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md) — Section 4.2.7 on key exchange modes; the ROBOT attack and static RSA removal rationale
- [S013 — OWASP TLS Cheat Sheet](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md) — ECDHE with x25519/P-256 recommendations; static RSA and DH disable guidance
- [S017 — NIST SP 800-52r2](../../research/security-foundations/01-sources/web/S017-nist-sp800-52r2-tls.md) — "Not permitted" classification of static RSA in federal TLS deployments

---

*← [Previous lesson](./L06-cipher-suite-selection.md)* · *[Next lesson →](./L08-passwords-pki.md)*
