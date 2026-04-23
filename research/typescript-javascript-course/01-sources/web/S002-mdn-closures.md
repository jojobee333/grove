# S002 — MDN: Closures

**ID**: S002  
**URL**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures  
**Retrieved**: 2025 (current session)  
**Addresses**: Q2 (closures and scope mental models)

## Key Points

### Lexical Scoping
- JavaScript uses **lexical (static) scoping**: a function's scope is determined at write-time, not call-time
- Inner functions can access variables in outer functions' scopes

### Closure Definition
- A **closure** is a function combined with its lexical environment captured at creation time
- The inner function retains access to the outer scope's variables even after the outer function has returned

### Practical Patterns
- **Function factory**: `function makeAdder(x) { return y => x + y; }`
- **Module pattern (IIFE)**: wraps state in a closure for privacy
  ```js
  const counter = (() => {
    let count = 0;
    return { increment: () => ++count, get: () => count };
  })();
  ```

### Classic Loop Bug
```js
// Bug: all handlers alert the same value (var hoisting)
for (var i = 0; i < 3; i++) {
  setTimeout(() => alert(i), 1000); // always 3
}
// Fix: use let (block scoping creates new binding per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => alert(i), 1000); // 0, 1, 2
}
```

### Performance Consideration
- Don't create closures inside loops or hot paths unnecessarily
- Shared methods should be on the prototype, not recreated per instance

## Teaching Relevance
- Closures are one of the most powerful and most misunderstood JS concepts
- The "why does this print 3" loop bug is a classic interview question
- Helps explain how React hooks and module patterns work under the hood
