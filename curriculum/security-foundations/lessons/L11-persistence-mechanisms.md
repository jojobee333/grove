# How Attackers Hide in Legitimate Autorun Mechanisms

**Module**: M06 · Persistence — Abusing What the OS Trusts
**Type**: core
**Estimated time**: 14 minutes
**Claim**: C8 — Persistence via legitimate OS mechanisms is the attacker's default; detection requires baselining normal first

---

## The core idea

A skilled attacker does not install a rootkit that hides itself from the kernel. That is detectable and raises immediate suspicion. Instead, they create a scheduled task that runs every day at 3 AM, or a WMI subscription that fires every time a user logs in, or a cron job that re-downloads their tooling if removed.

These mechanisms are indistinguishable from legitimate administrative use without a baseline. A cron job is just a cron job. A registry Run key is just a Run key. Detecting malicious entries means knowing which ones were supposed to be there — and flagging newcomers.

## Why it matters

Persistence is how attackers survive across reboots and re-infections. After gaining initial access, the first two goals are escalation (get more privileges) and persistence (ensure you can come back). Without persistence, a single reboot or session timeout ends the intrusion. Understanding the persistence locations means knowing where to look to verify a host is clean and where to monitor for changes.

## Linux persistence locations

**Cron**: the most common Linux persistence mechanism.
- `/etc/cron.d/` — root-owned, system-wide; any file dropped here with correct syntax runs as root
- `/var/spool/cron/crontabs/[username]` — per-user crontabs; attacker-controlled user's crontab persists across logins
- `/etc/cron.hourly/`, `/etc/cron.daily/` — scripts placed here run on schedule without any explicit crontab entry

Detection: `find /etc/cron.d -newer /root/.bashrc` (compare against a baseline file you trust); diff current crontab state against saved baseline.

**systemd user services**: `~/.config/systemd/user/evil.service` runs when the user logs in, with no root required. Many organisations do not monitor user-level systemd units. The malicious service starts automatically, restarts on failure (`Restart=always`), and looks identical to a legitimate development utility. (S007)

**rc.local**: `/etc/rc.local` is executed at boot with root privileges. Many modern systems still have it enabled for legacy compatibility. An entry in rc.local survives nearly all incident response procedures short of full OS reinstall.

**SSH authorized_keys**: `~/.ssh/authorized_keys` is a persistence mechanism masquerading as authentication configuration. Attacker adds their public key. Persists indefinitely unless specifically audited.

## Windows persistence locations

**Registry Run keys**: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` and `HKCU\...\Run`. Any value present here launches its associated program at user login (HKCU) or system boot (HKLM). The per-user key requires no admin privileges and is not regularly audited on most systems.

**Scheduled tasks**: `schtasks.exe` creates tasks that run on schedule, at login, at boot, or on any system event. Task definitions are stored in C:\Windows\System32\Tasks. Attackers create tasks with legitimate-sounding names ("Windows Update Helper", "AV Scanner") that execute malicious binaries.

**WMI subscriptions**: the subtlest Windows persistence. Three components required: a Filter (what event to watch for), a Consumer (what to do), and a Binding (connecting the filter to the consumer). Standard monitoring tools do not display WMI subscriptions. They survive across reboots and are not visible to Task Manager or most AV tools. MITRE ATT&CK T1546.003. (S015, S016)

**Services**: `HKLM\SYSTEM\CurrentControlSet\Services` controls Windows service definitions. An attacker-installed service starts at boot and runs as a specified account, often SYSTEM. Services are more visible than WMI but more persistent than Run keys.

## Key points

- Every persistence mechanism is a legitimate OS feature — cron is for scheduling, WMI is for event-driven scripting, registry Run keys are for user startup programs
- Detection requires a known-good baseline; you cannot identify malicious entries without knowing what legitimate entries look like
- WMI subscriptions (filter + consumer + binding) are the stealthiest Windows persistence path — invisible to most standard monitoring

## Go deeper

- [S015 — Sysmon v15](../../../../../vault/research/security-foundations/01-sources/web/S015-sysmon-v15.md) — Sysmon events 19/20/21 for WMI subscription monitoring
- [S016 — AD Security Best Practices](../../../../../vault/research/security-foundations/01-sources/web/S016-ad-security-best-practices.md) — GPO-based persistence and scheduled task auditing
- [S007 — FHS](../../../../../vault/research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md) — Linux persistence location map

---

*← [Previous: The Filesystem as a Security Map](./L10-linux-filesystem.md)* · *[Next: Detecting Persistence Through Baselining](./L12-detecting-persistence.md) →*
