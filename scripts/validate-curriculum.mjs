#!/usr/bin/env node
/**
 * Grove Curriculum Validator
 * Validates a curriculum folder against the v3 schema contract.
 *
 * Usage:
 *   node scripts/validate-curriculum.mjs <slug>
 *   node scripts/validate-curriculum.mjs python-scripting-best-practices
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/validate-curriculum.mjs <course-slug>');
  process.exit(1);
}

const base = resolve(`curriculum/${slug}`);
if (!existsSync(base)) {
  console.error(`Course not found: curriculum/${slug}`);
  process.exit(1);
}

console.log(`\nValidating curriculum: ${slug}`);
console.log('─'.repeat(50));

function readJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) {
    console.error(`  ✗ Failed to parse ${path.replace(base, slug)}: ${e.message}`);
    errorCount++;
    return null;
  }
}

let errorCount = 0;
let warnCount = 0;

function err(msg) { console.error(`  ✗ ${msg}`); errorCount++; }
function warn(msg) { console.warn(`  ⚠ ${msg}`); warnCount++; }
function ok(msg) { console.log(`  ✓ ${msg}`); }

// ── Load artifacts ──────────────────────────────────────────────────────────
const course = readJSON(join(base, 'course.json'));
if (!course) { console.error('\n❌ course.json missing or unparseable — cannot continue.'); process.exit(1); }

const cardsData     = readJSON(join(base, 'cards.json'));
const conceptsData  = readJSON(join(base, 'concepts.json'));
const adaptiveRules = readJSON(join(base, 'adaptive-rules.json'));
const learningPaths = readJSON(join(base, 'learning-paths.json'));

// ── Build lookup sets ───────────────────────────────────────────────────────
const allLessons = {};
for (const m of course.modules ?? []) {
  for (const l of m.lessons ?? []) {
    if (!l.id) { err(`lesson missing id in module ${m.id}`); continue; }
    allLessons[l.id] = l;
  }
}
const allConceptIds = new Set((conceptsData?.concepts ?? []).map(c => c.id));
const hasConceptGraph = allConceptIds.size > 0;
const cards = cardsData?.cards ?? [];
const allCardIds = new Set(cards.map(c => c.id));

// ── Validate course.json ────────────────────────────────────────────────────
console.log('\ncourse.json');

for (const [lid, l] of Object.entries(allLessons)) {
  // v3 required fields
  if (!Array.isArray(l.teaches_concepts))
    warn(`${lid}: teaches_concepts missing — add [] if none`);
  if (l.mastery_threshold === undefined)
    warn(`${lid}: mastery_threshold missing`);
  if (l.difficulty === undefined)
    warn(`${lid}: difficulty missing`);
  if (l.unlock_rule === undefined)
    warn(`${lid}: unlock_rule missing`);

  // review_after_days must be an array if present
  if (l.review_after_days !== undefined && !Array.isArray(l.review_after_days))
    err(`${lid}: review_after_days must be an array`);

  // mastery_threshold range
  if (l.mastery_threshold !== undefined &&
      (typeof l.mastery_threshold !== 'number' || l.mastery_threshold < 0 || l.mastery_threshold > 1))
    err(`${lid}: mastery_threshold must be a number between 0 and 1`);

  // difficulty range
  if (l.difficulty !== undefined &&
      (typeof l.difficulty !== 'number' || l.difficulty < 1 || l.difficulty > 5))
    err(`${lid}: difficulty must be an integer between 1 and 5`);

  // prerequisite cross-references
  for (const prereq of l.prerequisites ?? []) {
    if (!allLessons[prereq])
      err(`${lid}: prerequisite "${prereq}" does not exist`);
  }

  // concept cross-references (only when concept graph exists)
  if (hasConceptGraph) {
    for (const cid of [...(l.teaches_concepts ?? []), ...(l.reinforces_concepts ?? [])]) {
      if (!allConceptIds.has(cid))
        err(`${lid}: concept "${cid}" not found in concepts.json`);
    }
  }
}
ok(`${Object.keys(allLessons).length} lessons checked`);

// ── Validate concepts.json ──────────────────────────────────────────────────
if (!conceptsData) {
  warn('concepts.json missing — adaptive concept tracking disabled');
} else {
  console.log('\nconcepts.json');
  for (const c of conceptsData.concepts ?? []) {
    if (!c.id) { err('concept missing id'); continue; }
    for (const dep of c.depends_on ?? []) {
      if (!allConceptIds.has(dep))
        err(`concept "${c.id}": depends_on "${dep}" does not exist`);
    }
    for (const lid of [...(c.introduced_in ?? []), ...(c.reinforced_in ?? [])]) {
      if (!allLessons[lid])
        err(`concept "${c.id}": lesson "${lid}" does not exist`);
    }
  }
  ok(`${allConceptIds.size} concepts checked`);
}

// ── Validate cards.json ─────────────────────────────────────────────────────
console.log('\ncards.json');
for (const card of cards) {
  if (!card.id) { err('card missing id'); continue; }
  if (card.lesson && !allLessons[card.lesson])
    err(`${card.id}: lesson "${card.lesson}" does not exist`);
  if (hasConceptGraph) {
    for (const cid of card.concepts ?? []) {
      if (!allConceptIds.has(cid))
        err(`${card.id}: concept "${cid}" not found in concepts.json`);
    }
  }
  for (const lid of card.remediation_lesson_ids ?? []) {
    if (!allLessons[lid])
      err(`${card.id}: remediation_lesson_id "${lid}" does not exist`);
  }
}
ok(`${cards.length} cards checked`);

// ── Validate assessments ────────────────────────────────────────────────────
const assessmentsDir = join(base, 'assessments');
if (existsSync(assessmentsDir)) {
  console.log('\nassessments/');
  const files = readdirSync(assessmentsDir).filter(f => f.endsWith('.json'));
  let totalQuestions = 0;
  for (const file of files) {
    const data = readJSON(join(assessmentsDir, file));
    if (!data) continue;
    for (const q of data.questions ?? []) {
      if (!q.id) { err(`${file}: question missing id`); continue; }
      totalQuestions++;
      if (hasConceptGraph) {
        for (const cid of q.concepts ?? []) {
          if (!allConceptIds.has(cid))
            err(`${file}/${q.id}: concept "${cid}" not found in concepts.json`);
        }
      }
      for (const lid of q.remediation_lesson_ids ?? []) {
        if (!allLessons[lid])
          err(`${file}/${q.id}: remediation_lesson_id "${lid}" does not exist`);
      }
      for (const cid of q.remediation_card_ids ?? []) {
        if (!allCardIds.has(cid))
          err(`${file}/${q.id}: remediation_card_id "${cid}" does not exist`);
      }
    }
  }
  ok(`${totalQuestions} questions across ${files.length} assessment files checked`);
}

// ── Validate learning-paths.json ────────────────────────────────────────────
if (!learningPaths) {
  warn('learning-paths.json missing — multi-path support disabled');
} else {
  console.log('\nlearning-paths.json');
  for (const path of learningPaths.paths ?? []) {
    if (!path.id) { err('path missing id'); continue; }
    for (const lid of path.sequence ?? []) {
      if (!allLessons[lid])
        err(`path "${path.id}": lesson "${lid}" does not exist`);
    }
  }
  ok(`${learningPaths.paths?.length ?? 0} paths checked`);
}

// ── Validate adaptive-rules.json ────────────────────────────────────────────
if (!adaptiveRules) {
  warn('adaptive-rules.json missing — default pacing will be used');
} else {
  console.log('\nadaptive-rules.json');
  const thresh = adaptiveRules.progression_rules?.unlock_next_lesson_if_mastery_above;
  if (thresh !== undefined && (typeof thresh !== 'number' || thresh < 0 || thresh > 1))
    err('progression_rules.unlock_next_lesson_if_mastery_above must be a number between 0 and 1');
  const intervals = adaptiveRules.review_policy?.default_intervals_days;
  if (intervals !== undefined && !Array.isArray(intervals))
    err('review_policy.default_intervals_days must be an array');
  const maxReviews = adaptiveRules.review_policy?.max_daily_reviews;
  if (maxReviews !== undefined && (typeof maxReviews !== 'number' || maxReviews < 1))
    err('review_policy.max_daily_reviews must be a positive integer');
  ok('adaptive-rules.json checked');
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
if (errorCount > 0) {
  console.error(`\n❌ Validation failed: ${errorCount} error(s), ${warnCount} warning(s)`);
  process.exit(1);
} else if (warnCount > 0) {
  console.warn(`\n⚠  Validation passed with ${warnCount} warning(s) — ${slug}`);
} else {
  console.log(`\n✓  Validation passed — ${slug} is a valid v3 curriculum`);
}
