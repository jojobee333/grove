# Linux Permissions — The rwx Model and Where It Breaks

**Module**: M07 · Linux Filesystem, Permissions, Incident Response  
**Type**: core  
**Estimated time**: 28 minutes  
**Claim**: C4 from Strata synthesis

---

## The core idea

Linux permissions are the enforcement boundary between what users are allowed to do and what the system should prevent. The core model is simple: every file and directory has an owner (a user) and a group. Three sets of permissions — read, write, execute — control what the owner, the group members, and everyone else can do. This is the **rwx model** (read-write-execute).

Two additional permission bits sit on top of this model: **SUID** (Set User ID on execution) and **SGID** (Set Group ID on execution). SUID causes an executable to run with the file owner's privileges rather than the executing user's privileges. This mechanism enables legitimate system tools (like `passwd`, which needs to write to `/etc/shadow`, a root-owned file) to work for ordinary users — and it is the most common privilege escalation vector on misconfigured Linux systems.

The research (Claim C4) states: Linux rwx/SUID/sudo is the enforcement boundary; SUID and sudo misconfigurations are the bypass conditions.

## Why it matters

Understanding the permission model is the prerequisite for understanding privilege escalation — how an attacker who has gained access as an unprivileged user elevates to root. The vast majority of Linux privilege escalation paths involve one of:
1. A misconfigured SUID binary
2. A dangerous sudo rule
3. A world-writable file in the execution path of a privileged process
4. A cron job running as root that executes a user-writable script

You cannot understand CTF privilege escalation challenges, real-world post-exploitation, or Linux hardening without this foundation.

## A concrete example

### The rwx Model

Every file and directory on Linux has three permission triplets:

```
-rwxr-xr--  2  root  staff  4096  Apr 18  /usr/bin/example
```

Breaking down `-rwxr-xr--`:

| Character | Meaning |
|-----------|---------|
| `-` | File type: `-` = regular file, `d` = directory, `l` = symlink |
| `rwx` | Owner permissions: read ✓, write ✓, execute ✓ |
| `r-x` | Group permissions: read ✓, write ✗, execute ✓ |
| `r--` | Others permissions: read ✓, write ✗, execute ✗ |

The **owner** is `root`. The **group** is `staff`.

**Numeric representation**: Each permission triplet can be written as a three-bit octal number. `rwx` = 7, `r-x` = 5, `r--` = 4. So `-rwxr-xr--` = 754.

For directories:
- **Read** (`r`): Can list the directory contents (`ls`)
- **Write** (`w`): Can create, delete, or rename files in the directory
- **Execute** (`x`): Can traverse (cd into) the directory and access files within it (needed for any sub-path traversal)

**chmod** changes permissions. `chmod 755 file` = `-rwxr-xr-x`. `chmod 600 file` = `-rw-------`. `chmod o-r file` removes read permission from others.

---

### SUID — The Privilege Escalation Vector

**What SUID does**: When a file has the SUID bit set, it executes with the **file owner's privileges** rather than the invoking user's privileges.

**The legitimate use case**: `/usr/bin/passwd` allows any user to change their own password. Password hashes are stored in `/etc/shadow`, which is owned by root and readable only by root (`-r--------`). The `passwd` binary has SUID set and is owned by root:

```
-rwsr-xr-x  1  root  root  54256  Jan  1  /usr/bin/passwd
```

The `s` in `rws` (owner execute position) indicates the SUID bit. When you run `/usr/bin/passwd`, the process runs with root privileges — allowing it to write to `/etc/shadow`. When the process exits, your shell is back to your normal user privileges.

**Finding SUID binaries**:

```bash
find / -perm -4000 -type f 2>/dev/null
```

This finds all files with the SUID bit set (`-4000` in octal). On a normal system, you expect to see a small list of known system binaries (`passwd`, `su`, `sudo`, `ping`, `mount`). Any unexpected SUID binary — particularly one in `/tmp/`, `/var/tmp/`, or a user's home directory — is a critical finding.

**The privilege escalation pattern**: An attacker who finds a SUID binary (owned by root) that can be abused to execute arbitrary commands gets root privileges. Classic examples:

- A custom SUID binary written by a developer that calls `system("ls")` (without full path) — an attacker who controls the `PATH` environment variable can substitute a malicious `ls` binary
- `find` with SUID (never legitimate on a standard system): `find . -exec /bin/sh \; -quit` — spawns a root shell
- A SUID text editor: open `/etc/shadow` as root and add a new account
- **GTFOBins** (https://gtfobins.github.io/) catalogs exactly which SUID binaries can be abused and how

---

### sudo — The Privileged Delegation System

`sudo` allows specific users to run specific commands as root (or as another user). The `/etc/sudoers` file (or files in `/etc/sudoers.d/`) defines the rules.

**Syntax**:
```
# Format: user  HOST=(run_as_user) command
alice  ALL=(ALL:ALL) ALL    # alice can run any command as any user
bob    ALL=(root) /usr/bin/apt-get update  # bob can only run this one command
carol  ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx  # no password required
```

**Common sudo misconfigurations that lead to privilege escalation**:

1. **`(ALL) NOPASSWD: /usr/bin/vi`**: If a user can run `vi` as root without a password, they can spawn a root shell from within vi: `:!/bin/bash`

2. **`(ALL) /path/to/custom_script.sh`**: If the script is writable by the user, or if the script calls other programs without full paths (PATH injection), or if the script accepts user-controlled input that is passed to a shell command, an attacker can achieve root code execution through the script.

3. **`(ALL) NOPASSWD: /usr/bin/find`**: `sudo find / -exec /bin/sh \; -quit` — root shell.

4. **`(ALL) /usr/bin/python3 /opt/app/backup.py`**: If `/opt/app/backup.py` is in a writable directory, the attacker replaces it.

5. **Dangerous wildcards**: `(ALL) /usr/bin/rsync *` — the wildcard allows passing arbitrary flags to rsync, including `--rsh` which controls the shell used for remote sync and can be abused.

**Checking sudo rules as an attacker**:
```bash
sudo -l    # List what the current user can run with sudo
```

**Checking sudo rules as a defender**:
```bash
cat /etc/sudoers
ls -la /etc/sudoers.d/
```

---

### World-Writable Files and Directories

A world-writable file (`-rw-rw-rw-`, permission 666) can be written by any user. A world-writable directory (`drwxrwxrwx`, 777) allows any user to create, delete, or rename files within it.

**Finding them**:
```bash
find / -type f -perm -002 -not -path "/proc/*" 2>/dev/null  # world-writable files
find / -type d -perm -002 -not -path "/proc/*" 2>/dev/null  # world-writable directories
```

**Why they matter**: If a root-owned cron job runs a script that is world-writable, any user can modify that script to add their own commands — which will execute as root on the next cron run. If a PATH directory that root uses is world-writable, an attacker can place a malicious binary there with the name of a command the cron job calls.

---

### umask — The Default Permission Mask

`umask` is the default permission subtraction applied when new files and directories are created. A umask of `022` means: new files get `0666 XOR 022 = 0644` (`-rw-r--r--`), new directories get `0777 XOR 022 = 0755` (`drwxr-xr-x`). A umask of `077` means all new files are `-rw-------` (only the owner can read/write).

Checking the current umask:
```bash
umask
```

A world-accessible umask (like `000` or `002`) on a sensitive service (web server, database) can expose files that should be private.

## Key points

- The rwx model: three permission triplets (owner, group, others) × three permissions (read, write, execute) = nine bits; represented as octal (755, 644, 600)
- SUID bit (`s` in owner execute position): executable runs with the file owner's privileges; owned by root + SUID = root execution; find all SUID binaries with `find / -perm -4000 -type f`
- sudo rules define command delegation; common misconfigurations: unconstrained text editors, writable scripts, wildcard arguments, NOPASSWD on powerful tools
- `sudo -l` lists what the current user can run; first thing an attacker checks after gaining access
- World-writable files/directories in execution paths of privileged processes are privilege escalation vectors
- GTFOBins catalogs how common SUID and sudo-allowed binaries can be abused for privilege escalation

## Go deeper

- [S004](../../../../vault/research/security-foundations/01-sources/) — Linux permission model, SUID/SGID mechanics, sudo privilege escalation patterns

---

*[← Previous: Linux Filesystem Hierarchy](./L19-linux-fhs.md)* · *[Next: Bash Log Analysis — Finding Incidents With grep and awk →](./L21-bash-log-analysis.md)*
