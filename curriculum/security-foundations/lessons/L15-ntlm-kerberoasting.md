# NTLM, Pass-the-Hash, and Kerberoasting

**Module**: M08 · Authentication Weaknesses — NTLM to Kerberoasting
**Type**: core
**Estimated time**: 15 minutes
**Claim**: C9 from Strata synthesis

---

## The core idea

Windows Active Directory environments inherit decades of authentication protocol decisions. Two of those decisions — NTLM hash reuse and RC4 encryption for Kerberos service tickets — are the basis for the two most commonly observed post-exploitation techniques in real intrusions: Pass-the-Hash and Kerberoasting. Understanding these attacks means understanding exactly which cryptographic property each exploits and exactly which event fires for detection. The specificity matters: "NTLM is weak" is useless; "Event 4624 Type 3 with `LmPackageName=NTLM V2` from an unexpected internal IP is the detection signature for PTH" is actionable.

---

## Pass-the-Hash (PTH)

**The cryptographic weakness**: NTLM authentication uses a challenge-response protocol where the client proves knowledge of the user's NTLM hash — not the plaintext password. The server sends a 16-byte challenge; the client encrypts it with the hash; the server verifies the response using its own copy of the hash. The server never sees the plaintext. The consequence: the hash alone is sufficient for authentication. The hash *is* the credential [S011](../../research/security-foundations/01-sources/web/S011-windows-event-4624.md).

**The attack chain**:
1. Attacker gains code execution on any domain-joined host with local admin or SYSTEM privileges
2. Dumps NTLM hashes from LSASS memory: `sekurlsa::logonpasswords` in Mimikatz, or `procdump -ma lsass.exe` followed by offline parsing
3. Extracts the NTLM hash for a privileged account (Domain Admin, service account)
4. Uses the hash directly: `sekurlsa::pth /user:admin /ntlm:HASH /domain:corp.local`
5. Opens a CMD prompt running as that user's identity — no password cracking required
6. Authenticates laterally to any host on the network using NTLM

A Domain Admin's NTLM hash from a single compromised workstation gives full domain access immediately [S016](../../research/security-foundations/01-sources/web/S016-ad-security-best-practices.md).

**Event 4624 detection signature** (on the target host where lateral movement lands):
```
EventID: 4624
LogonType: 3 (network)
LmPackageName: NTLM V2           ← PTH uses NTLM; Kerberos expected on internal paths
IpAddress: [unexpected source]   ← workstation-to-workstation 4624 Type 3 NTLM is anomalous
LogonGuid: {00000000-...}        ← absent (all zeros) = NTLM, not Kerberos
```

Alert when `LogonType=3` + `LmPackageName=NTLM V2` originates from a non-server source on an internal segment where Kerberos authentication is expected [S011](../../research/security-foundations/01-sources/web/S011-windows-event-4624.md).

**Sysmon Event 10 detection signature** (the hash-dumping itself, before the lateral movement):
```
EventID: 10 (Process Access)
TargetImage: C:\Windows\System32\lsass.exe
SourceImage: [anything unexpected]
GrantedAccess: 0x1010 or 0x1410    ← PROCESS_VM_READ access
```

Build an exclusion list of legitimate callers (Windows Defender, AV, EDR agent, Task Manager). Alert on everything else that opens LSASS with memory-read access. This is the canonical Sysmon Event 10 use case [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md).

---

## Kerberoasting

**The cryptographic weakness**: Kerberos service tickets are encrypted with the service account's password hash. Encryption type `0x17` is RC4-HMAC — the same cipher used by NTLM — which is fast to compute and therefore fast to brute-force offline. Any authenticated domain user can request a service ticket for any service principal name (SPN). The service never needs to be contacted for the ticket request to succeed [S023](../../research/security-foundations/01-sources/web/S023-windows-security-events.md).

**The attack chain**:
1. Attacker has any domain user account — no admin required
2. Enumerates all service accounts with SPNs: `setspn -T corp.local -Q */*`
3. Requests a TGS for each service account using the standard Kerberos API
4. Each TGS is encrypted with the service account's password hash in RC4
5. Extracts the tickets: `Invoke-Kerberoast` or `Rubeus kerberoast`
6. Takes the extracted hashes offline: cracks with Hashcat at millions of attempts per second

Unlike PTH, Kerberoasting requires no privilege escalation. A standard domain user account is sufficient [S016](../../research/security-foundations/01-sources/web/S016-ad-security-best-practices.md).

**AD Event 4769 detection signature** (on the domain controller):
```
EventID: 4769 (Kerberos Service Ticket Requested)
TicketEncryptionType: 0x17       ← RC4; hardened environments should show 0x12 (AES-256)
ServiceName: [service account]
ClientAddress: [requesting host]
```

A burst of 4769 events with `TicketEncryptionType=0x17` for multiple different service account names from a single source IP within a short window is a Kerberoasting sweep. A single isolated entry with `0x17` may be legacy compatibility. Set the threshold based on baseline behavior in your environment [S023](../../research/security-foundations/01-sources/web/S023-windows-security-events.md).

---

## DCSync: pulling all hashes without touching LSASS

**The mechanism**: Domain Controllers use the Directory Replication Service (DRS) protocol to replicate the AD database. The permissions `DS-Replication-Get-Changes` and `DS-Replication-Get-Changes-All` allow a principal to initiate replication. An attacker with these permissions can use Mimikatz `lsadump::dcsync` to impersonate a DC and pull password hashes for any account — including `krbtgt` for Golden Ticket attacks — without touching LSASS on any host [S016](../../research/security-foundations/01-sources/web/S016-ad-security-best-practices.md).

**AD Event 4662 detection signature** (on the domain controller):
```
EventID: 4662 (An operation was performed on an object)
Object Type: domainDNS
AccessMask: 0x100 (DS-Replication-Get-Changes-All)
SubjectUserName: [not a DC computer account]   ← DCs do this legitimately; humans don't
```

Alert on any non-DC account generating Event 4662 with `GetChangesAll` access on the `domainDNS` object. Legitimate replication only comes from DC computer accounts [S023](../../research/security-foundations/01-sources/web/S023-windows-security-events.md).

---

## RC4 mitigation and the configuration caveat

Remove RC4 from permitted Kerberos encryption types. In Active Directory Group Policy, set `Network Security: Configure encryption types allowed for Kerberos` to AES-128 and AES-256 only. For individual service accounts, set `msDS-SupportedEncryptionTypes` to `0x18` (AES-256 only).

**Important caveat**: RC4 being available is not an inherent Kerberos property — it is an Active Directory configuration choice. Modern Kerberos implementations default to AES-256. The reason RC4 persists in most environments is legacy application compatibility, not protocol necessity. This means eliminating Kerberoasting is achievable without changing the authentication protocol [S016](../../research/security-foundations/01-sources/web/S016-ad-security-best-practices.md).

Second caveat: even with RC4 enabled, service accounts with passwords of 25+ random characters are effectively immune to offline Kerberoasting. At Hashcat speeds on consumer hardware, a 25-character random password with standard complexity would require decades to crack. Strong passwords are therefore a viable mitigating control when RC4 removal is not immediately feasible.

## Key points

- Pass-the-Hash exploits NTLM's design property: the hash is the credential; no plaintext needed. Detection: Event 4624 `LogonType=3` + `LmPackageName=NTLM V2` from unexpected internal source; Sysmon Event 10 on lsass.exe
- Kerberoasting exploits RC4 service ticket encryption being requestable by any domain user, offline-crackable with no rate limiting. Detection: Event 4769 + `TicketEncryptionType=0x17` + burst pattern across multiple service names from single source
- DCSync exploits legitimate AD replication permissions to extract all password hashes. Detection: Event 4662 on domainDNS object from non-DC accounts
- RC4 availability is a configuration choice, not a Kerberos protocol property; and strong 25+ character service account passwords defeat offline cracking even when RC4 is negotiated

## Go deeper

- [S011 — Windows Event 4624](../../research/security-foundations/01-sources/web/S011-windows-event-4624.md) — LmPackageName field, LogonGuid absence as NTLM indicator
- [S016 — AD Security Best Practices](../../research/security-foundations/01-sources/web/S016-ad-security-best-practices.md) — NTLM deprecation guidance, Kerberoasting mitigations, DCSync detection
- [S023 — Windows Security Events](../../research/security-foundations/01-sources/web/S023-windows-security-events.md) — Event 4769 TicketEncryptionType field reference; Event 4662 access mask reference

---

*← [Previous lesson](./L14-event-correlation.md)* · *[Next lesson →](./L16-layered-controls.md)*

---

## The core idea

Windows Active Directory environments inherit decades of authentication protocol decisions. Two of those decisions — NTLM hash reuse and RC4 encryption for Kerberos service tickets — are the basis for the two most commonly observed post-exploitation techniques in real intrusions: Pass-the-Hash and Kerberoasting.

Understanding these attacks means understanding exactly which cryptographic weakness each exploits and exactly which event to monitor for detection. The specificity matters for CTFs and for building real detections.

---

## Pass-the-Hash (PTH)

**The cryptographic weakness**: NTLM authentication uses the password hash to create a challenge/response. The server never verifies that the client knows the plaintext password — it only verifies that the client can produce a correct response using the hash. The hash *is* the credential.

**The attack chain**:
1. Attacker gains access to a target host
2. Dumps NTLM hashes from LSASS memory (Mimikatz `sekurlsa::logonpasswords`, or LSASS procdump + offline parsing)
3. Uses the hash directly in a new authentication request — no password knowledge required
4. Authenticates as that user to any host on the network that accepts NTLM

A Domain Admin's NTLM hash from LSASS on workstation A gives full domain access — no password cracking required. (S011, S016)

**Event 4624 detection signature**:
```
LogonType: 3 (network)
LmPackageName: NTLM V2           ← PTH uses NTLM, not Kerberos
IpAddress: [unexpected source]   ← alert on unusual internal source IPs
```

**Sysmon Event 10 detection signature** (the hash-dumping itself):
```
TargetImage: C:\Windows\System32\lsass.exe
SourceImage: [anything unexpected]  ← Mimikatz, procdump, etc.
GrantedAccess: 0x1010 or 0x1410    ← memory read access to LSASS
```

Filter out legitimate callers (AV software, Windows Defender, SENSE) and alert on everything else accessing LSASS memory. (S015)

---

## Kerberoasting

**The cryptographic weakness**: Kerberos service tickets are encrypted with the service account's password hash. For legacy compatibility, many Active Directory environments still permit RC4 (NTLM cipher, type 0x17) as an allowed encryption type. NIST SP 800-52r2 explicitly prohibits RC4 cipher suites in modern deployments. (S017)

**The attack chain**:
1. Attacker has any domain user account (foot in the door)
2. Requests a Kerberos service ticket (TGS) for a service whose account uses RC4
3. Receives a ticket encrypted with the service account's RC4 hash
4. Takes the encrypted ticket offline; brute-forces it with Hashcat
5. Cracks the service account password — particularly effective against accounts with weak or non-rotating passwords

Unlike PTH, Kerberoasting does not require admin access. Any authenticated domain user can request service tickets.

**AD Event 4769 detection signature (on the domain controller)**:
```
Event 4769 (Kerberos Service Ticket Requested)
TicketEncryptionType: 0x17   ← RC4 — should be 0x12 (AES-256) in hardened environments
ServiceName: [service account name]
ClientAddress: [requesting host]
```

A burst of Event 4769 entries with `TicketEncryptionType=0x17` for multiple service accounts from a single source IP is a Kerberoasting sweep. A single entry may be legitimate legacy compatibility. (S011, S016, S023)

---

## DCSync: stealing Active Directory secrets without touching LSASS

**The mechanism**: Domain Controllers replicate the AD database between each other using the Directory Replication Service (DRS) protocol. Specific AD permissions (`DS-Replication-Get-Changes-All`) allow directory replication.

Attackers who have obtained Domain Admin privileges (or have been granted these specific permissions) can use Mimikatz `lsadump::dcsync` to impersonate a domain controller and pull password hashes for any account — including the `krbtgt` account required for Golden Ticket attacks — without ever linking to LSASS directly.

**AD Event 4662 detection signature**:
```
Event 4662 (An operation was performed on an object)
Object Type: domainDNS
AccessMask: 0x100 (DS-Replication-Get-Changes)
AccountName: [not a DC computer account]  ← key: DCs do this legitimately; regular users/workstations don't
```

Monitor for Event 4662 from non-DC accounts on the `domainDNS` object. This fires for DCSync regardless of the requesting IP address. (S016, S023)

---

## The RC4 mitigation

The prevention for Kerberoasting is straightforward: remove RC4 from allowed Kerberos encryption types. In AD, set `msDS-SupportedEncryptionTypes` = AES-256 only (0x18) for all service accounts. Accounts with strong, rotating passwords resist offline cracking even if RC4 is still negotiated. Note that removing RC4 may break legacy applications — pre-Windows Vista clients do not support AES Kerberos. (S017)

## Key points

- Pass-the-Hash exploits NTLM's design: the hash is the credential. Detection: Event 4624 Type 3 + LmPackageName=NTLM V2 from unexpected source; Sysmon Event 10 on lsass.exe
- Kerberoasting requests RC4-encrypted service tickets for offline cracking. Detection: Event 4769 + TicketEncryptionType=0x17 + burst pattern across multiple service names
- DCSync impersonates a DC to pull all password hashes. Detection: Event 4662 on domainDNS object from non-DC accounts

## Go deeper

- [S011 — Windows Event 4624](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4624) — LmPackageName field and NTLM detection
- [S016 — AD Security Best Practices](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/best-practices-for-securing-active-directory) — NTLM deprecation, Kerberoasting mitigations, DCSync detection
- [S023 — Windows Security Events](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/security-auditing-overview) — Event 4769 TicketEncryptionType field reference

---

*← [Previous: Correlating Events](./L14-event-correlation.md)* · *[Next: Layered Controls and the Bypass-Always Pattern](./L16-layered-controls.md) →*
