# How Protocols Work — Trust Assumptions as the Foundation of Everything

**Module**: M01 · How Security Thinking Works  
**Type**: core  
**Estimated time**: 25 minutes  
**Claim**: C1 from Strata synthesis

---

## The core idea

A **protocol** is an agreed-upon set of rules that governs how two or more parties communicate. Every protocol — whether it governs how two computers set up a TCP connection, how a browser resolves a domain name, or how a client and server negotiate an encrypted channel — is built on a foundation of **trust assumptions**.

A trust assumption is anything the protocol relies on being true without verifying it. The designers of a protocol choose which assumptions to make because verifying everything is expensive, slow, or sometimes technically impossible given the constraints of the era. Those assumptions are the exact places where attacks live.

The pattern is so consistent across all major network protocols that the research identifies it as the single highest-leverage mental model in security (Claim C1): **every major protocol's attack surface is embedded in its own design features**. TCP, ARP, HTTP, DNS, and TLS all follow the same structure. A learner who understands this pattern can look at any new protocol specification and immediately generate a list of potential attack surfaces — without looking up CVEs or reading security research.

Think of a protocol as a contract between parties. The contract says: "I will send you a SYN packet. You will send me a SYN-ACK. I will send you an ACK. We are now connected." The contract works because both parties are assumed to be cooperating. An attacker is a party who has read the contract and has no intention of cooperating — but who is still allowed to send packets.

## Why it matters

This lesson is the theoretical foundation for every module that follows. Before you study TCP attacks, DNS attacks, TLS vulnerabilities, or Windows authentication exploitation, you need one thing: the ability to look at a protocol and predict where it will break.

That ability comes from identifying trust assumptions. Once you can do that reliably — for any protocol, not just the ones covered in this course — you have a skill that transfers to every new protocol you will encounter throughout your career. New protocols get designed constantly. New trust assumptions get made. The pattern for finding their weak points does not change.

Without this mental model, studying security is memorization. With it, studying security is inference.

## A concrete example

**Example 1 — ARP, the simplest case**

The Address Resolution Protocol (ARP) is used to translate an IP address (like 192.168.1.1) into a hardware MAC address (like `00:11:22:33:44:55`). MAC addresses are what Ethernet actually uses to send frames on a local network. When your computer wants to talk to 192.168.1.1, it needs to know the MAC address to put in the Ethernet frame header.

ARP works like this: your computer broadcasts a message to every device on the local network: "Who has IP address 192.168.1.1? Tell me your MAC address." The device that owns that IP replies: "I have 192.168.1.1. My MAC address is `00:11:22:33:44:55`."

Now ask the trust question: **what does ARP assume to be true?**

1. It assumes that the device replying actually owns the IP address it claims to own.
2. It assumes that the most recent reply is the correct one.
3. It assumes no device will send an unsolicited reply (a reply that was not requested).

Not one of these assumptions is enforced. Any device on the local network can send an unsolicited ARP reply claiming to own any IP address. No cryptographic signature, no challenge, no verification. The protocol was designed when the threat model was "routing errors and hardware failures" — not "adversarial machines on the same network."

The attack flows directly from assumption #1 and #3 being false: **ARP spoofing**. An attacker sends an unsolicited ARP reply to your computer saying "I have IP 192.168.1.1 (your gateway). My MAC address is the attacker's MAC." Your computer updates its ARP cache. Now all your traffic destined for the gateway goes to the attacker instead. The attacker reads it, modifies it, or forwards it — a perfect man-in-the-middle position, derived entirely from reading the ARP specification.

**Example 2 — TCP's three-way handshake**

TCP establishes a connection via a three-step handshake:
1. Client → Server: SYN (I want to connect, my sequence number starts at X)
2. Server → Client: SYN-ACK (Okay, I'm half-open waiting for you, your seq is X, mine starts at Y)
3. Client → Server: ACK (Confirmed, I acknowledge your seq Y)

The server must hold a "half-open" connection entry in memory from step 2 until step 3 arrives. What does TCP assume?

**It assumes that the client who sent the SYN in step 1 will follow up with the ACK in step 3.**

An attacker who sends thousands of SYN packets with spoofed source IP addresses never sends the ACK. The server holds thousands of half-open entries, each occupying memory and kernel resources. When the table fills up, the server cannot accept legitimate connections. That is a **SYN flood** — a denial-of-service attack derived entirely from the half-open connection state machine.

The attack surface is the handshake design feature that makes TCP reliable: the three-step negotiation that ensures both parties have received each other's initial sequence numbers.

## Key points

- A protocol is a contract; a trust assumption is anything the contract does not verify
- Every major network protocol has trust assumptions baked into its design — they were reasonable for the threat model of the time
- The attack surface of a protocol is its trust assumptions; to find attacks, find the assumptions
- You do not need to read security research to derive attacks — you need to read the protocol specification and ask "what does this require to be true that it does not verify?"
- This pattern holds for TCP, ARP, HTTP, DNS, TLS, Kerberos, NTLM, and every other protocol examined in this research (Claim C1)

## Go deeper

- [S001](../../../../vault/research/security-foundations/01-sources/) — TCP sequence number trust assumption (SYN flood, RST injection)
- [S002](../../../../vault/research/security-foundations/01-sources/) — ARP broadcast model and its absence of authentication
- [S003](../../../../vault/research/security-foundations/01-sources/) — HTTP Host header as advisory, not enforced

---

*[← Previous: The Security Mindset](./L01-security-mindset.md)* · *[Next: Feature-to-Attack Derivation →](./L03-feature-to-attack.md)*
