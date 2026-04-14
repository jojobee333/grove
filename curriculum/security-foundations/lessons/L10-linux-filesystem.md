# The Filesystem as a Security Map: FHS and Bash Tools

**Module**: M05 · Linux Security — Permissions and the Filesystem
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C5 — The FHS provides a predictable forensic map; C6 — Bash pipelines are the primary investigation toolset

---

## The situation

You have a suspicious Linux host. You know the FHS (Filesystem Hierarchy Standard) tells you where things *should* be. That predictability is both a defensive advantage (you know where to look) and an attacker's playground (they know where to hide). Here is the map and the pipelines.

---

## Security-critical FHS locations

| Path | Purpose | Security relevance |
|---|---|---|
| `/etc/passwd`, `/etc/shadow` | User accounts and hashes | Check for unexpected accounts, UID=0 entries |
| `/etc/sudoers`, `/etc/sudoers.d/` | sudo configuration | NOPASSWD entries, wildcard commands |
| `/etc/cron.d/`, `/etc/cron.hourly/` | System cron jobs | Persistence — added files here run as root |
| `/var/spool/cron/crontabs/` | Per-user crontabs | Persistence — attacker crontabs for their user |
| `/etc/ssh/sshd_config` | SSH daemon configuration | PermitRootLogin, AuthorizedKeysFile path |
| `/home/*/.ssh/authorized_keys` | SSH authorized keys | Backdoor public keys for persistence |
| `/etc/rc.local` | Startup script | Legacy persistence location — still active on many systems |
| `/etc/systemd/system/` | System service units | New persistence location for systemd-based systems |
| `~/.config/systemd/user/` | User-level service units | Per-user persistence, runs on user login |
| `/tmp`, `/var/tmp` | World-writable temps | Attacker staging — look for executables, download artefacts |
| `/var/log/auth.log` | Authentication events | Failed logins, sudo use, SSH sessions |
| `/var/log/syslog` | General system log | Service starts/stops, cron execution |

(S007, S008)

---

## The investigation pipelines

**Failed login attempts with source IPs:**
```bash
grep "Failed password" /var/log/auth.log \
  | awk '{print $11}' \
  | sort | uniq -c | sort -rn \
  | head -20
```
Returns the top 20 source IPs by failed login count. Brute-force attacks show as one IP with thousands of failures. Credential stuffing shows as many IPs with one or two failures each.

**Successful logins (who logged in and when):**
```bash
last -a | head -30
```
Shows recent logins with username, terminal, source address, and timestamp.

**SUID binaries not in your expected list:**
```bash
find / -perm -4000 -type f 2>/dev/null | sort
```
Compare against the output from a known-clean baseline. New entries since last week are suspicious.

**Recently modified files in /etc:**
```bash
find /etc -newer /etc/passwd -type f 2>/dev/null
```
Finds files modified more recently than `/etc/passwd`. Adjust the reference file to your investigation timeline.

**Cron entries across all locations:**
```bash
for dir in /etc/cron.d /etc/cron.hourly /etc/cron.daily /etc/cron.weekly /etc/cron.monthly; do
  echo "=== $dir ==="; ls -la $dir 2>/dev/null
done
for user in $(cut -d: -f1 /etc/passwd); do
  crontab -u $user -l 2>/dev/null | grep -v '^#'
done
```

**World-writable files (staging ground check):**
```bash
find / -perm -002 -type f 2>/dev/null | grep -v '/proc\|/sys'
```

---

## The predictability principle

The FHS's strongest security property is predictability: a legitimate web server's web root is at `/var/www/html`, not `/tmp/srv`. Processes that run from `/tmp` are suspicious because nothing legitimate uses `/tmp` as a working directory for a persistent service. This is why attackers staging exploits in `/tmp` are detectable — not because `/tmp` is monitored specifically, but because its presence is anomalous compared to FHS conventions.

## Key points

- The FHS gives you a known-good map: anything outside expected locations for a given service is immediately suspicious
- `/etc/cron.d`, `/etc/rc.local`, `~/.config/systemd/user/` are the main Linux persistence locations — enumerate all of them on any suspicious host
- `grep "Failed password" /var/log/auth.log | awk | sort | uniq -c` is the basic brute-force detection pipeline

## Go deeper

- [S007 — FHS Filesystem Hierarchy](https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.html) — Full FHS specification and security notes
- [S008 — The Linux Command Line](https://linuxcommand.org/lc3_learning_the_shell.php) — Pipeline construction and text processing tools
- [S010 — Bash Scripting](https://tldp.org/LDP/abs/html/) — Advanced bash patterns for investigation scripts

---

*← [Previous: Linux Permissions](./L09-linux-permissions.md)* · *[Next: How Attackers Hide in Autorun Mechanisms](./L11-persistence-mechanisms.md) →*
