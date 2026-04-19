# DNS Architecture — The Hierarchy Everyone Depends On

**Module**: M03 · DNS — Universal Attack, Defense, Monitoring Layer  
**Type**: core  
**Estimated time**: 28 minutes  
**Claim**: C2 from Strata synthesis

---

## The core idea

DNS — the Domain Name System — is the internet's phone book. Every time you type a domain name (`google.com`, `bank.com`, `github.com`) into a browser, email client, or terminal, DNS translates that name into an IP address. Without DNS, you would need to memorize that `google.com` is `142.250.80.46` and that this address can change at any time. DNS is so fundamental that practically every other network protocol depends on it.

What makes DNS especially important from a security perspective is that it touches everything. DNS is not just a lookup service — it is simultaneously an **attack surface** (cache poisoning, zone transfer leakage, DNS tunneling), a **defense mechanism** (DNSSEC, RPZ-based blocking, DNS-layer filtering), and a **monitoring layer** (DNS logs reveal attacker command-and-control channels, malware callbacks, and data exfiltration). The research identifies DNS as the one protocol that is critical to understand across all four security domains — networking, cryptography, Linux, and Windows (Claim C2).

This lesson builds the architectural foundation you need before studying DNS attacks and DNS-based detection in the next two lessons.

**What is a domain name?** A domain name is a human-readable address organized in a hierarchy. In `mail.example.com`:
- `.com` is the top-level domain (TLD)
- `example` is the second-level domain (registered by an organization)
- `mail` is a subdomain created by the organization

Reading right to left gives you the tree structure.

## Why it matters

DNS is the entry point for almost every network interaction. It is also the protocol most attackers abuse for persistence and exfiltration — because DNS traffic is almost universally allowed through firewalls (if you block DNS, nothing works), and because many organizations do not log DNS queries at all.

Understanding DNS architecture — the hierarchy, the recursive resolution process, the caching system, the zone structure — is prerequisite knowledge for understanding: cache poisoning attacks (L08), DNS-based command-and-control detection (L09), DNSSEC (a cryptographic extension covered in M05), and Windows Active Directory (which uses DNS extensively for domain controller discovery).

## A concrete example

### The DNS Hierarchy

DNS is organized as a distributed tree. No single server knows about every domain — the knowledge is distributed across millions of servers worldwide, organized into a strict hierarchy:

```
. (root)
├── .com
│   ├── google.com
│   │   ├── mail.google.com
│   │   └── docs.google.com
│   └── example.com
│       └── www.example.com
├── .org
└── .net
```

**Root servers**: The top of the hierarchy. There are 13 sets of root server clusters (labeled A through M) operated by different organizations worldwide. They do not know the IP addresses of individual websites — they know which servers are responsible for each TLD.

**TLD servers**: Top-level domain servers. ICANN delegates operation of TLD zones (`.com`, `.org`, `.uk`, etc.) to registry operators. TLD servers know which servers are authoritative for second-level domains (like `google.com`).

**Authoritative name servers**: The servers that hold the actual DNS records for a specific domain. An organization (or their DNS provider) runs these. They know every record in the domain: which IP addresses hostnames map to, where email should be delivered, and so on.

**Recursive resolvers (also called recursive DNS servers)**: The servers your computer actually talks to. When you make a DNS query, your computer sends it to a recursive resolver — typically run by your ISP or a public provider (Google's `8.8.8.8`, Cloudflare's `1.1.1.1`). The recursive resolver does the work of querying the root, TLD, and authoritative servers on your behalf and returns the answer.

### The Resolution Process

Walking through a complete resolution for `www.example.com` (assuming no cached entries anywhere):

1. **Your computer → Recursive resolver**: "What is the IP address of `www.example.com`?"
2. **Recursive resolver → Root server**: "Where can I find information about `.com`?" Root server replies: "Ask the `.com` TLD server at `192.5.6.30`."
3. **Recursive resolver → .com TLD server**: "Where can I find information about `example.com`?" TLD server replies: "Ask the authoritative name server at `ns1.example.com` (`93.184.216.1`)."
4. **Recursive resolver → Authoritative server**: "What is the IP address of `www.example.com`?" Authoritative server replies: "It is `93.184.216.34`."
5. **Recursive resolver → Your computer**: "The IP address of `www.example.com` is `93.184.216.34`."

Each step uses UDP on port 53 (or TCP for large responses). The recursive resolver caches the answer for the duration of the TTL (Time To Live) — a value set by the authoritative server telling resolvers how long the answer is valid.

### DNS Record Types

DNS zones contain different types of records for different purposes:

| Type | Purpose | Example |
|------|---------|---------|
| A | Maps hostname to IPv4 address | `www.example.com → 93.184.216.34` |
| AAAA | Maps hostname to IPv6 address | `www.example.com → 2606:2800:220:1:248:1893:25c8:1946` |
| MX | Specifies mail server for a domain | `example.com → mail.example.com, priority 10` |
| CNAME | Canonical name alias | `shop.example.com → store-platform.cdn.com` |
| TXT | Arbitrary text; used for SPF, DKIM, domain verification | `"v=spf1 include:sendgrid.net ~all"` |
| NS | Specifies authoritative name servers for a zone | `example.com → ns1.example.com, ns2.example.com` |
| SOA | Start of Authority; zone metadata (serial number, refresh interval) | Zone administration info |
| PTR | Reverse lookup: IP address to hostname | `34.216.184.93.in-addr.arpa → www.example.com` |

### Caching and TTL

Caching is essential to DNS performance — without it, every DNS query would require 3–4 round trips to resolve, and the root servers would be overwhelmed with billions of queries per day.

Each DNS response includes a TTL value (seconds). Recursive resolvers cache the response and serve it from cache until the TTL expires. This creates a time window during which the resolver will serve cached data without re-querying the authoritative server — which is exactly the window a cache poisoning attack tries to exploit.

Short TTLs (60–300 seconds) mean changes propagate quickly but generate more queries. Long TTLs (3600–86400 seconds) reduce query volume but mean changes take longer to propagate and the poisoning window is longer if an attacker succeeds.

### Zone Transfers

DNS zones (the complete set of records for a domain) must be replicated from primary to secondary name servers so that multiple servers can answer queries (redundancy). This replication uses a mechanism called **zone transfer** (AXFR query type).

Zone transfers are legitimate and necessary. The security issue arises when a nameserver responds to zone transfer requests from **any** source, rather than only from authorized secondary name servers. In that case, any attacker can send an AXFR query and receive a complete dump of all hostnames and IP addresses in the zone — including internal servers, development machines, VPN gateways, and infrastructure that was never intended to be publicly discoverable.

This is covered in depth in L08 (DNS Attacks). The architectural point here is that DNS zones are databases, zone transfers are a database replication mechanism, and access control on that mechanism is a security property that must be explicitly configured.

## Key points

- DNS is a distributed hierarchical database: root servers → TLD servers → authoritative servers; recursive resolvers do the work for clients
- A recursive resolver queries the hierarchy on behalf of clients and caches answers for the TTL duration
- DNS uses UDP on port 53 (TCP for large responses and zone transfers)
- Common record types: A (IPv4), AAAA (IPv6), MX (mail), CNAME (alias), TXT (SPF/DKIM/verification), NS (name server delegation), PTR (reverse lookup)
- Zone transfers (AXFR) replicate a complete zone; misconfigured nameservers that respond to any requester leak a complete map of the organization's DNS infrastructure
- DNS is present in every network interaction — it is simultaneously an attack surface, a defense layer (DNS filtering, DNSSEC), and a monitoring source (query logs reveal C2 and exfiltration)

## Go deeper

- [S005](../../../../vault/research/security-foundations/01-sources/) — DNS recursive resolution, zone structure, caching, and TTL mechanics

---

*[← Previous: HTTP Vulnerabilities](./L06-http-vulnerabilities.md)* · *[Next: DNS Attacks — Cache Poisoning and Zone Leakage →](./L08-dns-attacks.md)*
