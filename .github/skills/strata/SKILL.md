---
name: strata
description: >-
  Strata is a structured research workflow that guides a research project from
  first question to final report. It orchestrates the full pipeline automatically:
  intake, sourcing, analysis, synthesis, and output. Use when: starting any research
  project, running the full research workflow end-to-end, resuming a Strata project,
  or any prompt containing "research", "strata", "investigate", "study this topic",
  "look into", "find out about", or "run research on". The single entry point for
  all Strata research work.
argument-hint: "Topic to research, or 'resume [topic-slug]' to continue an existing project"
user-invokable: true
allowed-tools:
  - editFiles
  - search
  - fetch
---

# Strata — Structured research workflow

Strata turns a question into a defensible, fully-sourced research report by
working through five zones in order: intake, sources, analysis, synthesis, output.

Each zone builds on the last. Nothing gets skipped. Everything is traceable.

## Not intended for

- One-off web lookups not part of a formal research project (use search tools directly)
- Creating or modifying sub-skill configurations or files outside the research folder
- Producing brief summaries from a single source without multi-source evaluation
- Browsing or summarizing a single web page in isolation

```
/strata [topic]

  00-intake    →   01-sources   →   02-analysis   →   03-synthesis   →   04-output
  Plan it          Find it          Pattern it         Conclude it        Deliver it
```

---

## Step 1 — Read state

**Entry:** Skill invoked with a topic, a `resume [topic-slug]` command, or any research-related prompt.  
**Exit:** Phase identified, user informed of current phase, next step number determined.

Always start here, every session.

Look for `research/[topic-slug]/state.json`:

- **File not found** → new project, go to Step 2
- **File found, phase = intake** → brief not yet approved, go to Step 2
- **File found, phase = sourcing** → resume sourcing, go to Step 4
- **File found, phase = analysis** → resume analysis, go to Step 5
- **File found, phase = synthesis** → resume synthesis, go to Step 6
- **File found, phase = output** → resume output writing, go to Step 7
- **File found, phase = complete** → show completion summary, ask if expansion needed

Tell the user which phase you're in before proceeding.

---

## Step 2 — Intake (invoke /research-start)

**Entry:** `state.json` not found, or `state.json` has `phase: intake`.  
**Exit:** User confirms brief in writing. `state.json` has `phase: sourcing`.

Load the `/research-start` skill from `.github/skills/research-start/SKILL.md`.
Follow its instructions exactly to:

- Create the project folder structure under `research/[topic-slug]/`
- Ask the user for brief, scope, and constraints
- Write `00-intake/brief.md` and `00-intake/plan.md`
- Initialize `state.json` with phase `intake`

**Verify (binary):** `research/[topic-slug]/00-intake/brief.md` and `00-intake/plan.md` both exist and are non-empty. If either is missing or empty, re-run the sub-skill before continuing.

**Gate:** Do not proceed to Step 3 until the user has confirmed the brief.
Ask explicitly: "Does this brief capture what you need? Reply yes to begin sourcing."

When confirmed: update `state.json` → `phase: sourcing`, `progress.brief_approved: true`.

---

## Step 3 — Sourcing loop (invoke /research-source repeatedly)

**Entry:** `state.json` has `phase: sourcing`.  
**Exit:** User confirms readiness to analyze. `state.json` has `phase: analysis`.

Load the `/research-source` skill from `.github/skills/research-source/SKILL.md`.
Follow its instructions to collect and document sources.

Run this skill in a loop:

```
while open gaps exist AND source target not met:
    invoke /research-source instructions
    update state.json source_counts after each batch
    check: are all high-priority gaps in gaps.md addressed?
```

After each sourcing batch, tell the user:
- How many sources collected so far
- Which gaps remain open
- Whether to continue sourcing or move to analysis

**Gate:** Ask the user before transitioning to analysis:
"N sources collected. N gaps still open (low priority). Continue sourcing or
begin analysis? (Type 'analyze' to proceed)"

When confirmed: update `state.json` → `phase: analysis`, `progress.sourcing_complete: true`.

---

## Step 4 — Analysis (invoke /research-analyze)

**Entry:** `state.json` has `phase: analysis`.  
**Exit:** All three analysis files verified present and non-empty. `state.json` has `phase: synthesis`.

Load the `/research-analyze` skill from `.github/skills/research-analyze/SKILL.md`.
Follow its instructions to:

- Read all source files
- Write `02-analysis/themes.md`
- Write `02-analysis/contradictions.md`
- Update `02-analysis/gaps.md`

**Verify (binary):** `02-analysis/themes.md`, `02-analysis/contradictions.md`, and `02-analysis/gaps.md` all exist and are non-empty before proceeding.

If a critical gap is found (a main Q-number with zero sources):
- Tell the user
- Loop back to Step 3 to fill the gap
- Return immediately to Step 4 upon re-entering — no additional user confirmation required to resume analysis

When analysis is complete:
Update `state.json` → `phase: synthesis`, `progress.analysis_complete: true`.

Show the user a brief analysis summary:
- N themes identified
- N contradictions found (N resolved, N unresolved)
- N gaps remaining (type and impact)

**Gate:** "Analysis complete. Proceed to synthesis? (yes/no)"

---

## Step 5 — Synthesis (invoke /research-synthesize)

**Entry:** `state.json` has `phase: synthesis` and all three analysis files exist.  
**Exit:** Synthesis quality checklist passes. `state.json` has `phase: output`.

Load the `/research-synthesize` skill from `.github/skills/research-synthesize/SKILL.md`.
Follow its instructions to:

- Write `03-synthesis/claims.md` — one claim per defensible conclusion
- Fill in the claims map — every Q-number from plan.md must appear
- Write `03-synthesis/narrative.md` — prose connecting all claims

Run the quality checklist before proceeding:
- [ ] Every claim cites at least one source
- [ ] Every Q-number appears in claims map
- [ ] Unresolved contradictions appear in narrative
- [ ] Narrative directly answers the research question

If checklist fails: fix the issue before proceeding.

When synthesis passes the checklist:
Update `state.json` → `phase: output`, `progress.synthesis_complete: true`.

**Gate:** "Synthesis complete. N claims written. Proceed to final output? (yes/no)"

---

## Step 6 — Output (invoke /research-write)

**Entry:** `state.json` has `phase: output` and synthesis checklist has passed.  
**Exit:** Both output files verified. `state.json` has `phase: complete`.

Load the `/research-write` skill from `.github/skills/research-write/SKILL.md`.
Follow its instructions to:

- Write `04-output/summary.md` — one-page TL;DR, 300-500 words
- Write `04-output/report.md` — full structured report with required sections:
  Executive Summary, Research Question & Scope, Methodology, Findings (one section per theme from `themes.md`), Contradictions & Limitations, Conclusion, Sources

Calibrate depth to `brief.md` output requirements.

**Verify (binary):** `04-output/summary.md` exists and is 300–500 words. `04-output/report.md` exists and contains all required section headings. If either fails, re-run the sub-skill before continuing.

When output is written:
Update `state.json` → `phase: complete`, `progress.output_complete: true`.

---

## Step 7 — Completion

**Entry:** Final acceptance checklist passes (see below).  
**Exit:** Summary displayed; any expansion request captured.

Show the user a final Strata project summary:

```
Strata research complete
────────────────────────────────────────
Topic:       [topic name]
Question:    [main research question]
Confidence:  high / medium / low

Sources:     N active (N web, N papers, N discarded)
Themes:      N identified
Claims:      N (N strong, N moderate, N weak/speculative)
Q coverage:  N/N questions answered

Outputs:
  → research/[slug]/04-output/summary.md
  → research/[slug]/04-output/report.md

Limitations: [one sentence on the most important caveat]
────────────────────────────────────────
```

Then ask: "Would you like to expand any section, add more sources, or dig
deeper into a specific angle?"

---

## Final acceptance checklist

Run this before displaying the Step 7 summary. All items must pass:

- [ ] `state.json` `phase` equals `complete`
- [ ] `04-output/summary.md` exists and is between 300 and 500 words
- [ ] `04-output/report.md` exists and contains all required section headings
- [ ] Every claim in `03-synthesis/claims.md` cites at least one source by ID
- [ ] Every Q-number from `00-intake/plan.md` appears in `03-synthesis/claims.md`
- [ ] `state.json` `history` has at least one entry per completed session

If any item fails: return to the responsible zone step and fix it before displaying the summary.

---

## State update rules

Update `state.json` after every step transition — not just at the end.
Fields to maintain:
- `phase` — current zone
- `last_updated` — today
- `last_action` — what just completed
- `next_action` — what comes next
- `progress` — all boolean flags
- `source_counts` — keep accurate
- `history` — append one entry per session

---

## Error handling

**User goes silent mid-workflow:** On next invocation, read `state.json` and
resume from the last completed step — do not start over.

**Source quality is poor:** Flag it in `gaps.md`, note the limitation, continue.
Do not block synthesis on imperfect sourcing — disclose instead.

**Research question turns out to be unanswerable:** That is a valid finding.
Write it as an inherent limitation in the output. Document why in `gaps.md`.

**Contradictions can't be resolved:** That is also a valid finding. State it
honestly in the narrative. Never pick a side without evidence.

**Sub-skill file not found at expected path:** Show the user: "Sub-skill at [path] not found. Cannot continue this zone until the path is resolved." Record the error in `state.json` `last_action` and halt the current zone. Do not attempt to run the zone without the sub-skill.

**state.json is malformed or missing required fields:** Show the user: "state.json at [path] is malformed. Attempting recovery." Infer the last valid phase from existing output files (e.g., if `04-output/report.md` exists, set phase = complete; if `03-synthesis/claims.md` exists, set phase = output). If no valid phase can be inferred, treat as a new project and explain what may be lost.

**User changes the research topic mid-workflow:** Treat the new topic as a new project. Ask first: "You have an active project at `research/[slug]`. Start a new project for the new topic? The existing project will remain in place." Wait for explicit confirmation before proceeding.

---

## Anti-patterns to avoid

- Writing conclusions or interpretations in source files — source files are evidence records, not analysis documents
- Skipping the brief confirmation gate — unconfirmed briefs produce misaligned reports
- Calling sub-skills out of zone order — analysis before sourcing will produce claims without source evidence
- Treating `state.json` as optional — skipping state updates causes sessions to conflict or silently restart
- Merging synthesis and output zones — `claims.md` must be complete and verified before `report.md` is written
- Marking a project complete without running the final acceptance checklist
- Writing a claim not traceable to a source ID — all claims must link to evidence; speculation is not a claim
- Proceeding through a user gate without receiving explicit user confirmation
