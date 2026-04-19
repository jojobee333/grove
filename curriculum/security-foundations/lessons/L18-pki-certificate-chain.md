# PKI — How Certificate Chains Establish Trust on the Web

**Module**: M06 · Hashing, Password Security, and PKI  
**Type**: core  
**Estimated time**: 28 minutes  
**Claim**: C14 from Strata synthesis

---

## The core idea

When your browser connects to `https://bank.com`, how does it know it is talking to the real bank and not an attacker who is intercepting the connection? The encryption protects the content, but encryption alone cannot prove identity. An attacker can set up their own TLS-encrypted server and claim to be `bank.com`. What prevents this?

The answer is **PKI** — Public Key Infrastructure. PKI is a system for establishing trusted identity through a chain of cryptographic signatures, anchored in a set of **root Certificate Authorities (CAs)** that are pre-installed in your operating system and browser as inherently trusted.

Understanding PKI means understanding: what a certificate is, how the chain of trust is built, what the four validation steps are (from Claim C14), and what happens when any component of the chain is compromised or misconfigured.

**What is an asymmetric key pair?** Unlike symmetric cryptography (same key encrypts and decrypts), asymmetric cryptography uses two mathematically linked keys: a **public key** (share freely) and a **private key** (never share). Data encrypted with the public key can only be decrypted with the private key. Crucially, the private key can also *sign* data — produce a signature that anyone with the public key can verify. We covered the key exchange use of asymmetric keys (Diffie-Hellman, ECDH) in M05; PKI uses the signature property.

## Why it matters

PKI underpins all HTTPS traffic, all code signing, all email encryption (S/MIME), all document signing, and all TLS mutual authentication. When PKI fails — through CA compromise, certificate misissuance, or misconfigured validation — the consequences range from undetected MITM attacks to fraudulent code execution. The DigiNotar breach (2011) resulted in the compromise of the Dutch PKI infrastructure and the fraudulent issuance of certificates for `*.google.com` — used to intercept Iranian users' Google traffic.

Understanding PKI validation is also prerequisite for understanding how DNSSEC, code signing, and software supply chain security work — they all use the same chain-of-trust model.

## A concrete example

### What a Certificate Contains

A TLS certificate (X.509 certificate) contains:
- **Subject**: The identity being certified (e.g., `CN=bank.com`)
- **Subject Alternative Names (SANs)**: The domain names this certificate is valid for (e.g., `bank.com`, `www.bank.com`, `m.bank.com`)
- **Public key**: The server's public key (RSA or ECDSA)
- **Issuer**: Which CA signed this certificate (e.g., `DigiCert TLS RSA SHA256 2020 CA1`)
- **Validity period**: `notBefore` and `notAfter` dates
- **Serial number**: Unique identifier assigned by the CA
- **Signature**: The CA's cryptographic signature over a hash of all the above fields
- **Extensions**: Additional fields (key usage, extended key usage, CRL/OCSP endpoints, CT log links)

The certificate does not contain the server's private key — ever. The private key stays on the server. The certificate only contains the public key.

### The Chain of Trust

No single CA signs everything. The PKI trust model uses a three-tier hierarchy:

**Root CA**: The trust anchor. Root CA certificates are self-signed (no higher authority signs them — they vouch for themselves). They are distributed with operating systems and browsers as a pre-installed list of trusted roots. There are roughly 150 trusted root CAs in most trust stores (Chrome, Mozilla, Apple, Microsoft each maintain their own). The root CA's private key is stored offline in Hardware Security Modules in highly controlled physical environments — because if the root private key is compromised, all certificates it issued or endorsed are compromised.

**Intermediate CA**: The root CA signs intermediate CA certificates. The intermediate CA is the one that actually issues TLS certificates to websites. This two-level structure limits risk: if an intermediate CA is compromised, only the certificates it issued are affected (not all certificates from the root). The root CA can revoke the intermediate certificate and issue a new one.

**End-entity certificate**: The certificate issued to a specific domain (`bank.com`). It is signed by the intermediate CA.

The chain: `bank.com cert` ← signed by → `DigiCert Intermediate CA` ← signed by → `DigiCert Root CA` ← trusted by → your browser/OS

### The Four Validation Steps (RFC 5280)

Claim C14 specifies that PKI trust requires four sequential checks. Your browser (or any TLS client) performs all four when presented with a server's certificate:

**Step 1 — Signature verification**: Verify the cryptographic signature on each certificate in the chain. The end-entity certificate is signed by the intermediate CA — verify the signature using the intermediate's public key. The intermediate certificate is signed by the root CA — verify using the root's public key. The root certificate is self-signed and in the trust store — it is trusted by policy, not by verification.

A signature is valid if: `verify(issuer_public_key, signature, hash(certificate_fields)) == true`. If the signature is invalid (modified certificate, wrong key, or forged certificate), verification fails.

**Step 2 — Validity period**: Check that `current_time` is between `notBefore` and `notAfter` on every certificate in the chain. An expired certificate must not be accepted, even if the signature is valid. Certificates expire to limit the window of exposure if a private key is later compromised.

**Step 3 — Revocation check**: Certificates can be revoked before expiry if the private key is compromised, the domain ownership changes, or the certificate was misissued. The CA maintains revocation information in two forms:
- **CRL (Certificate Revocation List)**: A signed list of revoked serial numbers, published at a URL in the certificate. Browsers download periodically (large files, slow).
- **OCSP (Online Certificate Status Protocol)**: A real-time query to a CA-operated server asking "is this specific certificate revoked?" Faster than CRL but requires a live request.
- **OCSP Stapling**: The server obtains a fresh OCSP response from the CA and "staples" it to the TLS handshake. The browser gets revocation status without making a separate request — better for privacy and performance.

**Step 4 — Name matching**: Verify that the domain name in the certificate's Subject or Subject Alternative Names matches the domain name the client is connecting to. Connecting to `bank.com`? The certificate must list `bank.com` or `*.bank.com` (wildcard) in its SANs. If the domain does not match, the certificate is not valid for this connection — even if it is otherwise valid.

All four steps must pass. If any step fails, the browser presents a certificate error.

---

### Certificate Transparency (CT)

An attack vector: a CA misbehaves and issues a certificate for `bank.com` to someone other than the bank. This is exactly what happened in the DigiNotar breach — fraudulent certificates for major domains.

**Certificate Transparency** (RFC 9162) addresses this by requiring all publicly trusted certificates to be logged in public, append-only, cryptographically verifiable logs before the certificate is trusted by Chrome. Anyone can monitor these logs for certificates issued for their domains — banks, governments, and security researchers monitor for unauthorized issuance.

The certificate includes a **Signed Certificate Timestamp (SCT)** — proof that it was submitted to a CT log. Chrome requires at least 2 SCTs. If a CA issues a certificate without logging it, Chrome will reject it.

---

### What Happens When PKI Fails

**CA compromise** (DigiNotar 2011): An attacker who compromises a CA's private key can issue fraudulent certificates for any domain. Result: DigiNotar was removed from all trust stores. All certificates it issued became untrusted. The Dutch government had to reissue their CA infrastructure.

**Weak domain validation**: Domain Validation (DV) certificates (the standard for most websites) only require proving control of a domain — typically by placing a specific file on the web server or adding a DNS TXT record. This does not verify the organization's identity. A phishing site at `bank-secure-login.com` can get a valid DV certificate for that domain, and the padlock will appear green in the browser. The padlock means "connection is encrypted" — not "this is who they claim to be."

**Wildcard certificate abuse**: A wildcard certificate (`*.example.com`) is valid for any subdomain. If a wildcard private key is compromised, an attacker can impersonate `login.example.com`, `api.example.com`, or any other subdomain.

## Key points

- PKI establishes identity through a chain of signatures: end-entity cert ← intermediate CA ← root CA ← browser/OS trust store
- The four validation steps (Claim C14): signature verification, validity period, revocation status, name matching — all four must pass
- Root CA private keys are offline in HSMs; intermediate CAs are online and revocable without affecting the root
- Certificate Transparency requires certificates to be logged in public append-only logs; enables monitoring for unauthorized issuance
- Domain Validation (DV) certs prove domain control, not organization identity; a padlock = encrypted channel, not verified identity
- CA compromise breaks the trust chain for all certificates that CA issued — DigiNotar (2011) is the canonical example: all certificates revoked, CA removed from trust stores

## Go deeper

- [S014](../../../../vault/research/security-foundations/01-sources/) — X.509 certificate structure, RFC 5280 chain validation, Certificate Transparency logs

---

*[← Previous: Password Hashing](./L17-password-hashing.md)* · *[Next: Linux Filesystem — The Forensic Map →](./L19-linux-fhs.md)*
