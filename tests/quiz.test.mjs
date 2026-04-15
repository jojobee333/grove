#!/usr/bin/env node
/**
 * Grove Quiz Scoring Tests
 * Tests computeQuizScore() — MCQ-only scoring, mixed types, pass/fail,
 * edge cases (no MCQs, all correct, all wrong).
 *
 * Run:  node tests/quiz.test.mjs
 */

import { test }  from 'node:test';
import assert    from 'node:assert/strict';

import { computeQuizScore } from '../app/modules/quiz.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mcq(id, correct, options = { a: 'A', b: 'B' }) {
  return { id, type: 'mcq', correct, options, question: `Q ${id}`, weight: 0.75, concepts: [] };
}

function sa(id) {
  return { id, type: 'short_answer', question: `SA ${id}` };
}

// ── MCQ scoring ───────────────────────────────────────────────────────────────

test('all correct: score=100, passed=true', () => {
  const quiz    = { questions: [mcq('Q1','a'), mcq('Q2','b')], passing_score: 70 };
  const answers = { Q1: 'a', Q2: 'b' };
  const result  = computeQuizScore(quiz, answers);
  assert.equal(result.correct, 2);
  assert.equal(result.total,   2);
  assert.equal(result.score,   100);
  assert.equal(result.passed,  true);
});

test('all wrong: score=0, passed=false', () => {
  const quiz    = { questions: [mcq('Q1','a'), mcq('Q2','b')], passing_score: 70 };
  const answers = { Q1: 'b', Q2: 'a' };
  const result  = computeQuizScore(quiz, answers);
  assert.equal(result.correct, 0);
  assert.equal(result.score,   0);
  assert.equal(result.passed,  false);
});

test('half correct: score=50, passed=false (default threshold 70)', () => {
  const quiz    = { questions: [mcq('Q1','a'), mcq('Q2','b')], passing_score: 70 };
  const answers = { Q1: 'a', Q2: 'a' };  // Q2 wrong
  const result  = computeQuizScore(quiz, answers);
  assert.equal(result.score,  50);
  assert.equal(result.passed, false);
});

test('75% score passes at 70 threshold', () => {
  const quiz = { questions: [mcq('Q1','a'), mcq('Q2','a'), mcq('Q3','a'), mcq('Q4','a')], passing_score: 70 };
  const answers = { Q1: 'a', Q2: 'a', Q3: 'a', Q4: 'b' }; // 3/4 = 75%
  const result  = computeQuizScore(quiz, answers);
  assert.equal(result.score,  75);
  assert.equal(result.passed, true);
});

test('score is rounded to nearest integer', () => {
  // 1/3 = 33.333...
  const quiz    = { questions: [mcq('Q1','a'), mcq('Q2','a'), mcq('Q3','a')], passing_score: 70 };
  const answers = { Q1: 'a', Q2: 'b', Q3: 'b' };
  const result  = computeQuizScore(quiz, answers);
  assert.equal(result.score, 33);
});

test('unanswered MCQ counts as wrong', () => {
  const quiz    = { questions: [mcq('Q1','a')], passing_score: 70 };
  const result  = computeQuizScore(quiz, {});
  assert.equal(result.correct, 0);
  assert.equal(result.score,   0);
});

// ── Custom passing_score ──────────────────────────────────────────────────────

test('80% score fails at 90 passing_score', () => {
  const quiz    = { questions: [mcq('Q1','a'), mcq('Q2','a'), mcq('Q3','a'), mcq('Q4','a'), mcq('Q5','a')], passing_score: 90 };
  const answers = { Q1: 'a', Q2: 'a', Q3: 'a', Q4: 'a', Q5: 'b' }; // 80%
  const result  = computeQuizScore(quiz, answers);
  assert.equal(result.score,  80);
  assert.equal(result.passed, false);
});

test('default passing_score is 70 when not set', () => {
  const quiz    = { questions: [mcq('Q1','a'), mcq('Q2','a'), mcq('Q3','a'), mcq('Q4','a')] }; // no passing_score
  const answers = { Q1: 'a', Q2: 'a', Q3: 'a', Q4: 'b' }; // 75%
  const result  = computeQuizScore(quiz, answers);
  assert.equal(result.passed, true);
});

// ── Mixed question types ──────────────────────────────────────────────────────

test('short_answer questions do not affect score', () => {
  const quiz    = { questions: [mcq('Q1','a'), sa('Q2')], passing_score: 70 };
  const answers = { Q1: 'a', Q2: 'some answer' };
  const result  = computeQuizScore(quiz, answers);
  assert.equal(result.total,  1);    // only 1 MCQ
  assert.equal(result.correct, 1);
  assert.equal(result.score,  100);
});

// ── No MCQs ───────────────────────────────────────────────────────────────────

test('quiz with only short_answer: score=null, passed=true (self-assessed)', () => {
  const quiz   = { questions: [sa('Q1'), sa('Q2')], passing_score: 70 };
  const result = computeQuizScore(quiz, {});
  assert.equal(result.score,  null);
  assert.equal(result.passed, true);
  assert.equal(result.total,  0);
});

test('empty questions array: score=null, passed=true', () => {
  const result = computeQuizScore({ questions: [], passing_score: 70 }, {});
  assert.equal(result.score, null);
  assert.equal(result.passed, true);
});
