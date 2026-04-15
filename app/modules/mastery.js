/**
 * Concept mastery update functions.
 * All functions are pure — they accept a mastery map and return a NEW map.
 * Input is never mutated.
 *
 * Mastery values are clamped to [0, 1].
 */

/**
 * Update mastery based on multiple-choice quiz answers.
 *
 * @param {Record<string,number>} currentMastery - Existing { conceptId: 0–1 }
 * @param {Array<object>}         questions       - Quiz questions
 * @param {Record<string,string>} answers         - { questionId: chosenOptionKey }
 * @returns {Record<string,number>} New mastery map
 */
export function masteryFromQuiz(currentMastery, questions, answers) {
  const mastery = { ...currentMastery };

  for (const q of questions) {
    if (q.type !== 'mcq') continue;
    const chosen = answers[q.id];
    if (chosen === undefined) continue;

    const correct = chosen === q.correct;
    const weight  = q.weight ?? 0.75;
    const delta   = correct ? weight * 0.15 : -(weight * 0.10);

    for (const cid of q.concepts ?? []) {
      const current    = mastery[cid] ?? 0.5;
      mastery[cid]     = Math.max(0, Math.min(1, current + delta));
    }
  }

  return mastery;
}

/**
 * Update mastery based on a flashcard review rating.
 *
 * @param {Record<string,number>} currentMastery
 * @param {string[]}              concepts - Concept IDs the card covers
 * @param {number}                quality  - Rating 1–5
 * @param {number}                [weight] - Card weight (default 0.5)
 * @returns {Record<string,number>} New mastery map
 */
export function masteryFromCard(currentMastery, concepts, quality, weight = 0.5) {
  const mastery = { ...currentMastery };
  const delta   = quality >= 4 ? weight * 0.12
                : quality >= 3 ? weight * 0.05
                :              -(weight * 0.08);

  for (const cid of concepts) {
    const current = mastery[cid] ?? 0.5;
    mastery[cid]  = Math.max(0, Math.min(1, current + delta));
  }

  return mastery;
}

/**
 * Update mastery based on code-challenge test results.
 *
 * @param {Record<string,number>} currentMastery
 * @param {string[]}              concepts
 * @param {number}                testsPassed
 * @param {number}                testsTotal
 * @param {number}                [passCriteria] - Pass threshold (default 0.70)
 * @param {number}                [weight]       - Challenge weight (default 1.0)
 * @returns {Record<string,number>} New mastery map
 */
export function masteryFromCodeChallenge(
  currentMastery, concepts, testsPassed, testsTotal,
  passCriteria = 0.70, weight = 1.0
) {
  const mastery    = { ...currentMastery };
  const passRatio  = testsTotal > 0 ? testsPassed / testsTotal : 0;
  const isPassed   = passRatio >= passCriteria;
  const isPartial  = passRatio > 0.5 && !isPassed;
  const delta      = isPassed  ? weight * 0.20
                   : isPartial ? weight * 0.05
                   :           -(weight * 0.15);

  for (const cid of concepts) {
    const current = mastery[cid] ?? 0.5;
    mastery[cid]  = Math.max(0, Math.min(1, current + delta));
  }

  return mastery;
}
