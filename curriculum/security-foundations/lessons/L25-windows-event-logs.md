# Windows Event Logs — The Multi-Source Telemetry Picture

**Module**: M09 · Windows Telemetry, Persistence, and Detection  
**Type**: core  
**Estimated time**: 30 minutes  
**Claim**: C7 from Strata synthesis

---

## The core idea

Windows generates an enormous volume of event logs. The research (Claim C7) makes a specific, important observation: **Windows telemetry requires correlated multi-source collection — no single log gives you a complete picture**. A defender who looks only at Security logs misses critical process activity. A defender who looks only at Sysmon misses authentication events. A defender who looks at neither can see nothing.

This lesson covers the Windows event log architecture, the most important event channels for security monitoring, the specific Event IDs that matter most, and how correlation across sources reveals attacks that no single source would expose.

**What is the Windows Event Log?** The Windows Event Log is the Windows operating system's central logging infrastructure. Applications, services, drivers, and the OS kernel all write structured log entries (events) to named channels. Events are stored in `*.evtx` files. The Windows Event Viewer (`eventvwr.msc`) provides a GUI to browse them; `wevtutil.exe` and PowerShell provide programmatic access.

## Why it matters

If you cannot see what is happening on your Windows systems, you cannot detect attacks. Security teams that forward Windows event logs to a SIEM (Security Information and Event Management system) can detect Pass-the-Hash, Kerberoasting, privilege escalation, new service creation, and lateral movement — all from events covered in this lesson. Security teams that do not collect logs from Windows endpoints discover breaches months later from a ransom note.

## A concrete example

### The Major Windows Log Channels

**Security Log** (`%SystemRoot%\System32\winevt\Logs\Security.evtx`)

The most important channel for authentication and access control events. Requires auditing to be enabled for specific event categories (configured via Group Policy or `auditpol.exe`).

Critical Event IDs:

| Event ID | Name | Security Relevance |
|----------|------|--------------------|
| **4624** | Successful Logon | Who logged in, from where, using which protocol (LogonType + LmPackageName). Key for pass-the-hash detection. |
| **4625** | Failed Logon | Failed authentication attempts. High rate from single source = brute force. |
| **4648** | Logon using explicit credentials | User used RunAs or network credentials different from current session. Common in lateral movement. |
| **4672** | Special privileges assigned to new logon | Admin/sensitive privileges assigned at logon. Every Domain Admin login generates this. |
| **4688** | Process creation (with command line) | Which process started, who started it, what command line was used. **Must enable "Include command line" auditing.** |
| **4698** | Scheduled task created | New scheduled task — common persistence mechanism. |
| **4702** | Scheduled task modified | Existing scheduled task changed. |
| **4720** | User account created | New account — attacker may create backdoor accounts. |
| **4732** | Member added to security-enabled group | User added to local admin group or other privileged group. |
| **4768** | Kerberos TGT requested | TGT request — AS-REQ. LmPackageName or absence of pre-auth. |
| **4769** | Kerberos service ticket requested | TGS-REQ. TicketEncryptionType field. Key for Kerberoasting. |
| **4776** | NTLM credential validation | DC validated NTLM credentials. Source workstation field. |

**LogonType values** (field in Event 4624):
- `2` = Interactive (user physically at machine)
- `3` = Network (accessing a network resource — file share, RPC)
- `4` = Batch (scheduled task)
- `5` = Service (service startup)
- `7` = Unlock (screensaver unlock)
- `10` = Remote interactive (RDP)
- `11` = Cached interactive (offline domain login with cached credentials)

LogonType 3 (network logon) with NTLM from workstation-to-workstation is a red flag for lateral movement.

---

**System Log** (`Security.evtx` sibling — `System.evtx`)

Contains OS, driver, and service events.

| Event ID | Name | Security Relevance |
|----------|------|--------------------|
| **7045** | Service installed | New service created in SCM — attacker may install service for persistence or C2 |
| **7040** | Service start type changed | Service changed from Manual to Automatic — persistence enabling |
| **7034/7035/7036** | Service crashed / sent start/stop controls | Unusual service behavior |

Service creation (7045) combined with a suspicious `ImagePath` (e.g., pointing to `AppData` rather than `System32`) is a strong persistence indicator.

---

**Windows PowerShell Log** (`Microsoft-Windows-PowerShell/Operational.evtx`)

PowerShell is the most powerful built-in post-exploitation tool on Windows. Two key Event IDs:

| Event ID | Name | Security Relevance |
|----------|------|--------------------|
| **4103** | Module logging | Individual PowerShell commands executed. Requires enabling module logging via GPO. |
| **4104** | Script block logging | PowerShell script blocks executed. Captures obfuscated code after deobfuscation. **Most valuable.** |

Script block logging (4104) is critical because it captures the **deobfuscated** content of PowerShell scripts — even if an attacker downloads an encoded script, the logging captures it after decoding. Enable via:

```
Computer Configuration → Administrative Templates → Windows Components → Windows PowerShell → Turn on PowerShell Script Block Logging → Enabled
```

---

**Task Scheduler Log** (`Microsoft-Windows-TaskScheduler/Operational.evtx`)

| Event ID | Name | Security Relevance |
|----------|------|--------------------|
| **106** | Task registered | Scheduled task created |
| **200** | Task launched | Task actually executed |
| **201** | Task completed | Task completed — check exit code |

Scheduled task creation is one of the most common persistence mechanisms (covered in L26). These events provide a corroboration source alongside Security 4698.

---

### Multi-Source Correlation: Why One Log Is Never Enough

**Attack scenario**: Attacker compromises a workstation, runs Mimikatz, extracts a domain admin hash, and uses it to authenticate to the Domain Controller.

**Single-source view (Security log only)**:
- You see Event 4624 (logon) on the DC from the workstation. The account is a domain admin. Looks like a normal admin authentication. Nothing obviously wrong.

**Adding the PowerShell log from the workstation**:
- Event 4104 shows: `Invoke-Mimikatz -DumpCreds` — the script block that was executed. Now you see the compromise.

**Adding the Network log from a SIEM**:
- The workstation has never authenticated to the DC before — the authentication is an anomaly from this source IP. Combined with the PowerShell execution, this confirms lateral movement.

**The pattern**: Any single log entry is ambiguous. Correlation across multiple sources (endpoint PowerShell logs + DC authentication logs + network anomaly detection) makes the attack visible and attributable.

---

### Enabling the Right Auditing

Most Windows installations have **insufficient auditing enabled by default**. Critical audit policies require explicit configuration:

**Via Group Policy** (recommended for domain environments):
```
Computer Configuration → Windows Settings → Security Settings → Advanced Audit Policy Configuration
```

**Minimum recommended settings**:
- Logon/Logoff → Audit Logon: Success + Failure
- Account Logon → Audit Credential Validation: Success + Failure
- Account Logon → Audit Kerberos Service Ticket Operations: Success + Failure
- Object Access → Audit Process Creation: Success (and enable command line)
- Privilege Use → Audit Sensitive Privilege Use: Success + Failure
- System → Audit Security System Extension: Success

**Via command line (one-off)**:
```cmd
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Process Creation" /success:enable
auditpol /get /category:*
```

**PowerShell script block logging** (GPO or Registry):
```
HKLM\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging
EnableScriptBlockLogging = 1
```

**Log forwarding**: Windows Event Forwarding (WEF) is the native mechanism for centralizing event logs to a collector. Alternatively, Elastic Beats, Splunk Universal Forwarder, or other SIEM agents collect events directly. Without centralization, logs are only on the machine where they were generated — often wiped by attackers after compromise.

---

### Querying Event Logs

**PowerShell (structured queries)**:
```powershell
# Get all Security events for admin logons in last 24 hours
Get-WinEvent -LogName Security -FilterXPath "
  *[System[(EventID=4624) and TimeCreated[timediff(@SystemTime) <= 86400000]]]
  and *[EventData[Data[@Name='LogonType']='10']]
" | Select-Object TimeCreated, Message

# Get all PowerShell script block events containing "mimikatz"
Get-WinEvent -LogName "Microsoft-Windows-PowerShell/Operational" -FilterXPath "
  *[System[EventID=4104]]" |
  Where-Object { $_.Message -match "mimikatz" }

# Get all new services created in last 7 days
Get-WinEvent -LogName System -FilterXPath "
  *[System[(EventID=7045) and TimeCreated[timediff(@SystemTime) <= 604800000]]]
"
```

**wevtutil (command line)**:
```cmd
# Export Security log
wevtutil epl Security C:\forensics\Security.evtx

# Query event count
wevtutil gli Security
```

**Python (python-evtx library)** for offline analysis of `.evtx` files collected from other machines.

## Key points

- No single Windows event log channel gives a complete picture; correlate Security + System + PowerShell + TaskScheduler logs for detection coverage
- Security log Event 4624 (Logon): LogonType 3 + NTLM from workstation-to-workstation = lateral movement signal; Event 4769 + TicketEncryptionType 0x17 = Kerberoasting signal
- System log Event 7045 (service install): suspicious ImagePath (pointing to AppData, Temp) = persistence signal
- PowerShell Event 4104 (script block logging): captures post-deobfuscation content; mandatory for detecting living-off-the-land attacks; must be enabled via GPO — off by default
- Log forwarding is mandatory for detection; logs on local machines can be wiped by attackers; use Windows Event Forwarding or SIEM agents to centralize
- Auditing is not fully enabled by default; configure Advanced Audit Policy via GPO for Logon, Process Creation, Kerberos operations

## Go deeper

- [S007](../../../../vault/research/security-foundations/01-sources/) — Windows event log channels, critical Event IDs, audit policy configuration
- [S010](../../../../vault/research/security-foundations/01-sources/) — Correlation patterns across Security + PowerShell + System logs

---

*[← Previous: Pass-the-Hash and Kerberoasting](./L24-pass-the-hash.md)* · *[Next: Windows Persistence — Legitimate Mechanisms Abused →](./L26-windows-persistence.md)*
