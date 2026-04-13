---
name: research-start
description: >-
  Starts or resumes a research project. Use when: starting new research on a topic,
  resuming an existing research project, checking research status, creating a research
  brief, building a research plan, or any prompt containing "start research", "new research",
  "resume research", "research status", "research brief", or "research plan".
argument-hint: "Topic name or folder slug to resume (e.g. 'ai regulation' or 'ai-regulation')"
user-invokable: true
allowed-tools:
  - editFiles
  - search
---

# Research start skill

You manage research project intake and session continuity. You always read
`state.json` before doing anything, and you always write it before you finish.

## Determining what to do

Read the argument or prompt to decide:

- "start research on X" or no existing folder → **new project**
- "resume" or folder already exists → **resume existing project**
- "status" or "where are we" → **status report only**

## Starting a new project

1. Create the research folder by copying the template structure:

```
research/[topic-slug]/
├── state.json
├── 00-intake/
│   ├── brief.md
│   └── plan.md
├── 01-sources/
│   ├── index.md
│   ├── web/
│   │   └── _template.md
│   └── papers/
│       └── _template.md
├── 02-analysis/
│   ├── themes.md
│   ├── contradictions.md
│   └── gaps.md
├── 03-synthesis/
│   ├── claims.md
│   └── narrative.md
└── 04-output/
    ├── summary.md
    └── report.md
```

2. Ask the user these questions (all at once, not one at a time):
   - What is the main research question this project must answer?
   - What will the output be used for, and by whom?
   - Any constraints? (deadline, source requirements, topics to avoid)

3. Write `00-intake/brief.md` from their answers using the template in
   [brief template](../../research/topic-name/00-intake/brief.md).

4. Draft `00-intake/plan.md` — break the main question into 4-6 answerable
   sub-questions, propose a source strategy, and estimate source volume needed.

5. Initialize `state.json`:
```json
{
  "topic": "[Topic Name]",
  "slug": "[topic-slug]",
  "created": "[today]",
  "last_updated": "[today]",
  "phase": "intake",
  "progress": {
    "brief_approved": false,
    "plan_approved": false,
    "sourcing_complete": false,
    "analysis_complete": false,
    "synthesis_complete": false,
    "output_complete": false
  },
  "last_action": "Project initialized",
  "next_action": "Review brief.md and plan.md, then approve to begin sourcing",
  "source_counts": { "total": 0, "active": 0, "discarded": 0, "pending_review": 0 },
  "questions": { "total": 0, "answered": 0, "unanswerable": 0 },
  "open_issues": [],
  "history": [
    { "date": "[today]", "session_summary": "Project initialized", "actions": ["Created folder structure", "Wrote brief.md", "Wrote plan.md"] }
  ]
}
```

6. Tell the user: "Review `brief.md` and `plan.md`. When approved, use
   `/research-source` to begin collecting sources."

## Resuming an existing project

1. Read `state.json` — note the phase, last action, and next action
2. Read `00-intake/brief.md` for scope context
3. Report status in one paragraph:
   - Current phase and what it means
   - What was last completed
   - What the recommended next action is
   - Which `/research-*` skill to use next
4. Ask if they want to proceed with the recommendation or do something different

## Status report

Read `state.json` and produce a brief summary table:

| Field | Value |
|-------|-------|
| Topic | |
| Phase | |
| Sources collected | N active / N total |
| Questions answered | N / N |
| Last action | |
| Next action | |

Then recommend the appropriate next `/research-*` skill.

## Phase → skill routing

| Phase | Recommended next skill |
|-------|------------------------|
| intake | `/research-source` (after brief approved) |
| sourcing | `/research-source` |
| analysis | `/research-analyze` |
| synthesis | `/research-synthesize` |
| output | `/research-write` |
| complete | Research is done — ask if expansion needed |

## State update on finish

Always update `state.json` before finishing:
- `last_updated`: today
- `last_action`: what you just did
- `next_action`: what should happen next
- Add a row to the `history` array
