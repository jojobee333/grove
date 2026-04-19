# DNS Attacks — Cache Poisoning, Zone Leakage, and Amplification

**Module**: M03 · DNS — Universal Attack, Defense, Monitoring Layer  
**Type**: core  
**Estimated time**: 28 minutes  
**Claim**: C2 and C3 from Strata synthesis

---

## The core idea

The previous lesson established DNS architecture: the hierarchy, the recursive resolution process, and caching. This lesson applies the same derivation framework from M01 to DNS — extracting the attacks directly from the design features you now understand.

Three DNS attacks are covered: **cache poisoning** (exploiting the unauthenticated cached response model), **zone transfer leakage** (exploiting unrestricted access to zone replication), and **DNS amplification** (exploiting the size asymmetry between DNS queries and responses for denial-of-service). A fourth, **DNS tunneling**, is introduced here and examined in depth in L09 in the context of command-and-control detection.

## Why it matters

DNS attacks are uniquely impactful because DNS is infrastructure for everything else. Poisoning a resolver does not just affect one website — it potentially redirects every user of that resolver to attacker-controlled servers for any domain the attacker chooses to target. Zone transfer leakage provides reconnaissance that takes hours of active scanning to replicate by any other means. DNS amplification attacks are among the largest volumetric DDoS attacks ever recorded (reaching terabits per second).

From a defensive perspective, DNS logs are one of the highest-value sources of threat intelligence available to a defender. Attackers know this — and they have developed techniques specifically designed to abuse DNS in ways that look like normal traffic.

## A concrete example

### Cache Poisoning

Cache poisoning works by convincing a recursive resolver to cache a forged DNS record — replacing the legitimate IP address for a domain with an attacker-controlled address.

**The setup**: A recursive resolver queries an authoritative server for `bank.com`. While waiting for the real response (the legitimate IP address), the resolver will accept the first valid response that matches the query. "Matches" means:
1. The source IP appears to be from the authoritative server
2. The Transaction ID (a 16-bit number in the DNS header) matches the ID the resolver put in the query

**The classic attack (pre-DNSSEC)**:
1. The attacker sends a large number of forged DNS responses to the resolver, each with:
   - Source IP spoofed to look like the authoritative server for `bank.com`
   - A guessed Transaction ID (0–65535)
   - The attacker's IP address as the answer for `bank.com`
2. The attacker also triggers the resolver to actually query `bank.com` (by causing their own DNS query to go through the resolver, or by other means)
3. The resolver sends out a real query with a real Transaction ID
4. If any of the attacker's forged responses matches the Transaction ID before the real response arrives, the resolver caches the forged record

With 16-bit Transaction IDs (65536 possible values), a high-rate attacker sending responses fast enough has a reasonable chance of winning the race against the real response. The Kaminsky attack (2008) demonstrated a much more efficient version of this using additional Birthday Paradox math on the transaction ID space.

**What happens after poisoning**: Every user whose DNS queries go through that resolver who asks for `bank.com` receives the attacker's IP address. They connect to the attacker's server, which can serve a fake bank website to steal credentials, or perform SSL stripping. The poisoning persists for the TTL of the record — potentially hours.

**DNSSEC**: DNSSEC (DNS Security Extensions) addresses cache poisoning by adding cryptographic signatures to DNS responses. An authoritative server signs its zone records; resolvers verify the signature using a chain of trust rooted at the DNS root zone. A forged response cannot be signed correctly — the resolver rejects it. DNSSEC is the correct mitigation for cache poisoning. (Cryptographic signing is covered in detail in M06.)

---

### Zone Transfer Leakage (AXFR)

DNS zone transfers (AXFR requests) replicate all records in a zone from primary to secondary name servers. This is a legitimate and necessary operation — without it, there would be only one authoritative server per domain and it would be a single point of failure.

The security property that must be enforced: **zone transfers should only be permitted from known secondary server IP addresses**.

When a nameserver is misconfigured to respond to AXFR requests from any source, any attacker can do:

```bash
dig AXFR example.com @ns1.example.com
```

And receive a complete dump of every DNS record in the zone:

```
example.com.        A     203.0.113.1
www.example.com.    A     203.0.113.1
mail.example.com.   A     203.0.113.5
dev-server.example.com.   A   10.0.1.100
vpn.example.com.    A     203.0.113.10
db-primary.example.com.  A   10.0.1.200
staging.example.com.     A   10.0.1.150
```

In a single query, the attacker has:
- All public-facing hostnames and IPs
- Internal hostnames that reveal infrastructure architecture (`db-primary`, `staging`)
- Private IP addresses that reveal internal network structure
- Service naming conventions that help guess other hostnames

This is reconnaissance that would take automated scanners hours to replicate — and it is louder (more detectable). AXFR leakage delivers it in milliseconds silently.

**Mitigation**: Restrict zone transfers using `allow-transfer { ip-address; };` ACLs in the nameserver configuration. TSIG (Transaction Signatures) can be used to authenticate zone transfer requests using a shared secret.

---

### DNS Amplification

DNS amplification is a reflection and amplification attack used for distributed denial-of-service.

**The amplification factor**: A DNS query is typically 40–60 bytes. A DNS response to a query for a large TXT record or an ANY query can be 3,000–4,000 bytes — a 70x amplification factor.

**The attack**:
1. The attacker controls a botnet (or can send spoofed UDP packets — which requires no special access)
2. The attacker sends DNS queries to open recursive resolvers (resolvers that respond to queries from any source) with the **source IP spoofed to the victim's IP address**
3. The resolvers send their (large) responses to the victim's IP
4. The victim receives traffic amplified 70x from the attacker's actual query volume

An attacker sending 1 Gbps of DNS queries can generate 70 Gbps of traffic toward the victim using 70x amplification — more than enough to exhaust most network uplinks.

**Mitigation**: 
- Internet service providers implement BCP38 (network ingress filtering) — dropping packets with source IPs that could not have originated from the source network. This prevents IP spoofing in principle, but adoption is incomplete.
- Recursive resolvers should only respond to clients in their intended customer base, not the entire internet ("open resolvers" are the vulnerability)
- Response Rate Limiting (RRL) on authoritative servers limits the rate of responses to any single source

---

### DNS Tunneling (Preview)

DNS is allowed through almost every firewall — if you block DNS, nothing works. Attackers exploit this by encoding non-DNS data inside DNS queries and responses, creating a covert channel for command-and-control traffic or data exfiltration.

A DNS tunnel works by encoding data in subdomain labels:
- Query: `aGVsbG8gd29ybGQ.c2VjcmV0LmV4YW1wbGUuY29t` → the subdomain is base64-encoded data
- Response: TXT record containing base64-encoded data back to the implant

The implant communicates with its controller by making DNS queries to an attacker-controlled domain. The DNS traffic looks superficially normal (DNS queries always happen) but the queries are abnormally long, have unusual entropy patterns in the subdomain labels, and generate higher-than-normal query volume for a single domain. Detection is covered in L09.

## Key points

- Cache poisoning exploits the unauthenticated, first-valid-response-wins model of DNS caching — a forged response with the right transaction ID poisons the cache for the TTL duration; DNSSEC mitigates this with cryptographic signatures
- Zone transfer leakage exposes a complete map of an organization's DNS infrastructure when AXFR access is not restricted to authorized secondaries; mitigated with allow-transfer ACLs and TSIG authentication
- DNS amplification uses open recursive resolvers and spoofed source IPs to reflect and amplify traffic toward a victim (70x+ amplification factors); mitigated by BCP38 and restricting open resolvers
- DNS tunneling encodes data in subdomain labels to create covert channels through DNS-permissive firewalls; detected through query length, entropy analysis, and volume anomalies

## Go deeper

- [S005](../../../../vault/research/security-foundations/01-sources/) — DNS cache poisoning mechanics, Kaminsky attack, AXFR access control, and amplification vectors

---

*[← Previous: DNS Architecture](./L07-dns-architecture.md)* · *[Next: DNS Command-and-Control Detection →](./L09-dns-c2-detection.md)*
