# The Linux Permission Model for Security Work

**Module**: M05 · Linux Security — Permissions and the Filesystem
**Type**: core
**Estimated time**: 13 minutes
**Claim**: C4 — The rwx/SUID/sudo privilege model defines the Linux security boundary and creates specific privilege escalation paths

---

## The core idea

Linux permissions are not just an access control mechanism — they are a privilege boundary that determines what an attacker can do after gaining a foothold. Understanding the model means understanding both what legitimate users can access and which bits create escalation paths to root.

Every file and directory has three permission sets: owner, group, and other. Each set has three bits: read (r = 4), write (w = 2), execute (x = 1). This is the rwx model. Two special bits extend it: SUID and SGID.

**SUID (Set User ID)**: when set on an executable, the process runs with the *file owner's* privileges, not the caller's. If `/usr/bin/passwd` is owned by root and has SUID set, any user running it gains root's effective UID to modify `/etc/shadow`. This is intentional for specific system utilities — and it is a privilege escalation target for attackers who find unexpected SUID binaries. (S009)

**SGID (Set Group ID)**: similar to SUID but elevates to the file's *group* rather than owner. On directories, SGID causes newly created files to inherit the directory's group — used for shared project directories.

**sudo**: grants specific users or groups the ability to run specific commands as root (or another user). The configuration is in `/etc/sudoers`. Misconfigured sudo rules — especially `NOPASSWD` entries or wildcard command paths — are among the most common local privilege escalation vectors in CTF and real environments. (S009)

## Why it matters

Privilege escalation is a core post-exploitation technique. After gaining initial access as a low-privileged user, the goal is reaching root or another high-value account. The Linux permission model determines how feasible that is. An auditor or defender who can identify over-privileged SUID binaries and permissive sudo rules before an attacker finds them is far ahead.

## A concrete example

**Finding SUID escalation paths**: run `find / -perm -4000 -type f 2>/dev/null`. This returns every file with the SUID bit set, suppressing permission errors. On a typical system you'll see `/usr/bin/passwd`, `/bin/su`, and several others — all legitimate. On a misconfigured or compromised system you might see `/usr/local/bin/custom_app` — owned by root, SUID set, written three months ago.

GTFOBins (https://gtfobins.github.io) documents which SUID binaries can be abused for privilege escalation. If `find` itself has SUID set: `find . -exec /bin/sh -p \; -quit` spawns a root shell. The "feature" being abused: `find` with SUID executes the `-exec` argument as root.

**sudo -l**: run `sudo -l` as any user to see what commands that user is allowed to run with sudo. `(root) NOPASSWD: /usr/bin/vim` allows privilege escalation via Vim's shell escape: `:!bash`.

## Key points

- SUID binaries run as their file owner regardless of who launches them — SUID root binaries owned by root are escalation targets if they have exploitable behaviour
- `find / -perm -4000 -type f 2>/dev/null` finds all SUID binaries; cross-reference against the expected list
- `sudo -l` reveals which users have which sudo permissions; NOPASSWD entries and wildcard paths are immediate escalation candidates

## Go deeper

- [S009 — Linux Command Permissions](../../../../../vault/research/security-foundations/01-sources/web/S009-linuxcommand-permissions.md) — rwx model, SUID/SGID, practical chmod and find commands
- [S007 — FHS Filesystem Hierarchy](../../../../../vault/research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md) — Where SUID binaries are expected to live

---

*← [Previous: Passwords, Hashing, and PKI](./L08-passwords-pki.md)* · *[Next: The Filesystem as a Security Map](./L10-linux-filesystem.md) →*
