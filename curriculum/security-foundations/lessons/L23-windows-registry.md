# Windows Registry — The Central Configuration Database

**Module**: M08 · Windows Authentication — NTLM, Kerberos  
**Type**: core  
**Estimated time**: 25 minutes  
**Claim**: C10 from Strata synthesis

---

## The core idea

The Windows Registry is a hierarchical database that stores configuration settings for the Windows operating system, hardware devices, installed software, and user preferences. Every Windows process, every installed application, every hardware driver, and most persistence mechanisms touch the Registry. The research (Claim C10) identifies the Registry as the **central configuration database for persistence, credentials, and authentication behavior** — making it essential knowledge for both attackers and defenders.

Unlike Linux (where configuration lives in flat text files scattered throughout `/etc/`), Windows centralizes configuration in a single queryable, ACL-protected database. This is both an architectural advantage (consistent storage, transactional updates, access control) and a concentrated attack surface (one place to look for and write persistence).

**The Registry hive structure**: The Registry is organized into five top-level keys called **hives**:

| Hive | Abbreviation | Contents |
|------|-------------|---------|
| `HKEY_CLASSES_ROOT` | `HKCR` | File type associations and COM class registrations |
| `HKEY_CURRENT_USER` | `HKCU` | Settings for the currently logged-in user (mapped to `HKUS\<SID>`) |
| `HKEY_LOCAL_MACHINE` | `HKLM` | System-wide settings: hardware, software, security, SAM database |
| `HKEY_USERS` | `HKU` | Settings for all loaded user profiles |
| `HKEY_CURRENT_CONFIG` | `HKCC` | Hardware profile for current boot |

For security purposes, `HKLM` (system-wide, requires admin to write) and `HKCU` (per-user, writable by that user) are the most important.

## Why it matters

The Registry is the most important artifact to understand for Windows persistence analysis. Virtually every persistence mechanism either writes to the Registry directly or relies on Registry-controlled behavior. It also stores authentication configuration (NTLM version settings, cached credentials, LSA secrets) and autorun specifications that execute on user login or system boot.

## A concrete example

### Key Security-Relevant Registry Paths

**Authentication and credential configuration**:

```
HKLM\SYSTEM\CurrentControlSet\Control\Lsa
```
The LSA (Local Security Authority) configuration key. Contains:
- `LmCompatibilityLevel`: Controls NTLM version negotiation (0=LM, 1=LM+NTLM, 2=NTLM only, 3=NTLMv2 only, 5=NTLMv2 only with 128-bit). Value 5 is the hardened setting.
- `RestrictAnonymous`: Controls anonymous (null session) access to shares and registry
- `NoLmHash`: If 1, Windows does not store the weak LM hash alongside the NT hash in the SAM
- `CachedLogonsCount`: How many domain account credentials are cached locally for offline login (default 10)

Attackers who gain local admin access query this key to understand the credential storage configuration. Defenders set `LmCompatibilityLevel` to 5 and `NoLmHash` to 1 as hardening steps.

```
HKLM\SAM\SAM\Domains\Account\Users
```
The SAM (Security Accounts Manager) database — stores local account NT hashes. Accessible only by SYSTEM (not even local admin directly — Mimikatz's `lsadump::sam` abuses a backup mechanism). This is the target for local hash extraction.

**Persistence locations (run on startup/login)**:

These are the most commonly abused Registry paths for persistence. An attacker who writes a command here gains code execution on every user login or system boot.

```
# Per-user autorun (executes for the current user on login)
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce    # Runs once, then deletes

# System-wide autorun (executes for all users; requires admin to write)
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce

# 32-bit software on 64-bit Windows (separate hive due to WOW64 redirection)
HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run
```

Each of these keys contains named values where the value data is a command to execute. Example malicious entry:

```
Name: WindowsUpdate
Data: C:\Users\alice\AppData\Roaming\update.exe
```

The name is deliberately chosen to look like a legitimate system process. The binary at the path executes on every login.

**Service registration**:

```
HKLM\SYSTEM\CurrentControlSet\Services\<ServiceName>
```
Every Windows service has an entry here. Keys:
- `ImagePath`: Path to the service executable
- `Start`: 0=Boot, 1=System, 2=Automatic, 3=Manual, 4=Disabled
- `Type`: 0x10=own process, 0x20=share process
- `ObjectName`: The account the service runs as (`LocalSystem`, `NetworkService`, or a specific service account)

Malicious services registered here execute as SYSTEM (the most privileged Windows account) if `ObjectName = LocalSystem`. Attackers who gain admin access register new services or modify existing ones.

**DLL hijacking and COM hijacking**:

```
HKCU\SOFTWARE\Classes\CLSID\{GUID}\InProcServer32
```
COM object registration (HKCU version does not require admin and overrides HKLM registrations for the current user). Used for COM hijacking persistence — the attacker registers a malicious DLL as the handler for a COM class that a legitimate elevated process uses.

---

### Reading the Registry

**Command line (regedit.exe, reg.exe)**:
```cmd
# Query a key
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

# Query a specific value
reg query "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" /v LmCompatibilityLevel

# Add a persistence entry (attacker perspective)
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "WindowsHelper" /t REG_SZ /d "C:\malware.exe" /f

# Delete a value
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "WindowsHelper" /f
```

**PowerShell**:
```powershell
# Get all Run key entries
Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

# Get LSA configuration
Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa"

# Find recently modified Registry keys (requires Get-ChildItem recursion + LastWriteTime)
Get-ChildItem -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" |
  Select-Object -ExpandProperty Property
```

**Autoruns (Sysinternals)**:
The `autoruns.exe` tool from Sysinternals provides a comprehensive GUI and CLI view of all autostart locations — Registry Run keys, services, scheduled tasks, browser extensions, DLLs, boot sectors. It is the fastest way to identify persistence mechanisms on a live system.

```
autorunsc.exe -accepteula -a * -c -h -vt > autoruns_output.csv
```

The `-h` flag hides Microsoft-signed entries (significantly reduces noise); the `-vt` flag submits hashes to VirusTotal.

---

### Registry Forensics (Offline Analysis)

Registry hives are stored as files:
- `%SystemRoot%\System32\config\SAM` — SAM database
- `%SystemRoot%\System32\config\SYSTEM` — System configuration
- `%SystemRoot%\System32\config\SOFTWARE` — Software configuration
- `%SystemRoot%\System32\config\SECURITY` — Security settings
- `%USERPROFILE%\NTUSER.DAT` — Per-user hive (HKCU)

These files are locked by the OS while Windows is running. To analyze them offline:
- Boot from a forensic live CD
- Use Volume Shadow Copy (VSS) copies that Windows creates automatically
- Use `reg save` to create a backup copy while the system is running

Tools for offline Registry analysis: **RegRipper** (automated extraction of forensic artifacts), **Registry Explorer** (GUI by Eric Zimmermann), **python-registry** (programmatic access).

## Key points

- The Windows Registry is a hierarchical database storing system and application configuration; persistence, credentials, and authentication behavior all live here
- `HKLM` is system-wide (requires admin to write); `HKCU` is per-user (writable by that user — exploited for user-level persistence and COM hijacking)
- Primary persistence keys: `HKCU\...\CurrentVersion\Run` (user-level) and `HKLM\...\CurrentVersion\Run` (system-level); check both during forensic investigation
- `HKLM\SYSTEM\CurrentControlSet\Control\Lsa` controls NTLM version and credential caching; `LmCompatibilityLevel = 5` is the hardened setting
- Registry hive files: `C:\Windows\System32\config\SAM, SYSTEM, SOFTWARE, SECURITY`; `%USERPROFILE%\NTUSER.DAT` for per-user hive
- Sysinternals Autoruns provides comprehensive enumeration of all autostart locations including Registry Run keys, services, and scheduled tasks

## Go deeper

- [S010](../../../../vault/research/security-foundations/01-sources/) — Windows Registry hive structure, persistence mechanisms, and LSA credential configuration

---

*[← Previous: NTLM and Kerberos](./L22-ntlm-kerberos.md)* · *[Next: Pass-the-Hash and Kerberoasting — Exploiting Authentication Weaknesses →](./L24-pass-the-hash.md)*
