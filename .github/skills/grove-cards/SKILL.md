---
name: grove-cards
description: >-
  Generates a spaced-repetition flashcard deck from Strata claims and lessons.
  Each card tests one atomic piece of knowledge. Produces cards.json compatible
  with the Grove learning app's built-in SM-2 spaced repetition scheduler.
  Use when: creating flashcards, building a recall deck, making study cards.
argument-hint: "Topic slug (e.g. 'ai-regulation')"
user-invokable: true
allowed-tools:
  - editFiles
---

# Grove cards skill

You generate flashcards for spaced repetition study. Each card tests exactly
one thing. The Grove app handles scheduling — you just write good cards.

## What makes a good flashcard

The single most important rule: **one card, one fact**.

Good card: "What is the primary mechanism by which X causes Y?"
Bad card: "Explain everything about X and its relationship to Y, Z, and W."

A card a learner gets wrong should feel like a specific, fixable gap —
not an overwhelming topic they didn't study enough.

## Card types to generate

For each Strata claim, generate cards across these types:

**Definition card** — what is this term/concept?
```
Front: What is [term]?
Back: [Precise 1-2 sentence definition from the research]
Source: S00N
```

**Claim card** — what did the research find?
```
Front: What does the evidence say about [topic]?
Back: [The claim from claims.md, confidence level, key supporting source]
Source: S00N
```

**Application card** — how is this used?
```
Front: When would you [apply concept X]?
Back: [Specific situation + what to do, from applied lessons]
Source: L0N
```

**Distinction card** — what's the difference?
```
Front: What is the difference between [A] and [B]?
Back: [Key distinguishing feature, sourced from research]
Source: S00N
```

**Contradiction card** — where does evidence conflict?
```
Front: Why do [Source A] and [Source B] reach different conclusions about [topic]?
Back: [The specific reason for the contradiction from contradictions.md]
Source: contradictions.md
```

## Output: cards.json

```json
{
  "topic": "Topic Name",
  "slug": "topic-slug",
  "generated": "YYYY-MM-DD",
  "total_cards": 0,
  "cards": [
    {
      "id": "CARD-001",
      "type": "definition | claim | application | distinction | contradiction",
      "module": "M01",
      "lesson": "L01",
      "front": "Question or prompt — one thing only",
      "back": "Answer — concise, accurate, sourced",
      "source_ref": "S001 or L01 or contradictions.md",
      "confidence_required": "low | medium | high",
      "tags": ["module-M01", "claim-C1", "type-definition"],
      "sr": {
        "interval": 1,
        "ease": 2.5,
        "reviews": 0,
        "next_review": "YYYY-MM-DD",
        "lapses": 0
      }
    }
  ]
}
```

The `sr` block is the SM-2 spaced repetition state. The Grove app updates this
as the learner reviews cards. Initial values are always: interval 1, ease 2.5, reviews 0.

## Card density guidelines

Calibrate to `learner.json`:

- **Goal: understand broadly** — 3-5 cards per lesson (definition + claim cards only)
- **Goal: apply practically** — 5-8 cards per lesson (heavier on application cards)
- **Goal: teach others** — 6-10 cards per lesson (include distinction + contradiction)
- **Goal: pass an exam** — 8-12 cards per lesson (all types, emphasis on recall)

## Confidence required field

Maps to how hard the app should push the learner:
- `low` — factual definitions, basic claims
- `medium` — relationships between concepts, applications
- `high` — contradictions, nuanced distinctions, speculative claims

## What to avoid

- Cards that can be answered with "yes" or "no"
- Cards testing trivia rather than understanding
- Cards with answers longer than 4 sentences
- Multiple questions crammed into one card front
- Cards that test the same thing as another card with slightly different wording
