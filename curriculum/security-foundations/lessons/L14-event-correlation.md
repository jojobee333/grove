# Correlating Events to Detect Lateral Movement

**Module**: M07 · Windows Telemetry — Seeing the Full Picture
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C10 — The registry has seven security-critical areas; combined with telemetry correlation, it enables full lateral movement detection

---

## The situation

An attacker is moving laterally through your network. They authenticated with stolen credentials (Event 4624), ran a command on a remote host (Sysmon Event 1), connected to a C2 server (Sysmon Event 3), and issued a Kerberos service ticket (AD Event 4769). Each event appears in a different log on a different host. You need to connect them.

---

## The correlation chain: four sources, one story

**Step 1 — Sysmon Event 1 (process PsExec launched)**:
```
Image: C:\Windows\Temp\psexec64.exe
CommandLine: psexec64.exe \\192.168.1.50 -u CORP\admin cmd.exe
ProcessGUID: {AAAAAAAA-0001-...}
ParentImage: cmd.exe
SHA256: [known PsExec hash or suspicious hash]
```

**Step 2 — Sysmon Event 3 (network connection from PsExec)**:
```
Image: [same psexec64.exe]
ProcessGUID: {AAAAAAAA-0001-...}   ← matches Event 1 ProcessGUID
DestinationIp: 192.168.1.50
DestinationPort: 445
```

**Step 3 — Event 4624 on the TARGET host (192.168.1.50)**:
```
LogonType: 3 (network)
SubjectUserName: CORP\admin
LmPackageName: NTLM V2           ← NTLM lateral movement signature
IpAddress: 192.168.1.20           ← source matches the PsExec host
TargetLogonId: 0x3F0A1
```

**Step 4 — AD Event 4769 (Kerberos ticket, or Event 4624 NTLM if no Kerberos)**:
```
ServiceName: cifs/192.168.1.50   ← SMB access to target
TicketEncryptionType: 0x17       ← RC4 (not AES) — NTLM-adjacent environment
ClientAddress: 192.168.1.20
```

The ProcessGUID from Sysmon steps 1 and 2 chains process to network. The source IP from Sysmon Event 3 matches the IpAddress in Event 4624 on the target. The TargetLogonId from Event 4624 can be used to find all Sysmon events occurring in that session context. This is the four-source kill chain. (S011, S015, S016)

---

## Windows registry: seven security-critical areas

The registry is a persistence and configuration store. Sysmon Events 12/13 should monitor these paths specifically (S022, S015):

| Registry path | Attacker purpose |
|---|---|
| `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` | Boot persistence (all users) |
| `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` | Boot persistence (this user) |
| `HKLM\SYSTEM\CurrentControlSet\Services` | Service installation (SYSTEM-level persistence) |
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon` | Hijack Winlogon (e.g., modifying Userinit) |
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options` | Debugger hijacking — attacker sets Debugger value for a legit process binary |
| `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders` | Shell folder redirection for persistence |
| `HKCU\Environment\UserInitMprLogonScript` | Logon script execution without admin |

Any modification to these paths during non-maintenance windows should trigger investigation.

---

## Example detection rule (pseudocode for SIEM)

```
Alert: Lateral Movement via PsExec Pattern
Condition:
  Sysmon Event 1 (process created)
    AND SHA256 matches known PsExec hash
    OR commandline contains "\\\\[IP address]"  
  WITHIN 60 seconds of:
  Sysmon Event 3 from same ProcessGUID
    AND DestinationPort = 445
  CORRELATED WITH:
  Event 4624 Type 3 on DestinationIp
    AND LmPackageName = "NTLM V2"
```

## Key points

- ProcessGUID is Sysmon's correlation key: it links Event 1 (process) to Event 3 (network), enabling "this process made this connection"
- NTLM lateral movement is identifiable by Event 4624 Type 3 + LmPackageName=NTLM — normal Kerberos environments should see minimal NTLM on internal lateral paths
- The seven registy areas in this lesson are the Sysmon Event 12/13 include targets; any write outside maintenance windows is investigation-worthy

## Go deeper

- [S015 — Sysmon v15](../../../../../vault/research/security-foundations/01-sources/web/S015-sysmon-v15.md) — ProcessGUID and SessionGUID correlation model
- [S022 — Windows Registry](../../../../../vault/research/security-foundations/01-sources/web/S022-windows-registry.md) — Registry hive structure and security-critical paths
- [S011 — Windows Event 4624](../../../../../vault/research/security-foundations/01-sources/web/S011-windows-event-4624.md) — TargetLogonId for session-level event correlation

---

*← [Previous: Windows Event Sources](./L13-windows-telemetry.md)* · *[Next: NTLM, Pass-the-Hash, and Kerberoasting](./L15-ntlm-kerberoasting.md) →*
