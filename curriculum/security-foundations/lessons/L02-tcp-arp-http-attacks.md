# TCP, ARP, and HTTP: Walking Protocols to Their Attacks

**Module**: M01 · The Protocol Feature Mental Model
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C3 — Packet-level attacks derive directly from protocol design decisions

---

## The situation

You understand the mental model from L01. Now apply it. For each of three protocols — TCP, ARP, and HTTP — start from the protocol's design decision and walk forward to the exact attack it enables. This is the skill: not memorising attack names, but deriving them.

---

## TCP: Trusted sequence numbers → SYN flood and RST injection

**The design decision**: TCP connections use sequence numbers to ensure ordered, reliable delivery. Both sides agree on initial sequence numbers during the three-way handshake. The receiver accepts segments that fall within the expected window.

**The trust assumption**: sequence numbers are unpredictable, so only the legitimate endpoint knows the current value.

**Attack 1 — SYN flood**: TCP's handshake requires the server to allocate a connection entry for every SYN it receives, waiting for the final ACK. An attacker sends thousands of SYN packets with spoofed source IPs. Each one consumes a connection slot. The server's connection table fills. Legitimate clients are refused. The "feature" being abused: servers allocate state before the handshake completes. (S001)

**Attack 2 — RST injection**: An off-path attacker who can guess the approximate sequence number can inject a RST (reset) segment, terminating an established TCP connection. The trust assumption (sequence numbers are hard to guess) held in the 1970s. Modern CPUs make guessing the 32-bit window feasible. The "feature" being abused: RST segments are accepted without cryptographic verification. (S001)

---

## ARP: Broadcast reply trust → ARP spoofing

**The design decision**: ARP uses Layer 2 broadcast so any machine on the segment can hear the question "Who has 192.168.1.1?" and reply if it owns that IP. The first (or last) reply is cached.

**The trust assumption**: only the legitimate owner of an IP will reply to the broadcast.

**The attack**: Any machine on the LAN segment can send an unsolicited ARP reply: "192.168.1.1 is at MAC AA:BB:CC:DD:EE:FF". The target machine updates its ARP table immediately — no verification. Now all traffic intended for the gateway is sent to the attacker. The attacker forwards it (man-in-the-middle) or drops it (denial of service). All of this requires zero authentication; it is the intended ARP mechanism repurposed. (S002)

---

## HTTP: Advisory Host header → header injection and request smuggling

**The design decision**: HTTP/1.1 added the `Host` header so one IP address could serve multiple virtual hosts. The server selects the right application based on the Host value. The feature required trusting the client-supplied header.

**The trust assumption**: the Host header reflects the legitimate intended destination.

**Attack 1 — Host header injection**: Some web applications use the Host header value to construct password reset URLs, redirect URLs, or cache keys. An attacker modifies the Host header to their own domain. The application builds `https://evil.com/reset?token=abc123` and emails it to the victim. The token is delivered to the attacker. (S003)

**Attack 2 — HTTP request smuggling**: HTTP/2 to HTTP/1.1 downgrade proxies must translate framing. Differences in how front-end proxies and back-end servers parse `Content-Length` vs `Transfer-Encoding` headers allow an attacker to "smuggle" a second request inside the first. The back-end server sees a request the front-end proxy never intended. The "feature" being abused: the protocol assumes all components parse headers identically. (S003)

---

## Key points

- Derive attacks by starting with the design decision, not the attack name — the derivation is the transferable skill
- SYN flood and RST injection both exploit TCP's stateful connection management before authentication completes
- ARP spoofing works because there is no authentication in the ARP spec; the broadcast reply is the mechanism
- HTTP Host header attacks are possible because HTTP spec requires trusting a client-supplied value for server routing

## Go deeper

- [S001 — RFC 793 TCP](https://tools.ietf.org/html/rfc793) — TCP spec; sequence number design in section 3
- [S002 — RFC 826 ARP](https://tools.ietf.org/html/rfc826) — ARP spec; the broadcast reply mechanism
- [S003 — RFC 7230 HTTP](https://tools.ietf.org/html/rfc7230) — HTTP/1.1 framing, Host header, and Transfer-Encoding

---

*← [Previous: How Protocol Features Become Attack Surfaces](./L01-protocol-features-attack-surfaces.md)* · *[Next: DNS Architecture and How Attackers Abuse It](./L03-dns-attacks.md) →*
