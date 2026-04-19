# The Filesystem as a Security Map: FHS and Bash Tools

**Module**: M05 · Linux Security — Permissions and the Filesystem
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C5 from Strata synthesis

---

## The situation

You have a suspicious Linux host. You know the FHS (Filesystem Hierarchy Standard) tells you where things *should* be. That predictability is both the defender's advantage and the attacker's staging ground. Predictability means you can define "normal" and quickly identify what deviates from it. This lesson maps the security-critical FHS locations and provides the bash investigation pipelines to query them.

---

## The FHS security map

Every security-relevant location on a Linux host appears in a predictable FHS path. Knowing this map means knowing where to look first on any host [S007](../../research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md):

| Path | Security relevance |
|---|---|
| `/etc/passwd`, `/etc/shadow` | User accounts; check for unexpected accounts, UID=0 entries |
| `/etc/sudoers`, `/etc/sudoers.d/` | sudo grants; NOPASSWD entries, wildcard commands |
| `/etc/cron.d/`, `/etc/cron.hourly/` | System cron persistence; any file here runs on schedule as root |
| `/var/spool/cron/crontabs/` | Per-user crontabs; attacker's user crontab persists across logins |
| `/etc/rc.local` | Boot-time persistence; still active on many systems for legacy compatibility |
| `/etc/systemd/system/` | System service unit persistence |
| `~/.config/systemd/user/` | Per-user service persistence; runs at user login without root |
| `/home/*/.ssh/authorized_keys` | SSH key-based persistence; attacker's public key grants permanent shell access |
| `/tmp`, `/var/tmp` | World-writable staging areas; attacker-dropped payloads appear here |
| `/var/log/auth.log` | Authentication events: failed logins, sudo use, SSH sessions |
| `/var/log/syslog` | Service starts/stops, cron execution, boot messages |
| `/proc/[PID]/` | Live process memory maps, open file descriptors, command line for running processes |

---

## The investigation pipelines

**Failed login attempts with source IP ranking:**

```bash
grep "Failed password" /var/log/auth.log \
  | awk '{print $11}' \
  | sort | uniq -c | sort -rn \
  | head -20
```

Returns top 20 source IPs by failed login count. A brute-force attack produces one IP with thousands of failures. A credential-stuffing campaign produces many IPs with one or two failures each — different shapes require different responses [S008](../../research/security-foundations/01-sources/web/S008-tlcl-linux-commandline.md).

**Successful logins:**

```bash
last -a | head -30
```

Shows recent logins with username, terminal, source address, and timestamp. `lastb` shows failed authentication attempts from `/var/log/btmp`.

**SUID binaries not in your expected set:**

```bash
find / -perm -4000 -type f 2>/dev/null | sort > /tmp/current_suid.txt
diff /var/baseline/suid_baseline.txt /tmp/current_suid.txt
```

Compare against a saved baseline from a known-clean state. Any addition since the baseline was taken is an immediate investigation priority [S007](../../research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md).

**Recently modified configuration files:**

```bash
find /etc -newer /etc/passwd -type f 2>/dev/null
```

Finds files modified more recently than `/etc/passwd`. Adjust the reference file to your timeline. `/etc/passwd` was last modified when the last user account was created — use a more recent reference file if that predates your investigation window.

**All cron entries across all locations:**

```bash
for dir in /etc/cron.d /etc/cron.hourly /etc/cron.daily /etc/cron.weekly /etc/cron.monthly; do
  echo "=== $dir ==="; ls -la "$dir" 2>/dev/null
done
for user in $(cut -d: -f1 /etc/passwd); do
  crontab -u "$user" -l 2>/dev/null | grep -v '^#' | grep -v '^$' && echo "[user: $user]"
done
```

Enumerates all cron locations in a single sweep. Any entry that does not match your known-good list is worth investigating [S010](../../research/security-foundations/01-sources/web/S010-tldp-abs-bash-scripting.md).

**World-writable files outside expected locations:**

```bash
find / -perm -002 -type f 2>/dev/null | grep -v '/proc\|/sys\|/dev'
```

Anything world-writable that is not under `/tmp`, `/var/tmp`, or a known shared directory is a configuration defect. An attacker who can write to a world-writable file executed by root (cron job, startup script) has root code execution.

---

## The predictability principle

The FHS's security value is predictability: a legitimate web server's root is at `/var/www/html`; its log files are at `/var/log/apache2/`; its config is at `/etc/apache2/`. A process serving web content from `/tmp/server` is structurally anomalous. Nothing legitimate uses `/tmp` as a persistent service working directory. This is why files staged in `/tmp` are detectable — not because `/tmp` is monitored for malware specifically, but because the FHS predicts that no legitimate service should originate there [S007](../../research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md).

The same logic applies to `/proc/[PID]/exe`. Each process has a symlink at `/proc/[PID]/exe` pointing to its executable. A process whose executable path is in `/tmp` or `/var/tmp` is an immediate finding. A process whose executable was deleted (the symlink resolves to `(deleted)`) indicates a technique where an attacker dropped a binary, executed it, and removed the file to impede forensics while the process continues running in memory.

## Limitations

The bash investigation pipelines assume log files are intact and contain truthful data. Log tampering is a common attacker technique: cleared `auth.log`, modified timestamps via `touch`, or redirected syslog. Critical forensic artifacts may require offline analysis of a captured disk image rather than live examination of the running system — a rootkit or privileged attacker can modify the kernel's view of running processes, open files, and even filesystem contents that live tools enumerate. For confirmed high-severity incidents, prefer offline imaging over live analysis [S008](../../research/security-foundations/01-sources/web/S008-tlcl-linux-commandline.md).

## Key points

- The FHS provides a predictable forensic map: anything outside its expected location for a service type is structurally suspicious without needing a known-malicious indicator
- `/etc/cron.d`, `~/.config/systemd/user/`, `/etc/rc.local`, and `~/.ssh/authorized_keys` are the primary Linux persistence locations; enumerate all four on any suspicious host
- `find /etc -newer /reference_file -type f` and SUID baseline diffing are the two highest-yield forensic searches for rapid triage
- Live investigation may be unreliable if the host is actively compromised; offline disk image analysis is more reliable for confirmed intrusions

## Go deeper

- [S007 — FHS Filesystem Hierarchy](../../research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md) — Full FHS specification; world-writable directories and their designed purpose
- [S008 — The Linux Command Line](../../research/security-foundations/01-sources/web/S008-tlcl-linux-commandline.md) — grep/awk/sort/uniq/find pipeline construction for log analysis
- [S010 — Bash Scripting Guide](../../research/security-foundations/01-sources/web/S010-tldp-abs-bash-scripting.md) — While-read loops, regex matching, tee for producing audit trail output alongside terminal display

---

*← [Previous lesson](./L09-linux-permissions.md)* · *[Next lesson →](./L11-persistence-mechanisms.md)*
