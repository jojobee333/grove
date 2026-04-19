# Pass-the-Hash and Kerberoasting — Exploiting Windows Authentication Weaknesses

**Module**: M08 · Windows Authentication — NTLM, Kerberos  
**Type**: applied  
**Estimated time**: 30 minutes  
**Claim**: C9 and C10 from Strata synthesis

---

## The situation

You have completed L22 (NTLM and Kerberos fundamentals) and L23 (Windows Registry). You now have the conceptual foundation to understand two of the most impactful Active Directory attack techniques: **Pass-the-Hash** (exploiting NTLM's hash-based authentication) and **Kerberoasting** (exploiting the fact that Kerberos service tickets are encrypted with service account passwords). Both are routinely found in red team assessments and real breach investigations.

This lesson applies the knowledge from L22 to concrete attacks — showing the derivation, the attacker workflow, the detection signals, and the defenses.

## The approach

Both attacks follow the same derivation pattern from M01: identify the design feature, identify the trust assumption, identify what an attacker does when that assumption is violated.

- **Pass-the-Hash**: NTLM authenticates using the NT hash, not the cleartext password → if you have the hash, you can authenticate without cracking it
- **Kerberoasting**: Kerberos service tickets are encrypted with the service account's password hash → any authenticated user can request a service ticket and attempt to crack the password offline

## A worked example

### Pass-the-Hash

**The design feature**: NTLM authentication (from L22) proves identity by encrypting a server challenge with the NT hash. The server verifies the response using the stored NT hash. The cleartext password is never transmitted or needed for authentication.

**The trust assumption**: The party that has the NT hash is the legitimate owner of that account.

**The attack**:

Step 1 — Hash extraction. An attacker with local admin privileges on a Windows host can extract NT hashes from memory using Mimikatz (a post-exploitation tool that reads the `lsass.exe` process):

```
mimikatz # privilege::debug
mimikatz # sekurlsa::logonpasswords
```

Output includes NT hashes for every account that has a cached logon session on the machine. This commonly includes:
- The local administrator account's hash
- The hash of any domain user who has logged in to this machine
- Often: a domain admin's hash, if a sysadmin has recently performed maintenance on this host

Step 2 — Hash usage. The attacker uses the NT hash directly with any tool that supports NTLM authentication without cleartext passwords:

```bash
# Using Impacket (Python toolkit for Windows network protocols)
# Access file shares using the hash
python3 smbclient.py corp.local/Administrator@dc01.corp.local -hashes :aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c

# Execute commands on remote host using the hash
python3 psexec.py corp.local/Administrator@dc01.corp.local -hashes :aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c
```

The format `LM_hash:NT_hash` — the LM hash part (`aad3b435b51404eeaad3b435b51404ee`) is the placeholder when LM hashes are disabled (which they should be).

**Why this is so impactful**: In many organizations, the local administrator account has the same password (and therefore the same NT hash) on every workstation — deployed via GPO or imaging. An attacker who extracts the hash from one machine can authenticate to every other machine as local administrator. This is lateral movement at scale.

**Detection signals**:
- Event ID 4624 (Successful Logon) with `LogonType = 3` (network logon) and `LmPackageName = NTLM V1/V2` from unexpected hosts
- A workstation-to-workstation authentication via NTLM (workstations should not be authenticating to each other's admin shares in normal operation)
- Microsoft Defender for Identity and similar tools specifically detect pass-the-hash patterns (hash used from a different host than the one where it was captured)

**Defenses**:
- **LAPS (Local Administrator Password Solution)**: Generates unique, random passwords for local administrator accounts on each machine — if the hash is stolen from one machine, it works only on that machine
- **Protected Users security group**: Prevents domain accounts in this group from caching NTLM credentials or using NTLM authentication at all — forces Kerberos
- **Credential Guard**: Uses virtualization-based security to protect credential memory from tools like Mimikatz
- **Disable local admin account**: Replace with managed service accounts where possible

---

### Kerberoasting

**The design feature**: Kerberos service tickets (from L22 Step 4) are encrypted with the service account's password hash. Any authenticated domain user can request a service ticket for any SPN.

**The trust assumption**: Decrypting the service ticket is computationally infeasible without the service account's password.

**The attack**: This assumption holds for strong passwords — but many service accounts in real environments have weak, old passwords (set years ago by an administrator who never changed them, not subject to password complexity policies, not in rotation).

Step 1 — SPN enumeration. Find all accounts with SPNs registered:

```powershell
# Find all accounts with SPNs in Active Directory
Get-ADUser -Filter {ServicePrincipalName -ne "$null"} -Properties ServicePrincipalName |
  Select-Object SamAccountName, ServicePrincipalName

# Or using Rubeus (modern C# Kerberos toolkit)
Rubeus.exe kerberoast /nowrap
```

Step 2 — Request service tickets for all SPNs. Any authenticated domain user can do this:

```powershell
# Using PowerShell
Add-Type -AssemblyName System.IdentityModel
$Ticket = New-Object System.IdentityModel.Tokens.KerberosRequestorSecurityToken -ArgumentList "MSSQLSvc/sqlserver.corp.local:1433"

# Using Rubeus (requests all available service tickets in Hashcat format)
Rubeus.exe kerberoast /format:hashcat /outfile:hashes.txt
```

Step 3 — Offline password cracking. The service ticket hash is in a format Hashcat or John the Ripper can crack:

```bash
# Crack TGS hashes with Hashcat (mode 13100 = Kerberos 5 TGS-REP etype 23/RC4)
hashcat -m 13100 hashes.txt wordlist.txt --rules-file rules/best64.rule

# If the service account has a weak password like "Summer2023!", this cracks in seconds
```

**Why this works**: Service accounts often:
- Have passwords set once and never rotated (sometimes for years)
- Are not subject to the same password policies as interactive user accounts
- Have descriptive names that hint at their password (`svc_sql_backup`, `SQLServiceAccount`)
- Were set up by developers or DBAs without security involvement

**Detection signals** (from L22):
- Event ID 4769 with `TicketEncryptionType = 0x17` (RC4-HMAC) for multiple service accounts from the same source host in a short time
- Modern tools request RC4-encrypted tickets specifically because RC4 is faster to crack than AES256; if your environment enforces AES256, the attacker must request AES tickets (still crackable, but slower)
- Rubeus and similar tools generate a burst of 4769 events for many different SPNs in seconds — normal behavior generates far fewer

**Defenses**:
- **Managed Service Accounts (gMSA)**: Active Directory automatically manages the password for gMSA accounts — 240-character random password, rotated every 30 days. An attacker who requests a service ticket for a gMSA gets an uncrackable hash. This is the definitive fix.
- **Long, random passwords for service accounts** (≥25 characters) if gMSA is not possible — makes cracking infeasible in any reasonable timeframe
- **AES-only Kerberos**: Force services to register only AES encryption types, not RC4 — makes cracking slower and reduces the attacker's tool options
- **Kerberoasting honeypots**: Register a fake SPN with an obvious name (`svc_honeypot`) attached to an account that is monitored — if anyone requests a ticket for it, alert immediately

---

### AS-REP Roasting (Related Attack — Brief Coverage)

A variant of Kerberoasting that targets accounts with **Kerberos pre-authentication disabled**. Normally, when a user requests a TGT (Step 1 in L22), the request includes a timestamp encrypted with the user's password hash — this proves the user knows the password before the KDC issues a TGT.

If pre-authentication is disabled for an account (the AD attribute `DONT_REQ_PREAUTH` is set), the KDC will issue a TGT for that account to anyone who asks — without verifying the requester knows the password. The AS-REP (the KDC's response) contains data encrypted with the user's password hash. The attacker requests AS-REPs for accounts with pre-auth disabled and cracks the hash offline.

Detection: Event ID 4768 (TGT request) for accounts that normally do not request TGTs from unexpected sources.
Prevention: Never disable Kerberos pre-authentication. Find accounts with the attribute set: `Get-ADUser -Filter {DoesNotRequirePreAuth -eq $True}`.

## Key points

- Pass-the-Hash: NT hash captured from lsass memory (via Mimikatz) is usable directly for NTLM authentication without knowing the cleartext password; LAPS assigns unique local admin passwords per machine to limit blast radius; Credential Guard protects lsass from Mimikatz-style access
- Kerberoasting: any domain user can request service tickets encrypted with the service account's password hash; weak service account passwords are crackable offline with Hashcat; gMSA accounts have auto-rotated 240-char passwords that are effectively uncrackable
- Detection: Event 4624 + NTLM V2 from unexpected hosts = potential pass-the-hash; Event 4769 + TicketEncryptionType 0x17 from one host = potential Kerberoasting
- AS-REP Roasting targets accounts with pre-authentication disabled; the AS-REP response contains hash-encrypted data crackable offline; never disable Kerberos pre-authentication
- Both attacks are derived from authentication protocol design features (hash-based NTLM responses; service ticket encryption with service account hash) — not implementation bugs

## Go deeper

- [S009](../../../../vault/research/security-foundations/01-sources/) — Pass-the-Hash mechanics and LAPS defense, Kerberoasting attack and gMSA defense
- [S010](../../../../vault/research/security-foundations/01-sources/) — Windows Event IDs for detecting authentication attacks

---

*[← Previous: Windows Registry](./L23-windows-registry.md)* · *[Next: Windows Event Logs — The Multi-Source Telemetry Picture →](./L25-windows-event-logs.md)*
