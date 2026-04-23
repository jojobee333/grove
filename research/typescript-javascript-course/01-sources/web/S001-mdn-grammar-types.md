# S001 — MDN: Grammar and Types

**ID**: S001  
**URL**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types  
**Retrieved**: 2025 (current session)  
**Addresses**: Q1 (JS gotchas for experienced devs), Q8 (var/let/const, hoisting, type coercion)

## Key Points

### Variable Declarations
- `var` is **function-scoped**; `let` and `const` are **block-scoped**
- `var` declarations are **hoisted** to the top of their scope with value `undefined`
- `let`/`const` have a **temporal dead zone (TDZ)**: accessing them before declaration throws `ReferenceError`
- `const` requires an initializer and cannot be reassigned (though object properties can mutate)

### Data Types (8 primitives)
- `Boolean`, `null`, `undefined`, `Number`, `BigInt`, `String`, `Symbol` + `Object`
- JavaScript uses **dynamic typing** — a variable can hold any type at any time
- `typeof null === "object"` — historical bug in JS, not fixable due to backwards compat

### Type Coercion Surprises
- `+` operator with a string converts the other operand to string: `"3" + 4 === "34"`
- Comparison operators like `==` coerce types (use `===` instead)
- Falsy values: `false`, `0`, `""`, `null`, `undefined`, `NaN`

### Template Literals
- Backtick syntax: `` `Hello ${name}` ``
- Support multi-line strings without `\n`
- Tagged templates allow custom processing

## Teaching Relevance
- Experienced devs from Java/C#/Python expect block scoping — `var` breaks this mental model
- Dynamic typing and coercion are the biggest footguns for devs coming from typed languages
- The "hoisting" concept has no real equivalent in most other languages
