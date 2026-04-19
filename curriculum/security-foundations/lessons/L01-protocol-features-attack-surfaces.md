# How Protocol Features Become Attack Surfaces

**Module**: M01 · The Protocol Feature Mental Model
**Type**: core
**Estimated time**: 13 minutes
**Claim**: C1 from Strata synthesis

---

## The core idea

Every protocol you will encounter was engineered to solve a specific usability problem. TCP was designed to guarantee reliable, ordered delivery of bytes across an unreliable network that might drop, reorder, or corrupt packets. ARP was designed so that machines on a local network segment can automatically discover each other's hardware addresses without manual configuration. HTTP was designed to let a single server host multiple websites by identifying the intended destination in each request. DNS was designed to replace an unscalable central host file with a distributed, delegated naming system that anyone could update for their own domain.

Each of these design decisions encodes a **trust assumption** — an implicit claim about who controls the trusted input that makes the mechanism work. TCP trusts that initial sequence numbers are large enough and unpredictable enough that an off-path attacker cannot forge them accurately. ARP trusts that the most recent host to claim an IP address on the segment is its legitimate owner. HTTP trusts that the `Host` header accurately reflects the client's intended destination. DNS trusts that recursive resolvers faithfully forward authentic answers from authoritative name servers.

None of these are bugs in the conventional sense. They were deliberate engineering tradeoffs made at a time when the threat model was hardware failure and routing errors, not adversarial manipulation. The security problem emerged later: each trust assumption can be satisfied *dishonestly*. An attacker who can supply the expected trusted value — a plausible sequence number, a forged ARP reply, a manipulated Host header, a poisoned cache entry — exercises the legitimate protocol mechanism while subverting its intended security guarantee.

This is the central pattern: **protocol feature → trust assumption → attack vector**. It holds without exception across TCP, ARP, HTTP, DNS, and TLS — five independent protocol stacks designed across four decades by different engineering teams [S001](../../research/security-foundations/01-sources/web/S001-rfc793-tcp.md) [S002](../../research/security-foundations/01-sources/web/S002-rfc826-arp.md) [S003](../../research/security-foundations/01-sources/web/S003-rfc7230-http.md) [S005](../../research/security-foundations/01-sources/web/S005-rfc1034-dns.md) [S012](../../research/security-foundations/01-sources/web/S012-rfc8446-tls13.md).

## Why it matters

A memorised catalogue of attack names grows obsolete. CVE databases accumulate thousands of entries per year. New protocols, APIs, and message formats appear constantly. A mental model that generates attack analyses from first principles stays useful indefinitely.

For practical security work, this pattern has a specific application: when evaluating any system — a new API, an unfamiliar protocol, a library's authentication mechanism — start by identifying the trust boundaries. Ask: what inputs does this system accept without verification? Who is authorised to supply those inputs? Could an attacker on the intended threat boundary satisfy those trust assumptions dishonestly? The answers point directly at the attack surface without requiring prior knowledge of that specific protocol's CVE history.

This is also why MITRE ATT&CK T1071 (Application Layer Protocol) documents dozens of C2 techniques all built on the same insight: legitimate protocol features designed for useful communication can be repurposed to carry attacker traffic, because the protocols were designed to trust the content of those features [S006](../../research/security-foundations/01-sources/web/S006-mitre-attack-c2.md).

## A concrete example

**Example 1 — TCP's sequence number assumption → SYN flood**

TCP's three-way handshake requires the server to allocate a connection state entry for every SYN segment received, then wait for the confirming ACK before the connection is complete. This design makes the protocol work correctly even under packet loss: the state entry keeps track of what has been agreed so far.

The trust assumption: the source IP address in a SYN packet is genuine, and the ACK will eventually arrive. The design decision that created vulnerability: the server allocates resources (connection table slots) before the handshake is confirmed.

The attack (SYN flood): send a flood of SYN packets with spoofed source IP addresses. Each packet causes the server to create a half-open connection entry and wait. With millions of packets per second, the connection table fills entirely. Legitimate clients attempting to connect are refused — the server has no room for their SYN. No exploit code, no vulnerability in the implementation: the half-open connection state mechanism is the attack surface [S001](../../research/security-foundations/01-sources/web/S001-rfc793-tcp.md).

**Example 2 — ARP's broadcast reply model → ARP spoofing**

ARP uses a broadcast to discover MAC addresses: "Who owns IP 10.0.0.1?" — sent to all hosts on the segment. Any host that owns that IP replies with its MAC address. The asking host caches the result.

The critical design detail from RFC 826: when a host receives any ARP packet, it first checks whether the sender's IP is already in its cache and updates the entry if so — *before* checking whether the opcode is a request or a reply. This early-update design ensures that stale cache entries are refreshed quickly when a host moves. It also means any host on the segment can send an unsolicited ARP reply, and the recipient will update its cache immediately without any verification [S002](../../research/security-foundations/01-sources/web/S002-rfc826-arp.md).

The attack: an attacker on the segment sends a gratuitous ARP reply claiming that the gateway IP maps to the attacker's MAC. All hosts update their caches. Traffic intended for the gateway now flows to the attacker. The broadcast reply model — the feature that makes automatic address resolution work — is the mechanism the attack uses.

## Limitations

This pattern explains attack mechanics, not design negligence. The engineers who built TCP in 1981 and ARP in 1982 operated under a threat model that included routing failures and hardware malfunctions, not adversarial peers on the network. Their designs were correct for that model. Applying modern security expectations retroactively misrepresents the situation and can lead to overstating the severity of design-era decisions. The pattern is a diagnostic tool for understanding how attacks work, not a verdict on historical engineering [S001](../../research/security-foundations/01-sources/web/S001-rfc793-tcp.md).

## Key points

- Every major protocol examined in this course encodes at least one trust assumption; the feature that makes the protocol function is also the mechanism its primary attack exploits
- The same structural pattern appears independently in TCP, ARP, HTTP, DNS, and TLS — five different stacks, all following the same logic
- Asking "who is authorised to supply this trusted value, and can that be faked?" generates attack models without requiring a pre-memorised list
- Design-era context matters: these are not engineering failures; they are tradeoffs whose security implications became visible as the threat model changed

## Go deeper

- [S001 — RFC 793 TCP](../../research/security-foundations/01-sources/web/S001-rfc793-tcp.md) — TCP's sequence number design, the three-way handshake state machine, and the half-open connection state that enables SYN flooding
- [S002 — RFC 826 ARP](../../research/security-foundations/01-sources/web/S002-rfc826-arp.md) — The table merge logic that executes before opcode check; the exact design decision that makes spoofing possible
- [S005 — RFC 1034 DNS](../../research/security-foundations/01-sources/web/S005-rfc1034-dns.md) — DNS recursive resolver trust chain and the cache TTL race condition underlying cache poisoning

---

*← Start* · *[Next lesson →](./L02-tcp-arp-http-attacks.md)*
