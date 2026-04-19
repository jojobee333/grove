# NTLM and Kerberos — Windows Authentication Fundamentals

**Module**: M08 · Windows Authentication — NTLM, Kerberos  
**Type**: core  
**Estimated time**: 30 minutes  
**Claim**: C9 from Strata synthesis

---

## The core idea

Windows environments use two primary authentication protocols: **NTLM** (NT LAN Manager) and **Kerberos**. These are not alternatives you choose between — they coexist in every Active Directory environment, with Kerberos being the preferred modern protocol and NTLM serving as a fallback. Both protocols have well-documented attack patterns, and the research (Claim C9) identifies them as **persistent weak links**: NTLM and RC4-based Kerberos both produce detectable signals when abused that allow defenders to identify attacks in Windows event logs.

Understanding these protocols is the foundation for understanding the most common Windows post-exploitation techniques: Pass-the-Hash (NTLM), Pass-the-Ticket, Kerberoasting, and AS-REP Roasting (all Kerberos-based, covered in L24).

**What is Active Directory (AD)?** Active Directory is Microsoft's directory service — the central authority in Windows enterprise networks that manages user accounts, computers, groups, and policies. When a user logs into a Windows computer in an organization, they authenticate against AD. Every access control decision — who can open which file share, who can RDP to which server — is ultimately checked against AD.

**What is a Domain Controller (DC)?** The Domain Controller is the server running Active Directory. It is the authentication authority: when you log in, the DC validates your credentials. Compromising a DC means compromising the entire Windows environment.

## Why it matters

NTLM and Kerberos attacks are among the most commonly exploited paths in Active Directory penetration tests and real-world breaches. Pass-the-Hash and Kerberoasting regularly appear in red team reports and incident response findings. Understanding the protocol mechanics explains why these attacks work, what evidence they leave, and what defenses are effective.

## A concrete example

### NTLM Authentication (Challenge-Response)

NTLM uses a challenge-response mechanism. No password is ever sent over the network — instead, the client proves it knows the password by applying a cryptographic function to it.

**NTLM authentication flow** (for network authentication to a file server):

1. **Negotiate**: Client sends a negotiate message to the server indicating it wants NTLM authentication and its capabilities.

2. **Challenge**: Server sends back an 8-byte random challenge (a nonce).

3. **Authenticate**: Client takes the user's NT hash (the NTLM hash — an MD4 hash of the UTF-16LE encoded password) and uses it to encrypt the server's challenge. The result is the **NTLMv2 response**, which the client sends along with the username and domain.

4. **Verification**: The server (or the Domain Controller, to which the server forwards the exchange) recomputes the expected response using the stored NT hash for that user. If they match, authentication succeeds.

**What is the NT Hash?** The NT hash is `MD4(UTF-16LE(password))`. It is stored in the SAM database (local accounts) or the Active Directory database (`NTDS.DIT`). MD4 is a fast, broken hash function — this is why NT hashes are so easily cracked once extracted.

**The critical property**: The NTLM authentication process requires the NT hash, not the cleartext password. An attacker who obtains the NT hash from memory (using Mimikatz, which reads the `lsass` process) can authenticate as that user without knowing the actual password. This is **Pass-the-Hash**.

**Detecting NTLM**: Windows Event Log Event ID 4624 (Successful Logon) includes the `LmPackageName` field. If `LmPackageName = NTLM V1` or `NTLM V2`, NTLM was used. In a modern Active Directory environment, most logins should use Kerberos — NTLM usage is expected only for specific compatibility scenarios. High NTLM usage is a detection signal (either misconfigured environment or active pass-the-hash attacks).

---

### Kerberos Authentication (Ticket-Based)

Kerberos is a ticket-based authentication system. Instead of sending credentials repeatedly to each service, the Domain Controller (acting as a **Key Distribution Center, KDC**) issues cryptographically signed tickets that clients present to services.

**Key terms**:
- **KDC (Key Distribution Center)**: The Domain Controller service that issues tickets
- **TGT (Ticket Granting Ticket)**: A "master ticket" that proves identity to the KDC; used to request service tickets
- **TGS (Ticket Granting Service)**: The KDC component that issues service tickets
- **Service Ticket / TGS ticket**: A ticket for accessing a specific service (file server, SQL Server, etc.)
- **SPN (Service Principal Name)**: The unique identifier for a service in AD (e.g., `MSSQLSvc/sqlserver.corp.local:1433`)

**Kerberos authentication flow**:

1. **AS-REQ (Authentication Service Request)**: The user's computer sends a request to the KDC for a TGT. It includes the username and a timestamp encrypted with the user's password hash (derived key).

2. **AS-REP (Authentication Service Reply)**: The KDC verifies the request, then sends back:
   - A **TGT**: Encrypted with the `krbtgt` account's password hash (only the KDC can decrypt this). Contains: username, groups, timestamps, and a session key.
   - A session key, encrypted with the user's password hash (so the client can decrypt it).
   
   The client holds the TGT in memory (cached in the Kerberos credential cache).

3. **TGS-REQ (Ticket Granting Service Request)**: When the user wants to access a service (e.g., a file share on `fileserver.corp.local`), their computer sends the TGT + the SPN of the target service to the KDC.

4. **TGS-REP (Ticket Granting Service Reply)**: The KDC verifies the TGT, then issues a **service ticket** encrypted with the target service account's password hash. The client receives this service ticket and a session key (encrypted with the TGT session key).

5. **AP-REQ (Application Request)**: The client presents the service ticket to the target service. The service decrypts it using its own password hash (which it knows) and extracts the user's identity and authorization data.

**Why this is secure (in principle)**: The KDC never sends cleartext credentials over the network. Each ticket is encrypted with a key only the relevant party knows. The client proves identity by successfully decrypting the AS-REP (which requires knowing the password).

**The Kerberoasting weakness**: Step 4 — service tickets are encrypted with the **service account's password hash**. Any authenticated domain user can request a service ticket for any SPN. If the service account has a weak password, an attacker can request the ticket offline and brute-force the service account's password from the ticket. This is covered in L24.

**Detecting Kerberos attacks**: Windows Event ID 4769 (Kerberos Service Ticket Request). The `TicketEncryptionType` field reveals what encryption was used:
- `0x17` = RC4-HMAC: weak, potentially a Kerberoasting attack (attackers often request RC4 to make cracking easier)
- `0x12` = AES256-CTS-HMAC-SHA1-96: strong, expected in modern environments
- `0x11` = AES128-CTS-HMAC-SHA1-96: strong

Mass service ticket requests from a single host (dozens of unique SPNs in a short window) is also a Kerberoasting detection signal.

---

### NTLM vs. Kerberos — Why Both Still Exist

| Property | NTLM | Kerberos |
|---------|------|---------|
| Requires DC | No (can work standalone for local auth) | Yes |
| Works offline/standalone | Yes | No |
| Supports mutual authentication | No (server cannot prove identity to client) | Yes |
| Supports delegation | Limited | Yes (constrained/unconstrained delegation) |
| Forward secrecy | No | No |
| Main attack | Pass-the-Hash, NTLM relay | Kerberoasting, Pass-the-Ticket, Golden/Silver Ticket |

NTLM is still used in environments with:
- Non-domain-joined machines
- Resources accessed by IP address rather than hostname (Kerberos requires hostnames for SPN matching)
- Older applications that only support NTLM
- Local user authentication (not domain accounts)

NTLM Relay is a significant attack category not covered in depth here: if an attacker can position themselves as a MITM for NTLM authentication, they can relay the challenge-response to authenticate to another service as the victim — without ever cracking the hash. NTLM's lack of mutual authentication makes it particularly vulnerable to relay attacks.

## Key points

- NTLM uses challenge-response: the client proves it knows the NT hash by using it to encrypt a server challenge; never sends cleartext password
- The NT hash is MD4(UTF-16LE(password)) — fast, crackable; also usable directly for Pass-the-Hash (authenticate without knowing the password)
- Kerberos is ticket-based: TGT from the KDC proves identity; service tickets grant access to specific services; encrypted with service account password hash
- Event ID 4624 with LmPackageName = NTLM V1/V2 indicates NTLM usage; in a modern AD environment, most logins should use Kerberos
- Event ID 4769 with TicketEncryptionType = 0x17 (RC4-HMAC) indicates potential Kerberoasting; mass service ticket requests from one host confirm it
- Both protocols are present in every AD environment; understanding both is prerequisite for Pass-the-Hash, NTLM relay, Kerberoasting, and Pass-the-Ticket (covered in L24)

## Go deeper

- [S009](../../../../vault/research/security-foundations/01-sources/) — NTLM challenge-response mechanics, Kerberos ticket flow, Event IDs for detection

---

*[← Previous: Bash Log Analysis](./L21-bash-log-analysis.md)* · *[Next: Windows Registry — The Configuration Database →](./L23-windows-registry.md)*
