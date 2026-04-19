# Prototype and the Cost of Cloning-Based Flexibility

**Module**: M02 · Construction and Runtime Variation  
**Type**: applied  
**Estimated time**: 22 minutes  
**Claim**: C2; Contradiction 2 from Strata synthesis

---

## The core idea

**Prototype** answers a narrow creational question: sometimes you do not just want a new object of the same type — you want a new object that starts with the same type *and* the same configured state. In those situations, cloning an existing **exemplar** (a pre-configured instance that serves as a template) can be simpler than rebuilding the state through long constructors, configuration files, or parallel class hierarchies.

Think of a rubber stamp. You do not build a new stamp every time you need to stamp something. You have one master stamp, and you press it. The prototype pattern works similarly: you keep one pre-configured instance and *clone* it when you need a fresh copy with the same starting configuration.

The reason Prototype deserves careful study in this course is what Nystrom does after explaining it. He immediately compares it with alternatives: spawn functions, templates, and first-class types [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md). That comparison matters. It shows that deep pattern study is not the same as unconditional pattern endorsement. A pattern's underlying *problem* can remain useful even when its canonical *implementation form* has better alternatives.

## How cloning works (and where it breaks)

When you clone an object in Python (using `copy.copy()` for a shallow copy or `copy.deepcopy()` for a deep copy), you get a new object that starts with the same field values as the original. This is called **cloning** or **copying**.

The semantic trap is the difference between **shallow copy** and **deep copy**:

- A **shallow copy** creates a new object but copies references to nested objects. If the prototype has a list of settings, the clone and the prototype share that same list.
- A **deep copy** creates a new object AND new copies of all nested objects. The clone is fully independent.

Neither is automatically correct. Choosing the wrong one introduces subtle bugs where modifying the clone accidentally modifies the prototype, or vice versa. This is one of the practical costs the pattern introduces [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md).

## Why it matters

Prototype matters as a case study in pattern economics. It is elegant when the cost of reconstructing configured variants is genuinely high. But it can introduce deep-versus-shallow copy bugs, awkward clone contracts that every subclass must implement, and unnecessary machinery when simpler alternatives exist.

A practical engineer needs to be able to say both: "Here is the pressure Prototype solves" *and* "Here is why I might not choose it even when that pressure exists." That second skill is as important as the first.

## Example 1 — when cloning earns its keep

Imagine a game or design tool that maintains templates for enemy types, drawing tools, or document blocks. Each template has dozens of configured properties:

```python
import copy

class EnemyTemplate:
    def __init__(self, name, health, speed, abilities, loot_table):
        self.name = name
        self.health = health
        self.speed = speed
        self.abilities = abilities        # a list of ability names
        self.loot_table = loot_table      # a dict of item -> probability

    def clone(self):
        # Deep copy to ensure the clone is fully independent
        return copy.deepcopy(self)

# Create one master template
goblin_template = EnemyTemplate(
    name="Goblin",
    health=30,
    speed=8,
    abilities=["slash", "dodge"],
    loot_table={"gold": 0.5, "potion": 0.2}
)

# Spawn a patrol of goblins without rebuilding each from scratch
patrol = [goblin_template.clone() for _ in range(10)]
patrol[3].health = 15  # weaken one — does NOT affect the template
```

Here, cloning saves the cost of repeatedly passing the same configuration parameters. The template is a convenient starting point, and deep copy ensures independence.

## Example 2 — when simpler alternatives are better

Now consider a different situation: you need to create variations of a simple configuration object:

```python
# Without prototype — just use keyword arguments
def create_notifier(smtp_host, port=587, use_tls=True, timeout=10):
    return SmtpNotifier(host=smtp_host, port=port, use_tls=use_tls, timeout=timeout)

test_notifier = create_notifier("localhost", port=25, use_tls=False)
prod_notifier = create_notifier("mail.example.com")
```

This factory function is far clearer than maintaining a prototype, implementing a clone method, and worrying about shallow vs. deep copy. Nystrom calls this a "spawn function" — a direct alternative to the class-based prototype [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md). In modern languages, spawn functions, named constructors, and dataclass `replace()` often provide the same reuse benefit with less machinery.

**There is a real disagreement here.** The research source for Prototype (S011) is itself the source of the contradiction. Nystrom shows the pattern clearly, then demonstrates that in many real systems — particularly those using modern language features — the classic GoF cloning form adds more complexity than value [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md). The deeper idea of reusing configured state remains useful. The specific mechanism of "every class implements clone" often does not. This is the clearest example in the course of a pattern whose *problem* outlives its original *form*. The form should adapt to the language's capabilities; the problem awareness should not be discarded.

## Example 3 — the shallow-versus-deep copy trap

The most common practical mistake with Prototype is getting an unexpected connection between a clone and the original. This is the shallow-versus-deep copy problem:

```python
import copy

class SpawnConfig:
    def __init__(self, name: str, modifiers: list):
        self.name = name
        self.modifiers = modifiers  # mutable nested object

# Create the prototype
goblin_base = SpawnConfig(name="Goblin", modifiers=["fast", "weak"])

# Shallow copy — looks independent, but shares the list reference
elite_goblin = copy.copy(goblin_base)
elite_goblin.name = "Elite Goblin"           # OK — new string value
elite_goblin.modifiers.append("armoured")    # DANGER — modifies the shared list!

print(goblin_base.modifiers)    # ["fast", "weak", "armoured"] — unintended!
print(elite_goblin.modifiers)   # ["fast", "weak", "armoured"] — same list object

# Deep copy — fully independent
boss_goblin = copy.deepcopy(goblin_base)
boss_goblin.modifiers.append("boss")   # safe — separate list

print(goblin_base.modifiers)    # ["fast", "weak"] — unchanged
```

A shallow copy creates a new object at the top level but copies *references* to nested objects. Both the original and the clone point at the same `modifiers` list. Any mutation through either reference changes both. A deep copy recurses through the entire object graph and produces independent copies of every nested structure.

Neither is automatically correct — deep copy is often what Prototype users intend, but it is more expensive and must be explicitly requested. Every class that implements a `clone()` method must decide, and document, which semantics it provides. Every caller must understand the contract.

This overhead is one of the reasons factory functions and named constructors so often beat class-based Prototype in modern codebases: a factory function creates a fresh object with fresh nested structures by default, without requiring the caller to know the copy depth [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md).

## Key points

- Prototype is valuable when configured state and type both need to be copied together and rebuilding from scratch is genuinely costly [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md)
- The semantic trap is shallow versus deep copy: choosing the wrong one produces subtle shared-state bugs
- Modern alternatives — factory functions, named constructors, dataclass replace — often solve the same problem more clearly
- The classic GoF cloning form frequently loses to simpler approaches in modern languages
- The underlying insight (reuse of configured state) survives even when the implementation form should not

## Go deeper

- [S011](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S011-nystrom-prototype.md) — Nystrom on both the value and the weaknesses of Prototype, including alternatives
- [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md) — Fowler on evolving into patterns only when their cost is economically justified

---

*[← Previous lesson](./L05-plugin-pattern.md)* · *[Next lesson: Registry: Centralized Access with Hidden Cost →](./L07-registry.md)*
