#!/usr/bin/env node

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage shim ─────────────────────────────────────────────────────────
// Node has no localStorage; provide a minimal synchronous Map-backed shim
// before importing the module under test.

const store = new Map();

globalThis.localStorage = {
  getItem:    key       => store.has(key) ? store.get(key) : null,
  setItem:    (key, v)  => store.set(key, v),
  removeItem: key       => store.delete(key),
  clear:      ()        => store.clear(),
  get length()          { return store.size; },
  key:        i         => [...store.keys()][i] ?? null,
};

import { saveNote, loadNote, getAllNotes, getNoteCount } from '../app/modules/notes.js';

// Helper: reset storage before every test
function clearStore() { store.clear(); }

// ── saveNote / loadNote ───────────────────────────────────────────────────────

test('loadNote returns empty string when no note exists', () => {
  clearStore();
  assert.equal(loadNote('my-course', 'L01'), '');
});

test('saveNote persists text and loadNote retrieves it', () => {
  clearStore();
  saveNote('my-course', 'L01', 'This is my note.');
  assert.equal(loadNote('my-course', 'L01'), 'This is my note.');
});

test('saveNote overwrites previous text', () => {
  clearStore();
  saveNote('my-course', 'L01', 'First version.');
  saveNote('my-course', 'L01', 'Updated version.');
  assert.equal(loadNote('my-course', 'L01'), 'Updated version.');
});

test('saveNote with empty/whitespace-only text removes the note', () => {
  clearStore();
  saveNote('my-course', 'L01', 'Some note');
  saveNote('my-course', 'L01', '   ');
  assert.equal(loadNote('my-course', 'L01'), '');
});

// ── getNoteCount ──────────────────────────────────────────────────────────────

test('getNoteCount returns 0 when no notes saved', () => {
  clearStore();
  assert.equal(getNoteCount('my-course'), 0);
});

test('getNoteCount increments as notes are added', () => {
  clearStore();
  saveNote('my-course', 'L01', 'note 1');
  saveNote('my-course', 'L02', 'note 2');
  assert.equal(getNoteCount('my-course'), 2);
});

test('getNoteCount decrements when a note is deleted', () => {
  clearStore();
  saveNote('my-course', 'L01', 'note 1');
  saveNote('my-course', 'L02', 'note 2');
  saveNote('my-course', 'L01', ''); // delete
  assert.equal(getNoteCount('my-course'), 1);
});

// ── getAllNotes ───────────────────────────────────────────────────────────────

test('getAllNotes returns empty array when no notes exist', () => {
  clearStore();
  assert.deepEqual(getAllNotes('my-course'), []);
});

test('getAllNotes returns all saved notes with lessonId and text', () => {
  clearStore();
  saveNote('my-course', 'L01', 'Alpha');
  saveNote('my-course', 'L02', 'Beta');
  const notes = getAllNotes('my-course');
  assert.equal(notes.length, 2);
  const ids = notes.map(n => n.lessonId).sort();
  assert.deepEqual(ids, ['L01', 'L02']);
});

test('getAllNotes entries include savedAt ISO timestamp', () => {
  clearStore();
  const before = new Date().toISOString();
  saveNote('my-course', 'L01', 'A note');
  const after = new Date().toISOString();
  const [note] = getAllNotes('my-course');
  assert.ok(note.savedAt >= before, 'savedAt should be >= before');
  assert.ok(note.savedAt <= after,  'savedAt should be <= after');
});

test('getAllNotes does not include notes deleted by empty save', () => {
  clearStore();
  saveNote('my-course', 'L01', 'Keep this');
  saveNote('my-course', 'L02', 'Delete this');
  saveNote('my-course', 'L02', '');
  const notes = getAllNotes('my-course');
  assert.equal(notes.length, 1);
  assert.equal(notes[0].lessonId, 'L01');
});

// ── Slug isolation ────────────────────────────────────────────────────────────

test('notes are isolated by course slug', () => {
  clearStore();
  saveNote('course-a', 'L01', 'A note');
  saveNote('course-b', 'L01', 'B note');
  assert.equal(loadNote('course-a', 'L01'), 'A note');
  assert.equal(loadNote('course-b', 'L01'), 'B note');
  assert.equal(getNoteCount('course-a'), 1);
  assert.equal(getNoteCount('course-b'), 1);
  assert.equal(getAllNotes('course-a')[0].text, 'A note');
});
