#!/usr/bin/env node
// Tests for app/modules/pomodoro.js
// All shims must be in place BEFORE the dynamic import so that loadState()
// (which runs at module top-level) sees a real localStorage.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage shim ─────────────────────────────────────────────────────────
const store = new Map();
globalThis.localStorage = {
  getItem:    k      => store.has(k) ? store.get(k) : null,
  setItem:    (k, v) => store.set(k, v),
  removeItem: k      => store.delete(k),
  clear:      ()     => store.clear(),
  get length()       { return store.size; },
};

// ── Browser environment shims ─────────────────────────────────────────────────
// window = globalThis so Notification/AudioContext references resolve
globalThis.window = globalThis;

// Notification: permission denied so notification branches are skipped
globalThis.Notification = { permission: 'denied', requestPermission: async () => 'denied' };

// AudioContext: undefined — new AudioContext() throws, silently caught by module
globalThis.AudioContext = undefined;

// DOM shim: provide a widget target element
const widgetEl = { innerHTML: '' };
globalThis.document = {
  getElementById: id => (id === 'pomodoro-widget' ? widgetEl : null),
};

// ── Fake setInterval / clearInterval ─────────────────────────────────────────
// Capture the tick callback so tests can fire ticks manually.
let _capturedTick = null;
let _timerId = 0;
globalThis.setInterval = fn => { _capturedTick = fn; return ++_timerId; };
globalThis.clearInterval = () => { _capturedTick = null; };

// ── Import module under test (dynamic so shims are already in place) ──────────
const {
  initPomodoro,
  pomodoroStart,
  pomodoroPause,
  pomodoroReset,
  pomodoroSetMode,
  pomodoroToggleCollapse,
} = await import('../app/modules/pomodoro.js');

// ── Helpers ───────────────────────────────────────────────────────────────────
const KEY = 'grove_pomodoro';
const getState = () => JSON.parse(store.get(KEY));

/** Simulate n timer ticks by calling the captured tick function n times. */
function advanceTicks(n) {
  for (let i = 0; i < n; i++) _capturedTick?.();
}

// ── Reset to known state before each test ────────────────────────────────────
// pomodoroSetMode() resets mode/status/remaining but NOT collapsed, so we
// normalise collapsed to false explicitly.
beforeEach(() => {
  pomodoroSetMode('focus'); // → idle, 1500s, focus
  if (getState().collapsed) pomodoroToggleCollapse(); // → collapsed = false
  _capturedTick = null;
  widgetEl.innerHTML = '';
});

// ── Preset values ─────────────────────────────────────────────────────────────

test('focus preset is 25 minutes (1500 s)', () => {
  pomodoroSetMode('focus');
  const s = getState();
  assert.equal(s.mode, 'focus');
  assert.equal(s.remaining, 1500);
});

test('short preset is 5 minutes (300 s)', () => {
  pomodoroSetMode('short');
  const s = getState();
  assert.equal(s.mode, 'short');
  assert.equal(s.remaining, 300);
});

test('long preset is 15 minutes (900 s)', () => {
  pomodoroSetMode('long');
  const s = getState();
  assert.equal(s.mode, 'long');
  assert.equal(s.remaining, 900);
});

// ── pomodoroSetMode ───────────────────────────────────────────────────────────

test('setMode resets status to idle', () => {
  pomodoroStart();
  assert.equal(getState().status, 'running');
  pomodoroSetMode('short');
  assert.equal(getState().status, 'idle');
});

test('setMode clears an active ticker', () => {
  pomodoroStart();
  assert.ok(_capturedTick !== null, 'ticker should be set after start');
  pomodoroSetMode('short');
  assert.equal(_capturedTick, null, 'ticker should be cleared after mode change');
});

test('setMode ignores unknown mode names', () => {
  const before = getState();
  pomodoroSetMode('turbo'); // not a valid mode
  const after = getState();
  assert.equal(after.mode, before.mode);
  assert.equal(after.remaining, before.remaining);
  assert.equal(after.status, before.status);
});

test('setMode persists state to localStorage', () => {
  store.delete(KEY);
  pomodoroSetMode('long');
  assert.ok(store.has(KEY), 'should write to localStorage');
  assert.equal(getState().mode, 'long');
});

// ── pomodoroStart ─────────────────────────────────────────────────────────────

test('pomodoroStart sets status to running', () => {
  pomodoroStart();
  assert.equal(getState().status, 'running');
});

test('pomodoroStart registers a tick callback', () => {
  assert.equal(_capturedTick, null);
  pomodoroStart();
  assert.ok(typeof _capturedTick === 'function', 'should register a tick function');
});

test('pomodoroStart persists running status', () => {
  pomodoroStart();
  assert.equal(getState().status, 'running');
});

// ── pomodoroPause ─────────────────────────────────────────────────────────────

test('pomodoroPause sets status to paused', () => {
  pomodoroStart();
  pomodoroPause();
  assert.equal(getState().status, 'paused');
});

test('pomodoroPause clears the ticker', () => {
  pomodoroStart();
  assert.ok(_capturedTick !== null, 'ticker should be active');
  pomodoroPause();
  assert.equal(_capturedTick, null, 'ticker should be cleared after pause');
});

test('pomodoroPause persists paused status', () => {
  pomodoroStart();
  pomodoroPause();
  assert.equal(getState().status, 'paused');
});

// ── pomodoroReset ─────────────────────────────────────────────────────────────

test('pomodoroReset restores remaining to full preset time', () => {
  pomodoroStart();
  advanceTicks(10);
  assert.equal(getState().remaining, 1490);
  pomodoroReset();
  assert.equal(getState().remaining, 1500);
});

test('pomodoroReset sets status to idle', () => {
  pomodoroStart();
  pomodoroReset();
  assert.equal(getState().status, 'idle');
});

test('pomodoroReset clears the ticker', () => {
  pomodoroStart();
  pomodoroReset();
  assert.equal(_capturedTick, null);
});

test('pomodoroReset persists the reset state', () => {
  pomodoroStart();
  pomodoroReset();
  const s = getState();
  assert.equal(s.status, 'idle');
  assert.equal(s.remaining, 1500);
});

// ── pomodoroToggleCollapse ────────────────────────────────────────────────────

test('pomodoroToggleCollapse sets collapsed to true', () => {
  assert.equal(getState().collapsed, false);
  pomodoroToggleCollapse();
  assert.equal(getState().collapsed, true);
});

test('pomodoroToggleCollapse double-toggle returns to false', () => {
  pomodoroToggleCollapse();
  pomodoroToggleCollapse();
  assert.equal(getState().collapsed, false);
});

test('pomodoroToggleCollapse persists collapsed state', () => {
  pomodoroToggleCollapse();
  assert.ok(store.has(KEY));
  assert.equal(getState().collapsed, true);
});

// ── Tick logic ────────────────────────────────────────────────────────────────

test('each tick decrements remaining by 1', () => {
  pomodoroStart();
  advanceTicks(5);
  assert.equal(getState().remaining, 1495);
});

test('tick keeps status running while remaining > 0', () => {
  pomodoroSetMode('short');
  pomodoroStart();
  advanceTicks(299);
  assert.equal(getState().status, 'running');
  assert.equal(getState().remaining, 1);
});

test('tick transitions status to done when remaining reaches 0', () => {
  pomodoroSetMode('short');
  pomodoroStart();
  advanceTicks(300);
  const s = getState();
  assert.equal(s.status, 'done');
  assert.equal(s.remaining, 0);
});

test('tick clears the ticker when done', () => {
  pomodoroSetMode('short');
  pomodoroStart();
  advanceTicks(300);
  assert.equal(_capturedTick, null, 'ticker should stop when done');
});

test('further ticks after done are no-ops', () => {
  pomodoroSetMode('short');
  pomodoroStart();
  advanceTicks(300);
  advanceTicks(5); // _capturedTick is null — advanceTicks skips via ?.()
  const s = getState();
  assert.equal(s.remaining, 0);
  assert.equal(s.status, 'done');
});

// ── Done → restart flow ───────────────────────────────────────────────────────

test('pomodoroStart from done state auto-resets then begins running', () => {
  pomodoroSetMode('short');
  pomodoroStart();
  advanceTicks(300);
  assert.equal(getState().status, 'done');

  pomodoroStart(); // should reset then start
  const s = getState();
  assert.equal(s.status, 'running');
  assert.equal(s.remaining, 300); // full time restored by reset before start
});

// ── Rendering ─────────────────────────────────────────────────────────────────

test('initPomodoro does not throw', () => {
  assert.doesNotThrow(() => initPomodoro());
});

test('initPomodoro without DOM element is a safe no-op', () => {
  const origGet = globalThis.document.getElementById;
  globalThis.document.getElementById = () => null; // simulate missing widget div
  assert.doesNotThrow(() => initPomodoro());
  globalThis.document.getElementById = origGet;
});

test('widget HTML contains formatted time in idle focus state', () => {
  initPomodoro();
  assert.ok(widgetEl.innerHTML.includes('25:00'), 'should display 25:00');
});

test('widget HTML contains Start button when idle', () => {
  initPomodoro();
  assert.ok(widgetEl.innerHTML.includes('Start'), 'idle state shows Start button');
});

test('widget HTML contains Pause button when running', () => {
  pomodoroStart();
  assert.ok(widgetEl.innerHTML.includes('Pause'), 'running state shows Pause button');
});

test('widget HTML contains Resume button when paused', () => {
  pomodoroStart();
  pomodoroPause();
  assert.ok(widgetEl.innerHTML.includes('Resume'), 'paused state shows Resume button');
});

test('widget HTML contains Done button when finished', () => {
  pomodoroSetMode('short');
  pomodoroStart();
  advanceTicks(300);
  assert.ok(widgetEl.innerHTML.includes('Done'), 'done state shows Done button');
});

test('collapsed widget renders pomo-collapsed class and time', () => {
  pomodoroToggleCollapse();
  assert.ok(widgetEl.innerHTML.includes('pomo-collapsed'), 'should use collapsed variant');
  assert.ok(widgetEl.innerHTML.includes('25:00'), 'collapsed view should show time');
});

test('collapsed widget does not render mode buttons', () => {
  pomodoroToggleCollapse();
  assert.ok(!widgetEl.innerHTML.includes('pomo-modes'), 'mode buttons hidden when collapsed');
});

test('reset icon shown when running', () => {
  pomodoroStart();
  assert.ok(widgetEl.innerHTML.includes('↺'), 'reset icon should be visible while running');
});

test('reset icon shown when paused', () => {
  pomodoroStart();
  pomodoroPause();
  assert.ok(widgetEl.innerHTML.includes('↺'), 'reset icon should be visible while paused');
});

test('reset icon hidden when idle', () => {
  initPomodoro();
  assert.ok(!widgetEl.innerHTML.includes('↺'), 'reset icon hidden in idle state');
});
