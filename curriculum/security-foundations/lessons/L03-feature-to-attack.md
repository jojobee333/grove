# Feature-to-Attack Derivation — Applying the Mental Model Across Four Protocols

**Module**: M01 · How Security Thinking Works  
**Type**: applied  
**Estimated time**: 25 minutes  
**Claim**: C1 from Strata synthesis

---

## The core idea

The previous two lessons introduced the mental model: every protocol's trust assumption is an attack surface. This lesson makes it mechanical. You will walk through four protocol specifications — TCP, ARP, DNS, and HTTP — using only the protocol description, and derive the primary attack for each from the design decision that causes it. No CVE lookup required.

By the end of this lesson, the process should feel predictable enough that you can apply it to any protocol you have never studied. The goal is not to memorize four attacks — it is to practice the derivation process until it is automatic.

## Why it matters

Protocols you will encounter in your career include ones that do not yet exist. New authentication mechanisms, new transport protocols, new application-layer APIs, new cloud service interfaces. Each of these will have trust assumptions. Your ability to find those assumptions before an attacker does — or to recognize when an attacker has already found them — depends on having practiced this derivation process enough that it is a reflex.

This lesson is the practice session. After this, every subsequent module applies the same process to a specific domain.

## A concrete example

### TCP — The Half-Open Connection Table

**The design feature**: TCP requires a three-step handshake to establish a connection. After the server receives the initial SYN from a client, it must hold an open slot in memory ("half-open connection") until the client's final ACK arrives. This is what guarantees that both sides have received each other's initial sequence numbers before data flows.

**The trust assumption**: The client who sent the SYN will follow up with the ACK within the timeout window.

**The derivation**: What happens if the assumption is violated at scale? If an attacker sends 100,000 SYN packets per second with random spoofed source IP addresses, the server creates 100,000 half-open entries. The ACK never arrives (the source IPs are fake). The half-open table fills. New legitimate connections are rejected.

**The attack**: SYN flood denial-of-service. Derived directly from the half-open state design feature.

**Second derivation from the same protocol**: TCP sequence numbers identify which data belongs to which position in the byte stream. Packets are accepted if their sequence number falls within the "window" of expected values. What if an attacker sends a TCP RST (reset) packet with a spoofed source IP, but with a sequence number inside the expected window? The receiving side terminates the connection, even though the packet came from the attacker, not from the real sender. That is **RST injection** — a TCP session termination attack, derived from the sequence number acceptance window.

---

### ARP — The Unauthenticated Cache Update

**The design feature**: ARP lets any device on a local network announce its IP-to-MAC mapping. Any device can reply to a broadcast query. Crucially, devices also accept unsolicited ARP replies — replies that update their cache even when no query was sent.

**The trust assumption**: Any device that claims to own an IP address on the local network actually owns it.

**The derivation**: An attacker sends an unsolicited ARP reply to your machine: "IP 192.168.1.1 (the gateway) is at MAC address AA:BB:CC:DD:EE:FF (the attacker's MAC)." Your machine updates its ARP cache. All traffic you send to the gateway now goes to the attacker.

**The attack**: ARP spoofing / ARP cache poisoning. The attacker now sits between your machine and the gateway: they can read all your unencrypted traffic, modify it in transit, or selectively drop packets.

**Note**: This attack only works against devices on the same Layer 2 network segment — you have to be on the same switch broadcast domain as the victim. This constraint flows from the same design feature: ARP operates at Layer 2, not Layer 3.

---

### DNS — The Cached Forged Response

**The design feature**: DNS resolves domain names to IP addresses via a chain of resolvers. Your computer asks your local resolver, which asks a root server, which points to a TLD server, which points to the authoritative server for the domain. The local resolver **caches** answers to avoid repeating the full chain for each query.

**The trust assumption**: The first valid response to a DNS query is the correct answer. The resolver does not verify that the response came from the actual authoritative server (in classic DNS — before DNSSEC).

**The derivation**: A DNS query uses UDP. UDP is connectionless and stateless — any machine can send a UDP packet claiming to be from any source IP. If an attacker can send a forged DNS response to a resolver before the real authoritative response arrives, the resolver will cache the attacker's forged mapping. The cache now points `bank.com` to the attacker's IP address.

**The attack**: DNS cache poisoning. Every user whose requests go through that resolver is now sent to the attacker's server instead of the real bank. The resolver's cache is poisoned until the TTL expires.

**Second derivation**: DNS zones (databases of all DNS records for a domain) are replicated between primary and secondary nameservers via "zone transfers." Zone transfers are designed for legitimate replication. What does zone transfer expose? The complete list of every hostname and IP address in the organization's domain — including internal servers, developer machines, VPN gateways. An attacker who sends a zone transfer request to a misconfigured nameserver gets a complete map of the organization's internal infrastructure.

---

### HTTP — The Parsing Disagreement

**The design feature**: HTTP/1.1 supports two ways to specify how long a request body is: `Content-Length` (a number of bytes) and `Transfer-Encoding: chunked` (body is delivered in size-prefixed chunks, terminated by a zero-size chunk). Both exist because different deployment environments need different mechanisms.

**The trust assumption**: Every component in the chain (browser, reverse proxy, load balancer, application server) parses the request body boundaries the same way.

**The derivation**: What if a reverse proxy uses `Transfer-Encoding` to determine where a request ends, but the backend application server uses `Content-Length`? An attacker can craft a single HTTP request that the proxy reads as one request, but the backend reads as two requests. The second "request" that only the backend sees can contain forged HTTP headers, modified paths, or smuggled credentials that bypass the proxy's security controls.

**The attack**: HTTP request smuggling. An attacker uses the parsing disagreement to inject a partial request into the backend's queue that prefixes the next legitimate user's request, potentially stealing their session token or hijacking their request.

**Second derivation**: The `Host` header in HTTP tells a web server which virtual host (website) to serve when multiple sites share one IP address. The Host header is set by the browser based on the URL you typed — but it is just text in the request. What if a web application uses the Host header to construct password reset links? An attacker intercepts a password reset request and replaces the Host header with their own domain. The application sends the reset link to the attacker's server. The attacker now has the victim's password reset token.

## Key points

- For each protocol, the derivation has three steps: (1) identify the design feature that makes the protocol useful, (2) identify the trust assumption that feature relies on, (3) construct what happens when that assumption is violated by a non-cooperating participant
- TCP → half-open state table → SYN flood; sequence window → RST injection
- ARP → unauthenticated cache updates → ARP spoofing
- DNS → cached responses with no signature verification → cache poisoning; zone transfer → topology leakage
- HTTP → dual body-length parsing mechanisms → request smuggling; advisory Host header → host header injection

## Go deeper

- [S001](../../../../vault/research/security-foundations/01-sources/) — TCP sequence numbers and the SYN flood / RST injection derivation
- [S002](../../../../vault/research/security-foundations/01-sources/) — ARP broadcast mechanics and the spoofing attack
- [S003](../../../../vault/research/security-foundations/01-sources/) — HTTP Host header and request smuggling
- [S005](../../../../vault/research/security-foundations/01-sources/) — DNS recursive resolution and cache poisoning / zone transfer

---

*[← Previous: How Protocols Work](./L02-protocol-trust-assumptions.md)* · *[Next: TCP/IP — How the Three-Way Handshake Becomes a SYN Flood →](./L04-tcp-syn-flood.md)*
