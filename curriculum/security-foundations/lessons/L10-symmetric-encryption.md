# Symmetric Cryptography — What AES Actually Does

**Module**: M04 · Symmetric Cryptography — AES, Block Modes, AEAD Won  
**Type**: core  
**Estimated time**: 30 minutes  
**Claim**: C11 from Strata synthesis

---

## The core idea

Cryptography is the science of transforming data so that only intended recipients can read it. **Symmetric cryptography** specifically uses the same key for both encryption and decryption — sender and receiver share a secret key, and anyone who does not have the key cannot read the ciphertext.

**AES** (Advanced Encryption Standard) is the dominant symmetric cipher in use today. It encrypts data in fixed-size blocks of 16 bytes (128 bits) using a key of 128, 192, or 256 bits. Understanding what AES does internally — and what it deliberately does not do — is the foundation for understanding why the **mode of operation** (how AES is applied to data longer than 16 bytes) is where modern cryptographic vulnerabilities live.

**Why is this the right mental model?** The research (Claim C11) finds that the transition from CBC (Cipher Block Chaining) to AEAD (Authenticated Encryption with Associated Data) modes is the defining shift in applied cryptography over the last decade. AES itself is not broken. The block modes that sit on top of AES — particularly CBC — are what created exploitable vulnerabilities. Understanding AES first, then block modes, then AEAD is the correct learning order.

**What does "encrypt" mean?** Encryption takes plaintext (readable data) and a key, and produces ciphertext (unreadable data). Decryption takes ciphertext and the same key, and recovers the plaintext. Without the key, going from ciphertext to plaintext should be computationally infeasible — the best an attacker can do is exhaustively try all possible keys (brute force), which for a 256-bit key would require more operations than there are atoms in the observable universe.

**What does "symmetric" mean?** The same key encrypts and decrypts. This is different from asymmetric cryptography (covered in M05), where a public key encrypts and a private key decrypts. Symmetric cryptography is faster and used for bulk data encryption; asymmetric is used for key exchange and signatures.

## Why it matters

AES is used everywhere: HTTPS connections use AES to encrypt web traffic, your disk encryption (BitLocker, FileVault, LUKS) uses AES, encrypted messaging apps use AES, VPNs use AES, database encryption uses AES. If you work in any technical role in security — analyst, engineer, developer — you will encounter AES constantly.

More importantly, the vulnerabilities in TLS 1.2, the BEAST attack, the POODLE attack, the CRIME attack, and many others all exploited not AES itself, but the **mode of operation** layered on top of it. Understanding the block cipher foundation tells you why those attacks worked and why AEAD modes closed the door.

## A concrete example

### What AES Does (Simplified)

AES is a **substitution-permutation network**. For each 16-byte block, it performs a fixed number of rounds (10 rounds for AES-128, 12 for AES-192, 14 for AES-256). Each round applies four operations:

1. **SubBytes**: Replace each byte with a different byte using a fixed lookup table (S-box). This provides non-linearity — the output is not a linear function of the input, which defeats linear algebra attacks.

2. **ShiftRows**: Cyclically shift the rows of the 4×4 byte grid by different offsets. This moves bytes into different column positions.

3. **MixColumns**: Multiply each column of the 4×4 grid by a fixed matrix in a Galois Field (a specific mathematical structure). This ensures that changing one byte in a column affects all bytes in the column after this step.

4. **AddRoundKey**: XOR the state with a portion of the round key (derived from the original key via the key schedule).

The final round omits MixColumns.

The key insight: **after 10+ rounds of these operations, a single bit change in the input causes on average half the bits in the output to change**. This property — called the avalanche effect — is what makes AES secure. Every bit of ciphertext depends on every bit of plaintext and every bit of the key in a complex, non-linear way. There is no shortcut to recovery without the key.

### The Block Size Problem

AES encrypts exactly 16 bytes at a time. A plaintext message is almost never exactly 16 bytes. What do you do with messages of arbitrary length?

You need a **mode of operation**: a specification for how to apply AES repeatedly across a sequence of blocks.

The simplest mode is **ECB** (Electronic Codebook): divide the message into 16-byte blocks, encrypt each block independently with the same key.

**Why ECB is catastrophically broken**: Identical 16-byte blocks of plaintext produce identical ciphertext blocks. This means the structure of the plaintext is visible in the ciphertext. The classic demonstration: encrypt a bitmap image with ECB mode. The ciphertext of the image still has the same block structure as the original image — you can see the shapes and edges because identical plaintext blocks produce identical ciphertext blocks.

**The point**: A block cipher mode must ensure that identical plaintext blocks produce different ciphertext, or the mode leaks information about patterns in the data. ECB fails this completely. CBC was designed to fix it. CBC has different problems (covered in L11). AEAD modes (covered in L12) fix all of them.

### AES Key Sizes

- **AES-128**: 128-bit key, 10 rounds. The 128-bit key space has 2¹²⁸ possible keys. Exhaustive search is computationally infeasible with any foreseeable technology. AES-128 is considered secure against classical computers.
- **AES-256**: 256-bit key, 14 rounds. Provides additional margin against quantum attacks (Grover's algorithm reduces the effective key strength to 128 bits — still infeasible). Preferred for environments with high security requirements or long-term data protection needs.
- **AES-192**: 192-bit key, 12 rounds. Rarely used; AES-128 and AES-256 are the standard choices.

**Quantum computing note**: Shor's algorithm (which threatens asymmetric cryptography like RSA and ECC) does not apply to AES. Grover's algorithm provides a quadratic speedup for brute-force search — halving the effective key length. AES-256's effective security against a quantum computer is 128 bits — still considered safe. This is why AES-256 is recommended for long-term data protection.

## Key points

- AES is a block cipher that encrypts data in fixed 16-byte blocks using a 128, 192, or 256-bit key; 10–14 rounds of substitution and permutation operations produce the avalanche effect
- The key is the secret — without it, recovering the plaintext from AES ciphertext is computationally infeasible even for governments and nation-states
- AES itself is not broken; the vulnerabilities in real-world deployments come from the **mode of operation** layered on top of AES
- ECB mode (encrypt each block independently) is broken: identical plaintext blocks produce identical ciphertext blocks, leaking structural information
- AES-256 is preferred for long-term data protection (quantum resistance); AES-128 is secure for current use cases
- The correct mental model: AES is a primitive; a cipher suite = AES + a mode of operation + (ideally) an authentication tag; all three matter

## Go deeper

- [S011](../../../../vault/research/security-foundations/01-sources/) — AES design principles, substitution-permutation network structure, and key schedule

---

*[← Previous: DNS C2 Detection](./L09-dns-c2-detection.md)* · *[Next: CBC Mode — Why the Standard Block Mode Has to Die →](./L11-cbc-attacks.md)*
