# Choosing the Right Structural Pattern for the Boundary

**Module**: M04 · Application and Boundary-Shaping Patterns  
**Type**: applied  
**Estimated time**: 24 minutes  
**Claim**: C3 from Strata synthesis

---

## The core idea

Structural patterns are often described as "ways to reduce coupling," but that slogan is too vague to guide actual design decisions. Coupling is reduced by many different patterns in different ways. The key skill is matching the *type* of boundary problem to the *intent* of the pattern that addresses it.

Every structural pattern studied in this module answers a different question:

- **Service Layer** answers: "Multiple interfaces keep duplicating the same coordination — where does that logic live?"
- **Special Case** answers: "An exceptional condition keeps forcing checks in many callers — can this exception behave like a normal object?"
- **Registry** answers: "Code needs a service but has no natural reference path — where can it look it up?"
- **Service Locator** answers: "An ambient service needs to be reachable widely — can I avoid plumbing it through every layer?"

The selection mistake beginners often make is to pick the most familiar pattern, or the most architecturally impressive one, rather than the one that matches the actual mismatch type [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md) [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md).

## The selection heuristic

Match your symptom to its cause. Then match the cause to the pattern that absorbs it.

| Symptom | Cause | Pattern |
|---------|-------|---------|
| Three interfaces duplicate the same 4-step coordination | Duplicated boundary orchestration | Service Layer |
| Eight callers check `if customer is None` or `if status == "unknown"` | Repeated exceptional-case logic | Special Case |
| Deep rendering code needs a texture cache with no natural path | Ambient service with no ownership path | Registry (narrow) |
| Every UI component needs the audio service; passing it is pure noise | Gratuitous plumbing for an ambient service | Service Locator (narrow) |

The "narrow" qualifier matters. Registry and Service Locator are appropriate only when the lookup or ambient-access problem is real and the alternatives are genuinely worse. They are not general-purpose dependency mechanisms.

## Why it matters

Better diagnosis prevents decorative ceremony. A service layer with one trivial endpoint is overhead. A special case object for an exception that only appears in one file is noise. A registry for dependencies that could be injected cleanly is hidden coupling. Pattern selection should follow pressure diagnosis, not convenience or familiarity.

The research is explicit: structural indirection is valuable when the boundary is real and semantically important. It becomes decorative ceremony when there is no real mismatch to absorb [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md).

## Example 1 — same symptom, different cause

Two systems both have code that looks "messy and unclear." Running the diagnostic loop produces different results:

**System A**: Three entry points (API, job, admin) all duplicate inventory-reserve, payment-charge, and confirmation-send. The mismatch is duplicated coordination at the boundary. The response is Service Layer.

**System B**: A billing module has twelve places where the code branches on `if customer.status == "guest"`. The mismatch is a recurring exceptional case scattered across callers. The response is Special Case (a `GuestCustomer` object with appropriate behavior).

Same vague symptom ("messy"), different causes, different patterns. Without diagnosis, you might apply the wrong one.

## Example 2 — confirming pattern fit with the five questions

Using the diagnostic loop from L02, confirm or reject a pattern choice for a specific boundary problem.

**Situation**: A game engine's particle system, physics engine, and animation system all need a `ResourceLoader`. Passing it through every subsystem's constructor adds 4–5 levels of parameter noise.

Run the questions:
1. **Painful behavior**: `ResourceLoader` must be threaded through five layers of subsystem constructors to reach particle systems.
2. **Pain type**: Coupling pressure from excessive parameter plumbing.
3. **Next occurrence**: Every new subsystem that needs resources will add the same parameter noise.
4. **Smallest structure**: A service locator or registry that provides `ResourceLoader` to leaf systems that need it.
5. **New cost**: Hidden coupling — callers no longer declare their dependency on `ResourceLoader` explicitly.

This analysis confirms Service Locator *may* be defensible here (the plumbing cost is real) but also reveals the hidden-coupling cost explicitly. A team choosing Service Locator here should do so knowing they are accepting that tradeoff, not ignoring it [S005](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S005-nystrom-service-locator.md).

**There is a real disagreement here.** The sources agree that structural patterns are valuable at real boundaries. They disagree about which patterns create acceptable hidden-coupling tradeoffs. Convenience-oriented access (Registry, Service Locator) can collapse into a hidden dependency web when used broadly [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md). Service Layer and Special Case create structural cost but not hidden coupling — the pattern's purpose is visible in how it is used. That asymmetry should guide when each pattern is chosen.

## Example 3 — two pressures, two patterns in the same system

Real systems often have multiple boundary pressures simultaneously. A subscription billing platform shows how two structural patterns can address two distinct pressures without competing:

```python
# Pressure 1: THREE entry points duplicate the same billing orchestration
# API endpoint:
def api_run_billing_cycle(customer_id):
    customer = db.get_customer(customer_id)
    subscription = db.get_subscription(customer_id)
    invoice = billing.create_invoice(customer, subscription)
    payment.charge(customer.payment_method, invoice.amount)
    email.send_receipt(customer.email, invoice)

# Scheduled job:
def job_run_monthly_billing():
    for customer_id in db.get_active_customers():
        customer = db.get_customer(customer_id)
        subscription = db.get_subscription(customer_id)
        invoice = billing.create_invoice(customer, subscription)  # DUPLICATE
        payment.charge(customer.payment_method, invoice.amount)    # DUPLICATE
        email.send_receipt(customer.email, invoice)                # DUPLICATE

# Admin console:
def admin_retry_failed_charge(customer_id):
    customer = db.get_customer(customer_id)
    subscription = db.get_subscription(customer_id)
    invoice = billing.create_invoice(customer, subscription)  # DUPLICATE AGAIN
    ...
```

```python
# Pressure 2: a 'cancelled subscription' edge case scattered across six callers
def calculate_proration(subscription):
    if subscription is None or subscription.status == "cancelled":
        return 0
    ...
```

Diagnosis:
- **Pressure 1**: duplicated orchestration across entry points → **Service Layer**
- **Pressure 2**: recurring exceptional-case check across callers → **Special Case**

Response:

```python
# Service Layer absorbs pressure 1
class BillingService:
    def run_billing_cycle(self, customer_id: str) -> Invoice:
        customer = self._db.get_customer(customer_id)
        subscription = self._db.get_subscription(customer_id)  # may return CancelledSubscription
        invoice = self._billing.create_invoice(customer, subscription)
        self._payment.charge(customer.payment_method, invoice.amount)
        self._email.send_receipt(customer.email, invoice)
        return invoice

# Special Case absorbs pressure 2
class CancelledSubscription:
    status = "cancelled"
    def proration(self): return 0
    def create_invoice(self, customer): return EmptyInvoice()
    def days_remaining(self): return 0
```

The two patterns solve two different pressures. They do not overlap or compete. The Service Layer’s job is orchestration flow. The Special Case’s job is hiding the cancelled-subscription exception from callers. Recognising that different pressures need different patterns — and that both can coexist in one system — is the practical payoff of the selection heuristic [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md) [S017](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S017-fowler-special-case.md).

## Key points

- Match the boundary mismatch type to the pattern intent — not to familiarity or architectural prestige
- Service Layer: orchestration duplication across entry points [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md)
- Special Case: recurring exceptional-condition checks scattered across callers [S017](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S017-fowler-special-case.md)
- Registry/Locator: genuine ambient-access need with no natural ownership path (use narrowly and knowingly) [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md)
- Structural indirection that does not address a real mismatch is decorative ceremony [S013](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S013-fowler-poeaa.md)

## Go deeper

- [S015](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S015-fowler-service-layer.md) — orchestration duplication as the primary Service Layer pressure
- [S017](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S017-fowler-special-case.md) — recurring exceptional conditions and polymorphic handling
- [S004](../../../../vault/research/design-patterns-under-pressure-low-level-system-design/01-sources/web/S004-fowler-registry.md) — lookup convenience and hidden coupling — why Registry should be treated carefully

---

*[← Previous lesson](./L11-special-case.md)* · *[Next lesson: Data Mapper: Keeping the Domain Ignorant of the Database →](./L13-data-mapper.md)*
