#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { scoreLesson, reorderByStruggle } from '../app/modules/adaptive-sequencer.js';

const lesson = (id, concepts) => ({ id, teaches_concepts: concepts });

test('scoreLesson returns 0 with no data', () => {
  assert.equal(scoreLesson(lesson('L01', ['alpha']), {}), 0);
});

test('scoreLesson returns 0 for lesson with no matching struggled concepts', () => {
  const journal = { entries: [{ status: 'open', conceptIds: ['beta'], attempts: 3 }] };
  assert.equal(scoreLesson(lesson('L01', ['alpha']), { mistakeJournal: journal }), 0);
});

test('scoreLesson scores by open mistake attempts for matching concepts', () => {
  const journal = {
    entries: [{ fingerprint: 'quiz:M01:Q1', status: 'open', conceptIds: ['alpha'], attempts: 3 }],
  };
  assert.equal(scoreLesson(lesson('L01', ['alpha']), { mistakeJournal: journal }), 3);
});

test('scoreLesson ignores resolved mistakes', () => {
  const journal = {
    entries: [{ fingerprint: 'quiz:M01:Q1', status: 'resolved', conceptIds: ['alpha'], attempts: 5 }],
  };
  assert.equal(scoreLesson(lesson('L01', ['alpha']), { mistakeJournal: journal }), 0);
});

test('lesson covering a struggled concept scores higher than one that does not', () => {
  const journal = {
    entries: [{ fingerprint: 'quiz:M01:Q1', status: 'open', conceptIds: ['alpha'], attempts: 2 }],
  };
  const scoreA = scoreLesson(lesson('LA', ['alpha']), { mistakeJournal: journal });
  const scoreB = scoreLesson(lesson('LB', ['other']), { mistakeJournal: journal });
  assert.ok(scoreA > scoreB);
});

test('reorderByStruggle returns same order when no struggle data', () => {
  const lessons = [lesson('L01', ['a']), lesson('L02', ['b'])];
  const result = reorderByStruggle(lessons, {});
  assert.deepEqual(result.map(l => l.id), ['L01', 'L02']);
});

test('reorderByStruggle does not mutate the input array', () => {
  const lessons = [lesson('L01', ['a']), lesson('L02', ['b'])];
  const original = [...lessons];
  reorderByStruggle(lessons, {});
  assert.deepEqual(lessons, original);
});

test('reorderByStruggle puts struggle-matching lesson first', () => {
  const lessons = [lesson('L01', ['unrelated']), lesson('L02', ['alpha'])];
  const journal = {
    entries: [{ fingerprint: 'quiz:M01:Q1', status: 'open', conceptIds: ['alpha'], attempts: 1 }],
  };
  const result = reorderByStruggle(lessons, { mistakeJournal: journal });
  assert.equal(result[0].id, 'L02');
});

test('reorderByStruggle respects attempt count weight', () => {
  const lessons = [lesson('L01', ['beta']), lesson('L02', ['alpha'])];
  const journal = {
    entries: [
      { fingerprint: 'quiz:M01:Q1', status: 'open', conceptIds: ['alpha'], attempts: 1 },
      { fingerprint: 'quiz:M01:Q2', status: 'open', conceptIds: ['beta'],  attempts: 5 },
    ],
  };
  const result = reorderByStruggle(lessons, { mistakeJournal: journal });
  assert.equal(result[0].id, 'L01'); // beta has 5 attempts vs alpha's 1
});

test('reorderByStruggle with confidence log overconfidence counts', () => {
  const lessons = [lesson('L01', ['unrelated']), lesson('L02', ['alpha'])];
  const confidenceLog = {
    entries: [
      { confidence: 'high', correct: false, conceptIds: ['alpha'] },
      { confidence: 'high', correct: false, conceptIds: ['alpha'] },
    ],
  };
  const result = reorderByStruggle(lessons, { confidenceLog });
  assert.equal(result[0].id, 'L02');
});

test('reorderByStruggle returns single-element list unchanged', () => {
  const lessons = [lesson('L01', ['alpha'])];
  const result = reorderByStruggle(lessons, {});
  assert.deepEqual(result.map(l => l.id), ['L01']);
});
