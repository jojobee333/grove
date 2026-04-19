# TCP/IP — How the Three-Way Handshake Becomes a SYN Flood

**Module**: M02 · Networking Protocols and Their Attacks  
**Type**: core  
**Estimated time**: 28 minutes  
**Claim**: C3 from Strata synthesis

---

## The core idea

TCP (Transmission Control Protocol) is the protocol that makes the internet reliable. When you load a web page, stream a video, or send an email, TCP is the layer that guarantees your data arrives in order, without missing pieces, and without corruption. It achieves this guarantee through a carefully designed connection state machine — and that state machine is precisely what a SYN flood attack exploits.

To understand the attack mechanically (not just by name), you need to understand three things: how TCP establishes a connection, what state the server must hold during that process, and what happens when a participant refuses to cooperate with the design.

**What is an IP address?** Every device on a network has an IP address — a numerical label like `192.168.1.10` that identifies it. Think of it like a mailing address: it tells the network where to deliver packets.

**What is a port?** A server can run many services simultaneously. A port is a number (0–65535) that identifies which service a packet is intended for. Port 80 is HTTP (web), port 443 is HTTPS (encrypted web), port 22 is SSH (remote administration). When you connect to a web server, your connection goes to IP address port 443. Your computer uses a random high-numbered port on its end (say, port 54321) so the server can tell your connection from someone else's.

**What is TCP?** IP delivers packets between addresses, but it makes no guarantees about order or delivery. TCP runs on top of IP and adds: (1) guaranteed delivery with retransmission, (2) ordered byte streams, (3) connection state so both sides know when they are "in a conversation." TCP turns the unreliable packet delivery of IP into a reliable two-way channel.

## Why it matters

SYN flood attacks are among the most common forms of distributed denial-of-service (DDoS) on the internet. Understanding the mechanism — not just the name — tells you why SYN cookies exist, how modern CDN providers mitigate SYN floods at scale, and what the difference is between a network-level and application-level denial of service. More importantly, it gives you a template: any connection state machine that holds resources on behalf of an unauthenticated initiator is potentially vulnerable to a resource exhaustion attack built on the same pattern.

## A concrete example

### The Three-Way Handshake in Detail

When a client (say, your browser) connects to a server (say, a web server), TCP uses a three-step process to establish the connection:

**Step 1 — SYN**: The client sends a TCP segment with the SYN flag set. It includes an Initial Sequence Number (ISN) — a randomly chosen number (say, 1000) that identifies where the client's byte stream starts. The server receives this and creates a "half-open connection" entry in its connection table.

**Step 2 — SYN-ACK**: The server responds with both the SYN flag and the ACK flag set. It acknowledges the client's ISN (ACK = 1001, meaning "I received up to byte 1000, I'm ready for byte 1001") and sends its own ISN (say, 5000). The server's half-open entry now waits for the client to confirm.

**Step 3 — ACK**: The client sends a final ACK acknowledging the server's ISN (ACK = 5001). The connection is now fully established. Both sides know each other's starting sequence numbers and can begin exchanging data.

The critical detail: **between Step 2 and Step 3, the server holds a half-open connection entry in memory**. This entry occupies kernel resources — memory, a slot in the connection table. The server waits for Step 3 (the client's ACK) for a timeout period (typically 30–120 seconds before discarding it).

### The SYN Flood

The SYN flood attack exploits the half-open connection window:

1. The attacker sends thousands or millions of SYN packets per second to the target server.
2. Each SYN uses a **spoofed (fake) source IP address** — the attacker puts random or deliberately chosen IP addresses in the source field of each packet. The packets still reach the server (routers do not generally verify that a packet's claimed source IP is real).
3. The server responds to each SYN with a SYN-ACK directed at the spoofed source IP. These SYN-ACKs go to random machines on the internet that never sent a SYN — they either drop the packets or respond with RST, neither of which helps the server.
4. The server's half-open connection table fills up. When the table is full, the server cannot create new half-open entries.
5. Legitimate clients trying to connect get no response — the server has no capacity left in its connection table.

The server's service is now unavailable to legitimate users. The attacker did not need to exploit a bug or bypass authentication — they exploited the normal, correct behavior of the TCP state machine.

### RST Injection — A Second Attack From the Same Design

TCP RST (Reset) packets forcibly terminate a connection. If either side sends a RST, the connection is immediately closed, no graceful shutdown. RST packets are legitimate — used when a program crashes, when a connection times out, or when a server refuses an unexpected connection.

TCP accepts a RST packet if the sequence number in the RST is within the "receive window" — the range of sequence numbers the receiving side currently considers valid for this connection.

**The attack**: An attacker who can observe or guess the sequence numbers in an active TCP connection between Alice and a server can send a spoofed RST packet with a sequence number inside the window. The server (or Alice) terminates the connection, even though the RST came from the attacker, not from the other party. This is RST injection — useful for disrupting established connections (e.g., dropping a VPN session, terminating an active SSH connection, or disrupting a database connection).

The attack surface is the sequence number acceptance window: the same design feature that allows TCP to handle out-of-order packet delivery also means that a packet with a correct-ish sequence number is trusted even when it comes from the wrong source.

## Key points

- TCP's three-way handshake requires the server to hold a "half-open" connection entry between receiving a SYN and receiving the final ACK — this is the resource that SYN floods exhaust
- A SYN flood sends massive numbers of SYN packets with spoofed source IPs, filling the half-open connection table and preventing legitimate connections
- RST injection exploits the TCP sequence number acceptance window — a RST with a sequence number in the window is treated as legitimate even from an attacker
- Both attacks are derived from TCP's connection reliability features, not from bugs in TCP implementations
- Mitigation (SYN cookies) avoids holding state by encoding the connection parameters into the ISN — the server only creates a real entry when the final ACK arrives with the encoded information

## Go deeper

- [S001](../../../../vault/research/security-foundations/01-sources/) — TCP sequence numbers, the SYN flood, RST injection, and ISN prediction attacks in the context of RFC 793

---

*[← Previous: Feature-to-Attack Derivation](./L03-feature-to-attack.md)* · *[Next: ARP — Why Any Host on Your Network Can Lie →](./L05-arp-spoofing.md)*
