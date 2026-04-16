/**
 * Flashcard grouping and review-scope helpers.
 */

function normalizeSr(card, progressCards) {
  const saved = progressCards?.[card.id] ?? {};
  return {
    ease: 2.5,
    interval: 0,
    reviews: 0,
    lapses: 0,
    next_review: null,
    ...(card.sr ?? {}),
    ...saved,
  };
}

function isLessonUnlocked(lesson, completedLessons) {
  const prereqs = lesson.prerequisites ?? [];
  if (!prereqs.length) return true;

  const rule = lesson.unlock_rule ?? 'all_prerequisites_mastered';
  if (rule === 'any_prerequisite_mastered') {
    return prereqs.some(prereqId => completedLessons.has(prereqId));
  }
  return prereqs.every(prereqId => completedLessons.has(prereqId));
}

function getCurrentModuleId(course, completedLessons) {
  for (const module of course?.modules ?? []) {
    const lessons = module.lessons ?? [];
    const hasUnlockedIncompleteLesson = lessons.some(lesson => (
      !completedLessons.has(lesson.id) && isLessonUnlocked(lesson, completedLessons)
    ));

    if (hasUnlockedIncompleteLesson) {
      return module.id;
    }
  }

  return null;
}

export function isCardDue(card, progressCards, now = new Date()) {
  const sr = normalizeSr(card, progressCards);
  if (!sr.next_review) return true;
  return new Date(sr.next_review) <= now;
}

export function getReachedModuleIds(course, progress) {
  if (!course?.modules?.length) return new Set();

  const completedLessons = new Set(Object.keys(progress?.lessons ?? {}));
  const reached = new Set();
  const currentModuleId = getCurrentModuleId(course, completedLessons);

  for (const module of course.modules) {
    const lessons = module.lessons ?? [];
    const completedCount = lessons.filter(lesson => completedLessons.has(lesson.id)).length;

    if (completedCount > 0 || module.id === currentModuleId) {
      reached.add(module.id);
    }
  }

  return reached;
}

export function getReviewableCards({ course, cards, progress, moduleId = null, now = new Date() }) {
  const allCards = cards ?? [];
  if (!allCards.length) return [];

  const reachedModuleIds = course ? getReachedModuleIds(course, progress) : null;

  return allCards.filter(card => {
    if (moduleId && card.module !== moduleId) return false;
    if (!moduleId && reachedModuleIds && card.module && !reachedModuleIds.has(card.module)) return false;
    if (moduleId && reachedModuleIds && card.module && !reachedModuleIds.has(card.module)) return false;
    return isCardDue(card, progress?.cards, now);
  });
}

export function buildCardModuleSummaries({ course, cards, progress, now = new Date() }) {
  const allCards = cards ?? [];
  if (!allCards.length) return [];

  const progressCards = progress?.cards ?? {};

  if (!course?.modules?.length) {
    const orderedIds = [];
    const grouped = new Map();

    for (const card of allCards) {
      const moduleId = card.module || 'UNGROUPED';
      if (!grouped.has(moduleId)) {
        grouped.set(moduleId, []);
        orderedIds.push(moduleId);
      }
      grouped.get(moduleId).push(card);
    }

    return orderedIds.map(moduleId => {
      const moduleCards = grouped.get(moduleId) ?? [];
      return {
        moduleId,
        title: moduleId,
        totalCount: moduleCards.length,
        dueCount: moduleCards.filter(card => isCardDue(card, progressCards, now)).length,
        reviewedCount: moduleCards.filter(card => normalizeSr(card, progressCards).reviews > 0).length,
        isReached: true,
        isCurrent: false,
        status: 'available',
      };
    });
  }

  const completedLessons = new Set(Object.keys(progress?.lessons ?? {}));
  const reachedModuleIds = getReachedModuleIds(course, progress);
  const currentModuleId = getCurrentModuleId(course, completedLessons);

  return (course.modules ?? [])
    .map(module => {
      const moduleCards = allCards.filter(card => card.module === module.id);
      if (!moduleCards.length) return null;

      const lessons = module.lessons ?? [];
      const completed = lessons.length > 0 && lessons.every(lesson => completedLessons.has(lesson.id));
      const started = lessons.some(lesson => completedLessons.has(lesson.id));
      const isReached = reachedModuleIds.has(module.id);
      const isCurrent = module.id === currentModuleId;

      let status = 'locked';
      if (completed) status = 'completed';
      else if (started) status = 'in-progress';
      else if (isCurrent) status = 'current';
      else if (isReached) status = 'available';

      return {
        moduleId: module.id,
        title: module.title,
        totalCount: moduleCards.length,
        dueCount: moduleCards.filter(card => isCardDue(card, progressCards, now)).length,
        reviewedCount: moduleCards.filter(card => normalizeSr(card, progressCards).reviews > 0).length,
        isReached,
        isCurrent,
        status,
      };
    })
    .filter(Boolean);
}