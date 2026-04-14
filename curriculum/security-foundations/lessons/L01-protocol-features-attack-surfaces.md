# How Protocol Features Become Attack Surfaces

**Module**: M01 · The Protocol Feature Mental Model
**Type**: core
**Estimated time**: 13 minutes
**Claim**: C1 — Protocol features are the attack surface

---

## The core idea

Every protocol you will encounter was designed to solve a usability problem. TCP was designed so that packets arrive reliably even when the network drops some. ARP was designed so machines on a LAN can discover each other automatically. HTTP was designed so one server could host multiple websites. DNS was designed so humans don't need to remember IP addresses.

Each design decision encodes a trust assumption: *someone will tell us the correct sequence number*, *the last reply to a broadcast is authoritative*, *the Host header reflects the intended destination*, *recursive resolvers forward honest answers*. These are not bugs. They are the intended behaviour. The problem is that attackers can satisfy these trust assumptions dishonestly. The same feature that makes the protocol work is the mechanism the attack uses. This is the pattern: **protocol feature → trust assumption → exploit path**.

## Why it matters

When you encounter a new protocol — whether reviewing an API, doing a CTF challenge, or reading a CVE — you don't need a prior list of known attacks. You need to ask one question: *what does this protocol trust, and who is allowed to provide that trusted value?* If the answer is "anyone on the network" or "the client itself", you have your attack surface.

This mental model is more durable than a memorised list of attacks. Attack names change. CVE numbers multiply. The underlying structural pattern stays constant. Internalise it once and you can independently reason about both ancient protocols and ones published after this course was written.

## A concrete example

ARP (Address Resolution Protocol) solves the problem: "I have an IP address — what MAC address should I send frames to?" The design decision was to use broadcast: send a broadcast asking "Who owns this IP?" and trust that the correct machine replies.

The trust assumption: the most recent reply to a broadcast is authoritative.

The exploit: any machine on the LAN segment can send an unsolicited ARP reply claiming to own any IP address. The receiving machine updates its ARP cache immediately. Now all traffic intended for the gateway flows through the attacker's machine instead. This is ARP spoofing — the attack is the broadcast mechanism, repurposed.

No external vulnerability is required. The attack is written into the protocol spec itself.

## Key points

- Every network protocol encodes at least one trust assumption about who controls input
- The trust assumption required for the protocol to function is also the attack vector
- Asking "who is allowed to provide this trusted value?" is the single most useful question you can ask about any protocol

## Go deeper

- [S001 — RFC 793 TCP](../../../../../vault/research/security-foundations/01-sources/web/S001-rfc793-tcp.md) — TCP's sequence number design and its side effects
- [S002 — RFC 826 ARP](../../../../../vault/research/security-foundations/01-sources/web/S002-rfc826-arp.md) — The original ARP spec; the trust assumption is visible in the design
- [S005 — RFC 1034 DNS](../../../../../vault/research/security-foundations/01-sources/web/S005-rfc1034-dns.md) — DNS recursive resolver trust chain

---

*← Start* · *[Next lesson: TCP, ARP, and HTTP: Walking Protocols to Their Attacks](./L02-tcp-arp-http-attacks.md) →*
