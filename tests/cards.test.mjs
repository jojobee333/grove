#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildCardModuleSummaries, getReachedModuleIds, getReviewableCards } from '../app/modules/cards.js';

const COURSE = {
  modules: [
    {
      id: 'M01',
      title: 'Module One',
      lessons: [
        { id: 'L01', prerequisites: [], unlock_rule: 'all_prerequisites_mastered' },
        { id: 'L02', prerequisites: ['L01'], unlock_rule: 'all_prerequisites_mastered' },
      ],
    },
    {
      id: 'M02',
      title: 'Module Two',
      lessons: [
        { id: 'L03', prerequisites: ['L02'], unlock_rule: 'all_prerequisites_mastered' },
      ],
    },
    {
      id: 'M03',
      title: 'Module Three',
      lessons: [
        { id: 'L04', prerequisites: ['L03'], unlock_rule: 'all_prerequisites_mastered' },
      ],
    },
  ],
};

const CARDS = [
  { id: 'C01', module: 'M01', sr: { next_review: null, reviews: 0 } },
  { id: 'C02', module: 'M02', sr: { next_review: null, reviews: 0 } },
  { id: 'C03', module: 'M03', sr: { next_review: null, reviews: 0 } },
];

test('fresh course: only first module is reviewable', () => {
  const progress = { lessons: {}, cards: {} };
  const reached = getReachedModuleIds(COURSE, progress);

  assert.deepEqual([...reached], ['M01']);
  assert.deepEqual(
    getReviewableCards({ course: COURSE, cards: CARDS, progress }).map(card => card.id),
    ['C01']
  );
});

test('after completing first module, previous and current module decks are reviewable', () => {
  const progress = { lessons: { L01: {}, L02: {} }, cards: {} };
  const reached = getReachedModuleIds(COURSE, progress);

  assert.deepEqual([...reached], ['M01', 'M02']);
  assert.deepEqual(
    getReviewableCards({ course: COURSE, cards: CARDS, progress }).map(card => card.id),
    ['C01', 'C02']
  );
});

test('module summaries mark future modules locked and current frontier available', () => {
  const progress = { lessons: { L01: {} }, cards: { C01: { reviews: 2, next_review: '2099-01-01' } } };
  const summaries = buildCardModuleSummaries({ course: COURSE, cards: CARDS, progress });

  assert.equal(summaries[0].status, 'in-progress');
  assert.equal(summaries[0].reviewedCount, 1);
  assert.equal(summaries[1].status, 'locked');
  assert.equal(summaries[2].status, 'locked');
});