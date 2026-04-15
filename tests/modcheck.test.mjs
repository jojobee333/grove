#!/usr/bin/env node
/**
 * Grove Module Check Tests
 * Tests isModcheckUnlocked(), submitModcheckLogic(), and
 * computeUnlockedModchecks() — no DOM dependency.
 *
 * Run:
 *   node tests/modcheck.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { isModcheckUnlocked, submitModcheckLogic } from '../app/modules/modcheck.js';
import { computeUnlockedModchecks }                from '../app/modules/planner.js';

// ── Local test-only helper (progress mutation is trivial, not worth a module export) ──
function scoreModcheckQ(moduleId, qId, correct, progress) {
  if (!progress.modchecks) progress.modchecks = {};
  if (!progress.modchecks[moduleId]) progress.modchecks[moduleId] = { scores: {}, done: false };
  progress.modchecks[moduleId].scores[qId] = correct;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LESSON_A = { id: 'L01', title: 'Lesson A', prerequisites: [], estimated_minutes: 20 };
const LESSON_B = { id: 'L02', title: 'Lesson B', prerequisites: ['L01'], estimated_minutes: 25 };

const MODULE_1 = {
  id: 'M01',
  title: 'Intro',
  description: 'Introduction',
  lessons: [LESSON_A, LESSON_B],
};

const MODULE_2 = {
  id: 'M02',
  title: 'Advanced',
  description: 'Advanced topics',
  lessons: [
    { id: 'L03', title: 'Lesson C', prerequisites: [], estimated_minutes: 30 },
  ],
};

const MODCHECK_M01 = {
  id: 'modcheck-M01',
  module: 'M01',
  title: 'Module Check: Intro',
  questions: [
    { id: 'MC01', question: 'What is X?', answer: 'X is Y.' },
    { id: 'MC02', question: 'What is Z?', answer: 'Z is W.' },
    { id: 'MC03', question: 'What is Q?', answer: 'Q is R.' },
  ],
};

const BUNDLE = {
  version: 3,
  modchecks: {
    M01: MODCHECK_M01,
    // M02 intentionally has no modcheck
  },
};

const COURSE = {
  slug: 'test-course',
  topic: 'Test',
  modules: [MODULE_1, MODULE_2],
};

function emptyProgress() {
  return { lessons: {}, cards: {}, quizzes: {}, modchecks: {}, conceptMastery: {} };
}

// ── isModcheckUnlocked ────────────────────────────────────────────────────────

describe('isModcheckUnlocked()', () => {
  test('returns false when no lessons are completed', () => {
    const progress = emptyProgress();
    assert.equal(isModcheckUnlocked('M01', { course: COURSE, bundle: BUNDLE, progress }), false);
  });

  test('returns false when only some lessons are completed', () => {
    const progress = emptyProgress();
    progress.lessons['L01'] = { date: '2024-01-01' };
    assert.equal(isModcheckUnlocked('M01', { course: COURSE, bundle: BUNDLE, progress }), false);
  });

  test('returns true when all lessons are completed', () => {
    const progress = emptyProgress();
    progress.lessons['L01'] = { date: '2024-01-01' };
    progress.lessons['L02'] = { date: '2024-01-02' };
    assert.equal(isModcheckUnlocked('M01', { course: COURSE, bundle: BUNDLE, progress }), true);
  });

  test('returns false for unknown moduleId', () => {
    const progress = emptyProgress();
    assert.equal(isModcheckUnlocked('M99', { course: COURSE, bundle: BUNDLE, progress }), false);
  });

  test('returns false when bundle is null', () => {
    const progress = emptyProgress();
    progress.lessons['L01'] = { date: '2024-01-01' };
    progress.lessons['L02'] = { date: '2024-01-02' };
    assert.equal(isModcheckUnlocked('M01', { course: COURSE, bundle: null, progress }), false);
  });

  test('returns true for a module with one lesson when that lesson is done', () => {
    const progress = emptyProgress();
    progress.lessons['L03'] = { date: '2024-01-01' };
    assert.equal(isModcheckUnlocked('M02', { course: COURSE, bundle: BUNDLE, progress }), true);
  });
});

// ── scoreModcheckQ ────────────────────────────────────────────────────────────

describe('scoreModcheckQ()', () => {
  test('initialises progress.modchecks when not present', () => {
    const progress = emptyProgress();
    scoreModcheckQ('M01', 'MC01', true, progress);
    assert.ok(progress.modchecks['M01']);
    assert.equal(progress.modchecks['M01'].scores['MC01'], true);
    assert.equal(progress.modchecks['M01'].done, false);
  });

  test('records a missed answer as false', () => {
    const progress = emptyProgress();
    scoreModcheckQ('M01', 'MC02', false, progress);
    assert.equal(progress.modchecks['M01'].scores['MC02'], false);
  });

  test('preserves other question scores when adding a new one', () => {
    const progress = emptyProgress();
    scoreModcheckQ('M01', 'MC01', true, progress);
    scoreModcheckQ('M01', 'MC02', false, progress);
    assert.equal(progress.modchecks['M01'].scores['MC01'], true);
    assert.equal(progress.modchecks['M01'].scores['MC02'], false);
  });

  test('overwrites an existing score for the same question', () => {
    const progress = emptyProgress();
    scoreModcheckQ('M01', 'MC01', false, progress);
    scoreModcheckQ('M01', 'MC01', true, progress);
    assert.equal(progress.modchecks['M01'].scores['MC01'], true);
  });
});

// ── submitModcheckLogic ───────────────────────────────────────────────────────

describe('submitModcheckLogic()', () => {
  test('marks modcheck as done', () => {
    const result = submitModcheckLogic(MODCHECK_M01, { scores: {}, done: false });
    assert.equal(result.done, true);
  });

  test('calculates correct score when all answers correct', () => {
    const existing = { scores: { MC01: true, MC02: true, MC03: true }, done: false };
    const result   = submitModcheckLogic(MODCHECK_M01, existing);
    assert.equal(result.correct, 3);
    assert.equal(result.total,   3);
    assert.equal(result.score,   100);
  });

  test('calculates correct score when some answers missed', () => {
    const existing = { scores: { MC01: true, MC02: false, MC03: false }, done: false };
    const result   = submitModcheckLogic(MODCHECK_M01, existing);
    assert.equal(result.correct, 1);
    assert.equal(result.total,   3);
    assert.equal(result.score,   33);
  });

  test('returns score of null when no questions exist', () => {
    const emptyModcheck = { ...MODCHECK_M01, questions: [] };
    const result = submitModcheckLogic(emptyModcheck, { scores: {}, done: false });
    assert.equal(result.score, null);
  });

  test('calculates score as 0 when all answers missed', () => {
    const existing = { scores: { MC01: false, MC02: false, MC03: false }, done: false };
    const result   = submitModcheckLogic(MODCHECK_M01, existing);
    assert.equal(result.correct, 0);
    assert.equal(result.score,   0);
  });

  test('score is stored in returned object (not mutated from existing)', () => {
    const existing = { scores: { MC01: true, MC02: true, MC03: false }, done: false };
    const result   = submitModcheckLogic(MODCHECK_M01, existing);
    assert.equal(result.score, 67);
    assert.equal(result.done,  true);
    // Input is not mutated
    assert.equal(existing.done, false);
  });

  test('handles missing existing entry (no prior scores)', () => {
    const result = submitModcheckLogic(MODCHECK_M01, undefined);
    assert.equal(result.correct, 0);
    assert.equal(result.total,   3);
    assert.equal(result.score,   0);
    assert.equal(result.done,    true);
  });

  test('result includes a date string', () => {
    const result = submitModcheckLogic(MODCHECK_M01, { scores: {}, done: false });
    assert.ok(typeof result.date === 'string');
    assert.ok(result.date.includes('T'));  // ISO format
  });
});

// ── computeUnlockedModchecks (integration with planner) ───────────────────────

describe('computeUnlockedModchecks()', () => {
  test('returns empty array when no lessons are complete', () => {
    const progress = emptyProgress();
    const result = computeUnlockedModchecks({ course: COURSE, bundle: BUNDLE, progress });
    assert.deepEqual(result, []);
  });

  test('returns empty array when only some lessons in a module are complete', () => {
    const progress = emptyProgress();
    progress.lessons['L01'] = { date: '2024-01-01' };
    const result = computeUnlockedModchecks({ course: COURSE, bundle: BUNDLE, progress });
    assert.deepEqual(result, []);
  });

  test('returns modcheck when all lessons in a module are complete', () => {
    const progress = emptyProgress();
    progress.lessons['L01'] = { date: '2024-01-01' };
    progress.lessons['L02'] = { date: '2024-01-02' };
    const result = computeUnlockedModchecks({ course: COURSE, bundle: BUNDLE, progress });
    assert.equal(result.length, 1);
    assert.equal(result[0].moduleId, 'M01');
    assert.equal(result[0].moduleTitle, 'Intro');
    assert.equal(result[0].modcheck, MODCHECK_M01);
  });

  test('does not return modcheck for module that has no entry in bundle.modchecks', () => {
    const progress = emptyProgress();
    progress.lessons['L03'] = { date: '2024-01-01' };
    const result = computeUnlockedModchecks({ course: COURSE, bundle: BUNDLE, progress });
    assert.deepEqual(result, []);  // M02 has no modcheck in BUNDLE
  });

  test('does not resurface an already-completed modcheck', () => {
    const progress = emptyProgress();
    progress.lessons['L01'] = { date: '2024-01-01' };
    progress.lessons['L02'] = { date: '2024-01-02' };
    progress.modchecks['M01'] = { done: true, score: 100 };
    const result = computeUnlockedModchecks({ course: COURSE, bundle: BUNDLE, progress });
    assert.deepEqual(result, []);
  });

  test('resurfaces completed-but-not-yet-marked-done modcheck (partial scores only)', () => {
    const progress = emptyProgress();
    progress.lessons['L01'] = { date: '2024-01-01' };
    progress.lessons['L02'] = { date: '2024-01-02' };
    progress.modchecks['M01'] = { scores: { MC01: true }, done: false };
    const result = computeUnlockedModchecks({ course: COURSE, bundle: BUNDLE, progress });
    assert.equal(result.length, 1);  // still shows until explicitly marked done
  });

  test('returns multiple unlocked modchecks when multiple modules are complete', () => {
    const bundleWithBoth = {
      ...BUNDLE,
      modchecks: {
        M01: MODCHECK_M01,
        M02: {
          id: 'modcheck-M02', module: 'M02', title: 'Module Check: Advanced',
          questions: [{ id: 'MC01', question: 'Q1', answer: 'A1' }],
        },
      },
    };
    const progress = emptyProgress();
    progress.lessons['L01'] = { date: '2024-01-01' };
    progress.lessons['L02'] = { date: '2024-01-02' };
    progress.lessons['L03'] = { date: '2024-01-03' };
    const result = computeUnlockedModchecks({ course: COURSE, bundle: bundleWithBoth, progress });
    assert.equal(result.length, 2);
  });
});
