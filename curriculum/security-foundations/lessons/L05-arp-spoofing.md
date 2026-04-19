# ARP — Why Any Host on Your Network Can Lie to Every Other Host

**Module**: M02 · Networking Protocols and Their Attacks  
**Type**: core  
**Estimated time**: 25 minutes  
**Claim**: C3 from Strata synthesis

---

## The core idea

The Address Resolution Protocol (ARP) solves a specific problem: your computer knows an IP address it wants to talk to, but the local network needs MAC addresses to actually deliver Ethernet frames. ARP bridges that gap. It is also one of the most trivially exploitable protocols in existence, because it has absolutely no authentication mechanism. Any machine on your local network can tell every other machine a lie about who owns which IP address — and by default, everyone will believe it.

**What is a MAC address?** A MAC (Media Access Control) address is a hardware identifier burned into every network interface card. It looks like `00:1A:2B:3C:4D:5E` — six pairs of hex digits. While IP addresses are logical (assigned by software, can change), MAC addresses are physical identifiers for specific hardware on the local network. Ethernet frames use MAC addresses to deliver data at Layer 2 (the local network link). IP addresses are used for routing between networks at Layer 3.

**Why does this distinction matter?** When your computer wants to send data to the gateway router at `192.168.1.1`, your computer needs to know the MAC address of the router to construct the Ethernet frame. It knows the IP address. It does not automatically know the MAC. ARP is the mechanism that finds out.

## Why it matters

ARP spoofing is a foundational attack technique for local network penetration testing, man-in-the-middle attacks, and HTTPS stripping attacks. If you are on the same network as a victim (same office WiFi, same VLAN, same switch broadcast domain), ARP gives you the ability to redirect their traffic through your machine. This is relevant for:

- Capturing credentials on unencrypted protocols (HTTP, Telnet, FTP)
- Performing SSL stripping attacks against poorly-configured HTTPS implementations
- Intercepting and modifying DNS responses in transit
- Pivoting through a network after initial access to a single host

Understanding the mechanism is also prerequisite for understanding why network segmentation (VLANs, separate subnets) and Dynamic ARP Inspection are standard enterprise defenses — both of which limit the blast radius of ARP spoofing by restricting which devices can communicate at Layer 2.

## A concrete example

### How ARP Works (Normal Operation)

**The scenario**: Your computer (`192.168.1.5`, MAC `AA:AA:AA:AA:AA:AA`) wants to send data to the gateway router at `192.168.1.1`.

**Step 1 — ARP Request**: Your computer broadcasts an ARP request to every device on the local network. The destination MAC is `FF:FF:FF:FF:FF:FF` — the broadcast address, meaning "everyone should read this." The message is: "Who has IP address 192.168.1.1? Tell 192.168.1.5."

**Step 2 — ARP Reply**: The router (`192.168.1.1`, MAC `BB:BB:BB:BB:BB:BB`) sends an ARP reply back directly to your computer: "I have 192.168.1.1. My MAC address is BB:BB:BB:BB:BB:BB."

**Step 3 — Cache**: Your computer stores this mapping in its ARP cache: `192.168.1.1 → BB:BB:BB:BB:BB:BB`. Future packets to `192.168.1.1` go directly to that MAC address without another ARP query. This cache entry expires after a few minutes.

That is the entire protocol. No handshake, no challenge, no signature. Trust is implicit.

### ARP Spoofing (Attack)

**The attacker** (`192.168.1.100`, MAC `CC:CC:CC:CC:CC:CC`) wants to intercept all traffic between your computer and the gateway.

**The attack — two poisoning messages**:

1. The attacker sends an unsolicited ARP reply to your computer: "I have 192.168.1.1 (the gateway). My MAC is CC:CC:CC:CC:CC:CC." Your computer updates its ARP cache: `192.168.1.1 → CC:CC:CC:CC:CC:CC` (the attacker's MAC). Your computer now sends all gateway-bound traffic to the attacker.

2. The attacker sends an unsolicited ARP reply to the gateway: "I have 192.168.1.5 (your computer). My MAC is CC:CC:CC:CC:CC:CC." The gateway now sends traffic intended for your computer to the attacker instead.

Both ARP caches have been poisoned. All traffic between your computer and the gateway now flows through the attacker. This is a **man-in-the-middle (MITM) position**.

Key detail: the attacker sent **unsolicited ARP replies** — no one asked. ARP caches accept and store unsolicited replies because the protocol never anticipated adversarial participants on the local network.

### What the Attacker Can Do From This Position

With all traffic flowing through them, the attacker has several options:

- **Passive sniffing**: Simply capture and read all unencrypted traffic (HTTP requests, cleartext passwords, session cookies sent over HTTP)
- **SSL stripping**: When your browser tries to follow an HTTPS redirect, the attacker intercepts the HTTP response and serves the page over HTTP instead, capturing your credentials before re-sending them to the real server over HTTPS
- **DNS interception**: Capture and modify DNS responses in transit, redirecting domain lookups to attacker-controlled servers
- **Selective blocking**: Drop specific packets to disrupt communications without fully terminating them

### Why ARP Has No Authentication

ARP was designed in 1982 (RFC 826). At that time, local area networks were trusted environments — primarily university and corporate networks with a small number of known participants. The assumption that any machine on the network would cooperate honestly was reasonable. The cost of adding cryptographic authentication to every ARP exchange would have been prohibitive on the hardware of the era.

This is the design-era context caveat from Claim C1: these protocols cannot be judged as negligent for the trust assumptions they made. The pattern explains attack mechanics, not design failures. The designers of ARP were not naive — they were solving the right problem with the constraints of 1982.

## Key points

- ARP translates IP addresses to MAC addresses for local Ethernet delivery; it has no authentication mechanism
- Any device can send an unsolicited ARP reply claiming to own any IP address; other devices will update their ARP cache
- ARP spoofing poisons two ARP caches simultaneously (victim and gateway) to position the attacker between them — a man-in-the-middle position
- From a MITM position, an attacker can read unencrypted traffic, perform SSL stripping, or intercept and modify DNS responses
- ARP spoofing only works against devices on the same Layer 2 network segment (same switch broadcast domain)
- Defenses: Dynamic ARP Inspection (switches validate ARP replies against a known-good binding table), static ARP entries, network segmentation (VLANs limit broadcast domains)

## Go deeper

- [S002](../../../../vault/research/security-foundations/01-sources/) — ARP broadcast model, unsolicited reply acceptance, and the ARP spoofing attack derivation

---

*[← Previous: TCP/IP and SYN Flood](./L04-tcp-syn-flood.md)* · *[Next: HTTP — Request Smuggling and Host Header Injection →](./L06-http-vulnerabilities.md)*
