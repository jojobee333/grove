# Linux Filesystem — The Forensic Map

**Module**: M07 · Linux Filesystem, Permissions, Incident Response  
**Type**: core  
**Estimated time**: 28 minutes  
**Claim**: C5 from Strata synthesis

---

## The core idea

The Linux Filesystem Hierarchy Standard (FHS) defines where everything lives on a Linux system: executables, configuration files, logs, temporary files, user home directories, system libraries. Every Linux distribution follows this standard — with minor variations — which means that an attacker who knows the FHS can predict where to stage files, where to write persistence mechanisms, and where to look for sensitive credentials. Conversely, a defender who knows the FHS knows exactly where to look when investigating a compromise.

The research (Claim C5) identifies the FHS as a **forensic map**: predictable attacker staging locations (`/tmp`, `/var/tmp`), predictable persistence paths (`/etc/cron.d`, `/etc/systemd/system/`), and predictable log paths (`/var/log/auth.log`, `/var/log/syslog`). This predictability works both ways — and attackers use it too.

**Why Linux?** Linux runs the overwhelming majority of internet-facing servers, cloud infrastructure, containers, network devices, and Android devices. A security professional who cannot navigate a Linux filesystem fluently cannot work in most enterprise or cloud environments.

## Why it matters

Forensic investigations of compromised Linux systems follow a predictable workflow: check the expected attacker staging areas, check the persistence locations, check the logs. Without knowing the FHS, an investigator is lost in an unfamiliar filesystem. With it, a first-responder knows exactly which 15 paths to check within the first five minutes.

This lesson also establishes the foundation for L20 (Linux permissions — understanding the permission model requires knowing what kinds of files and directories exist in the FHS) and L21 (bash log analysis — knowing which log files exist and what they contain).

## A concrete example

### Key FHS Directories

```
/
├── bin/        # Essential user command binaries (ls, cp, mv, cat)
├── sbin/       # System binaries, usually root-only (iptables, mount)
├── usr/
│   ├── bin/    # Non-essential user command binaries (most installed programs)
│   ├── lib/    # Libraries for /usr/bin
│   └── local/  # Locally compiled/installed software (not from package manager)
├── etc/        # System-wide configuration files
├── home/       # User home directories (/home/alice, /home/bob)
├── root/       # Root user's home directory (separate from /home)
├── var/
│   ├── log/    # Log files
│   ├── tmp/    # Temporary files (PERSISTS across reboots unlike /tmp on some systems)
│   ├── www/    # Web server document roots (Apache: /var/www/html)
│   └── spool/  # Print queues, mail queues, cron spool
├── tmp/        # Temporary files (may be cleared on reboot; world-writable)
├── proc/       # Virtual filesystem: kernel/process information (not on disk)
├── sys/        # Virtual filesystem: hardware/kernel interfaces
├── dev/        # Device files (/dev/sda, /dev/null, /dev/urandom)
├── lib/        # Shared libraries for /bin and /sbin
├── opt/        # Optional add-on application software (some vendors use this)
├── mnt/        # Mount point for temporarily mounted filesystems
└── media/      # Mount points for removable media (USB drives, CDs)
```

### Security-Relevant Paths

**Credential and configuration files**:

| Path | Contents | Why Attackers Want It |
|------|---------|----------------------|
| `/etc/passwd` | User accounts (username, UID, GID, home dir, shell) | Lists all user accounts; historically contained hashed passwords (now in shadow) |
| `/etc/shadow` | Hashed passwords (root readable only) | Contains password hashes for cracking |
| `/etc/sudoers` | Who can run sudo and with what permissions | Persistence via adding accounts; privilege escalation via misconfiguration |
| `/etc/hosts` | Local hostname-to-IP mappings | Hijacking DNS resolution for specific hosts |
| `/etc/crontab` | System-wide cron schedule | Persistence: execute commands on schedule |
| `/etc/cron.d/` | Additional cron job files | Persistence: attackers drop files here |
| `/root/.ssh/` | Root's SSH authorized keys | Persistence: add attacker's SSH key |
| `/home/*/.ssh/` | User SSH keys and authorized_keys | Credential theft; persistence |
| `/root/.bash_history` | Root's command history | Forensics: what commands did root run? |

**Log files**:

| Path | Contents | Security Use |
|------|---------|-------------|
| `/var/log/auth.log` (Debian/Ubuntu) | SSH logins, su/sudo usage, authentication events | Detect brute force, unauthorized logins, privilege escalation |
| `/var/log/secure` (RHEL/CentOS) | Same as auth.log (different filename) | Same |
| `/var/log/syslog` | General system messages | Process crashes, service failures, kernel messages |
| `/var/log/messages` | General system messages (RHEL/CentOS) | Same as syslog |
| `/var/log/apache2/access.log` | Web server access log | Detect web exploitation attempts, path traversal, injection |
| `/var/log/apache2/error.log` | Web server error log | Application errors indicating exploitation attempts |
| `/var/log/nginx/access.log` | Nginx access log | Same as Apache |
| `/var/log/audit/audit.log` | Linux Audit Framework events (if auditd running) | Comprehensive syscall-level logging for forensics |
| `/var/log/wtmp` | Login records (binary, read with `last`) | Complete login/logout history |
| `/var/log/btmp` | Failed login records (binary, read with `lastb`) | Brute force detection |
| `/var/log/lastlog` | Last login for each user (binary, read with `lastlog`) | Detect dormant accounts being used |

**Attacker staging areas** (world-writable or predictably accessible):

| Path | Why Attackers Use It | What to Look For |
|------|---------------------|-----------------|
| `/tmp/` | World-writable; available without privileges; common first-stage landing zone | Unusual executables, scripts, downloaded payloads, sockets |
| `/var/tmp/` | Same as /tmp but may persist across reboots | Same; particularly for persistence |
| `/dev/shm/` | In-memory filesystem (RAM-backed); files disappear on reboot; no disk forensics | In-memory malware, cryptominers, C2 tools |

**Persistence mechanisms** (where attackers write to survive reboots):

| Path | Mechanism | Detection |
|------|----------|----------|
| `/etc/cron.d/` | Cron job files; execute on schedule as root | Unexpected files; unusual commands |
| `/etc/crontab` | System crontab | Modified entries |
| `/var/spool/cron/crontabs/` | Per-user crontabs | `crontab -l -u username` |
| `/etc/systemd/system/` | Systemd service units | Unexpected `.service` files; `systemctl list-units` |
| `/etc/rc.local` | Legacy startup script | Modified content |
| `/etc/profile.d/` | Scripts sourced for all user shells | Unexpected `.sh` files |
| `/etc/ld.so.preload` | Library preload file; executed before any program | Any content is suspicious; used for rootkits |
| `~/.bashrc`, `~/.profile`, `~/.bash_profile` | User shell initialization | Modified to execute commands on login |

### A First-Five-Minutes Checklist

When you first access a potentially compromised Linux system:

```bash
# 1. Check for unusual processes
ps aux | grep -v "\[" | sort -rn -k3 | head -20  # High CPU usage
ps aux | grep -E "(tmp|shm|dev/shm)"              # Processes running from /tmp or shm

# 2. Check listening services
ss -tlnp   # or: netstat -tlnp
# Look for unexpected listening ports or processes

# 3. Check recent logins
last | head -30      # Recent logins (from wtmp)
lastb | head -30     # Failed logins (from btmp)

# 4. Check for unexpected cron jobs
ls -la /etc/cron.d/
cat /etc/crontab
crontab -l -u root 2>/dev/null

# 5. Check for unexpected files in staging areas
find /tmp /var/tmp /dev/shm -type f -newer /tmp 2>/dev/null
ls -lat /tmp/ | head -20   # Sort by modification time

# 6. Check systemd services for unusual entries
systemctl list-units --type=service --state=running | grep -v ".service$"

# 7. Check /etc/ld.so.preload (rootkit indicator)
cat /etc/ld.so.preload 2>/dev/null && echo "WARNING: ld.so.preload exists"

# 8. Recent file changes in sensitive directories
find /etc -newer /etc/passwd -type f 2>/dev/null
find /usr/local/bin /usr/bin -newer /etc/passwd -type f 2>/dev/null
```

This checklist is not exhaustive — it is the first pass. The goal is to quickly determine whether a system is compromised and find the initial indicators to direct further investigation.

## Key points

- The FHS defines where everything lives on Linux systems; knowledge of the FHS is prerequisite for both attacking and defending Linux systems
- Attacker staging: `/tmp/`, `/var/tmp/`, `/dev/shm/` — check for unexpected executables or scripts; `/dev/shm` is in-memory and leaves no disk artifacts
- Log files: `/var/log/auth.log` (or `/var/log/secure`) for authentication events; `/var/log/audit/audit.log` for comprehensive audit logging
- Persistence mechanisms: cron jobs in `/etc/cron.d/`; systemd units in `/etc/systemd/system/`; shell init files in `~/.bashrc`; `/etc/ld.so.preload` is a rootkit indicator
- Credential files: `/etc/shadow` contains password hashes (root-readable only); `/home/*/.ssh/authorized_keys` can be modified to add attacker SSH keys
- The FHS's predictability is a two-edged sword: attackers use it to find targets quickly; defenders use it to find artifacts quickly

## Go deeper

- [S005](../../../../vault/research/security-foundations/01-sources/) — Linux FHS specification
- [S004](../../../../vault/research/security-foundations/01-sources/) — Linux forensic investigation paths and attacker staging patterns

---

*[← Previous: PKI Certificate Chains](./L18-pki-certificate-chain.md)* · *[Next: Linux Permissions — The rwx Model and Where It Breaks →](./L20-linux-permissions.md)*
