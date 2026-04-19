# Detecting Persistence Through Baselining

**Module**: M06 · Persistence — Abusing What the OS Trusts
**Type**: applied
**Estimated time**: 14 minutes
**Claim**: C8 from Strata synthesis

---

## The situation

You know the persistence locations from L11. Now you need to operationalize monitoring them. The correct model is: define known-good → alert on deviation. Not: maintain a blocklist of malicious entries — you cannot enumerate things you have not yet seen. Every persistence detection capability is fundamentally a baselining capability.

---

## Approach: snapshot, diff, and alert

For Linux persistence: periodic snapshot of all persistence locations + diff against saved baseline = changes since last known-good state. For Windows persistence: continuous Sysmon monitoring of Run keys and WMI subscriptions + exclusion list for known-good agents = high-signal alert queue.

---

## Worked example 1 — Linux crontab baseline workflow

Create a comprehensive crontab baseline [S007](../../research/security-foundations/01-sources/web/S007-fhs-filesystem-hierarchy.md):

```bash
# Save the baseline (run on a known-clean host)
(
  echo "=== System cron.d ==="
  ls -la /etc/cron.d/ 2>/dev/null
  for dir in /etc/cron.hourly /etc/cron.daily /etc/cron.weekly /etc/cron.monthly; do
    echo "=== $dir ==="; ls -la "$dir" 2>/dev/null
  done
  echo "=== Per-user crontabs ==="
  for user in $(cut -d: -f1 /etc/passwd); do
    crontab -u "$user" -l 2>/dev/null | grep -v '^#' | grep -v '^$' \
      && echo "[user: $user]"
  done
  echo "=== rc.local ==="
  cat /etc/rc.local 2>/dev/null
  echo "=== authorized_keys ==="
  find /home /root -name "authorized_keys" -exec echo "FILE: {}" \; -exec cat {} \; 2>/dev/null
) > /var/security/cron_baseline_$(date +%Y%m%d).txt
```

Diff against the baseline during an investigation:

```bash
diff /var/security/cron_baseline_20260401.txt \
  <(same commands, redirected through process substitution)
```

Lines prefixed with `>` are additions since the baseline. Lines prefixed with `<` are removals. Additions in cron, rc.local, or authorized_keys on a host that should not have changed are immediate findings [S010](../../research/security-foundations/01-sources/web/S010-tldp-abs-bash-scripting.md).

**Authorized keys audit as a one-liner:**

```bash
find /home /root -name "authorized_keys" -exec cat {} + 2>/dev/null
```

Compare every key against the approved administrator public key list. Any key not on the approved list requires immediate revocation and investigation.

---

## Worked example 2 — Sysmon Events 12/13 for Windows Run key monitoring

Configure Sysmon to capture all writes to persistence-relevant registry paths [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md):

```xml
<RegistryEvent onmatch="include">
  <TargetObject condition="contains">CurrentVersion\Run</TargetObject>
  <TargetObject condition="contains">CurrentVersion\RunOnce</TargetObject>
  <TargetObject condition="contains">Winlogon\Userinit</TargetObject>
  <TargetObject condition="contains">Winlogon\Shell</TargetObject>
  <TargetObject condition="contains">CurrentControlSet\Services</TargetObject>
</RegistryEvent>
```

**Event 12** fires on key creation or deletion. **Event 13** fires on value writes. For Run key persistence, Event 13 is the primary signal — the attacker writes a new string value to an existing key.

Key fields to examine in Event 13: `TargetObject` (full registry path including value name), `Details` (the data written — the executable path), `Image` (the process that made the write), and `EventTime`. A write to `HKCU\...\ Run` from `cmd.exe` or `powershell.exe` at 3 AM is high-confidence persistence activity.

---

## Worked example 3 — Sysmon Events 19/20/21 for WMI subscription detection

WMI subscriptions generate three Sysmon events in sequence [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md):

- **Event 19** (WMIEvent Filter): captures the filter name and query (what event triggers the subscription)
- **Event 20** (WMIEvent Consumer): captures the consumer name and type (CommandLineEventConsumer = executes a command; ActiveScriptEventConsumer = runs VBScript/JScript)
- **Event 21** (WMIEvent Binding): captures the binding that connects the filter to the consumer

A minimal Sysmon config to capture all WMI subscription creation:

```xml
<WmiEvent onmatch="include">
  <Operation condition="is">Created</Operation>
</WmiEvent>
```

This configuration fires on every WMI subscription creation regardless of consumer type or filter query. Legitimate WMI subscriptions are rare in most enterprise environments — the security operations team for most organizations should investigate any Events 19/20/21 cluster that does not correspond to a known administrative action [S022](../../research/security-foundations/01-sources/web/S022-windows-registry.md).

## The exclusion-list architecture

The practical Sysmon deployment pattern is: broad include rules + exclusion list for known-good noise. For Run key monitoring:

1. Enable the RegistryEvent rules above to capture all Run key writes
2. Run the configuration for 5-7 days on a representative host
3. Identify high-volume, known-legitimate processes (antivirus updater, backup agent, software deployment tool)
4. Add those process images to the exclusion list with comments documenting why they are excluded
5. Everything remaining in the alert queue is investigation-worthy

Version-control the exclusion list. Review it during security audits. The exclusion list is institutional knowledge about what is normal on your infrastructure — it is as important as the detection rules themselves.

## Key points

- Persistence detection is baseline comparison, not blocklist matching; define known-good first, then alert on deviation from it
- Sysmon Events 12/13 for Run key and service registry persistence; Events 19/20/21 for WMI subscription creation — all high-signal, low-noise if properly tuned
- Authorized keys audit must be part of any Linux incident response checklist; a missed attacker SSH key survives all other remediation
- The Sysmon exclusion list is an institutional knowledge asset; manage it in version control and review it at regular intervals

## Go deeper

- [S015 — Sysmon v15](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md) — Events 12/13 RegistryEvent and 19/20/21 WMIEvent documentation; XML configuration reference
- [S022 — Windows Registry](../../research/security-foundations/01-sources/web/S022-windows-registry.md) — Run/RunOnce/Services/Winlogon/LSA security-relevant paths and their purpose
- [S023 — Windows Security Events](../../research/security-foundations/01-sources/web/S023-windows-security-events.md) — Event 4698 scheduled task creation with TaskContent XML for baseline comparison

---

*← [Previous lesson](./L11-persistence-mechanisms.md)* · *[Next lesson →](./L13-windows-telemetry.md)*
