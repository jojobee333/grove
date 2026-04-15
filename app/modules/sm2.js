/**
 * SM-2 spaced repetition algorithm.
 * Pure function — returns a new SR state object, never mutates input.
 *
 * @typedef {{ ease: number, interval: number, reviews: number, lapses: number, next_review: string|null }} SRState
 * @param {SRState} sr      - Current card SR state (not mutated)
 * @param {number}  quality - Response quality: 1 = hard/fail, 3 = okay, 5 = easy
 * @returns {SRState} New SR state with updated interval, ease, and next_review
 */
export function sm2Step(sr, quality) {
  const next = { ...sr };

  if (quality >= 3) {
    if (next.reviews === 0)      next.interval = 1;
    else if (next.reviews === 1) next.interval = 6;
    else                         next.interval = Math.round(next.interval * next.ease);

    next.ease = Math.max(
      1.3,
      next.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  } else {
    next.interval = 1;
    next.lapses   = (next.lapses ?? 0) + 1;
  }

  next.reviews = (next.reviews ?? 0) + 1;

  const due = new Date();
  due.setDate(due.getDate() + next.interval);
  next.next_review = due.toISOString().split('T')[0];

  return next;
}
