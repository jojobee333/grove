#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage shim (same pattern as notes.test.mjs)
const store = new Map();
globalThis.localStorage = {
  getItem:    key      => store.has(key) ? store.get(key) : null,
  setItem:    (key, v) => store.set(key, v),
  removeItem: key      => store.delete(key),
  clear:      ()       => store.clear(),
  get length()         { return store.size; },
  key:        i        => [...store.keys()][i] ?? null,
};

import {
  saveNote,
  getAllNotes,
  groupNotesByModule,
  formatNotesAsMarkdown,
  formatNotesAsJson,
} from '../app/modules/notes.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COURSE = {
  title: 'Rust for Programmers',
  slug:  'rust-for-programmers',
  modules: [
    { id: 'M01', title: 'Foundations', lessons: [
      { id: 'L01', title: 'Hello, Rust' },
      { id: 'L02', title: 'Variables and Types' },
    ]},
    { id: 'M02', title: 'Ownership', lessons: [
      { id: 'L03', title: 'Ownership Rules' },
    ]},
    { id: 'M03', title: 'Unused Module', lessons: [] },
  ],
};

function seedNotes() {
  store.clear();
  saveNote('rust-for-programmers', 'L01', 'First lesson note.');
  saveNote('rust-for-programmers', 'L03', 'Ownership note.');
}

// ── groupNotesByModule ────────────────────────────────────────────────────────

test('groupNotesByModule preserves course module order', () => {
  seedNotes();
  const groups = groupNotesByModule(COURSE, getAllNotes('rust-for-programmers'));
  assert.deepEqual(groups.map(g => g.moduleId), ['M01', 'M02']);
});

test('groupNotesByModule excludes modules with no notes', () => {
  seedNotes();
  const groups = groupNotesByModule(COURSE, getAllNotes('rust-for-programmers'));
  assert.ok(!groups.find(g => g.moduleId === 'M03'), 'M03 should be absent');
});

test('groupNotesByModule resolves lesson titles', () => {
  seedNotes();
  const groups = groupNotesByModule(COURSE, getAllNotes('rust-for-programmers'));
  const m01 = groups.find(g => g.moduleId === 'M01');
  assert.equal(m01.notes[0].lessonTitle, 'Hello, Rust');
});

test('groupNotesByModule falls back to lessonId for unknown lessons', () => {
  store.clear();
  saveNote('rust-for-programmers', 'UNKNOWN-L99', 'Orphan note');
  const groups = groupNotesByModule(COURSE, getAllNotes('rust-for-programmers'));
  const unknown = groups.find(g => g.moduleId === '__unknown__');
  assert.ok(unknown, '__unknown__ group should exist');
  assert.equal(unknown.notes[0].lessonTitle, 'UNKNOWN-L99');
});

// ── formatNotesAsMarkdown ─────────────────────────────────────────────────────

test('formatNotesAsMarkdown starts with an H1 containing the course title', () => {
  seedNotes();
  const groups = groupNotesByModule(COURSE, getAllNotes('rust-for-programmers'));
  const md = formatNotesAsMarkdown('Rust for Programmers', 'rust-for-programmers', groups, '1 Jan 2026');
  assert.ok(md.startsWith('# Rust for Programmers — Notes'), `Got: ${md.slice(0, 60)}`);
});

test('formatNotesAsMarkdown includes the export date label', () => {
  seedNotes();
  const groups = groupNotesByModule(COURSE, getAllNotes('rust-for-programmers'));
  const md = formatNotesAsMarkdown('Rust for Programmers', 'rust-for-programmers', groups, '1 Jan 2026');
  assert.ok(md.includes('_Exported 1 Jan 2026_'));
});

test('formatNotesAsMarkdown has H2 for each module and H3 for each lesson', () => {
  seedNotes();
  const groups = groupNotesByModule(COURSE, getAllNotes('rust-for-programmers'));
  const md = formatNotesAsMarkdown('Rust for Programmers', 'rust-for-programmers', groups, '1 Jan 2026');
  assert.ok(md.includes('## Foundations'));
  assert.ok(md.includes('## Ownership'));
  assert.ok(md.includes('### Hello, Rust'));
  assert.ok(md.includes('### Ownership Rules'));
});

test('formatNotesAsMarkdown includes note text', () => {
  seedNotes();
  const groups = groupNotesByModule(COURSE, getAllNotes('rust-for-programmers'));
  const md = formatNotesAsMarkdown('Rust for Programmers', 'rust-for-programmers', groups, '1 Jan 2026');
  assert.ok(md.includes('First lesson note.'));
  assert.ok(md.includes('Ownership note.'));
});

// ── formatNotesAsJson ─────────────────────────────────────────────────────────

test('formatNotesAsJson produces valid JSON', () => {
  seedNotes();
  const allNotes = getAllNotes('rust-for-programmers');
  const groups = groupNotesByModule(COURSE, allNotes);
  const json = formatNotesAsJson('rust-for-programmers', allNotes, groups, '2026-01-01T00:00:00.000Z');
  assert.doesNotThrow(() => JSON.parse(json));
});

test('formatNotesAsJson top-level keys are course, exportedAt, notes', () => {
  seedNotes();
  const allNotes = getAllNotes('rust-for-programmers');
  const groups = groupNotesByModule(COURSE, allNotes);
  const parsed = JSON.parse(formatNotesAsJson('rust-for-programmers', allNotes, groups, '2026-01-01T00:00:00.000Z'));
  assert.equal(parsed.course, 'rust-for-programmers');
  assert.equal(parsed.exportedAt, '2026-01-01T00:00:00.000Z');
  assert.ok(Array.isArray(parsed.notes));
});

test('formatNotesAsJson each note entry has required fields', () => {
  seedNotes();
  const allNotes = getAllNotes('rust-for-programmers');
  const groups = groupNotesByModule(COURSE, allNotes);
  const parsed = JSON.parse(formatNotesAsJson('rust-for-programmers', allNotes, groups, '2026-01-01T00:00:00.000Z'));
  parsed.notes.forEach(n => {
    assert.ok('lessonId'    in n, 'missing lessonId');
    assert.ok('lessonTitle' in n, 'missing lessonTitle');
    assert.ok('moduleId'    in n, 'missing moduleId');
    assert.ok('moduleTitle' in n, 'missing moduleTitle');
    assert.ok('text'        in n, 'missing text');
    assert.ok('savedAt'     in n, 'missing savedAt');
  });
});

test('formatNotesAsJson resolves lesson and module titles correctly', () => {
  seedNotes();
  const allNotes = getAllNotes('rust-for-programmers');
  const groups = groupNotesByModule(COURSE, allNotes);
  const parsed = JSON.parse(formatNotesAsJson('rust-for-programmers', allNotes, groups, '2026-01-01T00:00:00.000Z'));
  const l01 = parsed.notes.find(n => n.lessonId === 'L01');
  assert.equal(l01.lessonTitle, 'Hello, Rust');
  assert.equal(l01.moduleId,    'M01');
  assert.equal(l01.moduleTitle, 'Foundations');
});

test('formatNotesAsJson note count matches saved notes', () => {
  seedNotes();
  const allNotes = getAllNotes('rust-for-programmers');
  const groups = groupNotesByModule(COURSE, allNotes);
  const parsed = JSON.parse(formatNotesAsJson('rust-for-programmers', allNotes, groups, '2026-01-01T00:00:00.000Z'));
  assert.equal(parsed.notes.length, 2);
});
