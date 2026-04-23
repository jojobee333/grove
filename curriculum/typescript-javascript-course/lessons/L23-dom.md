# DOM Manipulation

**Module**: M10 · DOM & Browser APIs  
**Type**: applied  
**Estimated time**: 45 minutes  
**Claim**: C6 — The DOM is a live tree of objects representing an HTML document; JavaScript manipulates the tree to change what the user sees

---

## The core idea

The **Document Object Model (DOM)** is a programming interface for HTML. When a browser parses an HTML file, it builds a tree of objects where each node represents a tag, text content, or attribute. JavaScript can query this tree, read and modify nodes, add and remove elements, and change styles — all of which are reflected immediately in the browser.

The DOM is a browser-specific API — it does not exist in Node.js (unless you add a library like jsdom). TypeScript includes DOM type definitions in `lib: ["DOM"]`.

Key object types in the DOM:
- `Document` (`document`) — the root, provides query methods
- `HTMLElement` — a specific HTML element
- `NodeList` — a list of nodes (from `querySelectorAll`)
- `Event` — a user or browser interaction

## Why it matters

If you work on frontend code (including TypeScript with React), you need to understand the DOM for:
- Debugging rendered output
- Direct DOM manipulation when a framework is too heavy
- Building web components
- Writing vanilla JavaScript for performance-critical UI

Even in React apps, events are DOM events (with a React wrapper), refs give you DOM elements, and `useEffect` is often used to call DOM APIs.

## A concrete example

**Example 1 — querying elements**

```ts
// getElementById — returns HTMLElement | null
const btn = document.getElementById("submit-btn");
if (btn) {
  btn.textContent = "Submit"; // TypeScript narrows to HTMLElement
}

// querySelector — returns Element | null (generic)
const input = document.querySelector<HTMLInputElement>("#username");
// <HTMLInputElement> type argument lets you access .value

// querySelectorAll — returns NodeList (static snapshot)
const allLinks = document.querySelectorAll<HTMLAnchorElement>("a.nav-link");
allLinks.forEach(link => {
  link.classList.add("styled");
});

// getElementsByClassName — returns HTMLCollection (live — updates if DOM changes)
const active = document.getElementsByClassName("active"); // HTMLCollection
```

**Example 2 — reading and modifying elements**

```ts
const heading = document.querySelector<HTMLHeadingElement>("h1");
if (!heading) throw new Error("No h1 found");

// Text content
console.log(heading.textContent);     // gets text (strips HTML)
heading.textContent = "New title";    // sets text (HTML-safe)

// HTML content (careful: XSS risk if user-controlled)
console.log(heading.innerHTML);
heading.innerHTML = "<em>Emphasized</em>";  // sets HTML

// Attributes
const img = document.querySelector<HTMLImageElement>("img");
if (img) {
  console.log(img.src);          // get attribute via property
  img.alt = "Descriptive text";  // set attribute via property
  img.setAttribute("loading", "lazy"); // setAttribute for non-property attrs
}

// Classes
const card = document.querySelector(".card");
if (card) {
  card.classList.add("active");
  card.classList.remove("inactive");
  card.classList.toggle("expanded");         // adds if not present, removes if present
  card.classList.contains("active");         // boolean
}

// Styles
const box = document.querySelector<HTMLDivElement>(".box");
if (box) {
  box.style.backgroundColor = "red";   // camelCase CSS property names
  box.style.fontSize = "18px";
}
```

**Example 3 — creating and inserting elements**

```ts
// Create a new element
const newItem = document.createElement("li");
newItem.textContent = "New todo item";
newItem.classList.add("todo-item");

// Insert into the DOM
const list = document.querySelector<HTMLUListElement>("#todo-list");
if (list) {
  list.appendChild(newItem);           // add at the end
  list.prepend(newItem);               // add at the beginning
  list.insertBefore(newItem, list.firstChild); // insert before first child
}

// Modern: insertAdjacentHTML (fast, readable)
const container = document.querySelector("#container");
if (container) {
  container.insertAdjacentHTML("beforeend", `
    <div class="card">
      <h2>New Card</h2>
    </div>
  `);
  // Positions: "beforebegin", "afterbegin", "beforeend", "afterend"
}

// Removing elements
const oldItem = document.querySelector(".old");
oldItem?.remove(); // modern — safe with optional chaining
```

**Example 4 — TypeScript and DOM types**

```ts
// querySelector returns Element | null — often too broad
const el = document.querySelector(".my-input"); // Element | null

// Use generic to get the right type:
const input = document.querySelector<HTMLInputElement>(".my-input");
// HTMLInputElement | null

if (input) {
  const value = input.value;        // string — HTMLInputElement has .value
  input.focus();                     // HTMLInputElement method
}

// Type assertion (use when you are certain it exists and has the right type):
const form = document.getElementById("my-form") as HTMLFormElement;
// Only use as when querySelector/getElementById would return null
// and you're confident it exists (e.g., in DOMContentLoaded)

// Common HTMLElement subtypes:
// HTMLInputElement — .value, .checked, .type
// HTMLSelectElement — .value, .selectedIndex, .options
// HTMLFormElement — .submit(), .elements
// HTMLImageElement — .src, .alt, .naturalWidth
// HTMLAnchorElement — .href, .download
// HTMLCanvasElement — .getContext("2d")
```

## Key points

- `querySelector` returns the first matching element; `querySelectorAll` returns all matches as a NodeList
- Use the generic type argument `querySelector<HTMLInputElement>()` to get specific element types in TypeScript
- `textContent` sets text safely; `innerHTML` sets HTML (XSS risk with user-controlled input)
- `classList.add/remove/toggle/contains` are the idiomatic way to manage CSS classes
- DOM APIs don't exist in Node.js; use `lib: ["DOM"]` in tsconfig to get DOM type definitions in browser projects

## Go deeper

- [MDN: DOM](../../research/typescript-javascript-course/01-sources/web/S008-mdn-dom.md) — full DOM API coverage and element types
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — working with DOM types in TypeScript

---

*← [Previous lesson](./L22-narrowing.md)* · *[Next lesson: DOM Events and Delegation →](./L24-dom-events.md)*
