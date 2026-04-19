# Bash Log Analysis — Finding Incidents With grep, awk, and cut

**Module**: M07 · Linux Filesystem, Permissions, Incident Response  
**Type**: applied  
**Estimated time**: 30 minutes  
**Claim**: C6 from Strata synthesis

---

## The situation

A Linux system has been flagged as suspicious. An alert fired for outbound connection attempts to a known C2 IP address. You have SSH access to the host. You have no dedicated SIEM, no endpoint agent, no EDR — just the system's log files and a bash terminal. Your task: determine whether the system is compromised, and if so, identify the timeline of events.

This is not a hypothetical scenario — it describes the first-response situation in thousands of small and mid-sized organizations, cloud environments without monitoring tooling, and CTF forensic challenges. The research (Claim C6) identifies bash pipelines (grep, awk, cut, sort, uniq) as handling the majority of ad-hoc Linux log analysis when purpose-built tools are not available.

## The approach

Log analysis follows a pattern: start from the alert indicator, work backward to establish a timeline, then work forward from the timeline to find the full scope of compromise.

The tools: `grep` (search text with patterns), `awk` (field extraction and computation), `cut` (simple field extraction by delimiter), `sort` (sort lines), `uniq` (count or deduplicate adjacent identical lines), `wc` (count lines/words/chars), `tail` and `head` (last/first N lines), `sed` (stream editing — substitution, deletion).

## A worked example

### Task 1 — Find All Failed SSH Login Attempts

**Log file**: `/var/log/auth.log` (Debian/Ubuntu) or `/var/log/secure` (RHEL/CentOS)

**Typical auth.log line for a failed SSH login**:
```
Apr 18 14:22:31 webserver sshd[12345]: Failed password for invalid user admin from 203.0.113.42 port 54321 ssh2
```

**Find all failed password attempts**:
```bash
grep "Failed password" /var/log/auth.log
```

**Count failed attempts per source IP (top offenders)**:
```bash
grep "Failed password" /var/log/auth.log \
  | awk '{print $NF}' \    # Last field is "ssh2" — we want field before port
  | grep -oP 'from \K[\d.]+' \  # Extract IP after "from"
  | sort \
  | uniq -c \
  | sort -rn \
  | head -20
```

Alternatively with awk to extract the source IP (field 11 in the typical line format):
```bash
grep "Failed password" /var/log/auth.log \
  | awk '{print $11}' \
  | sort \
  | uniq -c \
  | sort -rn \
  | head -20
```

**Output interpretation**: An IP with thousands of failed attempts is brute-forcing. An IP with exactly 1 failed attempt per 30–60 seconds is doing slow brute force (rate-limited, trying to avoid lockout detection).

---

### Task 2 — Find Successful Logins After Failed Attempts From Same IP

This combination is the critical indicator: failed attempts followed by a success from the same source means the brute force succeeded.

```bash
# Find IPs with successful logins
grep "Accepted password\|Accepted publickey" /var/log/auth.log \
  | awk '{print $11}' \
  | sort | uniq > /tmp/successful_ips.txt

# Find IPs with failed attempts
grep "Failed password" /var/log/auth.log \
  | awk '{print $11}' \
  | sort | uniq > /tmp/failed_ips.txt

# Find IPs in both lists (brute force succeeded)
comm -12 /tmp/successful_ips.txt /tmp/failed_ips.txt
```

Or in a single pipeline:
```bash
# Show all accepted logins — sort by user and IP for review
grep "Accepted" /var/log/auth.log \
  | awk '{print $1, $2, $3, $9, $11}' \
  | sort -k4 -k5
```

---

### Task 3 — Build a Login Timeline for a Specific IP

Once you have identified a suspicious IP, reconstruct the full timeline of its activity:

```bash
# All events from a specific IP (replace with actual IP)
grep "203.0.113.42" /var/log/auth.log \
  | awk '{print $1, $2, $3, $5, $NF}' \
  | sort
```

**Looking for escalation pattern**: Failed attempts → successful login → session opened → commands run (if you have process accounting or audit logs).

---

### Task 4 — Find Unusual sudo Usage

```bash
grep "sudo" /var/log/auth.log | grep -v "session opened\|session closed\|pam_unix"
```

Interesting patterns:
- `sudo: authentication failure` — user tried sudo but failed (wrong password or not in sudoers)
- `sudo: user NOT in sudoers` — an account that should not have sudo tried to use it
- `COMMAND=/bin/bash` or `COMMAND=/bin/sh` in the sudo log — someone ran a root shell via sudo

---

### Task 5 — Find Files Modified in the Last N Hours

Useful for identifying attacker-dropped files after establishing approximate compromise time from auth logs.

```bash
# Files modified in the last 24 hours, excluding /proc and /sys
find / -mmin -1440 -type f \
  -not -path "/proc/*" \
  -not -path "/sys/*" \
  -not -path "/run/*" \
  2>/dev/null \
  | sort

# Files modified after a specific reference file (e.g., after the suspicious login)
# First create a reference file with the right timestamp
touch -t 202604181422 /tmp/reference_time
find / -newer /tmp/reference_time -type f \
  -not -path "/proc/*" -not -path "/sys/*" \
  2>/dev/null
```

---

### Task 6 — Analyze Web Server Access Logs for Attack Patterns

**Apache/Nginx access log format** (combined log format):
```
203.0.113.42 - - [18/Apr/2026:14:22:31 +0000] "GET /wp-admin/install.php HTTP/1.1" 200 1234 "-" "curl/7.68.0"
```

**Find non-200 status codes (errors that might indicate scanning)**:
```bash
awk '{print $9}' /var/log/nginx/access.log \  # Field 9 is the HTTP status code
  | sort | uniq -c | sort -rn
```

**Find scanning activity — many 404s from same IP**:
```bash
awk '$9 == 404 {print $1}' /var/log/nginx/access.log \
  | sort | uniq -c | sort -rn | head -20
```

**Find SQL injection attempts**:
```bash
grep -iE "(union|select|insert|drop|exec|script)" /var/log/nginx/access.log \
  | awk '{print $1, $7}' | sort | uniq -c | sort -rn
```

**Find path traversal attempts**:
```bash
grep -E "\.\./|%2e%2e|%252e" /var/log/nginx/access.log
```

---

### Awk Field Reference

For log analysis, awk's field splitting is the most-used feature:

```bash
# Print specific fields
awk '{print $1, $3, $5}' file   # Fields 1, 3, and 5 (space-delimited by default)

# Use a different field separator
awk -F: '{print $1, $3}' /etc/passwd   # Colon-separated; print username and UID

# Filter and print
awk '$9 >= 500 {print $1, $7, $9}' access.log  # Only HTTP 5xx errors; print IP, path, code

# Count occurrences
awk '{freq[$1]++} END {for (k in freq) print freq[k], k}' file | sort -rn

# Conditional with regex
awk '/Failed password/ && /203\.0\.113\.42/ {print}' /var/log/auth.log
```

---

### When Logs Are Missing

Attackers who gain root access often attempt to clear log files. Signs of log tampering:
- Log files exist but are empty: `> /var/log/auth.log` truncates without deleting
- Log file modification time is very recent but contents are old
- Gaps in log timestamps — the auth.log had entries until 14:20, then nothing, then entries at 16:30
- `lastlog` and `wtmp` entries do not match auth.log (these are binary files that are harder to edit quickly)

When text logs are cleared, the binary wtmp/btmp files often still contain evidence:
```bash
last          # Read /var/log/wtmp — login records
lastb         # Read /var/log/btmp — failed login records
who --ips     # Current logins with IP addresses
```

## Key points

- `grep` finds lines matching patterns; `awk` extracts fields and performs calculations; `cut` extracts fields by delimiter; `sort | uniq -c | sort -rn` counts and ranks occurrences — these four patterns handle most log analysis
- Failed SSH attempts: `grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn`
- Brute force success indicator: same IP appears in both failed and successful login lists
- Web log analysis: extract HTTP status codes with `awk '{print $9}'`; find scanning/injection with `grep -iE`
- After establishing a compromise time from auth logs, use `find -newer reference_time` to find files the attacker dropped
- Log tampering leaves gaps in timestamps and empty log files; fall back to binary wtmp/btmp (`last`, `lastb`) which are harder to edit

## Go deeper

- [S006](../../../../vault/research/security-foundations/01-sources/) — Linux log analysis patterns, awk/grep for forensic investigation

---

*[← Previous: Linux Permissions](./L20-linux-permissions.md)* · *[Next: NTLM and Kerberos — Windows Authentication Fundamentals →](./L22-ntlm-kerberos.md)*
