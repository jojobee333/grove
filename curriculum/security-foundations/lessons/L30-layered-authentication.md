# Layered Authentication — Defense in Depth

**Module**: M10 · Layered Defense — From Controls to Detection  
**Type**: applied  
**Estimated time**: 25 minutes  
**Claim**: C19 from Strata synthesis

---

## The situation

You have studied NTLM (L22), Kerberos (L22), Pass-the-Hash (L24), and MFA bypass (L29). Each lesson showed a specific authentication weakness and its corresponding attack. This lesson synthesizes those into a coherent defense architecture: layered authentication, which means no single authentication control is the last line of defense.

**Defense in depth** (a concept you have encountered throughout this course) means: design your security so that a successful bypass of any one layer does not result in complete compromise. Applied to authentication, it means: even if an attacker steals a credential, additional authentication layers prevent or detect the attack.

## The approach

Effective layered authentication combines:
1. Strong credential policies (prevent credential theft from being useful)
2. Protocol hardening (force strong authentication protocols, disable weak ones)
3. Context-aware authentication (additional verification when context is anomalous)
4. Detection alongside each layer (so bypass is observable, not silent)

## A worked example

### Layer 1 — Credential Quality

**The problem**: Weak passwords are crackable (Kerberoasting, AS-REP roasting, offline attacks against exported hashes). Password reuse means one compromise affects multiple accounts.

**Implementation**:

```powershell
# Enforce password quality via Active Directory Fine-Grained Password Policy
$PSO = New-ADFineGrainedPasswordPolicy `
  -Name "PrivilegedAccountPolicy" `
  -Precedence 10 `
  -MinPasswordLength 16 `
  -PasswordHistoryCount 24 `
  -MinPasswordAge (New-TimeSpan -Days 1) `
  -MaxPasswordAge (New-TimeSpan -Days 90) `
  -LockoutThreshold 5 `
  -LockoutDuration (New-TimeSpan -Minutes 30) `
  -LockoutObservationWindow (New-TimeSpan -Minutes 30) `
  -ComplexityEnabled $true `
  -ReversibleEncryptionEnabled $false

# Apply to Domain Admins group
Add-ADFineGrainedPasswordPolicySub ject -Identity "PrivilegedAccountPolicy" -Subjects "Domain Admins"
```

**For service accounts**: gMSA (Managed Service Accounts) eliminates password quality concerns entirely — 240-character auto-rotating password, no human ever sets it, therefore no human ever sets it weakly.

**For user accounts**: passphrases (`CorrectHorseBatteryStaple` style) are longer and more memorable than complex short passwords; length beats complexity for resistance to brute force.

---

### Layer 2 — Protocol Hardening

**The problem**: NTLM passes hashes that can be stolen and reused. RC4 Kerberos can be Kerberoasted. LM/NTLMv1 are trivially crackable.

**Implementation — NTLM restriction**:

```
Group Policy:
Computer Configuration → Windows Settings → Security Settings →
  Local Policies → Security Options →
    Network security: LAN Manager authentication level = 5
    (Send NTLMv2 responses only; refuse LM & NTLM)
```

Or via Registry (from L23):
```
HKLM\SYSTEM\CurrentControlSet\Control\Lsa
LmCompatibilityLevel = 5
NoLmHash = 1
```

**Disable NTLM entirely for specific paths** (where Kerberos is available):
```
Computer Configuration → Windows Settings → Security Settings →
  Local Policies → Security Options →
    Network security: Restrict NTLM: Outgoing NTLM traffic to remote servers = Deny all
```

This prevents NTLM relay attacks — if NTLM is not used, relay is impossible.

**Kerberos — force AES encryption only**:
```powershell
# Disable RC4 Kerberos for a service account (prevents Kerberoasting from producing RC4 hashes)
Set-ADUser svc_sql -Replace @{msDS-SupportedEncryptionTypes = 24}
# 24 = AES128 (8) + AES256 (16) — RC4 (4) not included
```

---

### Layer 3 — Multi-Factor Authentication (MFA)

**The problem**: MFA can be bypassed via push fatigue or AiTM phishing (L29). The bypass works differently depending on MFA type.

**MFA tiers by phishing resistance** (from strongest to weakest):
1. **FIDO2 / WebAuthn hardware keys** (YubiKey, Windows Hello for Business): Cryptographically bound to the specific website origin. A phishing site at a different origin cannot trigger the authenticator. Immune to AiTM proxy attacks. **This is the only phishing-resistant MFA.**
2. **TOTP apps** (Google Authenticator, Microsoft Authenticator TOTP): Codes expire in 30 seconds. Vulnerable to real-time AiTM phishing (attacker forwards code immediately), but not to SIM swapping.
3. **Push notifications** (Authenticator app approvals): Vulnerable to push fatigue. Microsoft Authenticator's number-matching feature mitigates this.
4. **SMS OTP**: Vulnerable to SIM swapping and SS7 attacks. Avoid for privileged accounts.

**Implementation for privileged accounts** (Domain Admins, cloud IAM admins):
- Require FIDO2 hardware keys; no SMS fallback
- Enforce Windows Hello for Business (uses asymmetric cryptography bound to the device)
- Configure Conditional Access (Azure AD/Entra ID) to require compliant device AND MFA for admin operations

**Number matching for Microsoft Authenticator** (mitigates push fatigue):
```
Azure AD → Security → Authentication Methods → Microsoft Authenticator →
  Configure → Require number matching → Enable
```
The user must type the displayed number into the phone — a single accidental approval is no longer sufficient.

---

### Layer 4 — Protected Users Security Group

The Protected Users group is an Active Directory security group with hardened authentication semantics for its members:

```powershell
# Add an account to Protected Users
Add-ADGroupMember -Identity "Protected Users" -Members "DA_alice"
```

Membership enforces:
- No NTLM authentication (forces Kerberos only; Pass-the-Hash impossible)
- No credential caching (no `CachedLogonsCount` for these accounts)
- No DES or RC4 Kerberos (forces AES)
- TGT lifetime limited to 4 hours (shorter compromise window)
- No Kerberos delegation (prevents unconstrained delegation abuse)

This is the highest-value hardening for privileged accounts. The cost: these accounts cannot authenticate to services that only support NTLM, cannot use unconstrained delegation, and cannot authenticate on domain controllers if the DC is offline.

---

### Layer 5 — Context-Aware Authentication (Conditional Access)

**The concept**: Authentication decisions should consider context, not just credential validity. An attacker with a valid credential still has unusual context: logging in from a new country, from an unmanaged device, at 3am.

**Azure AD Conditional Access** (enterprise example):
```
Policy: Require MFA for Admin Roles
  Assignments: Users = Domain Admins, Cloud Admins
  Conditions: All locations
  Access controls: Grant → Require multi-factor authentication + Require compliant device

Policy: Block Legacy Auth Protocols
  Assignments: All users
  Conditions: Client apps = Exchange ActiveSync, Other clients (NTLM/basic auth)
  Access controls: Block
```

**On-premises equivalent**: NPS (Network Policy Server) with RADIUS authentication, requiring specific network location or device certificate for privileged access.

---

### Connecting to Detection

Even with all five layers above, authentication attacks are still possible (sophisticated attackers, insider threats, zero-days). Detection complements each prevention layer:

| Prevention Layer | What Fails | Detection Signal |
|-----------------|-----------|-----------------|
| Credential quality | Credentials still get captured via keylogging/phishing | New credential store access (Event 4663), anomalous logon source |
| Protocol hardening | NTLM required for legacy systems | Event 4624 NTLM from unexpected hosts |
| MFA | AiTM phishing captures session cookies | Session from impossible geography (user in US, session from EU 5 minutes later) |
| Protected Users | Not all privileged accounts added | Event 4769 RC4 from protected user accounts |
| Conditional Access | Misconfigured policy excludes an admin account | Event 4624 from unmanaged device for admin account |

## Key points

- Layered authentication means no single control protects authentication alone: credential quality + protocol hardening + MFA + context-aware access decisions, each layer with a detection complement
- FIDO2 hardware keys are the only phishing-resistant MFA; all other MFA types are vulnerable to some bypass; require FIDO2 or Windows Hello for Business for privileged accounts
- Protected Users group: forces Kerberos-only (eliminates NTLM and Pass-the-Hash), no credential caching, AES-only Kerberos; highest-value hardening for Domain Admin accounts; apply it
- Disable LM and NTLMv1 via GPO (`LmCompatibilityLevel = 5`); consider disabling NTLM entirely for paths where Kerberos is available
- Conditional Access / context-aware authentication: require managed device AND MFA for privileged access; block legacy auth protocols (NTLM/basic auth via ActiveSync)
- Every authentication prevention layer should have a matching detection policy — authentication is not monitored adequately without explicit audit policy configuration (L25)

## Go deeper

- [S009](../../../../vault/research/security-foundations/01-sources/) — Active Directory authentication hardening, Protected Users group
- [S020](../../../../vault/research/security-foundations/01-sources/) — FIDO2 and phishing-resistant MFA architecture

---

*[← Previous: Control Bypass](./L29-control-bypass.md)* · *[Next: The Detection Imperative →](./L31-detection-imperative.md)*
