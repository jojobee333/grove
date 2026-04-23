# Generics

**Module**: M09 · TypeScript Advanced  
**Type**: applied  
**Estimated time**: 50 minutes  
**Claim**: C5 — Generics allow writing type-safe code that works across multiple types without sacrificing type information

---

## The core idea

Generics are TypeScript's mechanism for writing **reusable type-safe code**. Instead of accepting `any` (which loses type information) or writing separate implementations for each type, you write a function or class with a type parameter `<T>` that gets filled in when the function is called.

The key insight: generics let the compiler track what type you put in and guarantee you get the same type out. A generic `identity<T>(value: T): T` takes a `string` and returns a `string` — not `any`, not `unknown`, but specifically `string`.

## Why it matters

Generics are everywhere in the TypeScript standard library:
- `Array<T>` — an array of T
- `Promise<T>` — a promise that resolves to T
- `Map<K, V>` — a map with keys of type K and values of type V
- `Record<K, V>` — an object with keys K and values V

You also write generics whenever you build utilities, React hooks with return values, API wrapper functions, or any function that transforms typed data.

## A concrete example

**Example 1 — the generic identity function**

```ts
// Without generics: loses type info
function identity(value: any): any {
  return value;
}
const s = identity("hello"); // s is type: any — bad

// Without generics: too rigid
function identityString(value: string): string { return value; }
function identityNumber(value: number): number { return value; }

// With generics: reusable AND type-safe
function identity<T>(value: T): T {
  return value;
}

const s = identity("hello");  // s is type: string — inferred!
const n = identity(42);       // n is type: number
const b = identity<boolean>(true); // explicit type argument
```

**Example 2 — generic functions with constraints**

```ts
// Unconstrained — T could be anything
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

first([1, 2, 3]);    // number | undefined
first(["a", "b"]);  // string | undefined
first([]);           // undefined

// Constrained — T must have a length property
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("hello", "hi");        // "hello" — strings have .length
longest([1, 2, 3], [1, 2]);   // [1, 2, 3] — arrays have .length
longest(10, 20);               // Error: 10 doesn't have a length property
```

**Example 3 — keyof operator with generics**

`keyof T` produces a union of all property names of T. Combined with generics, it enables type-safe property access.

```ts
// Without keyof: prop is just string — any typo compiles
function getProperty(obj: any, prop: string): any {
  return obj[prop];
}

// With keyof: prop must be an actual key of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = { id: 1, name: "Alice", email: "alice@example.com" };

getProperty(user, "name");   // string — correct
getProperty(user, "id");     // number — correct
getProperty(user, "phone");  // Error: '"phone"' is not assignable to 'keyof User'
```

**Example 4 — generic data structures**

```ts
// Generic stack
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }
}

const numStack = new Stack<number>();
numStack.push(1);
numStack.push(2);
numStack.pop(); // number | undefined — TypeScript knows the type

const strStack = new Stack<string>();
strStack.push("hello");
strStack.push(42); // Error: Argument of type 'number' is not assignable to 'string'
```

**Example 5 — generic API response wrapper**

```ts
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  const json = await response.json();
  return {
    data: json as T,
    status: response.status,
    message: response.ok ? "OK" : "Error"
  };
}

interface User {
  id: number;
  name: string;
}

// TypeScript knows the exact shape of the response:
const { data: user } = await fetchData<User>("/api/users/1");
user.name.toUpperCase(); // string — TypeScript knows this is a User
```

## Key points

- Type parameters (`<T>`) let you write code that works across types while preserving type information
- TypeScript infers the type argument from the call arguments — explicit `<Type>` is optional most of the time
- `keyof T` produces a union of the property names of T; use `K extends keyof T` for type-safe property access
- Constraints (`T extends Something`) restrict what types T can be, giving access to the constrained interface's properties
- Generic interfaces and classes (like `Array<T>`, `Promise<T>`) use the same mechanism — you can create your own

## Go deeper

- [TypeScript: Generics](../../research/typescript-javascript-course/01-sources/web/S007-ts-generics.md) — full generics tutorial from the TypeScript handbook
- [TypeScript: Everyday Types](../../research/typescript-javascript-course/01-sources/web/S006-ts-everyday-types.md) — type parameters in practice

---

*← [Previous lesson](./L19-interfaces.md)* · *[Next lesson: Utility Types →](./L21-utility-types.md)*
