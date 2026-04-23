# S011 — TypeScript Handbook: Utility Types

**URL**: https://www.typescriptlang.org/docs/handbook/utility-types.html  
**Retrieved**: 2026-04-19  
**Relevance**: Q4 (TS pedagogical order), Q8 (advanced TS patterns)

---

## Overview

TypeScript ships a set of globally-available generic utility types that transform existing types. They are built using conditional types and mapped types internally — understanding them also teaches those advanced concepts implicitly.

---

## Object property modifiers

### `Partial<Type>`
Makes all properties optional. Classic use case: update functions that accept partial data.
```ts
interface Todo { title: string; description: string; }
function updateTodo(todo: Todo, fields: Partial<Todo>) {
  return { ...todo, ...fields };
}
```

### `Required<Type>`
Opposite of Partial — makes all properties required. Useful for validating fully-formed objects.
```ts
interface Props { a?: number; b?: string; }
const obj2: Required<Props> = { a: 5 }; // Error: b is missing
```

### `Readonly<Type>`
Makes all properties read-only. Mutation attempts produce compile errors. Mirrors `Object.freeze()` intent at the type level.
```ts
const todo: Readonly<Todo> = { title: "Delete inactive users" };
todo.title = "Hello"; // Error: Cannot assign to read-only property
```

### `Record<Keys, Type>`
Constructs an object type with specific key types mapped to a value type. Better than `{ [key: string]: T }` when keys are known.
```ts
type CatName = "miffy" | "boris" | "mordred";
interface CatInfo { age: number; breed: string; }
const cats: Record<CatName, CatInfo> = {
  miffy: { age: 10, breed: "Persian" },
  boris: { age: 5, breed: "Maine Coon" },
  mordred: { age: 16, breed: "British Shorthair" },
};
```

---

## Property selection / removal

### `Pick<Type, Keys>`
Constructs a new type using only the specified keys from `Type`.
```ts
type TodoPreview = Pick<Todo, "title" | "completed">;
// { title: string; completed: boolean }
```

### `Omit<Type, Keys>`
Opposite of Pick — constructs a new type with the specified keys removed. `Omit<Todo, "description">` keeps everything except `description`.

---

## Union manipulation

### `Exclude<UnionType, ExcludedMembers>`
Removes union members assignable to `ExcludedMembers`.
```ts
type T0 = Exclude<"a" | "b" | "c", "a">;    // "b" | "c"
type T2 = Exclude<string | number | (() => void), Function>; // string | number
```

### `Extract<Type, Union>`
Keeps only union members assignable to `Union` (opposite of Exclude).
```ts
type T0 = Extract<"a" | "b" | "c", "a" | "f">; // "a"
type T1 = Extract<string | number | (() => void), Function>; // () => void
```

### `NonNullable<Type>`
Removes `null` and `undefined` from a type.
```ts
type T0 = NonNullable<string | number | undefined>; // string | number
type T1 = NonNullable<string[] | null | undefined>;  // string[]
```

---

## Function introspection

### `ReturnType<Type>`
Extracts the return type of a function type.
```ts
type T0 = ReturnType<() => string>;     // string
type T4 = ReturnType<typeof f1>;        // { a: number; b: string }
```

### `Parameters<Type>`
Extracts function parameter types as a tuple.
```ts
type T1 = Parameters<(s: string) => void>; // [s: string]
type T3 = Parameters<typeof f1>;           // [arg: { a: number; b: string }]
```

### `ConstructorParameters<Type>`
Like `Parameters` but for constructor functions.
```ts
type T0 = ConstructorParameters<ErrorConstructor>; // [message?: string]
```

### `InstanceType<Type>`
Extracts the instance type from a constructor type.
```ts
class C { x = 0; y = 0; }
type T0 = InstanceType<typeof C>; // C
```

---

## Async introspection

### `Awaited<Type>`
Recursively unwraps Promise types — models what `await` does.
```ts
type A = Awaited<Promise<string>>;              // string
type B = Awaited<Promise<Promise<number>>>;     // number
type C = Awaited<boolean | Promise<number>>;    // number | boolean
```

---

## Advanced / less common

### `NoInfer<Type>` (TS 5.4+)
Blocks inference to a type parameter, forcing TypeScript to use other call sites for inference.
```ts
function createStreetLight<C extends string>(colors: C[], defaultColor?: NoInfer<C>) {}
createStreetLight(["red", "yellow", "green"], "blue"); // Error — "blue" not in inferred C
```

### `ThisParameterType<Type>`
Extracts the `this` parameter type from a function.

### `OmitThisParameter<Type>`
Removes the `this` parameter from a function type.

### `ThisType<Type>`
Marker interface for contextual `this` typing in object literals — requires `noImplicitThis`.

### Intrinsic string manipulation types
`Uppercase<S>`, `Lowercase<S>`, `Capitalize<S>`, `Uncapitalize<S>` — operate on string literal types, useful in template literal types.

---

## Teaching order recommendation (Q4, Q8)

**Teach early (M07 — TS Foundations):**
- `Partial<T>`, `Readonly<T>` — immediately practical for update functions and immutable data
- `Record<K, V>` — cleaner dictionary typing
- `Pick<T, K>`, `Omit<T, K>` — shaping API response types
- `NonNullable<T>` — pairs with strict null checks

**Teach in M08 (TS Advanced):**
- `ReturnType<T>`, `Parameters<T>` — require understanding generics as type variables first
- `Exclude<T, U>`, `Extract<T, U>` — require understanding conditional types
- `Awaited<T>` — pairs with async/await module
- `InstanceType<T>` — only relevant if teaching class patterns

**Key insight for teaching**: Utility types are not magic — they are aliases for mapped/conditional type expressions. After showing `Partial<T>`, show students the definition: `{ [P in keyof T]?: T[P] }`. This bridges utility types to advanced TS concepts without requiring deep mastery of mapped types first.
