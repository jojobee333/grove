import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveHighlight, removeHighlight, getHighlights } from '../app/modules/highlights.js';

test('getHighlights returns empty array for unknown lesson', () => {
  assert.deepEqual(getHighlights({}, { slug: 'test', lessonId: 'L01' }), []);
});

test('getHighlights returns empty array for unknown slug', () => {
  assert.deepEqual(getHighlights({}, { slug: 'nope', lessonId: 'L01' }), []);
});

test('saveHighlight adds entry with id, quote, color, savedAt', () => {
  const store = saveHighlight({}, { slug: 'test', lessonId: 'L01', quote: 'hello world', color: 'yellow' });
  const result = getHighlights(store, { slug: 'test', lessonId: 'L01' });
  assert.equal(result.length, 1);
  assert.equal(result[0].quote, 'hello world');
  assert.equal(result[0].color, 'yellow');
  assert.ok(result[0].id, 'id should be set');
  assert.ok(result[0].savedAt, 'savedAt should be set');
});

test('saveHighlight is immutable — original store unchanged', () => {
  const original = {};
  saveHighlight(original, { slug: 'test', lessonId: 'L01', quote: 'x', color: 'yellow' });
  assert.deepEqual(original, {});
});

test('saveHighlight appends multiple highlights for the same lesson', () => {
  let store = {};
  store = saveHighlight(store, { slug: 'test', lessonId: 'L01', quote: 'alpha', color: 'yellow' });
  store = saveHighlight(store, { slug: 'test', lessonId: 'L01', quote: 'beta', color: 'green' });
  const result = getHighlights(store, { slug: 'test', lessonId: 'L01' });
  assert.equal(result.length, 2);
  assert.equal(result[0].quote, 'alpha');
  assert.equal(result[1].quote, 'beta');
});

test('saveHighlight isolates different lessons within same slug', () => {
  let store = {};
  store = saveHighlight(store, { slug: 'test', lessonId: 'L01', quote: 'a', color: 'yellow' });
  assert.deepEqual(getHighlights(store, { slug: 'test', lessonId: 'L02' }), []);
});

test('saveHighlight isolates different slugs', () => {
  let store = {};
  store = saveHighlight(store, { slug: 'course-a', lessonId: 'L01', quote: 'a', color: 'yellow' });
  assert.deepEqual(getHighlights(store, { slug: 'course-b', lessonId: 'L01' }), []);
});

test('saveHighlight generates unique ids', () => {
  let store = {};
  store = saveHighlight(store, { slug: 's', lessonId: 'L01', quote: 'a', color: 'yellow' });
  store = saveHighlight(store, { slug: 's', lessonId: 'L01', quote: 'b', color: 'yellow' });
  const [h1, h2] = getHighlights(store, { slug: 's', lessonId: 'L01' });
  assert.notEqual(h1.id, h2.id);
});

test('removeHighlight removes entry by id', () => {
  let store = {};
  store = saveHighlight(store, { slug: 'test', lessonId: 'L01', quote: 'hello', color: 'yellow' });
  const id = getHighlights(store, { slug: 'test', lessonId: 'L01' })[0].id;
  store = removeHighlight(store, { slug: 'test', lessonId: 'L01', id });
  assert.deepEqual(getHighlights(store, { slug: 'test', lessonId: 'L01' }), []);
});

test('removeHighlight preserves other highlights', () => {
  let store = {};
  store = saveHighlight(store, { slug: 'test', lessonId: 'L01', quote: 'first', color: 'yellow' });
  store = saveHighlight(store, { slug: 'test', lessonId: 'L01', quote: 'second', color: 'green' });
  const [h1] = getHighlights(store, { slug: 'test', lessonId: 'L01' });
  store = removeHighlight(store, { slug: 'test', lessonId: 'L01', id: h1.id });
  const remaining = getHighlights(store, { slug: 'test', lessonId: 'L01' });
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].quote, 'second');
});

test('removeHighlight on non-existent id is a no-op', () => {
  let store = {};
  store = saveHighlight(store, { slug: 'test', lessonId: 'L01', quote: 'keep', color: 'pink' });
  const before = getHighlights(store, { slug: 'test', lessonId: 'L01' }).length;
  store = removeHighlight(store, { slug: 'test', lessonId: 'L01', id: 'ghost-id' });
  const after = getHighlights(store, { slug: 'test', lessonId: 'L01' }).length;
  assert.equal(after, before);
});
