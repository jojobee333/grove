#!/usr/bin/env node
/**
 * Grove Keyboard Shortcut Tests
 * Tests mapKeyToCardAction() — pure function mapping keydown key + view state
 * to a card action string.  No DOM required.
 *
 * Run:  node tests/keyboard.test.mjs
 */

import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { mapKeyToCardAction } from '../app/modules/keyboard.js';

const UNFLIPPED = { view: 'cards', flipped: false };
const FLIPPED   = { view: 'cards', flipped: true  };
const OTHER     = { view: 'plan',  flipped: false  };

// ── Non-card views ────────────────────────────────────────────────────────────

test('Space in non-card view returns null', () => {
  assert.equal(mapKeyToCardAction(' ', OTHER), null);
});

test('1 in non-card view returns null', () => {
  assert.equal(mapKeyToCardAction('1', OTHER), null);
});

test('2 in non-card view returns null', () => {
  assert.equal(mapKeyToCardAction('2', OTHER), null);
});

test('3 in non-card view returns null', () => {
  assert.equal(mapKeyToCardAction('3', OTHER), null);
});

// ── Card view, card NOT yet flipped ──────────────────────────────────────────

test('Space flips unflipped card', () => {
  assert.equal(mapKeyToCardAction(' ', UNFLIPPED), 'flip');
});

test('1 on unflipped card returns null (must flip first)', () => {
  assert.equal(mapKeyToCardAction('1', UNFLIPPED), null);
});

test('2 on unflipped card returns null', () => {
  assert.equal(mapKeyToCardAction('2', UNFLIPPED), null);
});

test('3 on unflipped card returns null', () => {
  assert.equal(mapKeyToCardAction('3', UNFLIPPED), null);
});

// ── Card view, card flipped ───────────────────────────────────────────────────

test('1 on flipped card returns rate-hard', () => {
  assert.equal(mapKeyToCardAction('1', FLIPPED), 'rate-hard');
});

test('2 on flipped card returns rate-okay', () => {
  assert.equal(mapKeyToCardAction('2', FLIPPED), 'rate-okay');
});

test('3 on flipped card returns rate-easy', () => {
  assert.equal(mapKeyToCardAction('3', FLIPPED), 'rate-easy');
});

test('Space on flipped card returns null (already flipped)', () => {
  assert.equal(mapKeyToCardAction(' ', FLIPPED), null);
});

// ── Unrecognised keys ─────────────────────────────────────────────────────────

test('Unrecognised key in card view returns null', () => {
  assert.equal(mapKeyToCardAction('x', FLIPPED), null);
  assert.equal(mapKeyToCardAction('Enter', UNFLIPPED), null);
  assert.equal(mapKeyToCardAction('ArrowLeft', FLIPPED), null);
});
