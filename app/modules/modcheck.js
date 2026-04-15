/**
 * Pure module-check logic.
 * All functions accept dependencies as explicit parameters — no globals.
 */

/**
 * Returns true when all lessons in the given module have been completed.
 *
 * @param {string} moduleId
 * @param {{ course: object, bundle: object|null, progress: object }} deps
 * @returns {boolean}
 */
export function isModcheckUnlocked(moduleId, { course, bundle, progress }) {
  if (!bundle) return false;

  const m = course.modules.find(x => x.id === moduleId);
  if (!m) return false;

  const lessons = m.lessons ?? [];
  if (!lessons.length) return false;

  const completed = new Set(Object.keys(progress.lessons ?? {}));
  return lessons.every(l => completed.has(l.id));
}

/**
 * Compute the final result for a submitted module check.
 * Pure — does not mutate any argument, returns a new progress entry.
 *
 * @param {{ questions: Array<{ id: string }> }} modcheck
 * @param {{ scores?: Record<string,boolean>, done?: boolean }} existing - Current progress entry
 * @returns {{ done: true, date: string, score: number|null, correct: number, total: number, scores: Record<string,boolean> }}
 */
export function submitModcheckLogic(modcheck, existing) {
  const scores  = existing?.scores ?? {};
  const total   = modcheck.questions.length;
  const correct = Object.values(scores).filter(Boolean).length;

  return {
    scores,
    done:  true,
    date:  new Date().toISOString(),
    score: total > 0 ? Math.round((correct / total) * 100) : null,
    correct,
    total,
  };
}
