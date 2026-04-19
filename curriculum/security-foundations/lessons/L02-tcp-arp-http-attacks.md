# TCP, ARP, and HTTP: Walking Protocols to Their Attacks

**Module**: M01 · The Protocol Feature Mental Model
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C3 from Strata synthesis

---

## The situation

You understand the mental model from L01: protocol feature → trust assumption → attack vector. Now apply it. For each of four protocols — TCP, ARP, HTTP, and DNS — start from the spec and walk forward to the primary attack that flows directly from the packet structure. The goal is to be able to derive these attacks independently, not recall them from memory.

---

## Approach: read the spec, find the trust assumption

For each protocol, identify three things:
1. **The design decision** — what problem does this feature solve?
2. **The trust assumption** — what must the protocol take on faith for the feature to work?
3. **The attack vector** — who can supply that trusted value dishonestly, and what does that enable?

Once you have those three, the attack name almost doesn't matter. You understand the mechanism.

---

## Worked example 1 — TCP → SYN flood and RST injection

**The design decision**: TCP guarantees reliable, ordered delivery by assigning sequence numbers to every byte. Both endpoints synchronise their sequence numbers during the three-way handshake. Each subsequent segment is only accepted if its sequence number falls within the receiver's current window.

**The trust assumption**: Initial Sequence Numbers are chosen by a 32-bit timer. RFC 793 intended this to make sequence numbers unpredictable enough that an off-path attacker could not forge them [S001](../../research/security-foundations/01-sources/web/S001-rfc793-tcp.md).

**Attack A — SYN flood**: TCP requires the server to allocate a connection table entry for every SYN received — before the handshake completes and before the client's identity is verified. This is necessary for the protocol to work; the server must remember the SYN was received so it can send SYN-ACK and match the eventual ACK.

An attacker sends millions of SYN packets with spoofed source IPs. The server creates a half-open connection entry for each one and waits for the ACK that never comes. The connection table fills. Legitimate clients are refused service. The mechanism: state allocation before authentication.

**Attack B — RST injection**: A TCP RST segment immediately terminates a connection. The only check is that the sequence number falls within the current window. An off-path attacker who can observe network traffic (or estimate sequence numbers) can inject a forged RST with a valid-range sequence number, terminating an established connection between two other parties. BGP hijacking attacks have used TCP RST injection to disrupt backbone routing sessions. The mechanism: RST segments are accepted based only on sequence number, not cryptographic identity.

---

## Worked example 2 — ARP → man-in-the-middle

**The design decision**: IP packets need the Layer 2 MAC address of the next-hop host before they can be sent. ARP solves this with a broadcast: "Who has IP X?" — any host on the segment that owns IP X replies with its MAC. The requesting host caches the reply [S002](../../research/security-foundations/01-sources/web/S002-rfc826-arp.md).

**The trust assumption**: RFC 826's cache update logic runs *before* the opcode check. Any received ARP packet (request or reply) that references an IP already in the cache immediately updates the cache entry. This design allows stale entries to self-correct. It also means any host can send an unsolicited ARP reply for any IP and it will be accepted.

**The attack — ARP spoofing**: An attacker on the LAN segment sends gratuitous ARP replies asserting that the router's IP (e.g., `192.168.1.1`) maps to the attacker's MAC. All hosts on the segment receive and cache the reply. All traffic bound for the router is now forwarded to the attacker. The attacker forwards it upstream (maintaining connectivity) while inspecting or modifying every packet. This is a complete network-level man-in-the-middle using a standard protocol operation — no exploit code required.

---

## Worked example 3 — HTTP → Host header injection and request smuggling

**The design decision**: HTTP/1.1 added the mandatory `Host` header so that a server at a single IP address could host multiple virtual domains. The server reads the `Host` value and routes the request to the correct application. Because the client provides the header, and HTTP was designed for a cooperative trust model, no verification occurs [S003](../../research/security-foundations/01-sources/web/S003-rfc7230-http.md).

**The trust assumption**: the `Host` header accurately reflects the client's intended destination.

**Attack A — Host header injection**: Web frameworks that use `request.host` to generate password reset URLs, email verification links, or redirect targets will embed an attacker-controlled domain in those URLs. An attacker sets `Host: evil.com` in a password reset request. The application emails `https://evil.com/reset?token=ABC123` to the victim. The victim clicks it; the attacker captures the token.

**Attack B — HTTP request smuggling**: HTTP/1.1 defines two body-framing mechanisms: `Content-Length` (exact byte count) and `Transfer-Encoding: chunked` (length of each chunk in the stream). When a front-end proxy and a back-end server disagree on which header takes precedence, an attacker can craft a request whose body contains a second complete HTTP request. The front-end proxy sees one request; the back-end server processes two. The attacker's second request is processed as if it came from a legitimate client, bypassing access controls, poisoning caches, or hijacking other users' requests.

---

## Limitations

These are attack *patterns*, not guaranteed exploits in all environments. A SYN flood requires packet volume that most attackers on the open internet cannot sustain without a botnet. RST injection requires being on an intermediate network path or using an amplification technique. ARP spoofing is limited to the same Layer 2 broadcast domain. Request smuggling requires a specific combination of proxy and back-end that disagrees on header parsing. The exploitability conditions vary by OS version, network topology, and implementation choices — but the underlying mechanics are correct for understanding the attack class [S003](../../research/security-foundations/01-sources/web/S003-rfc7230-http.md).

## When to use this approach

Use the "design decision → trust assumption → attack" derivation whenever you encounter an unfamiliar protocol or a CVE description that seems unmotivated. Start from the spec. Identify what the protocol takes on faith. Check whether that faith can be abused. This works for protocol RFCs, API documentation, and library behaviour — anywhere a system must trust an input it cannot fully verify.

## Key points

- TCP's SYN flood exploits pre-authentication state allocation; RST injection exploits acceptance of sequence-numbered control segments without cryptographic verification
- ARP spoofing exploits the early-update design in RFC 826; no vulnerability exists beyond the intended protocol behaviour
- HTTP Host header injection and request smuggling both exploit the mandatory trust the protocol places in client-supplied headers
- Exploitability conditions vary by environment — treat these as attack patterns to model, not guaranteed exploits

## Go deeper

- [S001 — RFC 793 TCP](../../research/security-foundations/01-sources/web/S001-rfc793-tcp.md) — TCP state machine and sequence number design; Section 3.3 covers ISN selection and its security implications
- [S002 — RFC 826 ARP](../../research/security-foundations/01-sources/web/S002-rfc826-arp.md) — The Merge_flag cache update logic that executes before opcode check
- [S003 — RFC 7230 HTTP](../../research/security-foundations/01-sources/web/S003-rfc7230-http.md) — Section 5.4 on Host header requirements; Section 9.5 on request smuggling via Content-Length/Transfer-Encoding conflicts

---

*← [Previous lesson](./L01-protocol-features-attack-surfaces.md)* · *[Next lesson →](./L03-dns-attacks.md)*
