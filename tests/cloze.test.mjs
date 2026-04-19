/**
 * TDD RED — cloze card logic tests.
 * These all fail until app/modules/cloze.js is implemented.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseClozeText,
  renderClozeQuestion,
  renderClozeAnswer,
  scoreClozeAnswer,
  scoreAllBlanks,
} from '../app/modules/cloze.js';

// ── parseClozeText ──────────────────────────────────────────────────────────
describe('parseClozeText', () => {
  it('returns an empty array for text with no blanks', () => {
    assert.deepEqual(parseClozeText('No blanks here'), []);
  });

  it('returns array with one blank value', () => {
    assert.deepEqual(parseClozeText('The sky is {{blue}}'), ['blue']);
  });

  it('returns array with multiple blank values in order', () => {
    assert.deepEqual(
      parseClozeText('{{Python}} uses {{indentation}} to define blocks'),
      ['Python', 'indentation'],
    );
  });

  it('handles blank values with spaces', () => {
    assert.deepEqual(parseClozeText('Use {{for loop}} to iterate'), ['for loop']);
  });

  it('returns empty array for empty string', () => {
    assert.deepEqual(parseClozeText(''), []);
  });
});

// ── renderClozeQuestion ─────────────────────────────────────────────────────
describe('renderClozeQuestion', () => {
  it('replaces a single blank with _____', () => {
    assert.equal(renderClozeQuestion('The sky is {{blue}}'), 'The sky is _____');
  });

  it('replaces multiple blanks each with _____', () => {
    assert.equal(
      renderClozeQuestion('{{Python}} uses {{indentation}} to define blocks'),
      '_____ uses _____ to define blocks',
    );
  });

  it('leaves text with no blanks unchanged', () => {
    assert.equal(renderClozeQuestion('No blanks here'), 'No blanks here');
  });

  it('preserves surrounding punctuation and spacing', () => {
    assert.equal(
      renderClozeQuestion('A {{closure}} captures its surrounding {{scope}}.'),
      'A _____ captures its surrounding _____.',
    );
  });
});

// ── renderClozeAnswer ───────────────────────────────────────────────────────
describe('renderClozeAnswer', () => {
  it('wraps the revealed answer in [[...]]', () => {
    assert.equal(renderClozeAnswer('The sky is {{blue}}'), 'The sky is [[blue]]');
  });

  it('wraps multiple blanks each in [[...]]', () => {
    assert.equal(
      renderClozeAnswer('{{Python}} uses {{indentation}} to define blocks'),
      '[[Python]] uses [[indentation]] to define blocks',
    );
  });

  it('leaves text with no blanks unchanged', () => {
    assert.equal(renderClozeAnswer('No blanks here'), 'No blanks here');
  });
});

// ── scoreClozeAnswer ────────────────────────────────────────────────────────
describe('scoreClozeAnswer', () => {
  it('returns true for an exact match', () => {
    assert.equal(scoreClozeAnswer('blue', 'blue'), true);
  });

  it('returns false for a wrong answer', () => {
    assert.equal(scoreClozeAnswer('red', 'blue'), false);
  });

  it('is case-insensitive', () => {
    assert.equal(scoreClozeAnswer('Blue', 'blue'), true);
    assert.equal(scoreClozeAnswer('BLUE', 'blue'), true);
  });

  it('trims leading and trailing whitespace', () => {
    assert.equal(scoreClozeAnswer('  blue  ', 'blue'), true);
  });

  it('returns false for an empty answer', () => {
    assert.equal(scoreClozeAnswer('', 'blue'), false);
    assert.equal(scoreClozeAnswer('   ', 'blue'), false);
  });
});

// ── scoreAllBlanks ──────────────────────────────────────────────────────────
describe('scoreAllBlanks', () => {
  it('returns an array of booleans matching each blank', () => {
    assert.deepEqual(
      scoreAllBlanks(['python', 'indentation'], ['Python', 'indentation']),
      [true, true],
    );
  });

  it('returns false for each wrong answer', () => {
    assert.deepEqual(
      scoreAllBlanks(['java', 'tabs'], ['Python', 'indentation']),
      [false, false],
    );
  });

  it('handles mixed correct and wrong answers', () => {
    assert.deepEqual(
      scoreAllBlanks(['Python', 'tabs'], ['Python', 'indentation']),
      [true, false],
    );
  });

  it('returns empty array when both inputs are empty', () => {
    assert.deepEqual(scoreAllBlanks([], []), []);
  });

  it('uses scoreClozeAnswer rules (case-insensitive, trimmed)', () => {
    assert.deepEqual(
      scoreAllBlanks(['  PYTHON  '], ['python']),
      [true],
    );
  });
});
