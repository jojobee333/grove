# Using DNS Records as a Defender

**Module**: M02 · DNS — Single Protocol, Every Domain
**Type**: applied
**Estimated time**: 12 minutes
**Claim**: C2 from Strata synthesis

---

## The situation

You understand how attackers abuse DNS: cache poisoning redirects traffic, tunneling carries C2 traffic through firewalls, zone transfers leak topology. The defender's position is different: DNS records are not just for resolution. They are policy enforcement, attack surface reduction, and a detection tripwire when you instrument them correctly. This lesson shows how to convert each attack vector into a defensive measure.

---

## Approach: use DNS to restrict, authenticate, and monitor

Three defensive uses of DNS, each directly countering an attack class:

1. **CAA records** — restrict which certificate authorities can issue TLS certificates for your domain (counter to CA compromise and misissuance)
2. **DNSSEC** — authenticate DNS responses cryptographically (counter to cache poisoning)
3. **Sysmon Event 22 + DNS server logging** — detect DNS-based C2 at process level (counter to tunneling and DGA)

---

## Worked example 1 — CAA records for certificate issuance control

Certification Authority Authorization (CAA) records allow a domain owner to specify which CAs are permitted to issue certificates for their domain. All major CAs check CAA records before issuing, and a CA that violates a CAA policy faces sanctions from root programs (Chrome, Firefox, Apple) [S013](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md).

A minimal defensive configuration:

```dns
example.com  IN  CAA  0 issue "letsencrypt.org"
example.com  IN  CAA  0 issuewild ";"
```

The first record permits Let's Encrypt to issue standard certificates for `example.com`. The second record (`issuewild ";"`) disables wildcard certificate issuance entirely. This prevents an attacker who has compromised a sub-CA from issuing a wildcard cert for `*.example.com` that would be valid for all subdomains.

For an enterprise with multiple CAs (internal PKI plus a public CA for external services), enumerate each explicitly:

```dns
example.com  IN  CAA  0 issue "digicert.com"
example.com  IN  CAA  0 issue "letsencrypt.org"
example.com  IN  CAA  0 iodef "mailto:pki-team@example.com"
```

The `iodef` record directs the CA to report any failed issuance attempt to your security team — giving you visibility when someone attempts to obtain an unauthorized certificate for your domain [S013](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md).

---

## Worked example 2 — Sysmon Event 22 for DNS C2 detection

Standard DNS server logs record query name, query type, and client IP. This is useful for blocklist matching. It is not sufficient for attribution: when a log shows that `10.1.2.3` queried `c2domain.attacker.com`, you know the source IP but not which process on that host made the query.

Sysmon Event 22 adds process attribution. Fields logged for each DNS query: image path of the querying process, the query name, query type, query status (success/NXDOMAIN), query results, and the process's GUID for correlation with Event 1 (process creation). This allows you to answer: "Which process on this host sent a DNS query to a suspicious domain at 3:47 AM?" [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md)

A Sysmon configuration that captures DNS queries from all processes:

```xml
<DnsQuery onmatch="exclude">
  <!-- Exclude high-volume known-good resolvers -->
  <QueryName condition="end with">.microsoft.com</QueryName>
  <QueryName condition="end with">.windows.com</QueryName>
</DnsQuery>
```

**Detection pattern for DGA**: filter Event 22 for high NXDOMAIN rate (>10 failed lookups per minute), queries from non-browser processes, domain names with high character entropy (many consonant clusters, no dictionary words), and short TTL responses (\<60 seconds). A process generating hundreds of failed lookups to algorithmically-generated names is effectively confirmed malware exhibiting DGA behaviour.

**Detection pattern for DNS tunneling**: filter for TXT record queries from non-mail processes, subdomain labels longer than 32 characters, and high query volume for a single registered domain. DNS tunneling encodes data in subdomain labels — the subdomains become unusually long and high-entropy.

---

## Worked example 3 — Zone transfer restriction and split-horizon DNS

**Zone transfer restriction**: the single most impactful DNS configuration change for most organizations. Add `allow-transfer { none; };` to your BIND zone configuration (or the equivalent in Windows DNS or Route 53 ACLs) to reject AXFR requests from any IP that is not an authorized secondary server. This eliminates the topology-export vulnerability from L03 with a one-line change [S005](../../research/security-foundations/01-sources/web/S005-rfc1034-dns.md).

**Split-horizon DNS**: run separate zone data for your domain depending on whether the resolver is internal or external. Internal resolvers return `server1.internal.example.com → 10.1.2.50`. External resolvers return `server1.example.com → 203.0.113.45`. This prevents external enumeration of internal host names and IP ranges even when the domain is externally resolvable. An attacker running zone enumeration against your external DNS sees only public-facing records.

## Limitations

DNSEC authenticates DNS data but does not encrypt queries — DNS queries are visible in transit to network observers unless DNS-over-HTTPS (DoH, RFC 8484) or DNS-over-TLS (DoT, RFC 7858) is also deployed. For most enterprise environments, DNSSEC deployment is most valuable for your own authoritative zone (preventing misissuance and cache poisoning of your domain) rather than as a client-side protection. Process-level DNS monitoring via Sysmon Event 22 requires Sysmon deployment on all monitored endpoints and a SIEM or log aggregator to make the data actionable — infrastructure investment is required before coverage is complete [S015](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md).

## When to use it

Deploy CAA records on every public-facing domain as a baseline hardening step — the cost is minimal and the protection against CA misissuance is immediate. Deploy Sysmon Event 22 monitoring on all endpoints where endpoint detection coverage is a security requirement. Restrict zone transfers as a default DNS server configuration rather than treating it as an advanced hardening option. Apply split-horizon DNS whenever your domain has both internal and external resources and external topology exposure is a concern.

## Key points

- CAA records prevent unauthorized CAs from issuing certificates for your domain; add them to every public-facing domain with an `iodef` reporting address for visibility
- Sysmon Event 22 provides process-level DNS attribution that standard DNS logs lack — it is the primary tool for identifying which process is running a DNS-based C2 beacon
- Zone transfer restriction eliminates the topology-export vulnerability with one configuration line; it should be the default, not an optional hardening step
- Effective DNS C2 monitoring requires both endpoint (Event 22) and network-level logging; neither source alone provides complete coverage

## Go deeper

- [S015 — Sysmon v15](../../research/security-foundations/01-sources/web/S015-sysmon-v15.md) — Event 22 fields, Sysmon XML configuration, and correlation with Event 1 for process attribution
- [S013 — OWASP TLS Cheat Sheet](../../research/security-foundations/01-sources/web/S013-owasp-tls-cheatsheet.md) — CAA record requirements and DNS hardening as a TLS attack surface reduction measure
- [S005 — RFC 1034 DNS](../../research/security-foundations/01-sources/web/S005-rfc1034-dns.md) — Zone transfer (AXFR) design; SOA and NS record structure for split-horizon configuration

---

*← [Previous lesson](./L03-dns-attacks.md)* · *[Next lesson →](./L05-cbc-to-aead.md)*
