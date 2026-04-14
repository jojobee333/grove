# NTLM, Pass-the-Hash, and Kerberoasting

**Module**: M08 · Authentication Weaknesses — NTLM to Kerberoasting
**Type**: core
**Estimated time**: 15 minutes
**Claim**: C9 — NTLM/RC4 are the cryptographic weak links enabling Pass-the-Hash and Kerberoasting

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

- [S011 — Windows Event 4624](../../../../../vault/research/security-foundations/01-sources/web/S011-windows-event-4624.md) — LmPackageName field and NTLM detection
- [S016 — AD Security Best Practices](../../../../../vault/research/security-foundations/01-sources/web/S016-ad-security-best-practices.md) — NTLM deprecation, Kerberoasting mitigations, DCSync detection
- [S023 — Windows Security Events](../../../../../vault/research/security-foundations/01-sources/web/S023-windows-security-events.md) — Event 4769 TicketEncryptionType field reference

---

*← [Previous: Correlating Events](./L14-event-correlation.md)* · *[Next: Layered Controls and the Bypass-Always Pattern](./L16-layered-controls.md) →*
