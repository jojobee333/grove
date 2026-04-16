#!/usr/bin/env node
/**
 * Grove Planner Tests
 * Tests the computeNextSteps() planner logic with fixture data.
 *
 * Run:
 *   node tests/planner.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeNextSteps } from '../app/modules/planner.js';

// ── Fixture data ─────────────────────────────────────────────────────────────

const CONCEPTS = {
  concepts: [
    { id: 'alpha', title: 'Alpha', introduced_in: ['L01'], reinforced_in: [], depends_on: [] },
    { id: 'beta',  title: 'Beta',  introduced_in: ['L02'], reinforced_in: [], depends_on: ['alpha'] },
    { id: 'gamma', title: 'Gamma', introduced_in: ['L03'], reinforced_in: [], depends_on: ['beta'] },
  ]
};

const LEARNING_PATHS = {
  paths: [
    { id: 'fast-track', title: 'Fast Track', description: 'Core only', lessons: ['L01', 'L03'] }
  ]
};

const COURSE = {
  slug: 'test-course',
  modules: [
    {
      id: 'M01', title: 'Module One', objectives: [],
      lessons: [
        { id: 'L01', title: 'Lesson One',   type: 'core', estimated_minutes: 10, description: '',
          prerequisites: [], teaches_concepts: ['alpha'], reinforces_concepts: [],
          mastery_threshold: 0.75, difficulty: 1, unlock_rule: 'all_prerequisites_mastered', review_after_days: [1] },
        { id: 'L02', title: 'Lesson Two',   type: 'core', estimated_minutes: 10, description: '',
          prerequisites: ['L01'], teaches_concepts: ['beta'], reinforces_concepts: [],
          mastery_threshold: 0.75, difficulty: 2, unlock_rule: 'all_prerequisites_mastered', review_after_days: [1] },
      ]
    },
    {
      id: 'M02', title: 'Module Two', objectives: [],
      lessons: [
        { id: 'L03', title: 'Milestone', type: 'core', estimated_minutes: 10, description: '',
          prerequisites: ['L02'], teaches_concepts: ['gamma'], reinforces_concepts: [],
          mastery_threshold: 0.80, difficulty: 3, unlock_rule: 'all_prerequisites_mastered', review_after_days: [1] },
      ]
    }
  ],
  learning_plan: {
    milestone_lessons: ['L03'],
    suggested_schedule: 'Self-paced'
  }
};

const CARDS = [
  { id: 'C01', front: 'Q1', back: 'A1', module: 'M01', lesson: 'L01', type: 'definition',
    concepts: ['alpha'], cognitive_level: 'recall', weight: 0.5, reviewable: true,
    sr: { ease: 2.5, interval: 0, reviews: 0, lapses: 0, next_review: null } },
  { id: 'C02', front: 'Q2', back: 'A2', module: 'M02', lesson: 'L03', type: 'definition',
    concepts: ['gamma'], cognitive_level: 'recall', weight: 0.5, reviewable: true,
    sr: { ease: 2.5, interval: 0, reviews: 0, lapses: 0, next_review: null } },
];

const EMPTY_PROGRESS = { lessons: {}, cards: {}, quizzes: {}, conceptMastery: {} };

// ── Tests ─────────────────────────────────────────────────────────────────────

test('fresh start: only L01 (no prereqs) is next', () => {
  const { nextLessons } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS, progress: EMPTY_PROGRESS
  });
  assert.deepEqual(nextLessons.map(l => l.id), ['L01']);
});

test('after L01 done: L02 unlocks, L01 gone', () => {
  const { nextLessons } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: { ...EMPTY_PROGRESS, lessons: { L01: { date: '2026-01-01' } } }
  });
  assert.ok(nextLessons.some(l => l.id === 'L02'));
  assert.ok(!nextLessons.some(l => l.id === 'L01'));
});

test('milestone L03: blocked when mastery < threshold after L01+L02 done', () => {
  const { nextLessons, blockedByMastery } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: {
      ...EMPTY_PROGRESS,
      lessons: { L01: { date: '2026-01-01' }, L02: { date: '2026-01-02' } },
      conceptMastery: { alpha: 0.3, beta: 0.4 } // below 0.80 threshold
    }
  });
  assert.ok(!nextLessons.some(l => l.id === 'L03'), 'L03 should be blocked');
  assert.ok(blockedByMastery.some(l => l.id === 'L03'), 'L03 should be in blockedByMastery');
  const gate = blockedByMastery.find(l => l.id === 'L03');
  assert.equal(gate.threshold, 0.80);
  assert.ok(gate.avgMastery < 0.80);
});

test('milestone L03: unlocked when mastery >= threshold', () => {
  const { nextLessons, blockedByMastery } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: {
      ...EMPTY_PROGRESS,
      lessons: { L01: { date: '2026-01-01' }, L02: { date: '2026-01-02' } },
      conceptMastery: { alpha: 0.85, beta: 0.90 } // above 0.80 threshold
    }
  });
  assert.ok(nextLessons.some(l => l.id === 'L03'), 'L03 should be unlocked');
  assert.equal(blockedByMastery.length, 0);
});

test('milestone gate skipped when no concepts have been introduced (no prereqs completed)', () => {
  // L03 is a milestone but if no prior lessons done, introducedConcepts is empty → gate skips
  // In this fixture, L03 requires L02 which requires L01, so L03 never passes prereq check here.
  // Test the gate-skip separately by checking L03 only when prereqs met but with empty introduced:
  const courseNoPrereqs = structuredClone(COURSE);
  courseNoPrereqs.modules[1].lessons[0].prerequisites = []; // remove prereq from L03
  const { nextLessons, blockedByMastery } = computeNextSteps({
    course: courseNoPrereqs, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: EMPTY_PROGRESS // no completed lessons → introducedConcepts is empty
  });
  // Gate skips because introducedConcepts.size === 0
  assert.ok(nextLessons.some(l => l.id === 'L03'), 'L03 should pass when no introduced concepts to gate on');
  assert.equal(blockedByMastery.length, 0);
});

test('path filter: fast-track hides L02', () => {
  const { nextLessons } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: {
      ...EMPTY_PROGRESS,
      lessons: { L01: { date: '2026-01-01' } },
      selectedPath: 'fast-track' // fast-track only has L01+L03
    }
  });
  // L02 not in fast-track → hidden; L03 requires L02 (not done) so still locked
  assert.ok(!nextLessons.some(l => l.id === 'L02'), 'L02 should be filtered by path');
});

test('weak concepts: introduced concept below 0.6 appears in list', () => {
  const { weakConcepts } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: {
      ...EMPTY_PROGRESS,
      lessons: { L01: { date: '2026-01-01' } },
      conceptMastery: { alpha: 0.4 }
    }
  });
  assert.ok(weakConcepts.some(c => c.id === 'alpha'), 'alpha should be weak');
  assert.ok(!weakConcepts.some(c => c.id === 'beta'), 'beta not yet introduced');
});

test('weak concepts: introduced concept above 0.6 excluded', () => {
  const { weakConcepts } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: {
      ...EMPTY_PROGRESS,
      lessons: { L01: { date: '2026-01-01' } },
      conceptMastery: { alpha: 0.8 }
    }
  });
  assert.ok(!weakConcepts.some(c => c.id === 'alpha'), 'alpha should not be weak at 0.8');
});

test('review queue: card with past next_review is due', () => {
  const pastDate = '2000-01-01';
  const progressWithCard = {
    ...EMPTY_PROGRESS,
    cards: {
      C01: { ease: 2.5, interval: 7, reviews: 1, lapses: 0, next_review: pastDate },
      C02: { ease: 2.5, interval: 7, reviews: 1, lapses: 0, next_review: pastDate }
    }
  };
  const { reviewQueue } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: progressWithCard
  });
  assert.ok(reviewQueue.some(c => c.id === 'C01'), 'C01 should be due');
  assert.ok(!reviewQueue.some(c => c.id === 'C02'), 'C02 should not be due before M02 is reached');
});

test('review queue: card with future next_review not due', () => {
  const futureDate = '2099-12-31';
  const progressWithCard = {
    ...EMPTY_PROGRESS,
    cards: { C01: { ease: 2.5, interval: 7, reviews: 1, lapses: 0, next_review: futureDate } }
  };
  const { reviewQueue } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: progressWithCard
  });
  assert.ok(!reviewQueue.some(c => c.id === 'C01'), 'C01 should not be due yet');
});

test('all lessons completed: nextLessons is empty', () => {
  const { nextLessons } = computeNextSteps({
    course: COURSE, cards: CARDS, concepts: CONCEPTS,
    adaptiveRules: {}, learningPaths: LEARNING_PATHS,
    progress: {
      ...EMPTY_PROGRESS,
      lessons: { L01: {}, L02: {}, L03: {} },
      conceptMastery: { alpha: 0.9, beta: 0.9, gamma: 0.9 }
    }
  });
  assert.equal(nextLessons.length, 0);
});
