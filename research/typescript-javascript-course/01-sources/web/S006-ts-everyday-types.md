# S006 — TypeScript Handbook: Everyday Types

**ID**: S006  
**URL**: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html  
**Retrieved**: 2025 (current session)  
**Addresses**: Q4 (TypeScript type syntax), Q5 (interfaces, unions, type aliases)

## Key Points

### Primitives and Arrays
- Core types: `string`, `number`, `boolean` (lowercase — avoid `String`, `Number`, `Boolean`)
- Arrays: `number[]` or `Array<number>` — equivalent syntax
- `any`: opt-out of type checking — use sparingly

### Functions
```ts
function greet(name: string): string { return "Hello " + name; }
const add = (a: number, b: number): number => a + b;
async function getFavNum(): Promise<number> { return 26; }
```
- Parameter and return type annotations
- TypeScript infers return types in most cases
- Anonymous functions get contextual typing from callback positions

### Object Types
```ts
function printCoord(pt: { x: number; y: number }) { ... }
function printName(obj: { first: string; last?: string }) { ... } // optional property
```

### Union Types
```ts
function printId(id: number | string) { ... }
```
- Use type narrowing (`typeof id === "string"`) to work with specific branch
- TypeScript only allows operations valid for ALL members of the union

### Type Aliases vs Interfaces
```ts
type Point = { x: number; y: number };
interface Point { x: number; y: number }
```
- Both define object shapes; almost interchangeable
- **Interface**: extends with `extends`, supports declaration merging
- **Type alias**: can alias primitives, unions, tuples; cannot be re-opened
- Recommendation: prefer `interface` until you need `type` features

### Type Assertions
```ts
const canvas = document.getElementById("main") as HTMLCanvasElement;
```
- Tells TS "I know more than you about this type"
- Assertions are erased at runtime — no runtime check

### Literal Types
```ts
type Direction = "left" | "right" | "center";
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
```
- Combine with `as const` to prevent widening: `const req = { method: "GET" } as const`

### null and undefined
- With `strictNullChecks`: must explicitly check for null/undefined before use
- Non-null assertion: `element!.value` — asserts not null/undefined (no runtime check)

## Teaching Relevance
- The interface vs type alias question confuses everyone; the practical answer is "use interface by default"
- Structural typing is the biggest conceptual shift from nominal type systems (Java/C#)
- Union types replace Java enums for many use cases
