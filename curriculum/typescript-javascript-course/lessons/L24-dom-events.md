# DOM Events and Event Delegation

**Module**: M10 · DOM & Browser APIs  
**Type**: applied  
**Estimated time**: 45 minutes  
**Claim**: C6 — DOM events propagate through the element tree; event delegation uses this bubbling to attach a single listener that handles events on many child elements

---

## The core idea

DOM events are dispatched by the browser in response to user actions (click, keydown, submit) or browser events (load, resize). Events flow through the DOM in two phases: **capture** (from the root down to the target) and **bubble** (from the target back up to the root).

**Event delegation** is a pattern that uses bubbling: instead of attaching a listener to each child element, you attach one listener to a parent and use `event.target` to determine which child was clicked. This is more efficient, works for dynamically added elements, and is the approach frameworks like React use internally.

## Why it matters

Event delegation matters in two real scenarios:
1. **Long lists**: if you have 500 items and add a click listener to each, you have 500 listeners. One listener on the parent handles all of them.
2. **Dynamic content**: elements added after page load won't have event listeners if you attached them to specific elements during initialization. A parent listener handles them automatically.

TypeScript adds type safety to event handling — `event.target` is typed as `EventTarget | null`, not the specific element type, so you need to narrow it.

## A concrete example

**Example 1 — addEventListener basics**

```ts
const btn = document.querySelector<HTMLButtonElement>("#my-btn");

if (btn) {
  // Attach listener
  btn.addEventListener("click", (event) => {
    console.log("Clicked!", event.target);
    event.preventDefault(); // stop default behavior (form submit, link follow, etc.)
  });

  // Remove listener — must keep reference to the same function
  function handler(event: MouseEvent) {
    console.log("clicked");
  }

  btn.addEventListener("click", handler);
  btn.removeEventListener("click", handler); // works because same function reference
}
```

**Example 2 — event object properties**

```ts
document.addEventListener("keydown", (event: KeyboardEvent) => {
  console.log(event.key);          // "Enter", "a", "Escape", etc.
  console.log(event.code);         // "KeyA", "Enter" (physical key)
  console.log(event.ctrlKey);      // boolean — Ctrl held
  console.log(event.shiftKey);     // boolean
  console.log(event.altKey);       // boolean

  if (event.key === "Escape") {
    closeModal();
  }
});

document.querySelector("form")?.addEventListener("submit", (event: SubmitEvent) => {
  event.preventDefault(); // prevent page reload
  const form = event.target as HTMLFormElement;
  const data = new FormData(form);
  // submit via fetch instead
});
```

**Example 3 — event bubbling and stopPropagation**

```html
<div id="outer">
  <div id="inner">
    <button id="btn">Click me</button>
  </div>
</div>
```

```ts
document.getElementById("btn")?.addEventListener("click", () => {
  console.log("button");
});

document.getElementById("inner")?.addEventListener("click", () => {
  console.log("inner div");
});

document.getElementById("outer")?.addEventListener("click", () => {
  console.log("outer div");
});

// Clicking the button prints:
// "button"
// "inner div"   ← event bubbles up
// "outer div"   ← event continues bubbling

// To stop bubbling:
document.getElementById("btn")?.addEventListener("click", (e) => {
  e.stopPropagation(); // stops bubbling — inner and outer won't fire
  console.log("button only");
});
```

**Example 4 — event delegation**

```html
<ul id="todo-list">
  <li data-id="1">Task 1 <button class="delete">✕</button></li>
  <li data-id="2">Task 2 <button class="delete">✕</button></li>
  <!-- More items added dynamically -->
</ul>
```

```ts
const list = document.getElementById("todo-list");

// ONE listener on the parent — handles ALL current and future items
list?.addEventListener("click", (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  // Check if the clicked element matches what we care about
  if (target.classList.contains("delete")) {
    // Walk up to find the containing li with the data-id
    const li = target.closest<HTMLLIElement>("li");
    const id = li?.dataset.id;

    if (id) {
      deleteTask(parseInt(id, 10));
      li.remove();
    }
  }
});

// Adding a new item after page load — the delegation listener still handles it
function addTask(text: string, id: number) {
  const li = document.createElement("li");
  li.dataset.id = id.toString();
  li.innerHTML = `${text} <button class="delete">✕</button>`;
  list?.appendChild(li); // delegation listener works immediately
}
```

**Example 5 — TypeScript event typing**

```ts
// TypeScript event type hierarchy:
// Event → UIEvent → MouseEvent, KeyboardEvent, TouchEvent, etc.

// The addEventListener overloads know the correct event type per event name:
element.addEventListener("click", (e: MouseEvent) => {  // e is MouseEvent
  console.log(e.clientX, e.clientY); // coordinates
});

element.addEventListener("keydown", (e: KeyboardEvent) => { // e is KeyboardEvent
  console.log(e.key);
});

element.addEventListener("input", (e: Event) => { // e is InputEvent, but typed as Event
  const input = e.target as HTMLInputElement; // narrow to get .value
  console.log(input.value);
});

// Custom events:
const myEvent = new CustomEvent<{ userId: number }>("userAction", {
  detail: { userId: 42 },
  bubbles: true,
});

element.dispatchEvent(myEvent);

element.addEventListener("userAction", (e: CustomEvent<{ userId: number }>) => {
  console.log(e.detail.userId); // 42
});
```

## Key points

- Events bubble from the target element up through its ancestors; use `stopPropagation()` to stop bubbling
- `addEventListener(type, handler)` registers a listener; always keep a reference to `handler` if you need to remove it
- Event delegation: attach one listener to a parent; use `event.target` and `.closest()` to identify which child was interacted with
- TypeScript narrows event types automatically for common event names — `addEventListener("click", ...)` gives a `MouseEvent`
- `event.target` is typed as `EventTarget | null`; narrow with `as HTMLElement` or type guards to access element properties

## Go deeper

- [MDN: DOM](../../research/typescript-javascript-course/01-sources/web/S008-mdn-dom.md) — full event API coverage
- [MDN: JS Execution Model](../../research/typescript-javascript-course/01-sources/web/S003-mdn-execution-model.md) — events and the event loop

---

*← [Previous lesson](./L23-dom.md)* · *[Next lesson: Node.js Runtime →](./L25-nodejs.md)*
