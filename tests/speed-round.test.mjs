#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { selectSpeedRoundCards, recordSprintResult, computeSprintStats } from '../app/modules/speed-round.js';

const makeCard = (id, concepts = []) => ({
  id,
  concepts,
  sr: { ease: 2.5, interval: 0, reviews: 0, lapses: 0, next_review: null },
});

test('selectSpeedRoundCards returns at most count cards', () => {
  const cards = Array.from({ length: 20 }, (_, i) => makeCard(`C${i}`));
  const result = selectSpeedRoundCards(cards, {}, [], { count: 5 });
  assert.equal(result.length, 5);
});

test('selectSpeedRoundCards returns all cards when fewer than count', () => {
  const cards = [makeCard('C1'), makeCard('C2')];
  const result = selectSpeedRoundCards(cards, {}, [], { count: 10 });
  assert.equal(result.length, 2);
});

test('selectSpeedRoundCards returns empty array for empty input', () => {
  const result = selectSpeedRoundCards([], {}, []);
  assert.deepEqual(result, []);
});

test('weak-concept cards are sorted to the front', () => {
  const regular = makeCard('regular', ['other']);
  const weak = makeCard('weak', ['alpha']);
  const result = selectSpeedRoundCards([regular, weak], {}, ['alpha'], { count: 2 });
  assert.equal(result[0].id, 'weak');
});

test('due cards rank higher than non-due cards without weak concepts', () => {
  const notDue = makeCard('not-due', []);
  notDue.sr.next_review = '2099-01-01'; // not due
  const due = makeCard('due', []);
  due.sr.next_review = '2020-01-01'; // past due
  const result = selectSpeedRoundCards([notDue, due], {}, [], { count: 2 });
  assert.equal(result[0].id, 'due');
});

test('recordSprintResult appends to sprint history', () => {
  const sprints = recordSprintResult([], {
    cards: [{ cardId: 'C1', correct: true, timeMs: 1000 }],
    completedAt: '2026-04-22T10:00:00.000Z',
  });
  assert.equal(sprints.length, 1);
  assert.equal(sprints[0].cards.length, 1);
});

test('computeSprintStats returns zeroes for empty sprint history', () => {
  const stats = computeSprintStats([]);
  assert.equal(stats.correct, 0);
  assert.equal(stats.total, 0);
  assert.equal(stats.avgTimeMs, 0);
  assert.equal(stats.improvement, null);
});

test('computeSprintStats calculates correct count and avgTimeMs', () => {
  const sprints = recordSprintResult([], {
    cards: [
      { cardId: 'C1', correct: true,  timeMs: 1000 },
      { cardId: 'C2', correct: false, timeMs: 2000 },
      { cardId: 'C3', correct: true,  timeMs: 3000 },
    ],
    completedAt: new Date().toISOString(),
  });
  const stats = computeSprintStats(sprints);
  assert.equal(stats.correct, 2);
  assert.equal(stats.total, 3);
  assert.equal(stats.avgTimeMs, 2000);
  assert.equal(stats.improvement, null); // only one sprint, no comparison possible
});

test('computeSprintStats tracks improvement vs previous sprint on shared cards', () => {
  let sprints = recordSprintResult([], {
    cards: [
      { cardId: 'C1', correct: false, timeMs: 2000 },
      { cardId: 'C2', correct: false, timeMs: 1500 },
    ],
    completedAt: new Date().toISOString(),
  });
  sprints = recordSprintResult(sprints, {
    cards: [
      { cardId: 'C1', correct: true, timeMs: 1000 },
      { cardId: 'C2', correct: true, timeMs: 800 },
    ],
    completedAt: new Date().toISOString(),
  });
  const stats = computeSprintStats(sprints);
  assert.equal(stats.improvement, 2); // 2 more correct than before
});

test('computeSprintStats improvement is null when no shared cards', () => {
  let sprints = recordSprintResult([], {
    cards: [{ cardId: 'C1', correct: false, timeMs: 2000 }],
    completedAt: new Date().toISOString(),
  });
  sprints = recordSprintResult(sprints, {
    cards: [{ cardId: 'C2', correct: true, timeMs: 800 }],
    completedAt: new Date().toISOString(),
  });
  const stats = computeSprintStats(sprints);
  assert.equal(stats.improvement, null);
});
