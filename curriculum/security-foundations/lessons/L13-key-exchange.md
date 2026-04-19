# Key Exchange — How Two Strangers Agree on a Secret Over a Public Channel

**Module**: M05 · Key Exchange, Forward Secrecy, and TLS  
**Type**: core  
**Estimated time**: 30 minutes  
**Claim**: C12 from Strata synthesis

---

## The core idea

Symmetric cryptography (AES-GCM) solves the problem of encrypting messages — but it requires that the sender and receiver already share a secret key. How do two parties who have never communicated before — like your browser and a web server on the other side of the world — agree on a shared key without ever meeting in person and without an adversary who can read all their network traffic learning the key?

This is the **key exchange problem**, and it is one of the most elegant results in modern cryptography. The solution, called **Diffie-Hellman key exchange** (DH), allows two parties to establish a shared secret over a completely public channel — a channel that an adversary can monitor in its entirety — without the adversary being able to learn the shared secret.

This seems impossible. It is not. The security relies on a mathematical problem called the **discrete logarithm problem**, which is computationally hard in one direction and easy in the other — a "trapdoor function."

## Why it matters

Key exchange is the foundational operation in every encrypted network protocol: TLS (HTTPS), SSH, Signal, WireGuard, IPSec. Every time you connect to a secure website, a Diffie-Hellman exchange (or its elliptic curve variant, ECDH) establishes the session key used to encrypt your traffic. Understanding the mechanism explains: why key exchange vulnerabilities (like LogJam, which downgraded DH to 512-bit "export-grade" parameters) are so serious, why **forward secrecy** (covered in L14) is a property of the key exchange and not the cipher, and why "static RSA" key exchange (TLS 1.2 without forward secrecy) is a configuration that must be disabled.

## A concrete example

### The Color Mixing Analogy

Before the math, here is an analogy that captures the essential structure:

Imagine Alice and Bob want to agree on a secret color without Eve (an eavesdropper who can see everything) learning it.

1. Alice and Bob publicly agree on a starting color: yellow. (Eve knows: yellow.)
2. Alice picks a secret color: red. She mixes yellow + red = orange. She sends orange to Bob. (Eve knows: yellow, orange. Eve does not know: red.)
3. Bob picks a secret color: blue. He mixes yellow + blue = green. He sends green to Alice. (Eve knows: yellow, orange, green. Eve does not know: blue.)
4. Alice takes Bob's orange and adds her secret red: orange + red = brown.
5. Bob takes Alice's green and adds his secret blue: green + blue = brown.

Alice and Bob both arrive at brown — the same color — without ever communicating the color brown over the public channel. Eve saw yellow, orange, and green, but cannot determine brown without solving the "given a mixture and the base, find the secret addition" problem. If mixing colors were computationally irreversible (which it is not, but the math is), Eve is stuck.

### The Actual Mathematics — Diffie-Hellman

The real protocol replaces "colors" with modular arithmetic:

1. Alice and Bob publicly agree on two parameters: a large prime number $p$ and a generator $g$ (a specific integer with mathematical properties). These are public — Eve knows them.

2. Alice picks a secret integer $a$ (her private key). She computes $A = g^a \mod p$ and sends $A$ to Bob. (Eve knows: $g$, $p$, $A$. Eve does not know: $a$.)

3. Bob picks a secret integer $b$ (his private key). He computes $B = g^b \mod p$ and sends $B$ to Alice. (Eve knows: $g$, $p$, $A$, $B$. Eve does not know: $b$.)

4. Alice computes $S = B^a \mod p = (g^b)^a \mod p = g^{ab} \mod p$.

5. Bob computes $S = A^b \mod p = (g^a)^b \mod p = g^{ab} \mod p$.

Both arrive at the same $S = g^{ab} \mod p$ — the shared secret. Eve, who knows $g$, $p$, $A = g^a \mod p$, and $B = g^b \mod p$, must compute $g^{ab} \mod p$. She knows $g^a$ and $g^b$ but needs $g^{ab}$. Computing this from $g^a$ and $g^b$ is the **Diffie-Hellman problem**, which reduces to the **discrete logarithm problem**: given $g^a \mod p$, find $a$.

For large enough primes (2048 bits minimum, 3072+ recommended for new systems), the discrete logarithm problem is computationally infeasible. There is no known polynomial-time classical algorithm to solve it.

### ECDH — The Elliptic Curve Variant

**Elliptic Curve Diffie-Hellman (ECDH)** uses the same structural idea (trapdoor function, public parameters, private scalars, shared secret derived from both private inputs) but replaces the discrete logarithm over integers with the **elliptic curve discrete logarithm problem (ECDLP)**.

An elliptic curve over a finite field is a set of points satisfying a specific equation. There is a defined "addition" operation for two points on the curve. Given a base point $G$ on the curve and a scalar $k$, computing $kG$ (adding $G$ to itself $k$ times) is efficient. Given $kG$ and $G$, finding $k$ is the ECDLP — computationally hard.

The practical advantage: ECDH with 256-bit keys provides roughly the same security as DH with 3072-bit keys. Smaller keys mean faster computation and less bandwidth. Modern TLS uses ECDH with the P-256, P-384, or X25519 curves.

**X25519** (the elliptic curve used in TLS 1.3's most common key exchange) is designed for performance and resistance to implementation errors. It uses a 255-bit prime and is one of the most widely deployed key exchange algorithms in existence today.

### The LogJam Vulnerability (Applied Example)

During the "export cryptography" era (pre-1999), US law restricted the strength of cryptography that could be exported. TLS included "export-grade" cipher suites with 512-bit DH parameters — intentionally weak enough for 1990s governments to break.

The LogJam attack (2015) showed that these export-grade cipher suites were still supported by many servers, and that a MITM attacker could downgrade a TLS connection to use 512-bit DH parameters. With 512-bit DH, the discrete logarithm is solvable with moderate computing resources (and had been precomputed for the few widely-used primes). An attacker who precomputed the discrete log for the common 512-bit primes could decrypt any "downgraded" connection in real time.

The derivation is direct from the key exchange design: the parameter size determines security; smaller parameters = easier discrete log = broken security. The "export" concession created a permanently weaker code path that was exploitable decades after the restrictions were lifted.

## Key points

- Diffie-Hellman allows two parties to establish a shared secret over a public channel using the hardness of the discrete logarithm problem; $S = g^{ab} \mod p$ is computed by both parties from different information but produces the same result
- ECDH uses elliptic curve groups instead of integer modular arithmetic; provides equivalent security with much smaller keys (256-bit ECDH ≈ 3072-bit DH)
- TLS 1.3 uses (EC)DHE exclusively — DHE and ECDHE are the forward-secret variants (covered in L14); the "E" means ephemeral: a fresh key pair is generated for each session
- LogJam demonstrated that export-grade 512-bit DH parameters were recoverable, allowing decryption of downgraded TLS connections; lesson: parameter size is a direct security parameter in DH
- Key exchange is separate from encryption: DH establishes the session key, then AES-GCM (or ChaCha20-Poly1305) encrypts the data; both are necessary

## Go deeper

- [S012](../../../../vault/research/security-foundations/01-sources/) — Diffie-Hellman mechanics, LogJam attack, elliptic curve key exchange

---

*[← Previous: AEAD Encryption](./L12-aead-encryption.md)* · *[Next: Forward Secrecy — Why Session Keys Must Die →](./L14-forward-secrecy.md)*
