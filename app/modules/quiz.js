/**
 * Pure quiz scoring logic.
 */

/**
 * Score a submitted quiz.
 * Only MCQ questions contribute to the numeric score.
 * Non-MCQ questions are self-assessed; their presence does not change the score.
 *
 * @param {{ questions: Array<object>, passing_score?: number }} quiz
 * @param {Record<string,string>} answers - { questionId: chosenOptionKey }
 * @returns {{ correct: number, total: number, score: number|null, passed: boolean }}
 */
export function computeQuizScore(quiz, answers) {
  const mcqs = (quiz.questions ?? []).filter(q => q.type === 'mcq');

  if (!mcqs.length) {
    return { correct: 0, total: 0, score: null, passed: true };
  }

  let correct = 0;
  for (const q of mcqs) {
    if (answers[q.id] === q.correct) correct++;
  }

  const score  = Math.round((correct / mcqs.length) * 100);
  const passed = score >= (quiz.passing_score ?? 70);

  return { correct, total: mcqs.length, score, passed };
}
