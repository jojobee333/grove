# Sysmon — Deep Process and Network Telemetry

**Module**: M09 · Windows Telemetry, Persistence, and Detection  
**Type**: applied  
**Estimated time**: 25 minutes  
**Claims**: C7 and C8 from Strata synthesis

---

## The situation

You have covered Windows Event Logs (L25) and Windows Persistence (L26). You understand that native Windows auditing has significant blind spots: it does not capture parent-child process relationships, DNS queries, network connections from processes, file hash values, or DLL loads without additional configuration. **Sysmon** (System Monitor) is a free Sysinternals tool from Microsoft that fills these gaps, providing the high-fidelity telemetry that Windows native logging lacks.

The research (Claims C7 and C8) points to Sysmon as a key component of the multi-source correlated telemetry picture — specifically for detecting persistence mechanisms (C8) and for completing the telemetry coverage that no single native log provides (C7).

## The approach

Sysmon installs as a Windows driver and service. It monitors system activity and writes events to a dedicated channel: `Microsoft-Windows-Sysmon/Operational`. Unlike native logs, Sysmon captures events at the kernel level — more tamper-resistant and more complete than user-space logging.

A **Sysmon configuration file** (XML) controls exactly which events are collected and which are filtered out. A good configuration is the difference between Sysmon generating 50,000 noisy events per hour and generating 500 high-signal events per hour.

## A worked example

### Installing Sysmon

```cmd
# Download Sysmon from Sysinternals (official Microsoft source)
# Install with a configuration file
sysmon64.exe -accepteula -i sysmonconfig.xml

# Update configuration
sysmon64.exe -c sysmonconfig.xml

# Check current status
sysmon64.exe -s

# Uninstall
sysmon64.exe -u
```

The most widely used community configuration is **SwiftOnSecurity's sysmon-config** — a well-maintained XML configuration that provides strong defaults by excluding known-good high-volume processes and including detection-relevant events.

---

### Key Sysmon Event IDs

**Event ID 1 — Process Create**

The most important Sysmon event. Every new process generates an Event 1 with:
- `CommandLine`: Full command including all arguments (crucial for detecting LOLBin abuse)
- `ParentImage`: The executable that spawned this process
- `ParentCommandLine`: The parent's command line
- `Hashes`: SHA256 (and optionally MD5/IMPHASH) of the executable
- `User`: Which account ran the process
- `UtcTime`, `ProcessId`, `ParentProcessId`

**Why this matters**: Native Event 4688 (process creation) captures most of this, but Sysmon captures it with a parent-child relationship in a single structured record, with file hashes, and without requiring manual audit policy configuration. The hash enables VirusTotal lookups and cross-host correlation.

**Example detection** — `cmd.exe` spawned by `Word.exe`:
```xml
<ProcessCreate>
  <UtcTime>2025-03-15 14:23:01.123</UtcTime>
  <ProcessId>4892</ProcessId>
  <Image>C:\Windows\System32\cmd.exe</Image>
  <CommandLine>cmd.exe /c powershell.exe -enc [base64_payload]</CommandLine>
  <ParentImage>C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE</ParentImage>
  <ParentCommandLine>"WINWORD.EXE" /n "Invoice_March.docx"</ParentCommandLine>
  <User>CORP\alice</User>
  <Hashes>SHA256=5A9A6...</Hashes>
</ProcessCreate>
```

Word spawning cmd.exe spawning PowerShell with a base64-encoded command = macro malware execution. This exact chain is one of the most common initial access patterns.

---

**Event ID 3 — Network Connection**

Every outbound (and optionally inbound) TCP/UDP connection:
- `SourceIp`, `SourcePort`
- `DestinationIp`, `DestinationPort`
- `Image`: Which process initiated the connection
- `Protocol`, `Initiated` (outbound vs inbound)

**Example detection** — `powershell.exe` making outbound connections to unusual IPs on port 443:

```xml
<NetworkConnect>
  <Image>C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe</Image>
  <SourceIp>10.1.1.45</SourceIp>
  <DestinationIp>185.220.101.23</DestinationIp>
  <DestinationPort>443</DestinationPort>
  <Protocol>tcp</Protocol>
</NetworkConnect>
```

PowerShell connecting to a non-corporate IP on 443 (HTTPS) is suspicious — legitimate PowerShell connections should go to known Microsoft endpoints. Combined with Event 1 showing the PowerShell command line, this reveals C2 (command-and-control) traffic.

**High volume**: Network events generate significant volume. Good configs exclude known-good connections (DNS to 8.8.8.8, NTP to time servers) and focus on unusual destination ports or IPs, or unusual source processes.

---

**Event ID 7 — Image Loaded (DLL Load)**

Every DLL loaded by any process:
- `Image`: The loading process
- `ImageLoaded`: The DLL path
- `Signed`, `Signature`, `SignatureStatus`
- `Hashes`

**Example detection** — DLL loaded from a user-writable path:
```xml
<ImageLoad>
  <Image>C:\Windows\System32\svchost.exe</Image>
  <ImageLoaded>C:\Users\alice\AppData\Local\Temp\helper.dll</ImageLoaded>
  <Signed>false</Signed>
</ImageLoad>
```

A system process (`svchost.exe`) loading an unsigned DLL from `%TEMP%` is a DLL hijacking indicator. Legitimate DLLs loaded by system processes are signed and live in `System32`.

**Volume warning**: Image Load events are very high volume. Most configs enable them only for selected processes (browsers, Office applications, commonly hijacked system processes).

---

**Event ID 11 — File Create**

File creation events with:
- `Image`: Which process created the file
- `TargetFilename`
- `CreationUtcTime`

**Detection use**: Office applications creating executable files in `%TEMP%` (document dropping a payload); malware writing new executables; batch file creation.

---

**Event ID 12/13 — Registry Events**

- `12`: Registry key create/delete
- `13`: Registry value set
- `14`: Registry key/value rename

Fields include: `EventType`, `Image` (which process), `TargetObject` (full registry path), `Details` (value data for Event 13).

**Detection**: Watch `CurrentVersion\Run` keys for new entries (Event 13, TargetObject contains `\Run\`). This is the Registry-based persistence detection path.

```xml
<RegistryEvent>
  <EventType>SetValue</EventType>
  <Image>C:\Windows\Temp\update.exe</Image>
  <TargetObject>HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run\WindowsHelper</TargetObject>
  <Details>C:\Windows\Temp\update.exe -persist</Details>
</RegistryEvent>
```

`update.exe` writing itself to the Run key = persistence being established.

---

**Event ID 22 — DNS Query**

Every DNS query made by any process:
- `Image`: Which process queried DNS
- `QueryName`: The domain queried
- `QueryResults`: Resolved IP(s) or `NXDOMAIN`

**C2 detection application** (connecting back to L09 DNS C2 detection):
```xml
<DnsQuery>
  <Image>C:\Windows\System32\svchost.exe</Image>
  <QueryName>a1b2c3d4.evildomain.example.com</QueryName>
  <QueryResults>198.51.100.5</QueryResults>
</DnsQuery>
```

Long, random-looking subdomains queried by system processes indicate DNS tunneling or DNS-based C2. Sysmon Event 22 provides the process-to-domain mapping that network-level DNS logs alone cannot provide.

---

### Querying Sysmon Events

```powershell
# Get all process creation events in last hour
Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -FilterXPath "
  *[System[(EventID=1) and TimeCreated[timediff(@SystemTime) <= 3600000]]]"

# Find PowerShell processes with encoded commands
Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -FilterXPath "
  *[System[EventID=1]]" |
  Where-Object { $_.Message -match "powershell.*-enc" } |
  Select-Object TimeCreated, Message

# Find Registry Run key modifications
Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -FilterXPath "
  *[System[EventID=13]]
  and *[EventData[Data[@Name='TargetObject'][contains(.,'\Run\')]]]"

# Find network connections from office apps to external IPs
Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -FilterXPath "
  *[System[EventID=3]]
  and *[EventData[Data[@Name='Image'][contains(.,'WINWORD') or contains(.,'EXCEL')]]]"
```

---

### Sysmon Configuration Strategy

A minimal, high-value Sysmon config structure:

```xml
<Sysmon schemaversion="4.82">
  <EventFiltering>
    <!-- Capture all process creations except known-good noisy processes -->
    <RuleGroup name="ProcessCreate" groupRelation="or">
      <ProcessCreate onmatch="exclude">
        <Image condition="is">C:\Windows\System32\conhost.exe</Image>
      </ProcessCreate>
    </RuleGroup>

    <!-- Capture network connections only from interesting processes -->
    <RuleGroup name="NetworkConnect" groupRelation="or">
      <NetworkConnect onmatch="include">
        <Image condition="contains">powershell</Image>
        <Image condition="contains">WINWORD</Image>
        <Image condition="contains">EXCEL</Image>
      </NetworkConnect>
    </RuleGroup>

    <!-- Capture all Registry Run key modifications -->
    <RuleGroup name="RegistryEvent" groupRelation="or">
      <RegistryEvent onmatch="include">
        <TargetObject condition="contains">\CurrentVersion\Run</TargetObject>
      </RegistryEvent>
    </RuleGroup>
  </EventFiltering>
</Sysmon>
```

Start with SwiftOnSecurity's config, test in your environment for volume, and tune exclusions for known-good high-volume processes.

## Key points

- Sysmon installs as a kernel driver + service; writes to `Microsoft-Windows-Sysmon/Operational`; fills native Windows logging gaps (parent process relationships, file hashes, DNS queries, network connections by process)
- Event 1 (Process Create): full command line + parent process + SHA256 hash in one record; Word spawning cmd.exe spawning PowerShell = macro malware pattern
- Event 3 (Network Connect): which process connects to which IP:port; PowerShell → non-corporate external IP = C2 signal
- Event 13 (Registry value set): watch `\Run\` paths; malware writing itself to Run key = persistence signal
- Event 22 (DNS Query): process-to-domain mapping; random subdomains from system processes = DNS C2 signal (connects to L09)
- Configuration file is mandatory; use SwiftOnSecurity config as starting point; exclude known-good noisy processes to reduce volume without losing signal

## Go deeper

- [S007](../../../../vault/research/security-foundations/01-sources/) — Sysmon event ID taxonomy, configuration best practices
- [S008](../../../../vault/research/security-foundations/01-sources/) — Sysmon for persistence detection, SwiftOnSecurity config reference

---

*[← Previous: Windows Persistence](./L26-windows-persistence.md)* · *[Next: Least Privilege — The Foundational Control →](./L28-least-privilege.md)*
