# CBC Mode — Why the Standard Block Mode Has to Die

**Module**: M04 · Symmetric Cryptography — AES, Block Modes, AEAD Won  
**Type**: core  
**Estimated time**: 28 minutes  
**Claim**: C11 from Strata synthesis

---

## The core idea

Cipher Block Chaining (CBC) mode was designed to fix the catastrophic problem with ECB: identical plaintext blocks producing identical ciphertext blocks. CBC solved that problem beautifully — and introduced a different category of vulnerability that took decades to fully exploit. CBC is now deprecated for new applications. Understanding why requires understanding three specific attacks: BEAST, POODLE, and padding oracle attacks.

**A quick recap from L10**: AES encrypts 16-byte blocks. To handle arbitrary-length messages, you need a mode of operation that specifies how to chain the blocks together. ECB failed because it encrypts blocks independently. CBC chains them.

**What is an IV (Initialization Vector)?** The very first block of plaintext has no previous ciphertext to chain with. The IV is a random 16-byte value used as the "previous ciphertext" for encrypting the first block. The IV does not need to be secret — it can be sent alongside the ciphertext — but it must be random and unpredictable for each message. This is a critical requirement that some implementations violated, enabling the BEAST attack.

## Why it matters

CBC mode was used in TLS 1.0, TLS 1.1, and TLS 1.2. It was also used in SSH, IPSec, and many other protocols. The attacks covered in this lesson — particularly BEAST and POODLE — motivated the deprecation of TLS 1.0/1.1 and the push to TLS 1.3. Every current TLS configuration guide that says "disable CBC cipher suites" is a direct consequence of the vulnerabilities described here.

Padding oracle attacks are also widely applicable beyond TLS — they affect any system that accepts ciphertext, decrypts it, and provides different error messages for "decryption failed" vs "wrong padding" vs "wrong MAC."

## A concrete example

### How CBC Works

In CBC mode, encryption works as follows:

- Before encrypting block N of plaintext, XOR it with the ciphertext of block N-1 (or the IV for the first block)
- Then encrypt the XORed value with AES

Decryption reverses this:
- Decrypt ciphertext block N with AES
- XOR the result with ciphertext block N-1 (or the IV for the first block)
- The result is plaintext block N

**Why this fixes the ECB problem**: Even if two plaintext blocks are identical, they will be XORed with different previous ciphertexts before encryption. The ciphertexts will differ. Good.

### BEAST Attack

**The vulnerability**: In TLS 1.0, the IV for each record is not the random per-record value you might expect — it is the last ciphertext block of the previous TLS record. This is a predictable IV.

**Why predictable IVs are dangerous**: If an attacker can predict the IV that will be used for a message, and if the attacker can influence (some of) the plaintext content, and if the attacker can observe the ciphertext, the attacker can mount a **chosen-plaintext attack** against the CBC encryption.

In the BEAST attack (Browser Exploit Against SSL/TLS), an attacker with network access and the ability to inject JavaScript into the victim's browser can:

1. Observe a block of ciphertext that contains the encrypted session cookie
2. Predict the IV for the next TLS record (it is the last block of the previous record)
3. Inject a chosen plaintext that causes CBC's chaining to "cancel out" the previous IV
4. By iterating over guesses and observing which produce the same ciphertext as the target block, recover the plaintext byte-by-byte

This requires significant attacker capability (network MITM + script injection), but it was demonstrated to be practical against TLS 1.0.

**Fix**: Use per-record random IVs (TLS 1.1+) or switch to AEAD modes (TLS 1.3).

---

### Padding Oracle Attack

**What is padding?** AES-CBC requires plaintexts to be a multiple of 16 bytes. If the message is not exactly aligned, you must pad it to the next 16-byte boundary. PKCS#7 padding says: if you need N bytes of padding, add N bytes each with value N. So if you need 5 bytes of padding, add `05 05 05 05 05`. If you need 1 byte, add `01`. If the message already aligns perfectly, add a full block of `10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10`.

When decrypting, the receiving side strips the padding by checking the last byte to determine the padding length, then verifying that all padding bytes have the correct value.

**The oracle**: If a system decrypts ciphertext and returns a different error message when the padding is invalid vs. when the MAC is invalid vs. when the message is valid, an attacker can use these different responses as an **oracle** — a mechanism that answers yes/no questions about the ciphertext.

**The attack**:

The attacker intercepts a ciphertext block and the preceding ciphertext block (the "IV" for that block in CBC terms). The attacker modifies individual bytes of the preceding block and sends modified ciphertext to the server. Based on whether the server returns "invalid padding" or "valid padding", the attacker can determine the decrypted value of specific bytes in the target block — without the key.

Specifically: if modifying byte N of the preceding block to value X causes "valid padding" on the last position of the target block, then `decrypted_byte XOR X = 0x01` (PKCS7 padding byte for 1 byte of padding). This reveals the decrypted byte's value. Repeat for all bytes, and you have the full plaintext.

**In practice**: Padding oracle attacks require many queries (typically hundreds per byte), but they are fully automatable. The POODLE attack (Padding Oracle On Downgraded Legacy Encryption) demonstrated this against SSLv3.

**Real-world impact**: Any web application that accepts encrypted tokens, decrypts them, and returns different HTTP status codes for "decryption failed" vs. "invalid content" is potentially vulnerable — not just in TLS, but in application-layer cryptography. ASP.NET ViewState was broken by a padding oracle in 2010. Many Java EE applications were similarly vulnerable.

**Fix**: 
1. Use AEAD modes (which include authentication — an attacker cannot construct a ciphertext that will decrypt to valid padding without the key)
2. If using CBC, verify the MAC *before* checking padding, and return identical error messages regardless of failure reason (do not leak which check failed)

---

### CRIME and Compression Side-Channel

A brief mention of a different category: CRIME (Compression Ratio Info-leak Made Easy) attacked the combination of TLS compression + CBC mode. If TLS compresses plaintext before encrypting, the length of the ciphertext reveals information about how compressible the plaintext is. An attacker who can inject chosen content alongside a secret (like a session cookie) can observe that lengths decrease when the injected content shares substrings with the secret — incrementally recovering the secret through compression side-channel analysis.

Fix: disable TLS compression. CRIME led to TLS 1.3 removing compression entirely.

## Key points

- CBC mode fixes ECB's identical-blocks problem by XORing each block with the previous ciphertext before encryption; but it introduced new vulnerabilities
- BEAST exploited predictable IVs in TLS 1.0 to mount a chosen-plaintext attack against session cookies; fixed in TLS 1.1 with per-record random IVs
- Padding oracle attacks exploit the difference between padding-invalid vs. MAC-invalid error responses to recover plaintext byte-by-byte without the key; POODLE demonstrated this against SSLv3
- The fundamental problem with CBC: it provides confidentiality but not authentication — an attacker can modify ciphertext in predictable ways; AEAD modes provide both
- CBC is deprecated for new applications; TLS 1.3 supports only AEAD modes; any TLS configuration guide that says "disable CBC cipher suites" is a direct consequence of these attacks

## Go deeper

- [S011](../../../../vault/research/security-foundations/01-sources/) — CBC mode specification, padding oracle mechanics, BEAST/POODLE attack details

---

*[← Previous: Symmetric Cryptography and AES](./L10-symmetric-encryption.md)* · *[Next: AEAD — Why Authenticated Encryption Won →](./L12-aead-encryption.md)*
