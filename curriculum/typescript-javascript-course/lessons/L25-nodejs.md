# Node.js Runtime

**Module**: M11 · Node.js Foundations  
**Type**: core  
**Estimated time**: 40 minutes  
**Claim**: C6 — Node.js is a JavaScript runtime for server-side code built on V8 and libuv; it provides filesystem, networking, and process APIs that don't exist in the browser

---

## The core idea

Node.js is a runtime that lets JavaScript run outside the browser. It uses the same V8 engine that Chrome uses for JavaScript execution, but wraps it with **libuv** — a C library that provides the event loop and async I/O for the server environment.

Node.js adds APIs that browsers don't have: filesystem access (`fs`), raw TCP/UDP networking (`net`), child processes, and a global `process` object. In return, it removes browser-only APIs: no `document`, no `window`, no `localStorage`.

Since Node.js 18, most browser APIs that make sense on the server are available natively: `fetch`, `URL`, `ReadableStream`, and others. This convergence means that a growing amount of code runs in both environments.

## Why it matters

Most JavaScript developers will write server-side code at some point — REST APIs, build tools, CLI scripts, or test runners. Understanding:
- How Node.js's event loop differs from the browser's (hint: it's the same model, different built-in I/O)
- What APIs are available (no DOM, but fs/net/process)
- How `require` / `import` works (CJS vs ESM, from L15)
- How to work with the filesystem asynchronously

These are prerequisites for writing backend code with Express, Fastify, or raw `http`.

## A concrete example

**Example 1 — the process object**

```js
// process is a global in Node.js (not available in browsers)
console.log(process.version);       // Node.js version: "v20.x.x"
console.log(process.platform);      // "win32", "linux", "darwin"
console.log(process.env.NODE_ENV);  // environment variables
console.log(process.argv);          // command-line arguments array
// argv[0] = path to node, argv[1] = path to script, argv[2+] = your args

process.exit(0);   // exit with code 0 (success)
process.exit(1);   // exit with code 1 (error)

// Unhandled rejection handling (important for production):
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});
```

**Example 2 — the fs module**

```js
import { readFile, writeFile, readdir } from "node:fs/promises";

// Reading a file asynchronously
const content = await readFile("./data.json", "utf-8");
const data = JSON.parse(content);

// Writing a file
await writeFile("./output.json", JSON.stringify(data, null, 2), "utf-8");

// Reading a directory
const files = await readdir("./src");
console.log(files); // ["index.ts", "utils.ts", ...]

// Synchronous variants (block the event loop — avoid in servers, ok in scripts)
import { readFileSync } from "node:fs";
const sync = readFileSync("./config.json", "utf-8");
```

**Example 3 — the path module**

```js
import path from "node:path";

// __dirname is not available in ESM — use import.meta.url instead
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Building paths safely (handles Windows backslash vs Unix forward slash)
const dataPath = path.join(__dirname, "data", "users.json");
const absolute = path.resolve("./relative/path"); // resolves from cwd

// Parsing paths
path.basename("/usr/local/bin/node"); // "node"
path.dirname("/usr/local/bin/node");  // "/usr/local/bin"
path.extname("file.ts");              // ".ts"
```

**Example 4 — Node.js built-in module prefix**

Since Node.js 16, built-in modules should be imported with the `node:` prefix. This makes it clear the import is a built-in, not an npm package:

```js
// Old style (still works):
import fs from "fs";
import path from "path";

// New style (preferred):
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import os from "node:os";
import { EventEmitter } from "node:events";
```

**Example 5 — environment variables and .env**

Node.js reads environment variables from `process.env`. In development, use a `.env` file with a loader:

```bash
# .env file (never commit to git)
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=secret123
PORT=3000
```

```ts
// In production: set env vars in your deployment platform
// In development: use dotenv or Node.js --env-file flag

// Node.js 20.6+ built-in support:
// node --env-file=.env server.js

// Or manually with dotenv:
import "dotenv/config"; // loads .env into process.env

const port = parseInt(process.env.PORT ?? "3000", 10);
const apiKey = process.env.API_KEY;

if (!apiKey) {
  throw new Error("API_KEY environment variable is required");
}

// TypeScript: process.env values are always string | undefined
// Never assume they exist without checking
```

## Key points

- Node.js runs JavaScript on the server using the V8 engine + libuv for async I/O; same event loop model as browsers
- `process` is the global object for environment, args, and exit; `process.env` holds environment variables
- Use `node:fs/promises` for async file operations; avoid synchronous `*Sync` variants in servers
- Import built-in modules with the `node:` prefix (`node:fs`, `node:path`, `node:http`)
- `__dirname` and `__filename` are not available in ESM — compute them from `import.meta.url`

## Go deeper

- [Node.js Introduction](../../research/typescript-javascript-course/01-sources/web/S009-nodejs-intro.md) — full Node.js intro, event loop, and core modules
- [TypeScript: Handbook Basics](../../research/typescript-javascript-course/01-sources/web/S005-ts-handbook-basics.md) — TypeScript in Node.js projects

---

*← [Previous lesson](./L24-dom-events.md)* · *[Next lesson: Building an HTTP Server →](./L26-nodejs-http.md)*
