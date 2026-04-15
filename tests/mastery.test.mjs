#!/usr/bin/env node
/**
 * Grove Mastery Tests
 * Tests masteryFromQuiz(), masteryFromCard(), masteryFromCodeChallenge().
 * Verifies correct deltas, clamping, concept scoping, and immutability.
 *
 * Run:  node tests/mastery.test.mjs
 */

import { test }  from 'node:test';
import assert    from 'node:assert/strict';

import { masteryFromQuiz, masteryFromCard, masteryFromCodeChallenge } from '../app/modules/mastery.js';

// ── masteryFromQuiz ───────────────────────────────────────────────────────────

const MCQ = {
  id: 'Q1', type: 'mcq', correct: 'a', weight: 0.75,
  concepts: ['concept-alpha'],
  options: { a: 'Correct', b: 'Wrong' },
};
const QUESTIONS = [MCQ];

test('correct answer increases mastery', () => {
  const before = { 'concept-alpha': 0.5 };
  const after  = masteryFromQuiz(before, QUESTIONS, { Q1: 'a' });
  assert.ok(after['concept-alpha'] > 0.5, 'mastery should increase on correct answer');
});

test('wrong answer decreases mastery', () => {
  const before = { 'concept-alpha': 0.5 };
  const after  = masteryFromQuiz(before, QUESTIONS, { Q1: 'b' });
  assert.ok(after['concept-alpha'] < 0.5, 'mastery should decrease on wrong answer');
});

test('unanswered question leaves mastery unchanged', () => {
  const before = { 'concept-alpha': 0.5 };
  const after  = masteryFromQuiz(before, QUESTIONS, {});
  assert.equal(after['concept-alpha'], 0.5);
});

test('non-MCQ questions are ignored', () => {
  const sa = { id: 'Q2', type: 'short_answer', concepts: ['concept-alpha'] };
  const before = { 'concept-alpha': 0.5 };
  const after  = masteryFromQuiz(before, [sa], { Q2: 'some answer' });
  assert.equal(after['concept-alpha'], 0.5);
});

test('mastery is clamped at 1.0 on correct answer from high base', () => {
  const before = { 'concept-alpha': 0.98 };
  const after  = masteryFromQuiz(before, QUESTIONS, { Q1: 'a' });
  assert.equal(after['concept-alpha'], 1.0);
});

test('mastery is clamped at 0.0 on wrong answer from low base', () => {
  const before = { 'concept-alpha': 0.02 };
  const after  = masteryFromQuiz(before, QUESTIONS, { Q1: 'b' });
  assert.equal(after['concept-alpha'], 0);
});

test('unknown concept defaults to 0.5 before applying delta', () => {
  const after = masteryFromQuiz({}, QUESTIONS, { Q1: 'a' });
  assert.ok(after['concept-alpha'] > 0.5, 'new concept updated from 0.5 baseline');
});

test('correct delta matches expected formula (weight * 0.15)', () => {
  const weight = 0.75;
  const before = 0.5;
  const expected = Math.min(1, before + weight * 0.15);
  const after = masteryFromQuiz({ 'c': before }, [{ id: 'Q', type: 'mcq', correct: 'a', weight, concepts: ['c'], options: {} }], { Q: 'a' });
  assert.equal(after['c'], expected);
});

test('input mastery map is not mutated', () => {
  const before = { 'concept-alpha': 0.5 };
  const frozen = { 'concept-alpha': 0.5 };
  masteryFromQuiz(before, QUESTIONS, { Q1: 'a' });
  assert.deepEqual(before, frozen);
});

// ── masteryFromCard ───────────────────────────────────────────────────────────

test('quality=5 increases mastery (high delta)', () => {
  const after = masteryFromCard({ 'c': 0.5 }, ['c'], 5, 0.5);
  assert.ok(after['c'] > 0.5);
});

test('quality=4 increases mastery', () => {
  const after = masteryFromCard({ 'c': 0.5 }, ['c'], 4, 0.5);
  assert.ok(after['c'] > 0.5);
});

test('quality=3 increases mastery (small delta)', () => {
  const after = masteryFromCard({ 'c': 0.5 }, ['c'], 3, 0.5);
  assert.ok(after['c'] > 0.5);
});

test('quality=2 decreases mastery', () => {
  const after = masteryFromCard({ 'c': 0.5 }, ['c'], 2, 0.5);
  assert.ok(after['c'] < 0.5);
});

test('quality=1 decreases mastery', () => {
  const after = masteryFromCard({ 'c': 0.5 }, ['c'], 1, 0.5);
  assert.ok(after['c'] < 0.5);
});

test('quality=4 yields larger delta than quality=3', () => {
  const base = 0.5;
  const a4 = masteryFromCard({ 'c': base }, ['c'], 4, 0.5)['c'];
  const a3 = masteryFromCard({ 'c': base }, ['c'], 3, 0.5)['c'];
  assert.ok(a4 > a3, 'q4 increase should exceed q3 increase');
});

test('mastery is clamped at 0 and 1', () => {
  const tooHigh = masteryFromCard({ 'c': 0.99 }, ['c'], 5, 1.0);
  const tooLow  = masteryFromCard({ 'c': 0.01 }, ['c'], 1, 1.0);
  assert.equal(tooHigh['c'], 1);
  assert.equal(tooLow['c'],  0);
});

test('card mastery does not mutate input', () => {
  const before = { 'c': 0.5 };
  const frozen  = { 'c': 0.5 };
  masteryFromCard(before, ['c'], 5);
  assert.deepEqual(before, frozen);
});

// ── masteryFromCodeChallenge ──────────────────────────────────────────────────

test('all tests passed: mastery increases by weight * 0.20', () => {
  const weight = 1.0;
  const base   = 0.5;
  const after  = masteryFromCodeChallenge({ 'c': base }, ['c'], 5, 5, 0.70, weight);
  assert.equal(after['c'], Math.min(1, base + weight * 0.20));
});

test('partial pass (>50%, <threshold): small positive delta', () => {
  const base  = 0.5;
  const after = masteryFromCodeChallenge({ 'c': base }, ['c'], 4, 6, 0.70, 1.0);
  // passRatio = 4/6 ≈ 0.67 < 0.70 threshold, >0.5 → partial
  assert.ok(after['c'] > base, 'partial pass should give positive delta');
});

test('fail (<= 50%): mastery decreases', () => {
  const base  = 0.5;
  const after = masteryFromCodeChallenge({ 'c': base }, ['c'], 2, 6, 0.70, 1.0);
  // passRatio = 2/6 ≈ 0.33 → fail
  assert.ok(after['c'] < base, 'fail should decrease mastery');
});

test('all tests failed: mastery decreases by weight * 0.15', () => {
  const weight = 1.0;
  const base   = 0.5;
  const after  = masteryFromCodeChallenge({ 'c': base }, ['c'], 0, 5, 0.70, weight);
  assert.equal(after['c'], Math.max(0, base - weight * 0.15));
});

test('testsTotal=0: no division by zero, treated as fail', () => {
  const before = { 'c': 0.5 };
  const after  = masteryFromCodeChallenge(before, ['c'], 0, 0);
  assert.ok(after['c'] <= 0.5, 'zero total tests should not increase mastery');
});

test('code challenge mastery does not mutate input', () => {
  const before = { 'c': 0.5 };
  const frozen  = { 'c': 0.5 };
  masteryFromCodeChallenge(before, ['c'], 5, 5);
  assert.deepEqual(before, frozen);
});
