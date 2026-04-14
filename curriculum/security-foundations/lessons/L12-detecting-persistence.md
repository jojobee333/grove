# Detecting Persistence Through Baselining

**Module**: M06 · Persistence — Abusing What the OS Trusts
**Type**: applied
**Estimated time**: 14 minutes
**Claim**: C8 — Detection requires baselining; C19 — controls need paired detection

---

## The situation

You know the persistence locations. Now you need to monitor them. The correct model is: define known-good → alert on deviation. Not: maintain a blocklist of malicious entries (you can't enumerate things that don't exist yet).

---

## Linux: snapshot and diff

**Crontab baseline workflow:**
```bash
# Create the baseline
( for user in $(cut -d: -f1 /etc/passwd); do
    echo "=== $user ==="; crontab -u $user -l 2>/dev/null | grep -v '^#'
  done
  ls -la /etc/cron.d /etc/cron.hourly /etc/cron.daily /etc/cron.weekly
) > /var/log/cron_baseline_$(date +%Y%m%d).txt

# Check for deviations (run after security incident, or weekly)
diff /var/log/cron_baseline_20260401.txt <( same commands above )
```

**Authorized keys audit:**
```bash
find /home -name "authorized_keys" -exec cat {} + 2>/dev/null
find /root -name "authorized_keys" -exec cat {} + 2>/dev/null
```
Compare against the list of known public keys for authorised administrators. Any key not on the approved list is immediate revocation-and-investigation territory.

**New files in persistence locations since a reference date:**
```bash
find /etc/cron.d /etc/rc.local /etc/systemd/system \
     /home -name "*.service" -newer /etc/passwd -type f 2>/dev/null
```

---

## Windows: Sysmon Events 12/13 for registry, 19/20/21 for WMI

**Sysmon Event 12** (RegistryEvent, object created or deleted): fires when a registry key is created or deleted. Target the Run key paths:

```xml
<RegistryEvent onmatch="include">
  <TargetObject condition="contains">CurrentVersion\Run</TargetObject>
  <TargetObject condition="contains">CurrentVersion\RunOnce</TargetObject>
  <TargetObject condition="contains">Winlogon</TargetObject>
</RegistryEvent>
```

**Sysmon Event 13** (RegistryEvent, value set): fires when a registry value is written. Same filter paths as Event 12 — Event 12 catches key creation, Event 13 catches value writes. Most Run key persistence fires Event 13.

**Sysmon Events 19/20/21** (WMIEvent Filter/Consumer/BindingCreated): fires when a WMI subscription component is created — filter, consumer, or binding. These events have very high signal: legitimate administrative WMI subscriptions are rare in most environments. Any alert on Events 19/20/21 during non-maintenance windows should be investigated immediately. (S015)

---

## The exclusion-list pattern

The right architecture is: broad monitoring + exclusion list for known-good.

1. Enable broad rule (e.g., alert on all Run key writes)
2. Observe baseline traffic for 5-7 days
3. Add exclusions for known-good agents (AV updater, backup agent, known software updater)
4. Everything remaining is investigation-worthy

This is directly how Sysmon is tuned in production environments. The Sysmon GitHub provides SwiftOnSecurity's baseline config as a starting point. The exclusion list is your asset — it represents institutional knowledge about what normal looks like on your infrastructure.

For adversary simulation: add a Run key entry in HKCU, ensure Sysmon Event 13 fires, and verify your SIEM created an alert. Tune the ticket queue so this alert has a 15-minute SLA for investigation.

---

## Key points

- Persistence detection is baseline comparison, not blocklist matching — define known-good, alert on deviation
- Sysmon Events 12/13 cover registry persistence, Events 19/20/21 cover WMI — all three should alert on creation in Run key paths
- The exclusion list is an asset: manage it, version-control it, review it during security audits

## Go deeper

- [S015 — Sysmon v15](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon) — Event 12/13/19/20/21 documentation and XML configuration examples
- [S016 — AD Security Best Practices](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/best-practices-for-securing-active-directory) — Monitoring audits and baseline review recommendations

---

*← [Previous: Autorun Persistence Mechanisms](./L11-persistence-mechanisms.md)* · *[Next: Windows Event Sources](./L13-windows-telemetry.md) →*
