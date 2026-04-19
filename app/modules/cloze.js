/**
 * Cloze card logic.
 * Pure functions — no DOM access, no globals, no side effects.
 *
 * Cloze syntax: text contains one or more {{answer}} markers.
 *
 * Example:
 *   '{{Python}} uses {{indentation}} to define blocks'
 *   blanks: ['Python', 'indentation']
 *   question: '_____ uses _____ to define blocks'
 *   answer:   '[[Python]] uses [[indentation]] to define blocks'
 */

const BLANK_PATTERN = /\{\{([^}]*)\}\}/g;

/**
 * Extract all blank values from a cloze text string.
 * @param {string} text
 * @returns {string[]}
 */
export function parseClozeText(text) {
  const blanks = [];
  let match;
  const re = new RegExp(BLANK_PATTERN.source, 'g');
  while ((match = re.exec(text)) !== null) {
    blanks.push(match[1]);
  }
  return blanks;
}

/**
 * Render the question form of a cloze text — replaces {{answer}} with _____.
 * @param {string} text
 * @returns {string}
 */
export function renderClozeQuestion(text) {
  return text.replace(new RegExp(BLANK_PATTERN.source, 'g'), '_____');
}

/**
 * Render the revealed form of a cloze text — replaces {{answer}} with [[answer]].
 * @param {string} text
 * @returns {string}
 */
export function renderClozeAnswer(text) {
  return text.replace(new RegExp(BLANK_PATTERN.source, 'g'), (_, blank) => `[[${blank}]]`);
}

/**
 * Score a single cloze blank answer.
 * Case-insensitive, trims whitespace. Returns false for empty input.
 * @param {string} userInput
 * @param {string} expected
 * @returns {boolean}
 */
export function scoreClozeAnswer(userInput, expected) {
  const cleaned = userInput.trim();
  if (!cleaned) return false;
  return cleaned.toLowerCase() === expected.trim().toLowerCase();
}

/**
 * Score all blanks in a multi-gap cloze card.
 * @param {string[]} userAnswers  - user's answer for each blank, in order
 * @param {string[]} expectedBlanks - expected values from parseClozeText
 * @returns {boolean[]}
 */
export function scoreAllBlanks(userAnswers, expectedBlanks) {
  return expectedBlanks.map((expected, i) => scoreClozeAnswer(userAnswers[i] ?? '', expected));
}
