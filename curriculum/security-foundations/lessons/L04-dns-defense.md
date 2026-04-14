# Using DNS Records as a Defender

**Module**: M02 · DNS — Single Protocol, Every Domain
**Type**: applied
**Estimated time**: 12 minutes
**Claim**: C2 — DNS is a universal attack and defense vector across all security domains

---

## The situation

You understand how attackers abuse DNS. Now flip the perspective. DNS records are not just for resolution — they are configuration enforcement, attack surface reduction, and a detection tripwire when you instrument query logging correctly.

---

## CAA records: restrict which CAs can issue certificates for your domain

**Certificate Authority Authorization (CAA)** records specify which certificate authorities are permitted to issue TLS certificates for your domain. A CA that honours CAA records — and all major CAs do — will refuse to issue a certificate for your domain to an attacker even if the attacker controls DNS entries elsewhere.

```dns
example.com  CAA  0 issue "letsencrypt.org"
example.com  CAA  0 issuewild ";"
```

The second record disables wildcard certificate issuance entirely. This stops an attacker who compromises a sub-CA from issuing a wildcard cert for your domain. OWASP's TLS Cheat Sheet identifies CAA records as a mandatory hardening step for any public-facing domain. (S013)

---

## DNSSEC: authenticate DNS responses cryptographically

DNSSEC adds digital signatures to DNS zone data. A resolver that validates DNSSEC signatures can detect forged responses — making Kaminsky-style cache poisoning attack infeasible against DNSSEC-signed zones.

The limitation: DNSSEC only authenticates the DNS data itself. It does not encrypt queries (those are visible in transit; DNS-over-HTTPS or DNS-over-TLS are required for that). For defences that matter in practice, DNSSEC is most valuable for your own domain's records rather than for resolver protection against poisoning. (S005)

---

## Sysmon Event 22: who made this DNS query?

Standard DNS logs record the query but not the process that initiated it. This is enough for detecting malicious domains but not for attribution when multiple processes run on the same host.

Sysmon Event 22 logs: the querying process (with image path), the query string, and the DNS response. This allows a defender to answer the question: "Why did `svchost.exe` look up `random9z4k.ru` at 3:47 AM?" The process-level query attribution is what makes Sysmon Event 22 essential for C2 detection over standard DNS logs. (S015)

**Detection signature for DGA**: filter Sysmon Event 22 for: high NXDOMAIN rate, short TTL responses, domain names with high entropy (many consonant clusters, no real words), queries from non-browser processes. A process generating hundreds of failed lookups to algorithmically-generated names is almost certainly malware.

---

## Zone transfer restriction: lock your topology

Configure your authoritative name server to reject AXFR requests from any IP that is not a legitimate secondary server. This is a one-line change in BIND (`allow-transfer { none; };`) that eliminates free topology exposure. Many organisations discover they have been offering zone transfers openly for years when they run a DNS audit. (S005)

---

## Split-horizon DNS

Run separate internal and external DNS zones for the same domain. External resolvers return only the public-facing IPs. Internal resolvers return internal IPs for the same names. This prevents external enumeration of your internal network topology even if your domain is resolvable publicly.

---

## Key points

- CAA records prevent unauthorised CAs from issuing certificates for your domain — add them to every public-facing domain
- Sysmon Event 22 is the only standard Windows log that captures DNS queries at process level — essential for C2 attribution
- Zone transfer restriction prevents free topology export; this is a configuration default, not a complex hardening step

## Go deeper

- [S015 — Sysmon v15](../../../../../vault/research/security-foundations/01-sources/web/S015-sysmon-v15.md) — Event 22 DNS query monitoring configuration
- [S013 — OWASP TLS Cheat Sheet](../../../../../vault/research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md) — CAA record guidance and DNS hardening recommendations

---

*← [Previous: DNS Architecture and Attacks](./L03-dns-attacks.md)* · *[Next: Why CBC Kept Breaking](./L05-cbc-to-aead.md) →*
