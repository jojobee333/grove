#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  flattenPracticalApplications,
  getPracticalApplicationsForModule,
  summarizePracticalApplications,
} from '../app/modules/practical-applications.js';

const COURSE = {
  modules: [
    { id: 'M01', title: 'Foundations' },
    { id: 'M02', title: 'Practice' },
    { id: 'M03', title: 'Unused' },
  ],
};

const PRACTICAL_APPLICATIONS = {
  M01: {
    module_id: 'M01',
    title: 'Practical applications — Foundations',
    applications: [
      { id: 'APP-M01-01', title: 'Build a tiny tool' },
    ],
  },
  M02: {
    module_id: 'M02',
    title: 'Practical applications — Practice',
    applications: [
      { id: 'APP-M02-01', title: 'Ship an internal script' },
      { id: 'APP-M02-02', title: 'Refactor a workflow' },
    ],
  },
};

test('getPracticalApplicationsForModule returns module applications', () => {
  assert.equal(getPracticalApplicationsForModule(PRACTICAL_APPLICATIONS, 'M01').length, 1);
  assert.equal(getPracticalApplicationsForModule(PRACTICAL_APPLICATIONS, 'M03').length, 0);
});

test('summarizePracticalApplications preserves module order from course', () => {
  const summaries = summarizePracticalApplications(COURSE, PRACTICAL_APPLICATIONS);
  assert.deepEqual(summaries.map(summary => summary.moduleId), ['M01', 'M02']);
  assert.deepEqual(summaries.map(summary => summary.count), [1, 2]);
});

test('flattenPracticalApplications returns application rows with module metadata', () => {
  const rows = flattenPracticalApplications(COURSE, PRACTICAL_APPLICATIONS);
  assert.equal(rows.length, 3);
  assert.equal(rows[1].moduleId, 'M02');
  assert.equal(rows[1].moduleTitle, 'Practice');
});