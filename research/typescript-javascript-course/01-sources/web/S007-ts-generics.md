# S007 — TypeScript Handbook: Generics

**ID**: S007  
**URL**: https://www.typescriptlang.org/docs/handbook/2/generics.html  
**Retrieved**: 2025 (current session)  
**Addresses**: Q5 (advanced TypeScript — generics)

## Key Points

### The Identity Function (Hello World of Generics)
```ts
function identity<Type>(arg: Type): Type {
  return arg;
}
// Type argument inference: identity("hello") → Type = string
// Explicit: identity<string>("hello")
```

### Generic Collections
```ts
function loggingIdentity<Type>(arg: Array<Type>): Array<Type> { ... }
// Equivalent: Type[]
```

### Generic Interfaces and Classes
```ts
// Generic on the method (each call infers independently)
interface GenericIdentityFn {
  <Type>(arg: Type): Type;
}
// Generic on the interface (fixes Type for all methods)
interface Container<Type> {
  value: Type;
  transform: (x: Type) => Type;
}
// Generic class — only instance side, NOT static side
class Box<Type> {
  contents: Type;
  constructor(value: Type) { this.contents = value; }
}
```

### Generic Constraints
```ts
interface Lengthwise { length: number; }
function getLength<Type extends Lengthwise>(arg: Type): number {
  return arg.length;
}
```
- `extends` limits which types can be passed as the type argument

### keyof Constraint
```ts
function getProperty<Type, Key extends keyof Type>(obj: Type, key: Key): Type[Key] {
  return obj[key];
}
getProperty({ a: 1 }, "a"); // OK
getProperty({ a: 1 }, "z"); // Error: "z" is not keyof { a: number }
```

### Class Type in Generics (Factory Pattern)
```ts
function create<Type>(c: { new (): Type }): Type {
  return new c();
}
```

### Generic Parameter Defaults (TS 2.3+)
```ts
interface Container<T = string> { value: T; }
// Container without argument → Container<string>
```

## Teaching Relevance
- Generics feel redundant to Java/C# devs at first but TS generics work differently (structural)
- The identity function example is a perfect minimal example
- `keyof` constraint is important for building typed utility functions
- Generic classes are used constantly in React (e.g., `useState<User | null>(null)`)
