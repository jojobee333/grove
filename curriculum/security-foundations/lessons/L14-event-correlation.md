# Correlating Events to Detect Lateral Movement

**Module**: M07 · Windows Telemetry — Seeing the Full Picture
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C10 from Strata synthesis

---

## The situation

An attacker is moving laterally through your network. They authenticated with stolen credentials (Event 4624), ran a command on a remote host (Sysmon Event 1), connected to a C2 server (Sysmon Event 3), and issued a Kerberos service ticket (AD Event 4769). Each event appears in a different log on a different host. You need to connect them into a single timeline that tells a coherent story. This lesson shows exactly how.

---

## The correlation chain: four sources, one story

**Step 1 — Sysmon Event 1 on the source host (process launched)**:

```
EventID: 1 (Process Create)
Image: C:\Windows\Temp\psexec64.exe
CommandLine: psexec64.exe \\192.168.1.50 cmd.exe
ProcessGUID: {AAAA-0001-...}
ParentImage: C:\Windows\System32\cmd.exe
Hashes: SHA256=abc123...
```

The `ProcessGUID` is the stable identifier. Every subsequent Sysmon event from this process carries the same GUID [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md).

**Step 2 — Sysmon Event 3 on the same host (network connection)**:

```
EventID: 3 (Network Connection)
Image: C:\Windows\Temp\psexec64.exe
ProcessGUID: {AAAA-0001-...}    ← same as Event 1
DestinationIp: 192.168.1.50
DestinationPort: 445
Initiated: true
```

ProcessGUID links this connection definitively to the process from Event 1. The destination is the lateral movement target.

**Step 3 — Event 4624 on the TARGET host (192.168.1.50)**:

```
EventID: 4624 (Logon)
LogonType: 3 (network)
SubjectUserName: CORP\admin
LmPackageName: NTLM V2          ← lateral movement signal; Kerberos expected here
IpAddress: 192.168.1.20          ← matches Sysmon Event 3 DestinationIp (source)
TargetLogonId: 0x3F0A1
```

The `IpAddress` in Event 4624 on the target matches `DestinationIp` in Sysmon Event 3 on the source — confirming the same lateral movement event. The `TargetLogonId` identifies all subsequent events in this session on the target host [S011](../../research/security-foundations/01-sources/web/S011-windows-event-4624.md).

**Step 4 — AD Event 4769 on the domain controller (Kerberos ticket)**:

```
EventID: 4769 (Kerberos Service Ticket Requested)
ServiceName: cifs/192.168.1.50
TicketEncryptionType: 0x17       ← RC4 (NTLM cipher) — AES-256 (0x12) expected
ClientAddress: 192.168.1.20
```

RC4 encryption type (`0x17`) for an internal CIFS ticket is a Kerberoasting-environment signal. If the environment is properly configured for AES Kerberos, seeing `0x17` here is anomalous and indicates either a legacy account configuration or an active Kerberoasting request [S016](../../research/security-foundations/01-sources/web/S016-ad-security-best-practices.md).

---

## The Windows Registry: seven security-critical paths

Sysmon Events 12 and 13 should monitor these registry paths. Each represents an attacker-usable persistence or configuration manipulation surface [S022](../../research/security-foundations/01-sources/web/S022-windows-registry.md):

| Registry path | Attacker purpose |
|---|---|
| `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` | Boot persistence, all users; requires admin |
| `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` | Boot persistence, current user; no admin required |
| `HKLM\SYSTEM\CurrentControlSet\Services` | Service installation at SYSTEM-level persistence |
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon` | Userinit/Shell hijacking; runs on every logon |
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options` | Debugger hijacking; attacker's binary executes instead of the legitimate target |
| `HKLM\SYSTEM\CurrentControlSet\Control\LSA` | Kerberos encryption type setting; also LSA protection flags |
| `HKCU\Environment\UserInitMprLogonScript` | Logon script execution without admin |

Sysmon Event 13 (value set) on any of these paths during non-maintenance windows should trigger an alert. Most persistence techniques write new values rather than creating new keys, so Event 13 is the higher-priority signal of the two [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md).

---

## SIEM detection rule for lateral movement

A detection rule in pseudocode that connects the four-source chain:

```
ALERT: Lateral Movement — NTLM Type 3 + Preceding PsExec Pattern

Trigger:
  Event 4624 on HOST_B
    LogonType = 3
    LmPackageName = "NTLM V2"
    IpAddress = HOST_A_IP

Corroboration (within 120 seconds before trigger):
  Sysmon Event 1 on HOST_A
    Image MATCHES *psexec* OR *wmiexec* OR *smbexec*
    ProcessGUID = X
  Sysmon Event 3 on HOST_A
    ProcessGUID = X
    DestinationIp = HOST_B_IP
    DestinationPort = 445

Action: Create incident; link all four events; assign to Tier 2
```

The key design principle: never rely on a single event as the trigger. Each event in isolation may be legitimate. The combination of process launch + SMB connection + NTLM network logon on the target is the pattern.

## Limitations

Registry ACLs restrict write access to most HKLM paths — an attacker without admin privileges cannot write to `HKLM\...\Run` or Services. However, `HKCU\...\Run` is writable by any user without elevation. This means user-level persistence via HKCU is accessible to a non-admin compromised user, while HKLM persistence requires privilege escalation first. Factor this into alert severity: HKCU Run key writes are lower-privilege; HKLM writes imply prior admin access [S022](../../research/security-foundations/01-sources/web/S022-windows-registry.md).

## Key points

- ProcessGUID is Sysmon's correlation key: it links Event 1 (process creation) to Event 3 (network connection), enabling "this process made this connection to this destination"
- `TargetLogonId` in Event 4624 identifies the session context for all subsequent events on the target host in that session
- NTLM lateral movement is identifiable by Event 4624 Type 3 + `LmPackageName=NTLM V2` from an unexpected source IP; expected behavior on a Kerberos-configured network is `LmPackageName=Kerberos`
- HKCU Run key writes require no admin privileges; treat them differently from HKLM writes in alert triage

## Go deeper

- [S015 — Sysmon v15](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md) — ProcessGUID and SessionGUID correlation model; Events 1, 3, 10, 12, 13 field reference
- [S022 — Windows Registry](../../research/security-foundations/01-sources/web/S022-windows-registry.md) — Registry hive structure, HKCU vs HKLM ACL differences, security-critical paths
- [S011 — Windows Event 4624](../../research/security-foundations/01-sources/web/S011-windows-event-4624.md) — TargetLogonId for session-level event correlation across log sources

---

*← [Previous lesson](./L13-windows-telemetry.md)* · *[Next lesson →](./L15-ntlm-kerberoasting.md)*
