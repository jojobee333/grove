# Windows Event Sources: What Each Log Provides

**Module**: M07 · Windows Telemetry — Seeing the Full Picture
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C7 — Multi-source Windows telemetry is required; no single source provides complete visibility

---

## The core idea

A single Windows log source provides only a partial view of attacker activity. Event 4624 tells you a user authenticated — but not what they ran after. Sysmon tells you a process launched and connected to a remote host — but not who was authenticated when it happened. AD domain controller events tell you when a Kerberos ticket was issued — but not what the client did with it.

Effective Windows detection requires understanding the coverage boundary of each source and knowing which source fills which gap. This is the architecture.

## Why it matters

Attacker tools that evade endpoint detection typically do so by living in one log source's blind spot. Cobalt Strike's `execute-assembly` runs .NET code in memory and won't appear as a new process in Event 4688 — but Sysmon Event 10 (LSASS access) fires when it dumps credentials. Understanding which events fire for which actions means you can design detections that don't have blind spots.

---

## Source 1: Windows Security Event Log (Event 4624 — Logon)

**What it provides**: WHO authenticated, to WHAT host, using WHAT protocol, from WHERE, and HOW.

Key fields to examine in Event 4624:
- **LogonType**: 2 = interactive (local keyboard), 3 = network (SMB, WMI, etc.), 10 = RemoteInteractive (RDP), 5 = service
- **LmPackageName**: `NTLM V1`, `NTLM V2`, `Kerberos`, or `Negotiate`. NTLM V1 is crackable; presence is a finding
- **IpAddress**: source IP of the authentication. `127.0.0.1` = local; `::1` = IPv6 local; anything else is remote
- **TargetLogonId**: session identifier for correlating this logon to subsequent Sysmon events

**What it does NOT provide**: what programs ran after logon, what network connections were made, what files were accessed. (S011)

---

## Source 2: Sysmon

**What it provides**: WHAT ran, WHAT connected, WHAT was loaded, WHAT accessed LSASS.

Critical Sysmon events:
- **Event 1 (Process Create)**: image path, commandline, parent process, MD5/SHA256 hash, ProcessGUID. This is the primary process creation record — more detailed than Event 4688 from the Security log because it includes the hash.
- **Event 3 (Network Connection)**: source/destination IP, port, protocol — linked to the initiating process via ProcessGUID
- **Event 10 (Process Access)**: fires when one process opens the memory of another. `TargetImage: lsass.exe` = credential dumping attempt (Mimikatz, LSASS procdump)
- **Event 22 (DNS Query)**: which process made which DNS lookup — essential for C2 detection as noted in L04

**What it does NOT provide**: who was authenticated (that's Event 4624), what Kerberos tickets were issued (that's AD events). (S015)

---

## Source 3: Active Directory Domain Controller Events

**What it provides**: DC-level authentication and replication events invisible to endpoint logs.

- **Event 4769 (Kerberos Service Ticket Requested)**: includes `TicketEncryptionType` — value `0x17` indicates RC4, which is the Kerberoasting target
- **Event 4768 (Kerberos Authentication Ticket Requested)**: initial TGT issuance — maps a username to a TGT
- **Event 4662 (Object accessed in AD)**: fires when a user accesses directory objects with extended rights — DCSync uses `GetChangesAll` on the DomainDNS object; this is detectable here
- **Event 4698 (Scheduled task created)**: domain-wide task creation audit — GPO-deployed persistence

**What it does NOT provide**: what the client did with the ticket after receipt. (S016, S023)

---

## The coverage gap matrix

| Question | Event 4624 | Sysmon | AD Events |
|---|---|---|---|
| Who authenticated? | ✅ | ❌ | ✅ (partial) |
| What process ran? | ❌ | ✅ | ❌ |
| What connected where? | ❌ | ✅ (Event 3) | ❌ |
| What DNS query? | ❌ | ✅ (Event 22) | ❌ |
| What Kerberos ticket type? | ❌ | ❌ | ✅ (Event 4769) |
| Was LSASS accessed? | ❌ | ✅ (Event 10) | ❌ |
| DCSync request? | ❌ | ❌ | ✅ (Event 4662) |

## Key points

- Event 4624: WHO authenticated and WHAT protocol; check `LmPackageName` for NTLM vs Kerberos
- Sysmon: WHAT ran and WHAT connected; Event 10 catches credential dumping; Event 22 catches DNS-based C2
- AD events: Kerberos ticket type (Event 4769), DCSync (Event 4662), task creation (Event 4698) — none of these appear in the endpoint Security log

## Go deeper

- [S011 — Windows Event 4624](../../../../../vault/research/security-foundations/01-sources/web/S011-windows-event-4624.md) — Full field reference for logon events
- [S015 — Sysmon v15](../../../../../vault/research/security-foundations/01-sources/web/S015-sysmon-v15.md) — All event types and configuration reference
- [S023 — Windows Security Events](../../../../../vault/research/security-foundations/01-sources/web/S023-windows-security-events.md) — Events 4625/4688/4698/4768/4769 reference

---

*← [Previous: Detecting Persistence](./L12-detecting-persistence.md)* · *[Next: Correlating Events to Detect Lateral Movement](./L14-event-correlation.md) →*
