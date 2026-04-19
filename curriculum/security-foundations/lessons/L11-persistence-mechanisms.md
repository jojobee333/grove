# How Attackers Hide in Legitimate Autorun Mechanisms

**Module**: M06 · Persistence — Abusing What the OS Trusts
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C8 from Strata synthesis

---

## The core idea

A skilled attacker does not install a rootkit that hides itself from the kernel. That technique is detectable and requires kernel-level exploitation that raises immediate alert. Instead, the attacker creates a scheduled task that runs every day at 3 AM, or a WMI subscription that fires every time a user logs in, or a cron job that re-installs their tooling if removed. These mechanisms are indistinguishable from legitimate administrative use without knowing what was there before.

This is the claim: Windows and Linux persistence is accomplished almost exclusively by abusing legitimate OS mechanisms. Cron is for scheduling. WMI is for event-driven scripting. Registry Run keys are for user startup programs. SSH authorized_keys is for authentication. The attacker simply adds their entry to the mechanism the OS already trusts. Detection requires knowing which entries are authorized — and that requires baselining [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md) [S022](../../research/security-foundations/01-sources/web/S022-windows-registry.md) [S023](../../research/security-foundations/01-sources/web/S023-windows-security-events.md).

## Why it matters

Persistence is the second phase of every intrusion after initial access. Without it, a reboot or session timeout ends the compromise. With it, the attacker survives incident response that does not include a full OS reinstall, survives credential rotation (if they have an alternative entry point), and maintains long-term access for exfiltration or ransomware staging. Understanding persistence locations is prerequisite knowledge for any incident response work: it defines the checklist of locations you must examine and clear to confirm eviction of an adversary.

## Linux persistence mechanisms

**Cron** is the most common Linux persistence location because it requires no special privileges for user-level crontabs and root-owned cron directories accept any dropped file with correct syntax.

- `/etc/cron.d/` — root-owned, world-readable; any file dropped here with valid cron syntax executes on schedule as root
- `/var/spool/cron/crontabs/[username]` — per-user; an attacker's user crontab persists independently of the main system cron
- `/etc/cron.hourly/`, `/etc/cron.daily/` — executable scripts placed here run on the named schedule without explicit crontab syntax [S007](../../research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md)

**systemd user services**: `~/.config/systemd/user/backdoor.service` starts when the user logs in. No root required. With `Restart=always` configured, the service restarts if killed. Because user-level systemd units are rarely monitored, this persistence survives most basic IR procedures.

**rc.local**: `/etc/rc.local` executes at boot with root privileges. Legacy but still present on many systems. An entry here survives reboots and most IR procedures short of full OS reinstall.

**SSH authorized_keys**: `~/.ssh/authorized_keys` is designed for passwordless authentication via public key. An attacker who adds their public key can maintain SSH access independently of any password change on the account. Many IR runbooks fail to include authorized_keys audit as a mandatory step.

## Windows persistence mechanisms

**Registry Run keys** are the most common Windows persistence mechanism because they require no elevated privileges for the HKCU (Current User) hive [S022](../../research/security-foundations/01-sources/web/S022-windows-registry.md):

- `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` — user-writable; value executes at user login
- `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` — requires admin; executes at any user login
- `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\Userinit` and `Shell` — specifies what runs during login/desktop initialization; modification here persists across all user sessions

Sysmon Events 12 and 13 monitor registry key creation and value writes respectively. Without Sysmon, Run key modifications produce no default Windows telemetry.

**Scheduled tasks**: `schtasks.exe` creates tasks with triggers on schedule, user login, system boot, or arbitrary events. Task XML definitions are stored in `C:\Windows\System32\Tasks`. Windows Security Event 4698 logs scheduled task creation with the full task XML, including the command that will execute. Attackers create tasks with legitimate-sounding names like "Windows Update Helper" or "Telemetry Diagnostics" [S023](../../research/security-foundations/01-sources/web/S023-windows-security-events.md).

**WMI event subscriptions**: the stealthiest Windows persistence mechanism. Three components: a Filter (what system event to watch), a Consumer (what command to run), and a Binding (connecting the filter to the consumer). WMI subscriptions survive reboots, are invisible to Task Manager and most AV products, and do not appear in the Autoruns tool's basic view without enabling WMI scanning. Sysmon Events 19, 20, and 21 log WMI filter, consumer, and binding creation respectively — these events have extremely high signal because legitimate WMI subscriptions are rare in most environments [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md).

**Services**: `HKLM\SYSTEM\CurrentControlSet\Services` defines Windows service configuration. An attacker-installed service starts at boot as a specified account (often SYSTEM), making it both highly persistent and highly privileged. Services are more visible than WMI subscriptions but more privileged than Run keys.

## Limitations

All of these persistence techniques are detectable — but detection requires a known-good baseline of what should be present. Without a documented baseline of authorized Run keys, scheduled tasks, services, and cron entries, you cannot distinguish an attacker's addition from a legitimate program's installation. The baseline must be established before an incident, not during one. Post-incident baseline construction from a potentially-compromised system is unreliable [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md).

## Key points

- Every persistence mechanism is a legitimate OS feature abused by the attacker; Run keys, cron, WMI subscriptions, and scheduled tasks all have authorized uses
- Detection requires a known-good baseline established before any incident; you cannot distinguish malicious from legitimate entries without knowing what was authorized
- WMI filter + consumer + binding (Sysmon Events 19/20/21) is the stealthiest Windows persistence path; extremely rare for legitimate use, very high signal when it fires
- Cron (`/etc/cron.d/`), systemd user services, rc.local, and SSH authorized_keys are the four primary Linux persistence locations to check on any suspicious host

## Go deeper

- [S015 — Sysmon v15](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md) — Events 12/13 for Run key monitoring; Events 19/20/21 for WMI subscription detection
- [S022 — Windows Registry](../../research/security-foundations/01-sources/web/S022-windows-registry.md) — Run/RunOnce/Services/Winlogon path structure; HKCU vs HKLM access control differences
- [S023 — Windows Security Events](../../research/security-foundations/01-sources/web/S023-windows-security-events.md) — Event 4698 scheduled task creation with full TaskContent XML field

---

*← [Previous lesson](./L10-linux-filesystem.md)* · *[Next lesson →](./L12-detecting-persistence.md)*
