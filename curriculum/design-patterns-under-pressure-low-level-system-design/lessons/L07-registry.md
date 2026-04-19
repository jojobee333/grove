# Registry: Centralized Access with Hidden Cost

**Module**: M03 · Ambient Access and Hidden Dependencies  
**Type**: core  
**Estimated time**: 20 minutes  
**Claim**: C3, C5 from Strata synthesis

---

## The core idea

**Registry** exists for a real, legitimate reason: sometimes code needs to find a shared service or object, and there is no natural ownership path to reach it. Not every dependency can be plumbed through constructor parameters. When code deep inside a rendering subsystem needs a texture cache, or when a form widget needs a locale configuration, passing those services through five intermediate layers may create more noise than it removes.

A registry provides a **centralized lookup point** — a globally reachable place to ask: "give me the service I need by name or type" [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md).

The danger is immediate: the same move that makes access convenient also makes the dependency easier to hide. A class that reaches into a global registry does not advertise that dependency in its constructor or method signature. The code *reads as if it is self-sufficient* even when it depends on a globally registered service. Over time, more classes quietly reach into the registry for more services, and the true dependency web becomes invisible to anyone reading the code.

This is why Registry is a pattern worth studying carefully. It solves one pressure (lookup when no natural path exists) while silently creating another (hidden coupling). That combination is the defining characteristic of all the patterns in this module.

## What "ambient access" means

The word **ambient** means "present everywhere without being explicit." Ambient access is when code can reach a dependency without declaring it — just by calling a global function or accessing a global object.

Think of it like WiFi. WiFi is ambient: it is present throughout the building. You do not need to trace a cable from your laptop to a specific router. The connection is just... available. That convenience is real. But it also means that if the WiFi goes down, it is not obvious which code will break — because any code anywhere might be using it.

Registry gives dependencies the same ambient quality. The convenience is real. The invisibility of the coupling is the cost.

## Why it matters

Practical design is full of convenience temptations. Registry is one of the clearest cases where the convenience is understandable and the cost is architectural. If you learn only "global access bad," you miss why the pattern exists. If you learn only "central lookup convenient," you miss why systems built around registries become harder to reason about over time.

The structural patterns are most valuable at unstable or mismatched boundaries — where they isolate concerns that would otherwise leak across the design [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md). A registry can serve that function when the lookup problem is real and the service truly is ambient. But it stops serving that function when it becomes the default way to access any dependency.

## Example 1 — legitimate registry use

Consider a rendering engine that needs a texture cache in deeply nested draw calls. Passing `TextureCache` through every render function signature would create enormous parameter pollution:

```python
# Hard to justify passing texture_cache through every call
def render_scene(scene, camera, lights, texture_cache):
    for obj in scene.objects:
        render_object(obj, texture_cache)

def render_object(obj, texture_cache):
    tex = texture_cache.get(obj.texture_name)
    # ... draw
```

A registry can centralize access:

```python
class ServiceRegistry:
    _services = {}

    @classmethod
    def register(cls, name, service):
        cls._services[name] = service

    @classmethod
    def get(cls, name):
        service = cls._services.get(name)
        if service is None:
            raise KeyError(f"Service '{name}' not registered")
        return service

# At startup:
ServiceRegistry.register("texture_cache", TextureCache())

# Deep in rendering code:
def render_object(obj):
    cache = ServiceRegistry.get("texture_cache")
    tex = cache.get(obj.texture_name)
```

The convenience is real for this use case: a genuinely ambient, widely-needed service that would add noise if explicitly wired.

## Example 2 — registry overreach and hidden coupling

The same registry, used for ordinary business dependencies, creates problems:

```python
class OrderService:
    def place_order(self, order_data):
        # These look like local operations — they are actually global dependencies
        db = ServiceRegistry.get("database")
        mailer = ServiceRegistry.get("email_sender")
        logger = ServiceRegistry.get("audit_logger")
        # ... business logic
```

From reading `place_order()`, you cannot tell what it depends on without examining the registry. Testing it requires setting up the global registry correctly. Swapping the mailer in tests requires knowing the registry key. This is the anti-pattern: the registry has become the default dependency-access mechanism rather than a narrow convenience for ambient services [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md).

**There is a real disagreement here.** Structural patterns like Registry are most valuable at real, semantically important boundaries [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md). But convenience-oriented access patterns — of which Registry is a prime example — can quietly widen the dependency web while appearing to simplify code [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md). The disagreement is about scope: the pattern is legitimate for narrow ambient services and problematic as a general-purpose dependency mechanism. That line is real but contextual.

## Limitations

The most credible criticism of patterns is not that they are obsolete, but that they are applied before the pressure is real or in forms the problem does not require [S002](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S002-fowler-design-dead.md). Registry is a pattern that is often introduced for convenience before a real lookup problem exists. The right question before adding a registry: is there a genuinely ambient service that lacks a natural ownership path, or am I just avoiding constructor parameters?

## Example 3 — registry scope slippage

Registries often start justified and become problematic gradually. The first service is genuinely ambient. A second is added for convenience. A third follows. The registry grows until it covers ordinary business dependencies, and the coupling that was supposed to be narrow is now invisible everywhere.

Here is how that progression looks:

```python
# Step 1 — legitimate: a rendering-wide texture cache with no natural owner
ServiceRegistry.register("texture_cache", TextureCache())

# Step 2 — borderline: a logger used widely but could be injected
ServiceRegistry.register("logger", StructuredLogger())

# Step 3 — problematic: ordinary business dependencies now in the registry
ServiceRegistry.register("order_repo",      SqlOrderRepository())
ServiceRegistry.register("payment_gateway", StripePaymentGateway())
ServiceRegistry.register("email_sender",    SmtpEmailSender())

# Step 4 — a new service joins the registry by convention
class InvoiceService:
    def generate(self, order_id: str):
        order_repo     = ServiceRegistry.get("order_repo")       # invisible dependency
        email_sender   = ServiceRegistry.get("email_sender")     # invisible dependency
        logger         = ServiceRegistry.get("logger")           # invisible dependency
        # The constructor signature declares nothing — completely uninformative
```

At Step 4, `InvoiceService` *looks* dependency-free. Its constructor is empty. But it depends on three services, and those dependencies are completely hidden from any reader or tester. Testing it requires setting up the global registry correctly before each call.

The diagnostic rule for preventing slippage: a service belongs in the registry only if it is static infrastructure that never changes per test, per feature, or per environment. If a dependency would need a fake in tests or a different implementation in production, it is a candidate for injection, not registry lookup [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md).

## Key points

- Registry provides centralized lookup for services that have no natural reference path, which is a real problem in some systems [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md)
- Its global or pseudo-global nature makes hidden coupling the primary long-term risk
- The pattern is appropriate for genuinely ambient services; it becomes harmful as the default dependency-access mechanism
- Code that looks self-sufficient but depends on a registry is harder to test, reason about, and change [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md)

## Go deeper

- [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md) — Fowler on lookup mechanics and the global-nature warning
- [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md) — Nystrom on practical tradeoffs of service-locator-style access including when it is defensible

---

*[← Previous lesson](./L06-prototype.md)* · *[Next lesson: Service Locator: A Legitimate Tool with Sharp Edges →](./L08-service-locator.md)*
