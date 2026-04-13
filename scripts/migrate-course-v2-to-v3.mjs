#!/usr/bin/env node
/**
 * Grove Course Migrator: v2 → v3
 * Adds missing v3 adaptive fields to an existing course.json.
 * Idempotent — fields already present are never overwritten.
 *
 * Usage:
 *   node scripts/migrate-course-v2-to-v3.mjs <slug>
 *   node scripts/migrate-course-v2-to-v3.mjs python-scripting-best-practices
 *
 * After running, rebuild the bundle:
 *   node build-bundle.mjs <slug>
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/migrate-course-v2-to-v3.mjs <course-slug>');
  process.exit(1);
}

const base = resolve(`curriculum/${slug}`);
if (!existsSync(base)) {
  console.error(`Course not found: curriculum/${slug}`);
  process.exit(1);
}

const coursePath = join(base, 'course.json');
if (!existsSync(coursePath)) {
  console.error(`course.json not found in ${base}`);
  process.exit(1);
}

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const course = readJSON(coursePath);
let changes = 0;

/** Add a field to an object only if it's missing. */
function setDefault(obj, key, value) {
  if (obj[key] === undefined) {
    obj[key] = value;
    return true;
  }
  return false;
}

// ── Derive default difficulty from lesson type ───────────────────────────────
function defaultDifficulty(lesson) {
  const t = lesson.type || 'core';
  if (t === 'debate' || t === 'gap')     return 1;
  if (t === 'applied' || t === 'synthesis') return 3;
  if (t === 'advanced')                  return 4;
  return 2; // core, context, overview
}

// ── Migrate lesson_plan top-level defaults ────────────────────────────────────
const lp = course.learning_plan || {};
if (setDefault(course, 'learning_plan', {})) changes++;
if (setDefault(lp, 'milestone_lessons', [])) changes++;
if (setDefault(lp, 'suggested_schedule', 'Self-paced')) changes++;

// ── Migrate each lesson ───────────────────────────────────────────────────────
let lessonsMigrated = 0;
for (const mod of course.modules || []) {
  for (const lesson of mod.lessons || []) {
    let lessonChanged = false;

    // Core v3 fields
    if (setDefault(lesson, 'prerequisites',       [])) lessonChanged = true;
    if (setDefault(lesson, 'teaches_concepts',    [])) lessonChanged = true;
    if (setDefault(lesson, 'reinforces_concepts', [])) lessonChanged = true;
    if (setDefault(lesson, 'unlock_rule', 'all_prerequisites_mastered')) lessonChanged = true;

    // Difficulty — type-aware default
    if (setDefault(lesson, 'difficulty', defaultDifficulty(lesson))) lessonChanged = true;

    // Mastery threshold — slightly lower for non-core lessons
    const isCore = !['debate','gap','applied','synthesis','advanced'].includes(lesson.type);
    if (setDefault(lesson, 'mastery_threshold', isCore ? 0.80 : 0.75)) lessonChanged = true;

    // Review schedule — sensible progressive spacing
    if (setDefault(lesson, 'review_after_days', [1, 3, 7, 14])) lessonChanged = true;

    if (lessonChanged) {
      lessonsMigrated++;
      changes++;
    }
  }
}

if (changes === 0) {
  console.log(`✓ ${slug}: already at v3 — no changes needed`);
  process.exit(0);
}

writeFileSync(coursePath, JSON.stringify(course, null, 2) + '\n', 'utf8');

console.log(`✓ ${slug}: migrated ${lessonsMigrated} lesson(s), ${changes} total field addition(s)`);
console.log(`  Wrote: ${coursePath}`);
console.log(`\nNext step: node build-bundle.mjs ${slug}`);
