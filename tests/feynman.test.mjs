#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { saveFeynmanEntry, getFeynmanEntry, hasFeynmanEntry, getFeynmanEntries } from '../app/modules/feynman.js';

test('saveFeynmanEntry creates a new entry', () => {
  const store = saveFeynmanEntry({}, { slug: 'my-course', lessonId: 'L01', text: 'test explanation' });
  const entry = getFeynmanEntry(store, { slug: 'my-course', lessonId: 'L01' });
  assert.equal(entry.text, 'test explanation');
  assert.equal(entry.lessonId, 'L01');
  assert.equal(entry.slug, 'my-course');
  assert.ok(entry.savedAt);
});

test('getFeynmanEntry returns null for missing entry', () => {
  assert.equal(getFeynmanEntry({}, { slug: 'my-course', lessonId: 'L01' }), null);
});

test('getFeynmanEntry returns null for missing slug', () => {
  const store = saveFeynmanEntry({}, { slug: 'other', lessonId: 'L01', text: 'hi' });
  assert.equal(getFeynmanEntry(store, { slug: 'my-course', lessonId: 'L01' }), null);
});

test('hasFeynmanEntry returns false for whitespace-only text', () => {
  const store = saveFeynmanEntry({}, { slug: 'my-course', lessonId: 'L01', text: '   \n  ' });
  assert.equal(hasFeynmanEntry(store, { slug: 'my-course', lessonId: 'L01' }), false);
});

test('hasFeynmanEntry returns true after saving non-empty text', () => {
  const store = saveFeynmanEntry({}, { slug: 'my-course', lessonId: 'L01', text: 'my explanation' });
  assert.equal(hasFeynmanEntry(store, { slug: 'my-course', lessonId: 'L01' }), true);
});

test('saving again for same lesson overwrites previous entry', () => {
  let store = saveFeynmanEntry({}, { slug: 'my-course', lessonId: 'L01', text: 'first draft' });
  store = saveFeynmanEntry(store, { slug: 'my-course', lessonId: 'L01', text: 'revised explanation' });
  const entry = getFeynmanEntry(store, { slug: 'my-course', lessonId: 'L01' });
  assert.equal(entry.text, 'revised explanation');
  assert.equal(getFeynmanEntries(store, 'my-course').length, 1);
});

test('getFeynmanEntries returns all entries for a slug only', () => {
  let store = {};
  store = saveFeynmanEntry(store, { slug: 'my-course', lessonId: 'L01', text: 'explanation 1' });
  store = saveFeynmanEntry(store, { slug: 'my-course', lessonId: 'L02', text: 'explanation 2' });
  store = saveFeynmanEntry(store, { slug: 'other-course', lessonId: 'L01', text: 'other' });
  const entries = getFeynmanEntries(store, 'my-course');
  assert.equal(entries.length, 2);
});

test('getFeynmanEntries returns empty array for unknown slug', () => {
  assert.deepEqual(getFeynmanEntries({}, 'no-such-course'), []);
});
