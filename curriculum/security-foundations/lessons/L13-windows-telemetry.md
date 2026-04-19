# Windows Event Sources: What Each Log Provides

**Module**: M07 · Windows Telemetry — Seeing the Full Picture
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C7 from Strata synthesis

---

## The core idea

No single Windows log source provides complete visibility into attacker activity. Event 4624 tells you that a user authenticated — but not what they ran afterward. Sysmon Event 1 tells you a process launched and Event 3 tells you it connected to a remote host — but neither tells you which authenticated session was active at the time. Active Directory domain controller events tell you a Kerberos ticket was issued and what encryption type it used — but not what the recipient did with it.

Effective detection requires three sources operating simultaneously, each covering what the others cannot see. Claim C7 from Strata synthesis: Windows security telemetry requires correlated multi-source collection; no single source provides complete visibility. Every attacker technique that evades detection exploits a blind spot in a single-source collection strategy [S011](../../research/security-foundations/01-sources/web/S011-windows-event-4624.md) [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md) [S016](../../research/security-foundations/01-sources/web/S016-ad-security-best-practices.md) [S023](../../research/security-foundations/01-sources/web/S023-windows-security-events.md).

## Why it matters

Cobalt Strike's `execute-assembly` runs .NET code inside an existing process's memory without spawning a new process. Event 4688 (process creation in the Security log) does not fire. But Sysmon Event 10 fires when the injected code accesses LSASS for credential dumping. Understanding which events fire for which actions lets you build detections with no blind spots rather than hoping a single source catches everything.

For penetration testing reports: "no detectable activity" is a meaningful claim only if you have verified which log sources were active and what their coverage gaps are. Absence of evidence in one log is not absence of evidence.

---

## Source 1: Windows Security Event Log — Event 4624

**What it provides**: WHO authenticated, to WHAT host, using WHAT protocol, from WHERE, in WHAT session.

Key fields in Event 4624 [S011](../../research/security-foundations/01-sources/web/S011-windows-event-4624.md):

| Field | Security significance |
|---|---|
| `LogonType` | 2=interactive (keyboard), 3=network (SMB/WMI), 10=RemoteInteractive (RDP), 5=service |
| `LmPackageName` | `NTLM V1`, `NTLM V2`, `Kerberos`. NTLM on internal lateral movement paths = Pass-the-Hash signal |
| `IpAddress` | Source IP of the authentication. `127.0.0.1` = local; unexpected internal IP = lateral movement |
| `TargetLogonId` | Session handle; correlates this logon to all subsequent events in the same session |
| `LogonGuid` | Present only for Kerberos; absent = NTLM was used |

**What it does NOT provide**: what processes ran after logon, what network connections were made, what files were accessed, what registry was modified. Coverage boundary: authentication events only.

Event 4624 requires the "Audit Logon" policy to be enabled. This is enabled by default on Windows Server but must be explicitly verified [S023](../../research/security-foundations/01-sources/web/S023-windows-security-events.md).

---

## Source 2: Sysmon

**What it provides**: WHAT ran, WHAT connected, WHAT was loaded, WHAT accessed LSASS, WHAT DNS query was made.

Sysmon is not a native Windows component — it requires explicit installation and configuration. But it provides coverage that the Security log cannot offer [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md):

| Event | Coverage |
|---|---|
| **Event 1 (Process Create)** | Image path, full commandline, parent process, MD5/SHA256 hash, ProcessGUID |
| **Event 3 (Network Connection)** | Source/dest IP, port, protocol; linked to the creating process via ProcessGUID |
| **Event 10 (Process Access)** | One process opening another's memory; `TargetImage: lsass.exe` = credential dumping |
| **Event 12/13 (Registry)** | Key creation/deletion (12) and value writes (13); targets persistence paths |
| **Event 19/20/21 (WMI)** | WMI filter, consumer, and binding creation; persistence and execution via WMI |
| **Event 22 (DNS Query)** | Process-level DNS query attribution; essential for C2 detection |

**The correlation key**: `ProcessGUID` — a stable identifier present in Events 1, 3, 10, 12, 13, and 22 for the same process across all Sysmon event types. This is what makes it possible to say "the same process that was created at time T is the one that connected to this IP and made these DNS queries."

**What it does NOT provide**: who was authenticated (that's Event 4624), what Kerberos tickets were issued (that's AD events).

---

## Source 3: Active Directory Domain Controller Events

**What it provides**: DC-level authentication and replication events that never appear in endpoint logs.

| Event | Coverage |
|---|---|
| **4769 (Kerberos Service Ticket)** | `TicketEncryptionType` field: `0x17`=RC4 (Kerberoasting target), `0x12`=AES-256 (secure) |
| **4768 (Kerberos TGT)** | Initial TGT issuance; maps a username to a session on a specific host |
| **4662 (Object accessed in AD)** | `GetChangesAll` on domainDNS object = DCSync request from non-DC account |
| **4698 (Scheduled task created)** | Domain-wide task creation; includes full task XML in `TaskContent` field |
| **4688 (Process created)** | Available but inferior to Sysmon Event 1 — lacks hash and ProcessGUID |

Events 4769 and 4768 require "Audit Kerberos Service Ticket Operations" and "Audit Kerberos Authentication Service" policies to be enabled on DCs. These are not enabled by default on all Windows Server versions [S023](../../research/security-foundations/01-sources/web/S023-windows-security-events.md).

**What it does NOT provide**: what the client did with the Kerberos ticket after receipt; process-level activity on endpoints.

---

## The coverage gap matrix

| Detection question | Event 4624 | Sysmon | AD Events |
|---|---|---|---|
| Who authenticated? | ✅ | ❌ | ✅ (partial) |
| What process ran? | ❌ | ✅ (Event 1) | ❌ |
| What network connection? | ❌ | ✅ (Event 3) | ❌ |
| What DNS query? | ❌ | ✅ (Event 22) | ❌ |
| What Kerberos ticket type? | ❌ | ❌ | ✅ (Event 4769) |
| Was LSASS accessed? | ❌ | ✅ (Event 10) | ❌ |
| DCSync request? | ❌ | ❌ | ✅ (Event 4662) |
| WMI persistence? | ❌ | ✅ (19/20/21) | ❌ |

## Limitations

Correlating all three sources requires a SIEM or log aggregation platform that indexes events from endpoint Security logs, Sysmon logs, and DC Security logs simultaneously, and allows queries that join on `ProcessGUID`, `TargetLogonId`, and `IpAddress` across sources. Without this infrastructure, the matrix above is theoretical. Sysmon `ProcessGUID` and `SessionGUID` are the primary programmatic correlation keys — they are designed to be unique per process or session across the enterprise rather than just per host [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md).

## Key points

- Event 4624 answers WHO authenticated and HOW; check `LmPackageName` for NTLM vs Kerberos, `LogonType` for the channel used, and `LogonGuid` for presence/absence of Kerberos
- Sysmon answers WHAT ran and WHERE it connected; ProcessGUID is the correlation key linking process creation to network connections, DNS queries, and registry writes
- AD DC events answer WHAT Kerberos encryption type was used (Event 4769) and whether DCSync was performed (Event 4662); neither of these appears in endpoint logs
- Full coverage requires all three sources: authentication + process/network + domain authentication; each has a coverage gap the others fill

## Go deeper

- [S011 — Windows Event 4624](../../research/security-foundations/01-sources/web/S011-windows-event-4624.md) — Full field reference: LogonType, LmPackageName, IpAddress, TargetLogonId, LogonGuid
- [S015 — Sysmon v15](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md) — All event types, ProcessGUID correlation model, and SessionGUID design
- [S023 — Windows Security Events](../../research/security-foundations/01-sources/web/S023-windows-security-events.md) — Events 4688/4698/4768/4769/4662 and required audit policy settings

---

*← [Previous lesson](./L12-detecting-persistence.md)* · *[Next lesson →](./L14-event-correlation.md)
| What DNS query? | ❌ | ✅ (Event 22) | ❌ |
| What Kerberos ticket type? | ❌ | ❌ | ✅ (Event 4769) |
| Was LSASS accessed? | ❌ | ✅ (Event 10) | ❌ |
| DCSync request? | ❌ | ❌ | ✅ (Event 4662) |
| WMI persistence? | ❌ | ✅ (19/20/21) | ❌ |

## Limitations

Correlating all three sources requires a SIEM or log aggregation platform that indexes events from endpoint Security logs, Sysmon logs, and DC Security logs simultaneously, and allows queries that join on `ProcessGUID`, `TargetLogonId`, and `IpAddress` across sources. Without this infrastructure, the matrix above is theoretical. Sysmon `ProcessGUID` and `SessionGUID` are the primary programmatic correlation keys — they are designed to be unique per process or session across the enterprise rather than just per host [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md).

## Key points

- Event 4624 answers WHO authenticated and HOW; check `LmPackageName` for NTLM vs Kerberos, `LogonType` for the channel used, and `LogonGuid` for presence/absence of Kerberos
- Sysmon answers WHAT ran and WHERE it connected; ProcessGUID is the correlation key linking process creation to network connections, DNS queries, and registry writes
- AD DC events answer WHAT Kerberos encryption type was used (Event 4769) and whether DCSync was performed (Event 4662); neither of these appears in endpoint logs
- Full coverage requires all three sources: authentication + process/network + domain authentication; each has a coverage gap the others fill

## Go deeper

- [S011 — Windows Event 4624](../../research/security-foundations/01-sources/web/S011-windows-event-4624.md) — Full field reference: LogonType, LmPackageName, IpAddress, TargetLogonId, LogonGuid
- [S015 — Sysmon v15](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md) — All event types, ProcessGUID correlation model, and SessionGUID design
- [S023 — Windows Security Events](../../research/security-foundations/01-sources/web/S023-windows-security-events.md) — Events 4688/4698/4768/4769/4662 and required audit policy settings

---

*← [Previous lesson](./L12-detecting-persistence.md)* · *[Next lesson →](./L14-event-correlation.md)*
