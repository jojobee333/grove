#!/usr/bin/env node
/**
 * Grove Bundler Tests
 * Tests the build-bundle.mjs helper functions in isolation.
 * Uses Node.js built-in test runner (node:test) — no npm install required.
 *
 * Run:
 *   node tests/build-bundle.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ── Inline the pure helpers (mirrors build-bundle.mjs) ──────────────────────

function cognitiveLevel(cardType) {
  if (cardType === 'definition' || cardType === 'context') return 'recall';
  if (cardType === 'application' || cardType === 'synthesis') return 'application';
  return 'comprehension';
}

function defaultWeight(cardType) {
  if (cardType === 'definition' || cardType === 'context') return 0.5;
  if (cardType === 'application' || cardType === 'synthesis') return 1.0;
  return 0.75;
}

function quizCognitiveLevel(difficulty) {
  if (difficulty === 1) return 'recall';
  if (difficulty >= 3)  return 'application';
  return 'comprehension';
}

function quizWeight(cogLevel) {
  if (cogLevel === 'recall')       return 0.5;
  if (cogLevel === 'application')  return 1.0;
  return 0.75;
}

// ── cognitiveLevel ───────────────────────────────────────────────────────────

test('cognitiveLevel: definition → recall', () => {
  assert.equal(cognitiveLevel('definition'), 'recall');
});

test('cognitiveLevel: context → recall', () => {
  assert.equal(cognitiveLevel('context'), 'recall');
});

test('cognitiveLevel: application → application', () => {
  assert.equal(cognitiveLevel('application'), 'application');
});

test('cognitiveLevel: synthesis → application', () => {
  assert.equal(cognitiveLevel('synthesis'), 'application');
});

test('cognitiveLevel: claim → comprehension (fallback)', () => {
  assert.equal(cognitiveLevel('claim'), 'comprehension');
});

test('cognitiveLevel: unknown type → comprehension', () => {
  assert.equal(cognitiveLevel('xyz'), 'comprehension');
});

// ── defaultWeight ────────────────────────────────────────────────────────────

test('defaultWeight: definition → 0.5', () => {
  assert.equal(defaultWeight('definition'), 0.5);
});

test('defaultWeight: context → 0.5', () => {
  assert.equal(defaultWeight('context'), 0.5);
});

test('defaultWeight: application → 1.0', () => {
  assert.equal(defaultWeight('application'), 1.0);
});

test('defaultWeight: synthesis → 1.0', () => {
  assert.equal(defaultWeight('synthesis'), 1.0);
});

test('defaultWeight: comparison → 0.75 (fallback)', () => {
  assert.equal(defaultWeight('comparison'), 0.75);
});

// ── quizCognitiveLevel ───────────────────────────────────────────────────────

test('quizCognitiveLevel: difficulty 1 → recall', () => {
  assert.equal(quizCognitiveLevel(1), 'recall');
});

test('quizCognitiveLevel: difficulty 2 → comprehension', () => {
  assert.equal(quizCognitiveLevel(2), 'comprehension');
});

test('quizCognitiveLevel: difficulty 3 → application', () => {
  assert.equal(quizCognitiveLevel(3), 'application');
});

test('quizCognitiveLevel: difficulty 4 → application', () => {
  assert.equal(quizCognitiveLevel(4), 'application');
});

// ── quizWeight ───────────────────────────────────────────────────────────────

test('quizWeight: recall → 0.5', () => {
  assert.equal(quizWeight('recall'), 0.5);
});

test('quizWeight: application → 1.0', () => {
  assert.equal(quizWeight('application'), 1.0);
});

test('quizWeight: comprehension → 0.75', () => {
  assert.equal(quizWeight('comprehension'), 0.75);
});

// ── Integration: validate bundle.json structure ───────────────────────────────

const SLUGS = ['python-scripting-best-practices', 'meridian-tech-stack-mastery'];

for (const slug of SLUGS) {
  const bundlePath = resolve(`curriculum/${slug}/bundle.json`);

  test(`${slug}: bundle.json exists`, () => {
    assert.ok(existsSync(bundlePath), `${bundlePath} not found — run build-bundle.mjs ${slug}`);
  });

  test(`${slug}: bundle is v3`, () => {
    if (!existsSync(bundlePath)) return;
    const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
    assert.equal(bundle.version, '3.0');
    assert.equal(bundle.slug, slug);
  });

  test(`${slug}: bundle has required top-level keys`, () => {
    if (!existsSync(bundlePath)) return;
    const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
    for (const key of ['course', 'lessons', 'cards', 'quizzes', 'modchecks', 'codeChallenges', 'concepts', 'adaptiveRules', 'learningPaths']) {
      assert.ok(key in bundle, `Missing key: ${key}`);
    }
  });

  test(`${slug}: all cards have v3 enrichment fields`, () => {
    if (!existsSync(bundlePath)) return;
    const { cards } = JSON.parse(readFileSync(bundlePath, 'utf8'));
    assert.ok(cards.length > 0, 'No cards found');
    for (const card of cards) {
      assert.ok(Array.isArray(card.concepts),             `${card.id}: missing concepts`);
      assert.ok(['recall','comprehension','application'].includes(card.cognitive_level),
                                                          `${card.id}: invalid cognitive_level`);
      assert.ok(typeof card.weight === 'number',          `${card.id}: missing weight`);
      assert.ok(typeof card.reviewable === 'boolean',     `${card.id}: missing reviewable`);
    }
  });

  test(`${slug}: MCQ quiz questions have v3 enrichment fields`, () => {
    if (!existsSync(bundlePath)) return;
    const { quizzes } = JSON.parse(readFileSync(bundlePath, 'utf8'));
    const mcqs = Object.values(quizzes).flatMap(q => (q.questions || []).filter(x => x.type === 'mcq'));
    assert.ok(mcqs.length > 0, 'No MCQ questions found');
    for (const q of mcqs) {
      assert.ok(Array.isArray(q.concepts),                `${q.id}: missing concepts`);
      assert.ok(typeof q.weight === 'number',             `${q.id}: missing weight`);
      assert.ok(Array.isArray(q.remediation_lesson_ids),  `${q.id}: missing remediation_lesson_ids`);
    }
  });

  test(`${slug}: code challenges have v3 enrichment fields`, () => {
    if (!existsSync(bundlePath)) return;
    const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
    const challenges = Object.values(bundle.codeChallenges || {}).flatMap(c => c.challenges || []);
    if (challenges.length === 0) return; // Skip if no code challenges
    for (const c of challenges) {
      assert.ok(c.id, `challenge missing id`);
      assert.ok(['python', 'javascript'].includes(c.language), `${c.id}: invalid language`);
      assert.ok(c.prompt, `${c.id}: missing prompt`);
      assert.ok(c.starter_code || c.solution_template, `${c.id}: missing starter_code or solution_template`);
      assert.ok(Array.isArray(c.test_cases), `${c.id}: missing test_cases`);
      assert.ok(c.test_cases.length > 0, `${c.id}: empty test_cases`);
      assert.ok(Array.isArray(c.concepts), `${c.id}: missing concepts`);
      assert.ok(['application', 'synthesis'].includes(c.cognitive_level), `${c.id}: invalid cognitive_level`);
      assert.ok(typeof c.weight === 'number', `${c.id}: missing weight`);
      assert.ok(typeof c.pass_criteria === 'number', `${c.id}: missing pass_criteria`);
      assert.ok(Array.isArray(c.remediation_lesson_ids), `${c.id}: missing remediation_lesson_ids`);
    }
  });

  test(`${slug}: index.json has adaptive flags`, () => {
    const indexPath = resolve('curriculum/index.json');
    if (!existsSync(indexPath)) return;
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    const entry = index.courses?.find(c => c.slug === slug);
    assert.ok(entry, `${slug} not found in index.json`);
    assert.equal(entry.adaptive, true);
    assert.equal(entry.bundle_version, '3.0');
    assert.ok(typeof entry.total_questions === 'number');
  });
}
