#!/usr/bin/env node
/**
 * Grove SM-2 Spaced Repetition Tests
 * Tests sm2Step() — interval scheduling, ease adjustment, lapses, immutability.
 *
 * Run:  node tests/sm2.test.mjs
 */

import { test }  from 'node:test';
import assert    from 'node:assert/strict';

import { sm2Step } from '../app/modules/sm2.js';

const FRESH = { ease: 2.5, interval: 0, reviews: 0, lapses: 0, next_review: null };

// ── First review ──────────────────────────────────────────────────────────────

test('first review quality=5: interval becomes 1', () => {
  const result = sm2Step(FRESH, 5);
  assert.equal(result.interval, 1);
  assert.equal(result.reviews, 1);
});

test('first review quality=3: interval becomes 1', () => {
  const result = sm2Step(FRESH, 3);
  assert.equal(result.interval, 1);
});

// ── Second review ─────────────────────────────────────────────────────────────

test('second review quality=5: interval becomes 6', () => {
  const after1 = sm2Step(FRESH, 5);            // reviews=0 → interval=1
  const after2 = sm2Step(after1, 5);           // reviews=1 → interval=6
  assert.equal(after2.interval, 6);
  assert.equal(after2.reviews, 2);
});

// ── Third review (interval grows by ease factor) ─────────────────────────────

test('third review quality=5: interval = round(prev * ease)', () => {
  const s1 = sm2Step(FRESH, 5);
  const s2 = sm2Step(s1, 5);
  const s3 = sm2Step(s2, 5);
  assert.equal(s3.interval, Math.round(s2.interval * s2.ease));
});

// ── Ease adjustment ───────────────────────────────────────────────────────────

test('quality=5 increases ease', () => {
  const result = sm2Step(FRESH, 5);
  assert.ok(result.ease > FRESH.ease, 'ease should increase for quality=5');
});

test('quality=3 decreases ease slightly', () => {
  const result = sm2Step(FRESH, 3);
  assert.ok(result.ease < FRESH.ease, 'ease should decrease for quality=3');
});

test('ease never falls below 1.3', () => {
  // Apply many quality=1 lapses
  let sr = { ...FRESH };
  for (let i = 0; i < 20; i++) sr = sm2Step(sr, 1);
  assert.ok(sr.ease >= 1.3);
});

// ── Lapses (quality < 3) ──────────────────────────────────────────────────────

test('quality=1: interval resets to 1', () => {
  const s1 = sm2Step(FRESH, 5);
  const s2 = sm2Step(s1, 5);     // interval=6
  const s3 = sm2Step(s2, 1);     // LAPSE
  assert.equal(s3.interval, 1);
});

test('quality=1: lapses counter increments', () => {
  const result = sm2Step(FRESH, 1);
  assert.equal(result.lapses, 1);
});

test('quality=2: also a lapse (< 3)', () => {
  const result = sm2Step(FRESH, 2);
  assert.equal(result.interval, 1);
  assert.equal(result.lapses, 1);
});

// ── next_review is a date string ──────────────────────────────────────────────

test('next_review is set to a YYYY-MM-DD date string', () => {
  const result = sm2Step(FRESH, 5);
  assert.match(result.next_review, /^\d{4}-\d{2}-\d{2}$/);
});

test('next_review is tomorrow for interval=1', () => {
  const result = sm2Step(FRESH, 5);  // first review → interval=1
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  assert.equal(result.next_review, tomorrow.toISOString().split('T')[0]);
});

// ── Immutability ──────────────────────────────────────────────────────────────

test('input SR state is not mutated', () => {
  const original = { ...FRESH };
  sm2Step(FRESH, 5);
  assert.deepEqual(FRESH, original, 'FRESH must not be mutated');
});

test('returned object is a new reference', () => {
  const result = sm2Step(FRESH, 5);
  assert.notEqual(result, FRESH);
});
