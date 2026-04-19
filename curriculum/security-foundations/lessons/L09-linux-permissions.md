# The Linux Permission Model for Security Work

**Module**: M05 · Linux Security — Permissions and the Filesystem
**Type**: core
**Estimated time**: 13 minutes
**Claim**: C4 from Strata synthesis

---

## The core idea

Linux permissions are not just an access control mechanism — they are the primary privilege boundary that determines what an attacker can accomplish after gaining a foothold. The rwx model defines what users can access. SUID bits and sudo misconfigurations define the paths from low-privileged access to root. Understanding the model means understanding both halves: what the boundary protects and where it can be bypassed.

Every file and directory has three permission sets: owner, group, and other (everyone else). Each set has three bits: read (r = 4), write (w = 2), execute (x = 1). Combining these in octal notation: `chmod 600 ~/.ssh/id_rsa` sets the file to owner-read + owner-write only, denying all access to group and other. SSH requires exactly this permission on private key files and will refuse to load a key file with broader permissions [S009](../../research/security-foundations/01-sources/web/S009-linuxcommand-permissions.md).

Two special bits extend the base model significantly:

**SUID (Set User ID on execution)**: when set on an executable, the process runs with the *file owner's* privileges rather than the caller's effective UID. `/usr/bin/passwd` is owned by root and has SUID set — any user running it temporarily acquires root's effective UID to write to `/etc/shadow`. This is intentional for specific system utilities. It becomes a privilege escalation target when SUID root is set on any binary with exploitable behaviour [S008](../../research/security-foundations/01-sources/web/S008-tlcl-linux-commandline.md).

**sudo**: grants specific users the ability to run specific commands as root (or another specified user). Configuration lives in `/etc/sudoers`. The principle is least-privilege delegation: `alice ALL=(root) /usr/bin/systemctl restart nginx` allows Alice to restart nginx as root without giving her a root shell. Misconfigured sudo rules — `NOPASSWD` on broad commands, wildcard paths, or `ALL` permissions — are among the most common local privilege escalation vectors in both CTF and production environments [S009](../../research/security-foundations/01-sources/web/S009-linuxcommand-permissions.md).

World-writable directories `/tmp` and `/var/tmp` are defined in the FHS as staging areas that any user may write to. This makes them predictable attacker staging grounds: dropped payloads, downloaded tools, and pivot scripts appear here because write permission is universal [S007](../../research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md).

## Why it matters

Privilege escalation is a core post-exploitation phase. After initial compromise as a low-privileged user (web server process, service account, phishing victim), the attacker's next goal is reaching root or another high-value account. The Linux permission model defines exactly how feasible that is on a given system.

A defender who can enumerate over-privileged SUID binaries and permissive sudo rules before an attacker finds them is performing the same discovery work the attacker would perform. On any Linux system you are asked to assess, the SUID binary list and the sudoers file are the first two permission artifacts to examine.

## A concrete example

**Finding SUID privilege escalation paths**

```bash
find / -perm -4000 -type f 2>/dev/null | sort
```

This returns every file with the SUID bit set, suppressing permission errors from unreadable directories. On a typical system you will see `/usr/bin/passwd`, `/bin/su`, `/usr/bin/sudo`, and a small set of well-known utilities. On a misconfigured system you might see `/usr/local/bin/legacy_tool` — owned by root, SUID set, written six months ago by an administrator who has since left [S008](../../research/security-foundations/01-sources/web/S008-tlcl-linux-commandline.md).

GTFOBins documents which SUID binaries can be abused for privilege escalation. If `find` has SUID set: `find . -exec /bin/sh -p \; -quit` spawns a root shell via the `-exec` mechanism. If `vim` has SUID set: `:!bash` from inside the editor. The feature being abused is the legitimate `-exec` or shell-escape functionality of the binary — it was always designed to execute other programs; SUID root makes those executions privileged.

**Auditing sudo permissions**

```bash
sudo -l
```

Run as any user to see what that user is allowed to execute with sudo. `(root) NOPASSWD: /usr/bin/vim` is an immediate escalation: enter the editor, use `:!bash` to get a root shell, no password required. `(root) /usr/bin/python3 /opt/scripts/*.py` with a wildcard path allows the user to create `/opt/scripts/evil.py` and have it execute as root. Both are real misconfigurations found regularly on CTF machines and occasionally in production [S009](../../research/security-foundations/01-sources/web/S009-linuxcommand-permissions.md).

## There is a real disagreement here

The Linux permission model is described as a security boundary, but S010 and S008 both acknowledge that root bypasses the Unix permission model entirely: root (UID 0) ignores read, write, and execute restrictions on all files not protected by capabilities. A process running as root is not bounded by rwx. This creates a tension in the security model: permissions protect non-root users effectively; they provide no protection once root is obtained, and SUID bits on root-owned executables are the ladder an attacker climbs.

The resolution is not that the permission model is broken — it is that the permission model is explicitly designed for non-root users. Root and SUID are intentional exceptions, documented as such, and the security recommendation is: minimize SUID binaries, minimize processes running as root, minimize sudo grants. The boundary exists and is effective within its scope; the design explicitly acknowledges that root is outside that scope [S008](../../research/security-foundations/01-sources/web/S008-tlcl-linux-commandline.md).

## Limitations

SELinux, AppArmor, and POSIX ACLs provide controls beyond the base rwx model. SELinux assigns security contexts (labels) to files and processes, enforcing mandatory access control policies that constrain root processes as well as unprivileged ones — a process running as root but with a confined SELinux type cannot write to files outside its policy. AppArmor operates similarly with path-based profiles. Coverage and default enforcement vary significantly by distribution: SELinux enforcing mode is default on RHEL/CentOS/Fedora; AppArmor is default on Ubuntu/Debian; many embedded or minimal systems have neither. When assessing a host, determine which MAC system is active and enforcing before concluding that SUID exploitation will work as expected [S009](../../research/security-foundations/01-sources/web/S009-linuxcommand-permissions.md).

## Key points

- SUID root binaries run with root's effective UID regardless of who launches them; `find / -perm -4000 -type f` enumerates the full attack surface; cross-reference with GTFOBins
- `sudo -l` reveals the complete sudo privilege map for any user; NOPASSWD entries and wildcard paths are immediate escalation paths
- Root bypasses the Unix permission model entirely — permissions are a boundary for non-root users; minimizing SUID, root services, and sudo scope is the correct response
- SELinux/AppArmor extend beyond rwx and constrain root processes; their presence changes privilege escalation feasibility significantly

## Go deeper

- [S009 — Linux Command Permissions](../../research/security-foundations/01-sources/web/S009-linuxcommand-permissions.md) — rwx model, SUID/SGID bits, chmod octal notation, and sudo via /etc/sudoers
- [S008 — The Linux Command Line](../../research/security-foundations/01-sources/web/S008-tlcl-linux-commandline.md) — SUID bit mechanics, sticky bit on /tmp, and the `find -perm -4000` command
- [S007 — FHS Filesystem Hierarchy](../../research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md) — World-writable directories /tmp and /var/tmp; expected locations for SUID binaries

---

*← [Previous lesson](./L08-passwords-pki.md)* · *[Next lesson →](./L10-linux-filesystem.md)*
