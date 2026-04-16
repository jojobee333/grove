/**
 * Grove learning-plan planner.
 * Pure functions — all dependencies passed as explicit parameters.
 */

import { getReviewableCards } from './cards.js';

/**
 * Compute which modules have an unlocked, incomplete module check.
 *
 * @param {{ course: object, bundle: object, progress: object }} deps
 * @returns {Array<{ moduleId: string, moduleTitle: string, modcheck: object }>}
 */
export function computeUnlockedModchecks({ course, bundle, progress }) {
  if (!bundle) return [];
  const completed = new Set(Object.keys(progress.lessons ?? {}));
  const result    = [];

  for (const m of course.modules ?? []) {
    const mc = bundle.modchecks?.[m.id];
    if (!mc) continue;
    if (progress.modchecks?.[m.id]?.done) continue;

    const lessons = m.lessons ?? [];
    if (!lessons.length) continue;
    if (lessons.every(l => completed.has(l.id))) {
      result.push({ moduleId: m.id, moduleTitle: m.title, modcheck: mc });
    }
  }

  return result;
}

/**
 * Compute the learner's adaptive next-steps.
 *
 * @param {{
 *   course:        object,
 *   bundle:        object|null,
 *   cards:         Array<object>|null,
 *   concepts:      { concepts: Array<object> },
 *   adaptiveRules: object,
 *   learningPaths: { paths: Array<object> },
 *   progress:      object
 * }} deps
 * @returns {{
 *   nextLessons:       Array<object>,
 *   weakConcepts:      Array<object>,
 *   reviewQueue:       Array<object>,
 *   blockedByMastery:  Array<object>,
 *   unlockedModchecks: Array<object>
 * }}
 */
export function computeNextSteps({ course, bundle, cards, concepts, adaptiveRules, learningPaths, progress }) {

  const completedLessons = new Set(Object.keys(progress.lessons ?? {}));
  const conceptMastery   = progress.conceptMastery ?? {};

  // Restrict to selected learning path when one is active
  const selectedPath = progress.selectedPath ?? null;
  let pathLessonIds  = null;
  if (selectedPath) {
    const p = (learningPaths.paths ?? []).find(p => p.id === selectedPath);
    if (p?.lessons) pathLessonIds = new Set(p.lessons);
  }

  // Concepts introduced by already-completed lessons (used for milestone gates)
  const milestoneLessonIds  = new Set(course.learning_plan?.milestone_lessons ?? []);
  const introducedConcepts  = new Set();
  for (const m of course.modules ?? []) {
    for (const l of m.lessons ?? []) {
      if (completedLessons.has(l.id)) {
        (l.teaches_concepts ?? []).forEach(cid => introducedConcepts.add(cid));
      }
    }
  }

  // Unlockable lessons: prerequisites met, not yet done
  const nextLessons    = [];
  const blockedByMastery = [];

  for (const m of course.modules ?? []) {
    for (const l of m.lessons ?? []) {
      if (completedLessons.has(l.id)) continue;
      if (pathLessonIds && !pathLessonIds.has(l.id)) continue;

      const prereqs    = l.prerequisites ?? [];
      const unlockRule = l.unlock_rule ?? 'all_prerequisites_mastered';

      let unlocked = prereqs.length === 0;
      if (!unlocked && unlockRule === 'all_prerequisites_mastered') {
        unlocked = prereqs.every(pid => completedLessons.has(pid));
      } else if (!unlocked && unlockRule === 'any_prerequisite_mastered') {
        unlocked = prereqs.some(pid => completedLessons.has(pid));
      }
      if (!unlocked) continue;

      // Milestone mastery gate
      if (milestoneLessonIds.has(l.id) && introducedConcepts.size > 0) {
        const threshold = l.mastery_threshold ?? 0.75;
        const scores    = [...introducedConcepts].map(cid => conceptMastery[cid] ?? 0);
        const avg       = scores.reduce((s, v) => s + v, 0) / scores.length;
        if (avg < threshold) {
          const mod = course.modules.find(mod => mod.lessons?.some(x => x.id === l.id));
          blockedByMastery.push({ ...l, avgMastery: avg, threshold, moduleName: mod?.title ?? '' });
          continue;
        }
      }

      nextLessons.push(l);
    }
  }

  // Concepts introduced but mastery below 0.6
  const weakConcepts = [];
  for (const c of concepts.concepts ?? []) {
    const introduced = (c.introduced_in ?? []).some(lid => completedLessons.has(lid));
    if (!introduced) continue;
    const mastery = conceptMastery[c.id] ?? 0;
    if (mastery < 0.6) weakConcepts.push({ ...c, mastery });
  }
  weakConcepts.sort((a, b) => a.mastery - b.mastery);

  // Cards due for review today, limited to modules the learner has reached.
  const reviewQueue = getReviewableCards({ course, cards, progress });

  // Module checks unlocked (all lessons done, modcheck not completed)
  const unlockedModchecks = computeUnlockedModchecks({ course, bundle, progress });

  return { nextLessons, weakConcepts, reviewQueue, blockedByMastery, unlockedModchecks };
}
