# Grove Cards Authoring Reference

## Scope

Use this reference when generating `curriculum/[slug]/cards.json` from lessons and Strata claims.

## Card types

- Definition
- Claim
- Application
- Distinction
- Contradiction

## Required card fields

- `id`, `type`, `module`, `lesson`, `front`, `back`, `source_ref`, `confidence_required`, `tags`, `sr`

## Authoring rules

- One card tests one fact or distinction.
- Fronts should not combine multiple questions.
- Backs stay concise and sourced.
- `lesson` is required because the bundler uses it for adaptive enrichment.
- Do not author `concepts`, `cognitive_level`, `weight`, or `reviewable`; the bundler injects them.

## Calibration rules

- Goal controls card density and mix.
- Confidence level maps to conceptual difficulty.
- Contradiction and distinction cards belong in higher-confidence-demand sets.

## Validation checklist

- No duplicate cards with lightly reworded prompts.
- No yes/no cards.
- No answer longer than four sentences.
- `total_cards` matches the number of card objects.
- Initial `sr` values use the standard defaults.