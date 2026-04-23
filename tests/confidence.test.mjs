#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { recordConfidenceAttempt, summarizeConfidenceLog } from '../app/modules/confidence.js';

test('high-confidence miss counts as overconfidence', () => {
  const log = recordConfidenceAttempt({ entries: [] }, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q1',
    moduleId: 'M01',
    confidence: 'high',
    correct: false,
    conceptIds: ['alpha'],
    answeredAt: '2026-01-01T00:00:00.000Z',
  });

  const summary = summarizeConfidenceLog(log);

  assert.equal(log.entries.length, 1);
  assert.equal(summary.total, 1);
  assert.equal(summary.overconfidentCount, 1);
  assert.equal(summary.accuracy.high, 0);
});

test('accuracy is tracked by confidence band', () => {
  let log = { entries: [] };

  log = recordConfidenceAttempt(log, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q1',
    confidence: 'high',
    correct: true,
    answeredAt: '2026-01-01T00:00:00.000Z',
  });
  log = recordConfidenceAttempt(log, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q2',
    confidence: 'high',
    correct: false,
    answeredAt: '2026-01-01T00:01:00.000Z',
  });
  log = recordConfidenceAttempt(log, {
    sourceType: 'card',
    sourceId: 'C01',
    itemId: 'C01',
    confidence: 'low',
    correct: true,
    answeredAt: '2026-01-01T00:02:00.000Z',
  });

  const summary = summarizeConfidenceLog(log);

  assert.equal(summary.total, 3);
  assert.equal(summary.accuracy.high, 0.5);
  assert.equal(summary.accuracy.low, 1);
  assert.equal(summary.underconfidentCount, 1);
  assert.equal(summary.counts.high, 2);
  assert.equal(summary.counts.low, 1);
});

test('overconfident concepts are ranked by repeated misses', () => {
  let log = { entries: [] };

  log = recordConfidenceAttempt(log, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q1',
    confidence: 'high',
    correct: false,
    conceptIds: ['alpha'],
    answeredAt: '2026-01-01T00:00:00.000Z',
  });
  log = recordConfidenceAttempt(log, {
    sourceType: 'quiz',
    sourceId: 'M01',
    itemId: 'Q2',
    confidence: 'high',
    correct: false,
    conceptIds: ['alpha', 'beta'],
    answeredAt: '2026-01-01T00:01:00.000Z',
  });

  const summary = summarizeConfidenceLog(log);

  assert.deepEqual(summary.overconfidentConceptIds, ['alpha', 'beta']);
});