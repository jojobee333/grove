# Singleton Beyond the Joke Version

**Module**: M03 · Ambient Access and Hidden Dependencies  
**Type**: applied  
**Estimated time**: 22 minutes  
**Claim**: C5 from Strata synthesis

---

## The core idea

**Singleton** is one of the most discussed patterns in software design — and also one of the most misunderstood. The typical treatment is: "it ensures only one instance exists, and everyone can reach it globally." That is accurate, but it combines two separate decisions into one, and that combination is where things go wrong.

Nystrom's analysis is the clearest treatment of this in the source set [S010](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S010-nystrom-singleton.md). His core point: Singleton solves two different problems at once — **single instantiation** (there should be only one) and **global access** (everyone can reach it). These are not the same concern. Many systems need one without the other.

Let us define each precisely.

**Single instantiation** means enforcing that at most one instance of a class exists at runtime. This can be a real domain constraint: there is one file system, one hardware audio device, one physics engine. Creating two would cause conflicts.

**Global access** means making that instance reachable from anywhere in the code without it being passed explicitly. This is a convenience decision, not a domain constraint.

When these two decisions are bundled, the convenience half often causes architectural damage that the necessity half did not require.

## What Singleton solves well

Single instantiation is genuinely useful when the domain requires it. If two `AudioEngine` instances would both try to write to the same audio hardware buffer, you need a mechanism that prevents creating a second one. The pattern correctly addresses that concern.

Lazy initialization — creating the instance only when first accessed — can also be useful in systems where initialization order matters and the resource should not be allocated until it is needed [S010](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S010-nystrom-singleton.md).

## What Singleton costs

The global access half recreates most of the harms of global variables:

**Hidden coupling**: Any code anywhere can reach the singleton. You cannot tell what depends on the `AudioEngine` by reading classes — you have to search the whole codebase for calls to `AudioEngine.instance()`.

**Testing difficulty**: Tests that share a global singleton may interfere with each other. Resetting the singleton between tests requires workarounds. Substituting a fake singleton for tests requires hacking the global access mechanism.

**Concurrency hazards**: Multiple threads accessing the same global instance without synchronization can produce race conditions. Lazy initialization without thread safety can create multiple instances in concurrent systems — violating the very constraint the pattern was meant to enforce.

**Loss of initialization control**: Lazy initialization "takes control away from you" in Nystrom's phrasing [S010](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S010-nystrom-singleton.md). Systems with explicit startup sequences need to control *when* resources are allocated. A singleton that self-initializes on first use cannot be managed with that level of precision.

## Example 1 — the classic Singleton form

```python
class AudioEngine:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        if AudioEngine._instance is not None:
            raise RuntimeError("Use get_instance() to access AudioEngine")
        # ... expensive initialization

    def play(self, sound): pass
    def stop(self, sound): pass
```

Usage:

```python
# From anywhere in the codebase:
AudioEngine.get_instance().play("explosion.wav")
```

This works. But now `AudioEngine.get_instance()` can appear in any class, any module, without declaring the dependency. That is the coupling problem.

## Example 2 — alternative: explicit ownership with injection

```python
class AudioEngine:
    """No global access. Owned by the application root."""
    def __init__(self):
        # ... initialization
        pass

    def play(self, sound): pass
    def stop(self, sound): pass

# At application startup — one instance, explicitly owned
class Application:
    def __init__(self):
        self.audio = AudioEngine()  # ONE instance, created once
        self.game_scene = GameScene(audio=self.audio)  # passed explicitly
```

This achieves single instantiation (the application creates it once) without global access (the instance is only reachable where it is explicitly passed). The dependency is visible everywhere it matters. Testing is straightforward: pass a `FakeAudioEngine` at construction time.

Nystrom is explicit about this alternative approach: many "manager" or "service" singletons should either disappear entirely, be replaced by explicit passing from a root object, or be exposed through a scoped mechanism like a service locator — only if the passing cost is genuinely excessive [S010](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S010-nystrom-singleton.md).

## Example 3 — thread-safety hazard with lazy initialization

Lazy initialization in Singleton creates a concurrency trap that is easy to miss:

```python
import threading

class DatabaseConnectionPool:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:    # <-- two threads can both see True here
            cls._instance = cls()    # <-- both create separate instances
        return cls._instance
```

If Thread A and Thread B both call `get_instance()` before either has finished creating the instance, both will see `_instance is None`, both will create a new object, and the "only one instance" contract is silently violated. In a database connection pool, this could mean two pools managing the same connection limit independently — an invisible bug.

The standard fix is a lock:

```python
class DatabaseConnectionPool:
    _instance = None
    _lock = threading.Lock()

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
        return cls._instance
```

This makes initialization sequential and thread-safe. The cost: the lock is acquired on every call, even after the instance exists. In high-frequency access paths, that contention can become measurable overhead.

In Python specifically, the simplest thread-safe singleton is a module-level variable:

```python
# A module-level singleton — created once at import time, no locks needed
_pool = DatabaseConnectionPool()

def get_pool() -> DatabaseConnectionPool:
    return _pool
```

Python's import system guarantees single execution of module-level code. There is no race condition, no lazy initialization problem, and no lock overhead. This is often the cleanest approach in Python — and it side-steps most of the canonical Singleton pattern entirely while achieving the same effect [S010](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S010-nystrom-singleton.md).

This example reinforces Nystrom’s broader point: the *problem* (one instance) is real in some systems, but the canonical *form* of the pattern (class-based lazy `get_instance()`) often loses to simpler language-native approaches. That theme — pattern problem vs. pattern form — recurs in L24.

## When Singleton still makes sense

The pattern is not universally wrong. Cases where it remains appropriate:

- When the system genuinely has a unique hardware or OS resource that cannot be duplicated (file system, hardware timer)
- When initialization is expensive, one-time, and the resource should persist for the application lifetime
- When the access pattern is truly ambient (like a service locator, with the same tradeoffs)

But even in these cases, keeping single instantiation and global access as separate decisions is better design. Enforce uniqueness at the construction site; consider whether global reachability is also required or just convenient.

## Limitations

The most credible criticism of Singleton is not that it is always wrong. It is that it is commonly applied before asking whether both halves of the pattern are needed [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md). Engineers often reach for it when the real need is just a shared instance — which explicit ownership provides more safely. Singleton should survive design review only when both instantiation control *and* wide ambient reachability are justified.

## Key points

- Singleton bundles two concerns — single instantiation and global access — that often should be handled separately [S010](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S010-nystrom-singleton.md)
- The global-access half recreates hidden coupling, testing difficulty, and concurrency hazards
- Lazy initialization reduces startup-order control, which matters in performance-sensitive or explicitly sequenced systems
- Many singleton-shaped "manager" classes should be replaced by explicit ownership and injection
- The pattern is defensible when *both* halves — uniqueness enforcement and ambient reachability — are genuinely required

## Go deeper

- [S010](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S010-nystrom-singleton.md) — Nystrom on what Singleton solves, why it is regretted, and what alternatives are safer
- [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md) — useful comparison: Service Locator has the same ambient-access tradeoff in a slightly more flexible form
- [S006](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S006-refactoring-guru-criticism.md) — supplemental framing for common pattern misuse modes including global access overuse

---

*[← Previous lesson](./L08-service-locator.md)* · *[Next lesson: Service Layer as Orchestration Boundary →](./L10-service-layer.md)*
