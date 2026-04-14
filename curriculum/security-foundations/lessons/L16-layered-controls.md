# Layered Controls and the Bypass-Always Pattern

**Module**: M08 · Authentication Weaknesses — NTLM to Kerberoasting
**Type**: applied
**Estimated time**: 12 minutes
**Claim**: C19 — Every preventative control has a bypass condition; controls must be paired with detection

---

## The situation

You have a set of preventative controls in place: execution policy, file permissions, firewall rules, NTLM restrictions. What you need to understand is the failure mode of each — and what monitoring must accompany it. A control without a paired detection is only effective against unsophisticated attackers.

---

## The bypass-always pattern

Three examples from the research, spanning different domains:

**PowerShell execution policy**: Microsoft explicitly documents that execution policy "is not a security system." The policy prevents accidental script execution but can be bypassed by:
- Typing script contents directly at the prompt (no policy applies to interactive input)
- `powershell -ExecutionPolicy Bypass -File script.ps1`
- Running encoded commands via `-EncodedCommand`

The policy provides zero friction to a motivated attacker. What does provide friction: Script Block Logging (Event 4104) records the actual script content regardless of execution policy. AMSI intercepts and scans code before execution. The execution policy is a speed bump; Script Block Logging is the actual detection mechanism. (S014)

**ARP validation**: as established in L02, ARP has no authentication mechanism at the protocol level. There is no native ARP validation on most network equipment. Dynamic ARP Inspection (DAI) at the switch level is a mitigating control — but it requires managed infrastructure and explicit configuration. The absence of ARP authentication is a protocol property; it cannot be "fixed" without changing the protocol.

The paired detection: monitoring for unexpected ARP table changes, ARP poisoning detection tools (arpwatch), and network-level anomaly detection are the detection controls that matter, not a non-existent ARP validation feature.

**NTLM on a "Kerberos-first" network**: AD is configured to prefer Kerberos. But NTLM fallback exists for compatibility. An attacker can force NTLM authentication by targeting hosts by IP address rather than hostname (Kerberos requires a resolvable SPN; IP address authentication falls back to NTLM), or by using tools that explicitly initiate NTLM.

Disabling NTLM entirely breaks legacy applications. The paired detection: Event 4624 monitoring for LmPackageName=NTLM from unexpected sources remains the required control. (S011, S016)

---

## What effective layered controls look like

The research shows the difference between layered controls that work and those that don't (S016):

**Ineffective layering**: stack three controls that all depend on the same underlying mechanism. Example: execution policy + a policy that sets execution policy + a script that re-sets execution policy. An attacker who bypasses the underlying mechanism bypasses all three simultaneously.

**Effective layering**: controls that attack different mechanisms.
- **MFA** attacks the credential theft mechanism (a hash or password is not sufficient)
- **Privileged Access Workstations (PAWs)** attack the lateral movement mechanism (admin actions can only originate from a protected, monitored host)
- **Just-in-time (JIT) elevation** attacks the persistent privilege mechanism (no permanent group membership to harvest)
- **Paired detection** catches when all preventative controls fail

Each of these controls can be bypassed individually. Together, they require the attacker to defeat multiple independent mechanisms simultaneously — the cost of the attack increases significantly.

---

## The principle stated directly

"Every preventative control has a bypass condition. The detection control is mandatory, not optional."

For every control you rely on, document: the bypass condition, the detection signature that fires when the bypass is used, and the response procedure. A control without a documented bypass and paired detection is not a control — it is a configuration that creates false confidence.

## Key points

- PowerShell execution policy is a bypass in one line; Script Block Logging (Event 4104) is the actual detection control for malicious scripts
- Effective layered controls target different mechanisms, not the same one with multiple rules
- Document the bypass condition and paired detection for every preventative control — undocumented controls create false confidence

## Go deeper

- [S014 — PowerShell Execution Policies](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies) — Microsoft's own documentation that execution policy is not a security system
- [S016 — AD Security Best Practices](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/best-practices-for-securing-active-directory) — MFA, PAWs, JIT elevation implementation guidance

---

*← [Previous: NTLM, Pass-the-Hash, and Kerberoasting](./L15-ntlm-kerberoasting.md)* · *Course complete*
