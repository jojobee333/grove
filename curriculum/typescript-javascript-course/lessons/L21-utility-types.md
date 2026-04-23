# Utility Types

**Module**: M09 · TypeScript Advanced  
**Type**: applied  
**Estimated time**: 55 minutes  
**Claim**: C5 — TypeScript's built-in utility types transform existing types to create variations without repeating definitions

---

## The core idea

TypeScript ships a set of **utility types** — generic types in the standard library that transform other types. Instead of defining a new interface for every variation you need (e.g., a User, a CreateUserInput with no id, an UpdateUserInput with all fields optional), you use utility types to derive them from a base type.

The most commonly used are: `Partial<T>`, `Required<T>`, `Readonly<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`, `Exclude<T, U>`, `Extract<T, U>`, `NonNullable<T>`, `ReturnType<F>`, and `Parameters<F>`.

## Why it matters

Utility types eliminate duplication. If your `User` interface has 10 fields and your "create user" endpoint accepts 7 of them (no id, no createdAt, no updatedAt), you can write `Omit<User, "id" | "createdAt" | "updatedAt">` instead of manually defining a new interface. When you add a field to `User`, the derived type automatically includes it.

## A concrete example

**Example 1 — Partial and Required**

```ts
interface User {
  id: number;
  name: string;
  email: string;
  bio: string;
}

// Partial<T>: all properties become optional
type UserUpdate = Partial<User>;
// Equivalent to:
// { id?: number; name?: string; email?: string; bio?: string; }

function updateUser(id: number, changes: Partial<User>): Promise<User> {
  return patchRequest(`/api/users/${id}`, changes);
}

updateUser(1, { name: "Bob" });  // ✓ only sending what changed
updateUser(1, { foo: "bar" });   // Error: 'foo' is not in Partial<User>

// Required<T>: all properties become required (removes ?)
interface Config {
  host?: string;
  port?: number;
  timeout?: number;
}

type ResolvedConfig = Required<Config>;
// { host: string; port: number; timeout: number }
```

**Example 2 — Pick and Omit**

```ts
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

// Pick<T, K>: keep only the specified keys
type PublicUser = Pick<User, "id" | "name" | "email">;
// { id: number; name: string; email: string }
// Safe to expose in API responses — no passwordHash

// Omit<T, K>: remove the specified keys
type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;
// { name: string; email: string; passwordHash: string }
// Use for POST /api/users — no generated fields

// Combining:
type SafeCreateInput = Omit<User, "id" | "createdAt" | "updatedAt" | "passwordHash">;
```

**Example 3 — Record**

```ts
// Record<K, V>: object with keys of type K and values of type V
type StatusMap = Record<string, number>;
const httpCodes: StatusMap = { ok: 200, notFound: 404, error: 500 };

// More precise key type:
type Color = "red" | "green" | "blue";
type ColorValue = Record<Color, string>;
// { red: string; green: string; blue: string }

const palette: ColorValue = {
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
  // purple: "#..." — Error: 'purple' not in Color
};

// Practical use: lookup tables
type CountryCode = "US" | "GB" | "DE";
const countryNames: Record<CountryCode, string> = {
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
};
```

**Example 4 — ReturnType and Parameters**

```ts
// ReturnType<F>: extract the return type of a function
function fetchUser(id: number): Promise<User> {
  return fetch(`/api/users/${id}`).then(r => r.json());
}

type FetchUserReturn = ReturnType<typeof fetchUser>;
// Promise<User>

// Await the Promise to unwrap:
type ResolvedUser = Awaited<ReturnType<typeof fetchUser>>;
// User

// Parameters<F>: extract the parameter types as a tuple
type FetchUserParams = Parameters<typeof fetchUser>;
// [id: number]

// Practical use: building type-safe wrappers
function withLogging<T extends (...args: any[]) => any>(
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args) => {
    console.log("Calling with", args);
    return fn(...args);
  };
}
```

**Example 5 — Exclude, Extract, NonNullable**

```ts
type Status = "pending" | "active" | "suspended" | "deleted";

// Exclude<T, U>: remove U from T
type ActiveStatus = Exclude<Status, "deleted" | "suspended">;
// "pending" | "active"

// Extract<T, U>: keep only members of T that are assignable to U
type ClosedStatus = Extract<Status, "suspended" | "deleted">;
// "suspended" | "deleted"

// NonNullable<T>: remove null and undefined
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;
// string

// Practical use in API error handling:
type ApiResult<T> = T | null | Error;
type ValidResult<T> = Exclude<ApiResult<T>, null | Error>;
// T
```

## Key points

- `Partial<T>` makes all properties optional; `Required<T>` makes all properties required
- `Pick<T, K>` selects a subset of properties; `Omit<T, K>` removes a subset
- `Record<K, V>` creates an object type with specific key and value types
- `ReturnType<F>` and `Parameters<F>` extract function type information for building wrappers
- `Exclude`, `Extract`, and `NonNullable` operate on union types to refine them

## Go deeper

- [TypeScript: Utility Types](../../research/typescript-javascript-course/01-sources/web/S011-ts-utility-types.md) — the full utility types reference from the TypeScript handbook
- [TypeScript: Generics](../../research/typescript-javascript-course/01-sources/web/S007-ts-generics.md) — how utility types are implemented using mapped types and conditional types

---

*← [Previous lesson](./L20-generics.md)* · *[Next lesson: Type Narrowing and Discriminated Unions →](./L22-narrowing.md)*
