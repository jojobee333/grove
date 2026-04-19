# DNS as a Monitoring Layer — Detecting Command-and-Control Through Queries

**Module**: M03 · DNS — Universal Attack, Defense, Monitoring Layer  
**Type**: applied  
**Estimated time**: 30 minutes  
**Claim**: C2 from Strata synthesis

---

## The situation

DNS is the one protocol that every malware implant, every command-and-control framework, and every data exfiltration tool must use — because everything uses DNS. A process on a compromised host cannot reach its controller's IP address without first resolving the controller's domain. And if the attacker is using DNS tunneling (encoding traffic in DNS queries directly), the DNS queries themselves carry the data.

This means DNS logs are one of the most valuable sources of threat intelligence available to a defender. The challenge is that legitimate traffic generates enormous DNS query volume — thousands of queries per hour per host. The defender's task is to identify attacker-controlled domain communication within that noise.

This lesson gives you the specific patterns to look for and the logic behind each.

## The approach

DNS-based C2 detection works by identifying DNS queries that are statistically or structurally inconsistent with normal DNS traffic. Normal DNS traffic has predictable patterns — most queries go to a small set of well-known domains (CDNs, cloud providers, analytics platforms), query rates are consistent with browsing and application activity, and subdomain labels are short human-readable strings.

Malware traffic violates one or more of these patterns in ways that are difficult to avoid. An implant that communicates via DNS tunneling must encode data in subdomain labels — and encoded data has high entropy, longer labels, and unusual character distributions compared to legitimate subdomains. A fast-flux botnet must update DNS records frequently to evade takedowns — which shows up as abnormal TTL patterns. A domain generation algorithm (DGA) malware family resolves hundreds of algorithmically-generated domains per day — which shows up as a spike in NXDOMAIN responses.

## A worked example

### Pattern 1 — High-Entropy Subdomain Labels

**What normal subdomains look like**: `mail.google.com`, `cdn.example.com`, `api.github.com`. Short, lowercase, human-readable words or abbreviations. Low entropy.

**What DNS tunnel traffic looks like**: The implant encodes data in subdomain labels:

```
aGVsbG8gd29ybGQ.c2VjcmV0LmF0dGFja2Vy.com
```

The subdomain `aGVsbG8gd29ybGQ` is base64-encoded data. Base64-encoded or hex-encoded data has very high entropy — close to the maximum information density per character.

**Detection heuristic**: Calculate the Shannon entropy of subdomain labels. For each DNS query:

```
Shannon entropy = -Σ(p_i × log₂(p_i))
```

where `p_i` is the probability (frequency / length) of each character in the label. Normal subdomains have entropy below 3.5. Encoded data typically shows entropy above 3.8–4.0.

This is not a CVE lookup — it is applying information theory to DNS log data.

**Practical query**: If you have DNS log data in a structured format:

```bash
# Extract subdomain labels and calculate entropy with awk
awk -F. '{print $1}' dns_queries.log | \
  awk '{
    n=split($0,chars,""); 
    for(i=1;i<=n;i++) freq[chars[i]]++;
    for(c in freq) {
      p=freq[c]/n; 
      entropy += -p * log(p)/log(2);
    }
    if(entropy > 3.8) print $0, entropy;
    delete freq; entropy=0
  }'
```

---

### Pattern 2 — Abnormal Query Volume for a Single Domain

**What normal looks like**: A host queries `google.com` and its subdomains dozens of times per day. It queries most other domains rarely — once or a few times when an application makes a connection.

**What C2 beaconing looks like**: An implant that beacons every 30 seconds to `controller.attackerdomain.com` generates 2,880 queries per day to a single second-level domain. This is far outside the normal distribution for any individual domain.

**Detection heuristic**: Group DNS queries by second-level domain (the `example.com` part, stripping subdomains) and count queries per host per domain per hour. Flag any second-level domain receiving >100 queries per hour from a single host that is not in a known-good list of legitimate high-volume domains (CDNs, cloud providers, analytics).

**Why per-host, not per-domain globally?** An attacker who routes C2 through a shared cloud service (AWS, Cloudflare) or uses a DGA that generates legitimate-looking random strings can blend into aggregate traffic. Per-host analysis isolates the anomalous behavior to the compromised host.

---

### Pattern 3 — NXDOMAIN Spike (Domain Generation Algorithm Malware)

**What is a DGA?** A Domain Generation Algorithm is a technique used by malware authors to make their C2 infrastructure resilient to takedowns. Instead of hardcoding a fixed C2 domain, the malware generates hundreds of pseudo-random domain names daily using a seed (often the current date). The malware author registers only one or two of these domains. The malware tries all of them until it finds one that resolves.

**Why it's resilient**: Defenders who take down one C2 domain must identify and take down hundreds of potential next-day domains. Law enforcement and security vendors publish blocklists of known DGA patterns, but the malware can change its algorithm.

**What it looks like in DNS logs**: A host generates dozens to hundreds of queries for random-looking domains (like `xkqjzpom.com`, `bvlrqwst.org`) in a short window. Most return NXDOMAIN (domain does not exist) because only one or two are registered. The NXDOMAIN spike is the indicator.

**Detection heuristic**: Count NXDOMAIN responses per host per hour. A host generating >20 NXDOMAIN responses per hour for domains it has never queried before and that share no relationship with each other is a high-confidence DGA indicator.

---

### Pattern 4 — Unusual Query Types From Client Hosts

**What normal looks like**: Normal client hosts primarily send A record queries (IPv4 address lookups) and AAAA queries (IPv6). They occasionally send MX queries (email client) or TXT queries (application verification, SPF lookups).

**What tunneling looks like**: DNS tunneling tools frequently use TXT records for responses (TXT records can contain up to 255 bytes of arbitrary data per string, allowing more efficient data encoding than A or CNAME records). A client host generating high-volume TXT queries to a single domain is unusual.

**Detection heuristic**: Flag hosts generating >10 TXT queries per hour to domains outside the known-good list. Flag ANY query types (deprecated by RFC 8482 — legitimate clients should not be sending them; attacker tools still do).

---

### Operationalizing These Patterns

The detection logic above translates to specific rules in DNS logging infrastructure:

**If using passive DNS logging (network tap or DNS server query logs)**:

```bash
# Example: Find high-NXDOMAIN hosts in a DNS log
grep "NXDOMAIN" /var/log/named/query.log | \
  awk '{print $6}' | \  # extract source IP
  sort | uniq -c | \
  sort -rn | \
  head -20
```

```bash
# Example: Find high-volume queries to a single domain per source
awk '{print $6, $10}' /var/log/named/query.log | \  # source IP + queried domain
  sort | uniq -c | \
  awk '$1 > 50 {print}' | \  # more than 50 queries: same source, same domain
  sort -rn
```

**If using Zeek (Bro) network monitor**: Zeek's `dns.log` provides structured DNS data with query type, response code, and timing. JA3-style analysis of DNS patterns can be applied directly to Zeek output.

**If using Sysmon on Windows**: Sysmon Event ID 22 (DNS query) logs every DNS query made by every process on the host, including the process name and PID. This allows correlation: which process is making the high-entropy queries? Is it `powershell.exe`, `cmd.exe`, or a process running from `%APPDATA%`?

## When to use this approach

DNS anomaly detection is appropriate as:
- **First-alert detection** for hosts that have no other indicators of compromise
- **Lateral movement detection** when an already-compromised host pivots and starts beaconing from a new internal host
- **Data exfiltration detection** when unusually large DNS query volumes or payload sizes suggest data leaving via the DNS channel

It is not a replacement for endpoint detection (which sees process behavior) or network detection (which sees full packet content). It is most valuable in environments where full packet capture is not feasible and endpoint agents are not deployed on every host.

## Key points

- DNS logs are one of the highest-value threat intelligence sources because all malware must use DNS; defenders who log and analyze DNS traffic gain visibility that other log sources cannot provide
- DNS tunneling produces high-entropy subdomain labels (detectable via Shannon entropy calculation) and abnormal query volume for a single domain
- DGA malware produces NXDOMAIN spikes — many queries for random-looking domains that mostly don't exist; detectable by counting NXDOMAIN responses per host per hour
- Unusual DNS query types (high-volume TXT, deprecated ANY) from client hosts are high-confidence indicators of tunneling or misconfigured tools
- Sysmon Event ID 22 on Windows provides per-process DNS query visibility; passive DNS taps, Zeek, and DNS server query logs provide network-level visibility
- Detection thresholds should be tuned to the environment's baseline — what is anomalous depends on what is normal for each host category

## Go deeper

- [S005](../../../../vault/research/security-foundations/01-sources/) — DNS tunneling mechanics, DGA patterns, and DNS-layer threat intelligence frameworks

---

*[← Previous: DNS Attacks](./L08-dns-attacks.md)* · *[Next: Symmetric Cryptography — What AES Actually Does →](./L10-symmetric-encryption.md)*
