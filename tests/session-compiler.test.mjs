#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compileSessionPlan } from '../app/modules/session-compiler.js';

test('builds a mixed session inside the learner time cap', () => {
  const plan = compileSessionPlan({
    learner: { session_time_min: 20 },
    nextLessons: [
      { id: 'L02', title: 'Lesson Two', estimated_minutes: 10, moduleId: 'M01', moduleTitle: 'Module One' },
    ],
    reviewQueue: [{ id: 'C01' }, { id: 'C02' }, { id: 'C03' }, { id: 'C04' }],
    weakConcepts: [{ id: 'alpha', title: 'Alpha', mastery: 0.4 }],
    unlockedModchecks: [],
    dueMistakes: [{ id: 'mistake-1', conceptIds: ['alpha'] }],
  });

  assert.equal(plan.budgetMinutes, 20);
  assert.equal(plan.totalMinutes, 20);
  assert.deepEqual(plan.blocks.map(block => block.type), ['mistake-review', 'lesson', 'card-review']);
});

test('uses a module check when no lesson is available', () => {
  const plan = compileSessionPlan({
    learner: { session_time_min: 15 },
    nextLessons: [],
    reviewQueue: [],
    weakConcepts: [],
    unlockedModchecks: [
      { moduleId: 'M02', moduleTitle: 'Module Two', modcheck: { questions: [{}, {}, {}] } },
    ],
    dueMistakes: [],
  });

  assert.equal(plan.blocks.length, 1);
  assert.equal(plan.blocks[0].type, 'modcheck');
  assert.equal(plan.blocks[0].minutes, 6);
});