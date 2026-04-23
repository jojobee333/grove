#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getDueMistakes, recordMistake, resolveMistake, resolveMistakesForItem, summarizeMistakeJournal } from '../app/modules/mistake-journal.js';

test('repeated mistakes roll up into one open entry', () => {
  let journal = { entries: [] };

  journal = recordMistake(journal, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q1',
    moduleId: 'M01',
    prompt: 'Which option is correct?',
    learnerAnswer: 'b',
    correctAnswer: 'a',
    conceptIds: ['alpha'],
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  journal = recordMistake(journal, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q1',
    moduleId: 'M01',
    prompt: 'Which option is correct?',
    learnerAnswer: 'c',
    correctAnswer: 'a',
    conceptIds: ['alpha'],
    createdAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(journal.entries.length, 1);
  assert.equal(journal.entries[0].attempts, 2);
  assert.equal(journal.entries[0].learnerAnswer, 'c');
});

test('due mistakes and focus concepts are summarized', () => {
  let journal = { entries: [] };

  journal = recordMistake(journal, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q1',
    moduleId: 'M01',
    prompt: 'Alpha question',
    learnerAnswer: 'b',
    correctAnswer: 'a',
    conceptIds: ['alpha'],
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  journal = recordMistake(journal, {
    sourceType: 'challenge',
    sourceId: 'CH01',
    itemId: 'CH01',
    moduleId: 'M02',
    prompt: 'Gamma challenge',
    learnerAnswer: 'failed hidden tests',
    correctAnswer: 'pass threshold met',
    conceptIds: ['gamma'],
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  const due = getDueMistakes(journal, '2026-01-04T00:00:00.000Z');
  const summary = summarizeMistakeJournal(journal, '2026-01-04T00:00:00.000Z');

  assert.equal(due.length, 2);
  assert.equal(summary.openCount, 2);
  assert.equal(summary.dueCount, 2);
  assert.deepEqual(summary.focusConceptIds, ['alpha', 'gamma']);
});

test('resolveMistake marks a single entry resolved', () => {
  let journal = { entries: [] };

  journal = recordMistake(journal, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q1',
    moduleId: 'M01',
    prompt: 'Alpha question',
    learnerAnswer: 'b',
    correctAnswer: 'a',
    conceptIds: ['alpha'],
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  journal = resolveMistake(journal, 'quiz:M01:Q1', '2026-01-03T00:00:00.000Z');

  assert.equal(journal.entries[0].status, 'resolved');
  assert.equal(journal.entries[0].resolvedAt, '2026-01-03T00:00:00.000Z');
});

test('resolveMistakesForItem resolves matching open entries only', () => {
  let journal = { entries: [] };

  journal = recordMistake(journal, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q1',
    moduleId: 'M01',
    prompt: 'Alpha question',
    learnerAnswer: 'b',
    correctAnswer: 'a',
    conceptIds: ['alpha'],
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  journal = recordMistake(journal, {
    sourceType: 'card',
    sourceId: 'C01',
    itemId: 'C01',
    moduleId: 'M01',
    prompt: 'Card front',
    learnerAnswer: 'wrong',
    correctAnswer: 'right',
    conceptIds: ['beta'],
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  journal = resolveMistakesForItem(journal, { sourceType: 'quiz', sourceId: 'M01', itemId: 'Q1' }, '2026-01-04T00:00:00.000Z');

  assert.equal(journal.entries[0].status, 'resolved');
  assert.equal(journal.entries[1].status, 'open');

  const summary = summarizeMistakeJournal(journal, '2026-01-05T00:00:00.000Z');
  assert.equal(summary.openCount, 1);
});