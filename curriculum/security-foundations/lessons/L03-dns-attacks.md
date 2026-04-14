# DNS Architecture and How Attackers Abuse It

**Module**: M02 · DNS — Single Protocol, Every Domain
**Type**: core
**Estimated time**: 13 minutes
**Claim**: C2 — DNS is a universal attack and defense vector across all security domains

---

## The core idea

DNS is the infrastructure beneath every other protocol. Every HTTP request, every TLS handshake, every authentication event begins with a DNS lookup. This makes DNS uniquely valuable to attackers: compromise or abuse DNS and you get leverage across all other protocols simultaneously.

Attackers use DNS for three distinct purposes: as an attack target (cache poisoning), as attack infrastructure (C2 communication), and as cover for lateral movement (DGA domains). Defenders use DNS for certificate authority restriction, C2 detection, and topology protection. The same protocol plays every role.

## Why it matters

In CTFs and real investigations, attacker-controlled DNS is often the first persistent foothold. DNS C2 is the dominant command-and-control technique in threat intelligence because it traverses nearly every firewall (UDP port 53 is allowed almost everywhere) and blends into legitimate lookup traffic. If you're analysing a suspicious host and not looking at its DNS queries, you're missing the most likely C2 channel.

## A concrete example

**Cache poisoning (the Kaminsky attack pattern)**: DNS relies on a recursive resolver to look up external names on your behalf. The resolver caches answers to reduce load. An attacker who can inject a forged response into the resolver's cache causes all clients served by that resolver to receive attacker-controlled answers — without compromising any individual client.

The attack exploits the trust assumption: the resolver trusts responses that arrive on the correct UDP port with the correct transaction ID. Both are 16-bit values. With UDP source port randomisation disabled, an attacker sending roughly 65,536 spoofed responses to a known transaction ID can win the race. Once the cache is poisoned, the attacker can redirect an entire domain's traffic to a malicious IP for the duration of the TTL. (S005)

**DNS-based C2**: An implant installed on a compromised machine encodes outbound data in DNS query subdomains: `c2data.attacker.com`. The attacker's authoritative name server decodes the data from the query and responds with encoded commands in TXT records. This traffic traverses almost every firewall and is difficult to differentiate from legitimate DNS. MITRE ATT&CK T1071.004 documents this as one of the most-observed C2 techniques in real-world intrusions. (S006)

**Domain Generation Algorithms (DGA)**: Malware generates hundreds of pseudo-random domain names each day using a shared seed. The attacker registers only a few of them. The malware tries them all until one resolves. This makes C2 infrastructure resilient — takedown of one domain has no effect. Detection requires identifying the pattern of failed lookups rather than specific domain names. (S006)

**Zone transfer exposure**: DNS zone transfers (AXFR queries) are designed to allow secondary name servers to replicate zone data from primary servers. Misconfigured zones that allow zone transfers from any IP expose a complete map of all hostnames and IP addresses in the domain — a free topology map for attackers. (S005)

## Key points

- DNS operates as attack target (cache poisoning), attack infrastructure (C2 via DNS tunneling and DGA), and topology exposure vector (zone transfers)
- DNS C2 is the dominant command-and-control technique in real intrusions because port 53 traverses most firewalls
- DGA resilience means blocking individual C2 domains is ineffective — pattern detection across failed NXDOMAIN responses is required

## Go deeper

- [S005 — RFC 1034 DNS](../../../../../vault/research/security-foundations/01-sources/web/S005-rfc1034-dns.md) — DNS recursive resolution model and cache poisoning exposition
- [S006 — MITRE ATT&CK C2](../../../../../vault/research/security-foundations/01-sources/web/S006-mitre-attack-c2.md) — TA0011 Command and Control; DNS tunneling and DGA techniques

---

*← [Previous: TCP, ARP, and HTTP](./L02-tcp-arp-http-attacks.md)* · *[Next: Using DNS Records as a Defender](./L04-dns-defense.md) →*
