# Forward Secrecy — Why Session Keys Must Die With the Session

**Module**: M05 · Key Exchange, Forward Secrecy, and TLS  
**Type**: core  
**Estimated time**: 25 minutes  
**Claim**: C12 from Strata synthesis

---

## The core idea

Forward secrecy (also called **Perfect Forward Secrecy, PFS**) is a property of a key exchange protocol. A key exchange provides forward secrecy if compromising the long-term private keys of the participants **after** a session has ended cannot reveal the session's plaintext — because the session key was ephemeral (temporary, discarded after use) and cannot be recomputed.

The opposite of forward secrecy is **static key exchange** — where the session key can be derived from long-term keys. If an attacker records encrypted traffic today and obtains the long-term private key next year (by hacking the server, receiving it via legal process, or any other means), they can decrypt all previously recorded traffic. This is the "harvest now, decrypt later" attack.

**Ephemeral** is the key word. An ephemeral key pair is generated fresh for each session, used to complete the key exchange, and then deleted. The session key derived from it cannot be re-derived even by the original parties.

## Why it matters

The research (Claim C12) identifies forward secrecy via (EC)DHE as "non-negotiable" — citing IETF, OWASP, and NIST alignment. The three reasons forward secrecy matters in practice:

1. **Long-term key compromise**: Private keys get stolen (server breaches), expired certificates with keys not deleted, or law enforcement compels disclosure. Without forward secrecy, all past sessions encrypted under that key are now readable.

2. **Nation-state passive collection**: Intelligence agencies are known to record encrypted traffic at scale, storing it for future decryption. If a TLS session uses static RSA (no forward secrecy), an agency that obtains the private key years later can decrypt everything it recorded. With forward secrecy, past sessions cannot be retroactively decrypted — the ephemeral keys are gone.

3. **Certificate authority compromise**: If a CA is compromised and an attacker obtains a fraudulent certificate for your domain, they can impersonate your server — but only for new sessions. They cannot decrypt previously recorded sessions if forward secrecy was used.

## A concrete example

### Static RSA Key Exchange (No Forward Secrecy)

In TLS 1.2 with a static RSA cipher suite:

1. The server has a long-term RSA key pair (private key + public key in the certificate)
2. The client generates a random **pre-master secret** (a random value that will be used to derive the session key)
3. The client encrypts the pre-master secret with the server's RSA public key and sends it to the server
4. The server decrypts the pre-master secret using its RSA private key
5. Both derive the session key from the pre-master secret

Now consider: every session's pre-master secret is encrypted with the *same* long-term RSA public key. If an attacker records the entire TLS handshake (including the RSA-encrypted pre-master secret) and later obtains the server's private key, they can decrypt the pre-master secret and derive the session key — decrypting the entire recorded session.

The session key is not ephemeral — it is derivable from the long-term key.

### ECDHE Key Exchange (Forward Secrecy)

In TLS 1.3 (or TLS 1.2 with ECDHE cipher suite):

1. The server's long-term key (RSA or ECDSA) is used only for **authentication** — to sign the handshake transcript, proving the server owns the certificate
2. For the session key, both client and server **generate fresh ECDH key pairs** (`a` and $aG$ for the client; `b` and $bG$ for the server)
3. They exchange their public values ($aG$ and $bG$)
4. Each computes the shared secret $S = abG$ independently (as in L13)
5. The session key is derived from $S$ using a key derivation function
6. **After the handshake completes, both sides delete their ephemeral private keys $a$ and $b$**

An attacker who records the handshake sees $aG$ and $bG$ (public values). Even if they later compromise the server's long-term private key, they cannot compute $S = abG$ — because $a$ and $b$ were deleted and the discrete logarithm problem prevents recovery of $a$ from $aG$.

The session key was derived from $abG$ and then destroyed. There is no way to re-derive it.

### Verifying Forward Secrecy

You can verify whether a server supports forward secrecy using `openssl s_client`:

```bash
# Check what cipher suite a server negotiates
openssl s_client -connect example.com:443 2>/dev/null | grep "Cipher"
```

A cipher suite name containing `ECDHE` or `DHE` indicates forward secrecy. A suite with `RSA` as the key exchange mechanism (without DHE/ECDHE) does not have forward secrecy.

In a browser, clicking the padlock icon → connection information will show the key exchange algorithm. `X25519` or `P-256` (elliptic curve DH) means forward secrecy. `RSA` as the key exchange means no forward secrecy (though `RSA` in the authentication part, like `ECDHE-RSA-AES256-GCM-SHA384`, is fine — that refers to the signature algorithm, not the key exchange).

### The "Harvest Now, Decrypt Later" Threat Model

The threat is simple: an adversary records all encrypted TLS traffic today, stores it cheaply (storage is inexpensive), and waits for either:
- The server's private key to be exposed (breach, legal compulsion, employee disclosure)
- Quantum computing to mature (Shor's algorithm breaks RSA and classical DH, though not ECDH over properly chosen curves — post-quantum cryptography is a separate topic)

With forward secrecy, this threat is neutralized: the attacker holds ciphertext but no amount of future key compromise allows them to decrypt it.

Without forward secrecy (static RSA), every session you have ever encrypted is potentially retroactively readable. For communications that need to remain confidential for years (legal, medical, financial, journalistic), this is a serious risk.

## Key points

- Forward secrecy means compromising long-term keys after a session cannot decrypt that session's traffic — because the session key was derived from ephemeral keys that were discarded
- Static RSA key exchange (TLS 1.2 without DHE/ECDHE) has no forward secrecy; an attacker who records traffic and later obtains the private key can decrypt everything
- ECDHE/DHE key exchange provides forward secrecy because both parties generate fresh key pairs per session, derive the session key from the ephemeral exchange, then delete the ephemeral private keys
- TLS 1.3 uses only ephemeral key exchange — static RSA cipher suites are not supported; this is one of the main reasons to upgrade
- Forward secrecy is critical for the "harvest now, decrypt later" threat model where adversaries store encrypted traffic for future decryption

## Go deeper

- [S012](../../../../vault/research/security-foundations/01-sources/) — Static RSA vs ECDHE key exchange comparison, forward secrecy in TLS handshake

---

*[← Previous: Key Exchange and Diffie-Hellman](./L13-key-exchange.md)* · *[Next: TLS Versions — What Changed and What to Disable →](./L15-tls-versions.md)*
