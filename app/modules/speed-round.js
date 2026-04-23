/**
 * Speed Round — timed flashcard sprint with weak-concept prioritisation.
 *
 * Pure functions — no DOM, no timers, no localStorage side-effects.
 */

const DEFAULT_CARD_COUNT = 10;

/** Duration of a Speed Round in milliseconds (2 minutes). */
export const SPRINT_DURATION_MS = 2 * 60 * 1000;

/**
 * Select up to `count` cards for a Speed Round, prioritising:
 *   1. Weak-concept cards (card.concepts overlaps weakConceptIds)
 *   2. Due/unseen cards (next_review is null, missing, or in the past)
 *
 * Ordering within the same priority tier is stable (insertion order).
 *
 * @param {Array<object>} allCards       - Full card deck
 * @param {object}        progress       - Grove progress object (progress.cards)
 * @param {string[]}      weakConceptIds - Concept IDs the learner is weak on
 * @param {{ count?: number }} options
 * @returns {Array<object>} Selected cards (not shuffled — caller may shuffle)
 */
export function selectSpeedRoundCards(allCards, progress, weakConceptIds, { count = DEFAULT_CARD_COUNT } = {}) {
  if (!Array.isArray(allCards) || allCards.length === 0) return [];

  const weakSet = new Set(Array.isArray(weakConceptIds) ? weakConceptIds : []);
  const today = new Date().toISOString().split('T')[0];

  const scored = allCards.map(card => {
    const saved = progress?.cards?.[card.id];
    // Use saved progress next_review if available, else fall back to the card's sr field
    const nextReview = saved?.next_review ?? card.sr?.next_review ?? null;
    const isDue = !nextReview || nextReview <= today;
    const isWeak = (card.concepts ?? []).some(c => weakSet.has(c));
    // Priority: weak+due (3) > weak only (2) > due only (1) > neither (0)
    const score = (isWeak ? 2 : 0) + (isDue ? 1 : 0);
    return { card, score };
  });

  // Sort descending by score, preserving insertion order within a tier
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map(s => s.card);
}

/**
 * Append a completed sprint to the history array.
 *
 * @param {Array<object>} sprints - Existing sprint history
 * @param {{ cards: Array<{ cardId: string, correct: boolean, timeMs: number }>, completedAt?: string, totalMs?: number }} result
 * @returns {Array<object>} New history (original not mutated)
 */
export function recordSprintResult(sprints, result) {
  const current = Array.isArray(sprints) ? sprints : [];
  return [
    ...current,
    {
      cards: result.cards ?? [],
      completedAt: result.completedAt ?? new Date().toISOString(),
      totalMs: result.totalMs ?? 0,
    },
  ];
}

/**
 * Compute stats from the most recent sprint, with optional improvement delta vs the previous sprint.
 * Improvement is only calculated for cards that appeared in both sprints.
 *
 * @param {Array<object>} sprints - Sprint history from recordSprintResult
 * @returns {{ correct: number, total: number, avgTimeMs: number, improvement: number|null }}
 */
export function computeSprintStats(sprints) {
  if (!Array.isArray(sprints) || sprints.length === 0) {
    return { correct: 0, total: 0, avgTimeMs: 0, improvement: null };
  }

  const latest = sprints[sprints.length - 1];
  const cards = latest.cards ?? [];
  const correct = cards.filter(c => c.correct).length;
  const total = cards.length;
  const avgTimeMs = total > 0
    ? Math.round(cards.reduce((sum, c) => sum + (c.timeMs ?? 0), 0) / total)
    : 0;

  let improvement = null;
  if (sprints.length >= 2) {
    const prev = sprints[sprints.length - 2];
    const prevById = new Map((prev.cards ?? []).map(c => [c.cardId, c]));
    const shared = cards.filter(c => prevById.has(c.cardId));
    if (shared.length > 0) {
      const prevCorrect = shared.filter(c => prevById.get(c.cardId).correct).length;
      const currCorrect = shared.filter(c => c.correct).length;
      improvement = currCorrect - prevCorrect;
    }
  }

  return { correct, total, avgTimeMs, improvement };
}
