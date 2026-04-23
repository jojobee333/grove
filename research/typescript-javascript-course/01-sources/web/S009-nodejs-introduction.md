# S009 — Node.js: Introduction to Node.js

**ID**: S009  
**URL**: https://nodejs.org/en/learn/getting-started/introduction-to-nodejs  
**Retrieved**: 2025 (current session)  
**Addresses**: Q7 (Node.js runtime and server-side JS)

## Key Points

### What Node.js Is
- An **open-source, cross-platform JavaScript runtime** (not a framework, not a language)
- Runs the **V8 JavaScript engine** (same engine as Google Chrome) outside the browser
- A single process handles requests without creating a new thread per connection

### Async I/O Model
- Uses **non-blocking, asynchronous I/O primitives** in its standard library
- When Node.js waits for I/O (disk, network, DB), it does NOT block the thread
- Instead, it registers a callback and continues processing other work
- This allows handling **thousands of concurrent connections** with one thread

### Minimal Hello World Server
```js
import { createServer } from 'node:http';

const hostname = '127.0.0.1';
const port = 3000;

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
```
- `node:http` is a built-in module (no npm install needed)
- `createServer` accepts a request handler called for every incoming request
- `req` = `http.IncomingMessage` (access headers, URL, body)
- `res` = `http.ServerResponse` (write status, headers, body)

### Key Differences from Browser JS
- No `window`, no `document`, no DOM APIs
- Has `process` object (env vars, argv, exit), `fs`, `http`, `path`, etc.
- CommonJS (`require`) vs ESM (`import`) — both supported (prefer ESM with `.mjs` or `"type":"module"`)
- ECMAScript features are controlled by Node.js version, not browser compatibility

### Unique Advantages
- Same language on frontend and backend (huge for team productivity)
- npm ecosystem: largest package registry in the world
- Ideal for I/O-heavy workloads; not ideal for CPU-intensive tasks

## Teaching Relevance
- Experienced devs often think "server JS = different language"; it's the same JS with different host APIs
- The non-blocking model mirrors the browser event loop — same concept, different context
- The `node:` prefix for built-ins (`node:http`, `node:fs`) is modern best practice
