# Least Privilege — The Foundational Control

**Module**: M10 · Layered Defense — From Controls to Detection  
**Type**: core  
**Estimated time**: 25 minutes  
**Claim**: C19 from Strata synthesis

---

## The core idea

**Least privilege** means every user, process, service, and system should have the minimum access required to perform its function — and nothing more. It is not a single configuration setting; it is a design principle applied at every layer of a system: operating systems, applications, databases, cloud environments, and network access.

The research (Claim C19) identifies least privilege as the foundational preventive control: when least privilege is properly implemented, the damage an attacker can do after compromising a single account or service is bounded. When it is not implemented, a single compromised credential leads to full network compromise.

**The principle stated precisely**: Principal P should be granted privilege Q only if P requires Q to perform its authorized function, only for the duration that Q is needed, and at the narrowest scope where Q can satisfy the requirement.

## Why it matters

Look back at the attack techniques in the last five modules:
- **Pass-the-Hash** (L24): Works because the compromised account (often local admin or domain admin) has excessive privilege — LAPS limits blast radius by scoping privileges to one machine
- **Kerberoasting** (L24): Works because service accounts have domain-level privileges and weak passwords; gMSA + privilege scoping limits damage
- **Windows Persistence** (L26): Malware installs services as SYSTEM because compromised accounts have admin privileges; standard user accounts cannot install services
- **NTLM relay** (L22 extended): Effective because relayed credentials have wide access; least privilege scoping limits what the relay can reach

Least privilege does not prevent initial compromise. It limits what the attacker can do afterward.

## A concrete example

### Application: The Three Tiers of Least Privilege

**Tier 1 — User Account Privilege**

The most common violation: developers, IT staff, and power users running their daily workstation as local administrator. When they open a malicious email attachment, the malware inherits administrator privileges — it can install services, dump lsass, modify the Registry, and disable security tools.

**Implementation**:
- Standard user accounts for daily work (including IT staff's daily workstations)
- Separate admin accounts used only for administrative tasks, never for email/browsing
- Windows UAC (User Account Control) as a partial control — prompts before privilege elevation, but is not a substitute for separate accounts
- Linux `sudo` with specific command restrictions rather than unrestricted `sudo ALL`

```bash
# Least-privilege sudo: allow a specific command only
# /etc/sudoers entry
alice ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx
# Alice can restart nginx, nothing else via sudo
```

---

**Tier 2 — Service Account Privilege**

Services run under Windows accounts. Common violation: all services running as `LocalSystem` (equivalent to SYSTEM — the most privileged account, unrestricted access to everything on the machine).

**Implementation — Windows service accounts**:
- **Managed Service Accounts (MSA/gMSA)**: Auto-rotating passwords, scoped to a specific machine or group, no interactive logon — the attacker gets a hash that cannot be used for interactive auth
- **Network Service**: Can access network resources but is restricted locally
- **Virtual Accounts** (`NT SERVICE\ServiceName`): Each service gets an isolated virtual account with minimal permissions; cannot be used for lateral movement
- **Custom low-privilege accounts**: Service-specific domain accounts with explicit permission grants only to the resources they need

```powershell
# Configure a service to run as a gMSA
Set-Service -Name "MyService" -Credential (Get-Credential "CORP\svc_myservice$")

# Or in service registration
sc create MyService binpath= "C:\Services\myservice.exe" obj= "CORP\svc_myservice$"
```

---

**Tier 3 — Database and Application Privilege**

**Database**: Application database accounts commonly have DBA-level access (can read/write any table, drop tables, create users). The application only needs access to its own tables.

```sql
-- Least privilege database user for a web application
CREATE USER app_user WITH PASSWORD 'long-random-password';
-- Grant access only to the tables the app actually uses
GRANT SELECT, INSERT, UPDATE ON orders TO app_user;
GRANT SELECT ON products TO app_user;
-- No GRANT ALL, no SUPERUSER, no CREATE TABLE
```

**Filesystem**: Application processes should not have write access to their own executables (prevents in-place modification by malware). Write access should be scoped to designated data directories.

**Network**: The principle of least network privilege — firewalls and network access control should restrict which systems can communicate with which. A workstation should not be able to connect to the Domain Controller on port 445 (SMB). Lateral movement via NTLM relay relies on workstations being reachable from other workstations — segment the network.

---

### Privilege Escalation — What Happens Without Least Privilege

**Local privilege escalation**: An attacker with a standard user account exploits a vulnerability in a service running as SYSTEM or in a SUID binary (Linux) to gain elevated access. With least privilege applied, SYSTEM-privilege services are rare targets (most services run with minimal accounts), and SUID binaries are few and audited.

**Privilege escalation via misconfigured service permissions** (Windows):
```powershell
# Find services with weak permissions that allow non-admin users to modify them
# Attackers look for services where they can change the ImagePath
$services = Get-WmiObject -Class Win32_Service
foreach ($svc in $services) {
    $acl = Get-Acl "HKLM:\SYSTEM\CurrentControlSet\Services\$($svc.Name)"
    # Check for non-admin modify permissions
}
```

**Sudo abuse** (Linux):
```bash
# Common misconfiguration: user can run ANY command with sudo
alice ALL=(ALL) NOPASSWD: ALL  # Never do this

# Attacker exploits over-broad sudo
sudo less /etc/shadow           # Use less to read /etc/shadow, then !bash for shell
sudo find / -name shadow -exec bash \;  # find's -exec runs as root
```

---

### Implementing Least Privilege Systematically

**Discovery (what access exists now)**:
```powershell
# Windows: find accounts with excessive domain privileges
Get-ADGroupMember -Identity "Domain Admins" | Select-Object SamAccountName
Get-ADGroupMember -Identity "Enterprise Admins" | Select-Object SamAccountName

# Find local admin group members on a machine
Get-LocalGroupMember -Group "Administrators"

# Find services running as LocalSystem (over-privileged)
Get-WmiObject Win32_Service | Where-Object { $_.StartName -eq "LocalSystem" } |
  Select-Object Name, PathName
```

**Reduction (remove unneeded access)**:
The principle of least privilege requires active management — privileges accumulate over time without pruning:
- User accounts gain group memberships for one-off projects and never lose them
- Service accounts are added to Domain Admins "temporarily" and never removed
- Application databases get DBA grants "for testing" that persist in production

Regular access reviews (quarterly for privileged accounts, annually for standard accounts) are the operational process that maintains least privilege over time.

## Key points

- Least privilege limits blast radius: a compromised account can only damage what it has access to; proper implementation bounds the damage from any single compromise
- Three tiers: user account privilege (daily-use admin accounts are a critical risk), service account privilege (use gMSA or Virtual Accounts instead of LocalSystem), and database/application privilege (grant only needed table permissions, no DBA grants)
- Principle: minimum privilege, minimum scope, minimum duration — remove access when it is no longer needed
- Privilege escalation attacks target misconfigured service permissions, SUID binaries, and over-broad sudo rules — all directly caused by least privilege violations
- Practical discovery: enumerate Domain Admin/Enterprise Admin membership, find services running as LocalSystem, find sudo rules granting ALL
- Privileges accumulate over time; quarterly access reviews for privileged accounts are the operational maintenance required to sustain least privilege

## Go deeper

- [S019](../../../../vault/research/security-foundations/01-sources/) — Least privilege implementation patterns across OS, database, and network layers

---

*[← Previous: Sysmon — Deep Process and Network Telemetry](./L27-sysmon-detection.md)* · *[Next: Control Bypass — When Preventive Controls Fail →](./L29-control-bypass.md)*
