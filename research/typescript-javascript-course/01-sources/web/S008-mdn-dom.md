# S008 — MDN: Document Object Model (DOM)

**ID**: S008  
**URL**: https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model  
**Retrieved**: 2025 (current session)  
**Addresses**: Q6 (DOM and browser APIs)

## Key Points

### What the DOM Is
- The DOM is a **programming interface** for web documents — it represents the page as a logical tree of nodes
- Not part of JavaScript — it's a **Web API** provided by the host (browser)
- Each HTML element becomes a node in the tree; nodes can be elements, text, or attributes

### Accessing the DOM
```js
// Select elements
const p = document.querySelector("p");           // first match (CSS selector)
const items = document.querySelectorAll(".item"); // all matches → NodeList

// Navigate
document.body
element.parentNode
element.firstChild
element.childNodes

// Read/write
element.textContent = "Hello";
element.innerHTML = "<b>World</b>";
element.getAttribute("href");
element.classList.add("active");
```

### Creating and Modifying the Tree
```js
const heading = document.createElement("h1");
heading.appendChild(document.createTextNode("Hello"));
document.body.appendChild(heading);

parent.removeChild(child);
```

### Event Handling
```js
const btn = document.querySelector("#submit");
btn.addEventListener("click", (event) => {
  event.preventDefault();        // stop default behavior (form submit, link navigate)
  event.stopPropagation();       // stop event bubbling up the tree
  console.log(event.target);    // the element that triggered the event
});
```

### Event Propagation
- Events **bubble** up the DOM tree by default (from target → document)
- Use `stopPropagation()` to halt bubbling
- **Event delegation**: attach one listener to a parent to handle events from many children

### Node Types
- `Document` — root object; represents the whole page
- `Element` — an HTML tag (inherits from Node, then HTMLElement for HTML-specific stuff)
- `Node` — most general; text nodes and element nodes both extend it
- `Attr` — represents an attribute

### DOM vs. JavaScript
- DOM is NOT part of JS — it's a host API
- Node.js also runs JS but has no DOM (different host APIs: `fs`, `http`, etc.)

## Teaching Relevance
- The DOM is often confusingly conflated with JavaScript by beginners
- `querySelector` / `querySelectorAll` replaced `getElementById` / `getElementsByTagName` as modern patterns
- Event delegation is a performance pattern every dev should know
- The Node.js vs browser distinction is critical for understanding why `document` is undefined in Node
