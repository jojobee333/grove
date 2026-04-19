# HTTP — Request Smuggling and the Host Header That Isn't Verified

**Module**: M02 · Networking Protocols and Their Attacks  
**Type**: core  
**Estimated time**: 28 minutes  
**Claim**: C3 from Strata synthesis

---

## The core idea

HTTP (HyperText Transfer Protocol) is the request-response protocol that powers the web. Every time your browser loads a page, submits a form, or calls an API, it is sending HTTP requests and receiving HTTP responses. HTTP was designed to be simple, stateless, and flexible — and those design goals created trust assumptions that attackers exploit today.

Two vulnerabilities covered in this lesson — HTTP request smuggling and Host header injection — both arise from the same category of assumption: **that components in the HTTP processing chain agree on how to parse and interpret the request**. When they do not, attackers can exploit the disagreement.

**What is HTTP?** HTTP is a text-based protocol that runs over TCP. A request looks like this:

```
GET /index.html HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
Accept: text/html

```

The first line is the method (`GET`) and path (`/index.html`). The following lines are headers — key-value pairs that tell the server and intermediaries what the client wants. Then a blank line, then (for POST requests) the body.

**What is HTTPS?** HTTPS is just HTTP wrapped in TLS encryption. The HTTP structure is identical; TLS encrypts the contents so that intermediaries cannot read or modify the message in transit. (TLS is covered in M05.)

## Why it matters

HTTP is the protocol of virtually every web application in existence. Understanding where HTTP parsing creates trust violations is prerequisite knowledge for web application security — including understanding injections, request forgery, and API security. Request smuggling in particular has led to widespread vulnerabilities at major platforms including GitHub, Slack, and Akamai CDN infrastructure.

Host header injection specifically affects any application that constructs URLs using the Host header value — including password reset flows, which are present in essentially every web application that handles user accounts.

## A concrete example

### The Host Header

Every modern web server hosts multiple websites on a single IP address — this is called **virtual hosting**. When an HTTP request arrives at an IP address, the server needs to know which website (virtual host) to serve. There could be hundreds of websites on the same IP. The `Host` header is how the client tells the server which one it wants.

When you type `https://bank.com` in your browser, the browser sends:

```
GET /account HTTP/1.1
Host: bank.com
```

The server reads `Host: bank.com` and routes the request to the correct virtual host.

**The trust assumption**: The server trusts the Host header to accurately reflect which website the client intended to contact. It is just a header field — it is text. Nothing prevents a client (or an attacker intercepting the request) from putting any value there.

**Host header injection — the password reset attack**:

A web application sends password reset emails with a link like:
```
https://<HOST>/reset?token=abc123
```
where `<HOST>` is taken directly from the HTTP Host header. This seems reasonable — the Host header should tell you your own hostname, right?

The attack:
1. The attacker initiates a password reset for a victim's account on `bank.com`
2. The attacker intercepts the HTTP request (or uses a client that lets them set custom headers) and changes the Host header: `Host: attacker.com`
3. The server builds the reset URL: `https://attacker.com/reset?token=abc123`
4. The server sends the victim an email containing this link
5. The victim clicks the link — the token is sent to the attacker's server
6. The attacker uses the token to reset the victim's password

The Host header was used by the application as if it were a trusted source of the server's own hostname. It is not — it is set by the client and can be set to anything.

---

### HTTP Request Smuggling

Modern web deployments use multiple HTTP processing components in a chain: a CDN edge node, a reverse proxy or load balancer, and a backend application server. Each of these components parses incoming HTTP requests. Request smuggling exploits disagreements between how these components determine where one request ends and the next begins.

**HTTP/1.1 has two ways to specify request body length**:

1. `Content-Length: N` — the body is exactly N bytes
2. `Transfer-Encoding: chunked` — the body is sent in chunks, each prefixed with its size in hex, terminated by a zero-size chunk (`0\r\n\r\n`)

Both mechanisms exist because chunked encoding allows streaming responses where the total size is not known in advance, while Content-Length is simpler for fixed-size bodies.

**The vulnerability**: What happens when the front-end proxy uses one mechanism to determine where a request ends, and the backend uses the other?

**CL.TE attack** (front-end uses Content-Length, back-end uses Transfer-Encoding):

The attacker sends:
```
POST / HTTP/1.1
Host: vulnerable.com
Content-Length: 13
Transfer-Encoding: chunked

0

SMUGGLED
```

The front-end proxy reads Content-Length: 13. It counts 13 bytes of body: `0\r\n\r\nSMUGGLED`. The front-end sends this as a complete request to the backend.

The backend reads Transfer-Encoding: chunked. It sees `0\r\n\r\n` — a zero-size chunk — and considers the request body ended. The backend treats the request as complete. But `SMUGGLED` is left in the TCP connection buffer as the beginning of the **next** request.

When the next legitimate user's request arrives through the same persistent TCP connection, the backend prepends `SMUGGLED` to it. The next user's request now starts with the attacker's smuggled prefix — potentially overriding their request path, injecting headers, or capturing their session token.

**Why this is dangerous**:

- Attackers can capture other users' request headers (including session cookies and Authorization tokens) by smuggling a partial request that causes the backend to include the next user's headers in a response the attacker can read
- Attackers can bypass security checks performed by the front-end (IP restrictions, authentication headers, WAF rules) that the backend never sees
- The attack affects all users whose requests share a persistent connection with the attacker's smuggled request — not just the attacker

**Note on prevalence**: HTTP request smuggling is particularly impactful against shared infrastructure — CDNs, load balancers, API gateways — because many users share the same persistent connections between the proxy and backend layers.

---

### HTTP Response Splitting (Bonus)

A simpler HTTP parsing attack: if an application includes user-supplied input in an HTTP response header without sanitizing newline characters (`\r\n`), the attacker can inject new headers or even a second complete HTTP response. A crafted input like `malicious\r\nSet-Cookie: session=attacker` injected into a response header causes the client to set the attacker's cookie. This is a direct injection attack against the newline-as-header-delimiter parsing assumption.

## Key points

- The `Host` header identifies which virtual host to serve; it is set by the client, not verified by the server, and should never be used to construct security-sensitive URLs (password resets, CSRF tokens, canonical links) without explicit validation
- HTTP/1.1 has two body-length mechanisms (Content-Length and Transfer-Encoding); disagreements between front-end and back-end components on which to use create request smuggling vulnerabilities
- Request smuggling lets attackers prefix their payload to other users' requests, bypass front-end security controls, and capture other users' session tokens
- Both attacks are derived from HTTP design features (virtual hosting, dual body-length specification) not from implementation bugs — they exploit the parsing assumptions built into the protocol

## Go deeper

- [S003](../../../../vault/research/security-foundations/01-sources/) — HTTP Host header advisory nature, request smuggling, and virtual hosting mechanics

---

*[← Previous: ARP Spoofing](./L05-arp-spoofing.md)* · *[Next: DNS Architecture — The Hierarchy Everyone Depends On →](./L07-dns-architecture.md)*
