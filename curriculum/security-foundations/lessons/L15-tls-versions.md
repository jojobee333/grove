# TLS Versions — What Changed and What to Disable

**Module**: M05 · Key Exchange, Forward Secrecy, and TLS  
**Type**: applied  
**Estimated time**: 28 minutes  
**Claim**: C15 from Strata synthesis

---

## The situation

TLS (Transport Layer Security) is the protocol that encrypts web traffic (HTTPS), email in transit (SMTP with STARTTLS), and most other encrypted network communication. Every version of TLS is a specific combination of key exchange, authentication, cipher, and MAC (message authentication code) algorithms. Choosing the wrong combination — or supporting an old version that allows downgrade to broken configurations — is one of the most common cryptographic mistakes in real-world deployments.

The research (Claim C15) states the current standard clearly:
- **TLS 1.3**: Always preferred. Supports only AEAD ciphers and ephemeral key exchange. No deprecated options.
- **TLS 1.2 + ECDHE + AEAD**: Acceptable. Required for compatibility with older clients.
- **TLS 1.2 + static RSA or CBC ciphers**: A misconfiguration. Disable.
- **TLS 1.1 and below**: Disabled everywhere. No exceptions.

This lesson maps each version to the cryptographic mechanisms it uses, explains why each decision matters, and gives you the configuration vocabulary to verify and correct TLS deployments.

## The approach

Understanding TLS configuration requires understanding the **cipher suite** — the negotiated combination of cryptographic algorithms for a single session. A cipher suite name like `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384` encodes four choices:

1. **Key exchange**: `ECDHE` (ephemeral elliptic curve DH → forward secrecy)
2. **Authentication**: `RSA` (the server's certificate uses RSA for signing)
3. **Cipher**: `AES_256_GCM` (AES-256 in GCM mode → AEAD)
4. **MAC / PRF**: `SHA384` (used in TLS 1.2 for key derivation and message integrity)

In TLS 1.3, the cipher suite format changed — key exchange and authentication are no longer part of the cipher suite name (they are negotiated separately), simplifying the naming: `TLS_AES_256_GCM_SHA384`.

## A worked example

### TLS 1.0 and 1.1 — Why They Are Disabled

TLS 1.0 (1999) and TLS 1.1 (2006) have multiple well-documented weaknesses:

- **BEAST** (TLS 1.0): Predictable CBC IV (covered in L11). The IV for each record is the last ciphertext block of the previous record.
- **POODLE** (TLS 1.0 can be downgraded to SSLv3, which has the SSLv3 padding oracle): Even if the server supports TLS 1.0, a downgrade attack can force SSLv3.
- **CRIME** (both): TLS compression combined with CBC allows side-channel recovery of session cookies.
- **Weak cipher support**: TLS 1.0/1.1 support RC4 (broken stream cipher) and CBC with MD5/SHA-1 MACs. Even if a server does not advertise these, the protocol allows negotiating them if both sides support it.

IETF RFC 8996 (2021) formally deprecated TLS 1.0 and TLS 1.1. All major browsers and servers disabled them by default in 2020–2021. There is no valid reason to enable them.

---

### TLS 1.2 — The Acceptable Minimum With Caveats

TLS 1.2 (2008) introduced the flexibility to use AEAD cipher suites and ECDHE key exchange — the building blocks of modern TLS security. A properly configured TLS 1.2 deployment is secure.

**Acceptable TLS 1.2 cipher suites**:
```
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
```
Key properties: ECDHE (forward secrecy) + GCM or ChaCha20-Poly1305 (AEAD).

**Cipher suites to disable in TLS 1.2**:
```
# Static RSA (no forward secrecy)
TLS_RSA_WITH_AES_256_GCM_SHA384
TLS_RSA_WITH_AES_128_GCM_SHA256

# CBC cipher suites (padding oracle vulnerable)
TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384
TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256
TLS_RSA_WITH_AES_256_CBC_SHA256

# Legacy broken ciphers
TLS_RSA_WITH_RC4_128_SHA
TLS_RSA_WITH_3DES_EDE_CBC_SHA  # SWEET32 attack
```

**Nginx configuration example** (TLS 1.2, secure subset only):
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;
```

The `ssl_prefer_server_ciphers off` setting is intentional: in TLS 1.3, the client's preference should be respected (clients typically prioritize ChaCha20-Poly1305 on mobile hardware without AES-NI).

---

### TLS 1.3 — The Target

TLS 1.3 (RFC 8446, 2018) eliminated all of the flexibility that caused problems in TLS 1.2:

- **No static RSA**: Only ephemeral key exchange (ECDHE/DHE) is supported. Forward secrecy is mandatory.
- **No CBC**: Only AEAD cipher suites.
- **No MD5, SHA-1**: Only SHA-256 and SHA-384 for hashing.
- **No compression**: Eliminates CRIME-class attacks.
- **Reduced round trips**: TLS 1.3 completes the handshake in 1 round-trip (vs. TLS 1.2's 2). For repeat connections, 0-RTT (Zero Round-Trip Time resumption) allows sending data immediately — with caveats (replay attacks: 0-RTT data can be replayed by an attacker, so it must only be used for idempotent requests).
- **Encrypted handshake**: In TLS 1.3, more of the handshake is encrypted, reducing metadata leakage (an observer cannot see the certificate during the handshake).

TLS 1.3 cipher suites:
```
TLS_AES_256_GCM_SHA384        (preferred)
TLS_AES_128_GCM_SHA256
TLS_CHACHA20_POLY1305_SHA256
```

---

### Verifying TLS Configuration

**Using testssl.sh** (comprehensive TLS scanner):
```bash
./testssl.sh https://example.com
```
Output includes: supported protocol versions, supported cipher suites (with AEAD/CBC/static-RSA labels), certificate details, and HSTS/HPKP headers.

**Using nmap**:
```bash
nmap --script ssl-enum-ciphers -p 443 example.com
```
Output shows each supported TLS version and cipher suite, labeled with their security rating.

**Using openssl s_client**:
```bash
# Attempt TLS 1.0 connection — should fail on a properly configured server
openssl s_client -connect example.com:443 -tls1 2>&1 | grep "handshake failure"

# Check TLS 1.3 negotiation
openssl s_client -connect example.com:443 -tls1_3 2>/dev/null | grep -E "Protocol|Cipher"
```

**What a clean scan looks like**:
```
Protocol: TLSv1.3
Cipher: TLS_AES_256_GCM_SHA384
Session-ID: (empty in TLS 1.3 — no session IDs)
```

---

### The Contradiction: IETF "Deprecated" vs. "Disabled"

The Strata research notes a contradiction around TLS 1.2 status: some sources say "obsoletes" TLS 1.2 (IETF language), others say TLS 1.2 remains acceptable.

The resolution: "obsoletes" in IETF RFC terminology means "no further development" — not "stop using immediately." TLS 1.3 obsoletes TLS 1.2 the same way USB 3.0 obsoletes USB 2.0: the older version still works correctly for its intended purpose, the new version is preferred for new deployments. **IETF, OWASP, and NIST all state that TLS 1.2 with strong cipher suites remains acceptable** — the requirement is to disable the *weak* TLS 1.2 configurations, not TLS 1.2 itself.

**Bottom line**: Enable TLS 1.2 + TLS 1.3. Configure TLS 1.2 to support only ECDHE + AEAD. Disable TLS 1.1 and below. Disable all static RSA and CBC cipher suites.

## Key points

- TLS 1.0 and 1.1 are deprecated (RFC 8996) and must be disabled; BEAST, POODLE, CRIME, and legacy cipher support make them indefensible
- TLS 1.2 with ECDHE + AEAD is acceptable; TLS 1.2 with static RSA or CBC cipher suites is a misconfiguration
- TLS 1.3 is the target: forward secrecy mandatory, only AEAD ciphers, encrypted handshake, faster (1-RTT); "obsoletes TLS 1.2" in IETF terminology means "no further development," not "stop using"
- Acceptable cipher suites are prefix-identifiable: `ECDHE-*-GCM` or `ECDHE-*-CHACHA20`; any `RSA-WITH-*` (static RSA) or `CBC` is a misconfiguration
- Verify with `testssl.sh`, `nmap --script ssl-enum-ciphers`, or `openssl s_client`

## Go deeper

- [S012](../../../../vault/research/security-foundations/01-sources/) — TLS 1.2 cipher suite negotiation and TLS 1.3 handshake design
- [S015](../../../../vault/research/security-foundations/01-sources/) — NIST and OWASP TLS configuration guidance

---

*[← Previous: Forward Secrecy](./L14-forward-secrecy.md)* · *[Next: Hash Functions — What SHA-256 Does and Why SHA-1 Is Dead →](./L16-hash-functions.md)*
