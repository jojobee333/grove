const DEFAULT_SESSION_MINUTES = 25;

function estimateCardReviewMinutes(reviewQueue) {
  if (!Array.isArray(reviewQueue) || reviewQueue.length === 0) return 0;
  return Math.max(5, Math.min(10, Math.ceil(reviewQueue.length * 1.25)));
}

function estimateModcheckMinutes(modcheck) {
  const questionCount = modcheck?.questions?.length ?? 0;
  return Math.max(6, questionCount * 2);
}

function pushBlock(blocks, remainingMinutes, block) {
  if (block.minutes > remainingMinutes) return remainingMinutes;
  blocks.push(block);
  return remainingMinutes - block.minutes;
}

export function compileSessionPlan({
  learner,
  nextLessons = [],
  reviewQueue = [],
  weakConcepts = [],
  unlockedModchecks = [],
  dueMistakes = [],
}) {
  const budgetMinutes = learner?.session_time_min ?? DEFAULT_SESSION_MINUTES;
  const blocks = [];
  let remainingMinutes = budgetMinutes;

  if (dueMistakes.length > 0) {
    remainingMinutes = pushBlock(blocks, remainingMinutes, {
      type: 'mistake-review',
      title: 'Mistake review',
      minutes: Math.min(8, Math.max(5, dueMistakes.length * 2)),
      count: dueMistakes.length,
    });
  }

  const nextLesson = nextLessons[0] ?? null;
  if (nextLesson && nextLesson.estimated_minutes <= remainingMinutes) {
    remainingMinutes = pushBlock(blocks, remainingMinutes, {
      type: 'lesson',
      title: nextLesson.title,
      minutes: nextLesson.estimated_minutes,
      lessonId: nextLesson.id,
      moduleId: nextLesson.moduleId ?? null,
      moduleTitle: nextLesson.moduleTitle ?? null,
    });
  } else if (!nextLesson && unlockedModchecks.length > 0) {
    const nextModcheck = unlockedModchecks[0];
    const minutes = estimateModcheckMinutes(nextModcheck.modcheck);
    if (minutes <= remainingMinutes) {
      remainingMinutes = pushBlock(blocks, remainingMinutes, {
        type: 'modcheck',
        title: `${nextModcheck.moduleTitle} module check`,
        minutes,
        moduleId: nextModcheck.moduleId,
      });
    }
  }

  const cardMinutes = estimateCardReviewMinutes(reviewQueue);
  if (cardMinutes > 0 && cardMinutes <= remainingMinutes) {
    remainingMinutes = pushBlock(blocks, remainingMinutes, {
      type: 'card-review',
      title: 'Flashcard review',
      minutes: cardMinutes,
      count: reviewQueue.length,
    });
  }

  if (weakConcepts.length > 0 && remainingMinutes >= 5) {
    remainingMinutes = pushBlock(blocks, remainingMinutes, {
      type: 'weak-concept',
      title: `Reinforce ${weakConcepts[0].title}`,
      minutes: 5,
      conceptId: weakConcepts[0].id,
    });
  }

  return {
    budgetMinutes,
    totalMinutes: budgetMinutes - remainingMinutes,
    remainingMinutes,
    blocks,
  };
}