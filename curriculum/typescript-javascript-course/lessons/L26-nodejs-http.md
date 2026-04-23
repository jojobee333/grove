# Building an HTTP Server with Node.js

**Module**: M11 · Node.js Foundations  
**Type**: applied  
**Estimated time**: 45 minutes  
**Claim**: C6 — Node.js's http module provides a low-level server; understanding it clarifies what frameworks like Express are doing under the hood

---

## The core idea

Node.js has a built-in `http` module that creates TCP servers that speak the HTTP protocol. You call `http.createServer(handler)`, where `handler` is a function that receives an `IncomingMessage` (request) and `ServerResponse` (response). The request includes the URL, method, headers, and body (as a stream). The response has methods to set status, headers, and write the body.

Express, Fastify, Hono, and every other Node.js HTTP framework are built on top of this. Understanding the raw `http` module gives you the mental model for what frameworks abstract.

## Why it matters

Two reasons to understand raw Node.js HTTP:
1. When frameworks abstract too much, you need to know what's underneath to debug it
2. For simple services (webhooks, health checks, internal tools), raw `http` or a minimal framework is faster and lighter than Express

The key practical topics: parsing request bodies (they arrive as streams), routing by URL + method, setting response headers, and understanding status codes.

## A concrete example

**Example 1 — minimal HTTP server**

```ts
import http from "node:http";

const server = http.createServer((req, res) => {
  // req: IncomingMessage — URL, method, headers, body (stream)
  // res: ServerResponse — send headers and body

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Hello, World!" }));
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

**Example 2 — routing by URL and method**

```ts
import http from "node:http";
import { URL } from "node:url";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const method = req.method ?? "GET";

  // Route: GET /
  if (url.pathname === "/" && method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Welcome to the API");
    return;
  }

  // Route: GET /health
  if (url.pathname === "/health" && method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }

  // Route: GET /users/:id — manual parameter extraction
  const userMatch = url.pathname.match(/^\/users\/(\d+)$/);
  if (userMatch && method === "GET") {
    const id = parseInt(userMatch[1], 10);
    const user = await findUser(id);

    if (!user) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(user));
    return;
  }

  // 404 fallthrough
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});
```

**Example 3 — reading the request body**

The request body is a Node.js stream — it arrives in chunks and must be assembled:

```ts
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// Usage in a route handler:
if (url.pathname === "/users" && method === "POST") {
  try {
    const raw = await readBody(req);
    const input = JSON.parse(raw);

    // Validate input before using it
    if (!input.name || typeof input.name !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "name is required and must be a string" }));
      return;
    }

    const user = await createUser(input);
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(user));
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
  }
}
```

**Example 4 — why frameworks exist**

The raw `http` module works but requires repetitive boilerplate. Here's what Express does for you:

| Raw http | Express |
|---|---|
| Parse URL manually | `req.params`, `req.query` |
| Read body stream | `express.json()` middleware |
| `res.writeHead(200, {...})` | `res.status(200).json({...})` |
| Regex path matching | `app.get("/users/:id", ...)` |
| Manual error handling | Error middleware `(err, req, res, next)` |
| Middleware chaining | `app.use(middleware)` |

Understanding the raw http layer means you know what Express's `req.body` parsed, why `Content-Type: application/json` is required, and what happens when you don't call `res.end()`.

**Example 5 — graceful shutdown**

```ts
const server = http.createServer(handler);
server.listen(3000);

// Handle SIGTERM (e.g., from Docker or process manager)
process.on("SIGTERM", () => {
  console.log("SIGTERM received: closing server");
  server.close(() => {
    // Called after all pending connections are closed
    console.log("Server closed");
    process.exit(0);
  });
});
```

## Key points

- `http.createServer(handler)` creates a server; `handler` receives `IncomingMessage` and `ServerResponse`
- Set the `Content-Type` header before calling `res.end()` — clients use it to parse the response
- The request body arrives as a stream — accumulate chunks in a `data` listener, process in `end`
- Parse URL parameters manually with regex or `new URL()` in raw http; frameworks do this for you
- Frameworks like Express are thin wrappers over `node:http` — they add routing, middleware, and body parsing

## Go deeper

- [Node.js Introduction](../../research/typescript-javascript-course/01-sources/web/S009-nodejs-intro.md) — Node.js http, streams, and the event model
- [MDN: Promises and async/await](../../research/typescript-javascript-course/01-sources/web/S004-mdn-promises.md) — async patterns for request handling

---

*← [Previous lesson](./L25-nodejs.md)* · *Course complete! 🎉 Review the [course map](../course.json) or start on [Module 1](./L01-js-landscape.md)*
