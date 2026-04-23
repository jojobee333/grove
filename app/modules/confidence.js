const CONFIDENCE_LEVELS = new Set(['low', 'medium', 'high']);

function normalizeConfidence(confidence) {
  if (typeof confidence === 'string') {
    const value = confidence.trim().toLowerCase();
    if (CONFIDENCE_LEVELS.has(value)) return value;
  }
  if (confidence === 1) return 'low';
  if (confidence === 2) return 'medium';
  if (confidence === 3) return 'high';
  return null;
}

function defaultLog(log) {
  return { entries: Array.isArray(log?.entries) ? log.entries : [] };
}

export function recordConfidenceAttempt(log, attempt) {
  const confidence = normalizeConfidence(attempt?.confidence);
  if (!confidence) return defaultLog(log);

  const entry = {
    sourceType: attempt.sourceType ?? 'unknown',
    sourceId: attempt.sourceId ?? '',
    itemId: attempt.itemId ?? attempt.sourceId ?? '',
    moduleId: attempt.moduleId ?? null,
    confidence,
    correct: Boolean(attempt.correct),
    conceptIds: Array.isArray(attempt.conceptIds) ? [...new Set(attempt.conceptIds)] : [],
    answeredAt: attempt.answeredAt ?? new Date().toISOString(),
  };

  return {
    entries: [...defaultLog(log).entries, entry],
  };
}

export function summarizeConfidenceLog(log) {
  const entries = defaultLog(log).entries;
  const buckets = {
    low: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    high: { total: 0, correct: 0 },
  };
  const overconfidentConceptCounts = new Map();

  let overconfidentCount = 0;
  let underconfidentCount = 0;

  for (const entry of entries) {
    if (!buckets[entry.confidence]) continue;
    buckets[entry.confidence].total += 1;
    if (entry.correct) buckets[entry.confidence].correct += 1;
    if (entry.confidence === 'high' && !entry.correct) {
      overconfidentCount += 1;
      for (const conceptId of entry.conceptIds ?? []) {
        overconfidentConceptCounts.set(conceptId, (overconfidentConceptCounts.get(conceptId) ?? 0) + 1);
      }
    }
    if (entry.confidence === 'low' && entry.correct) underconfidentCount += 1;
  }

  const accuracy = Object.fromEntries(
    Object.entries(buckets).map(([level, stats]) => [
      level,
      stats.total ? stats.correct / stats.total : null,
    ])
  );

  return {
    total: entries.length,
    accuracy,
    counts: Object.fromEntries(Object.entries(buckets).map(([level, stats]) => [level, stats.total])),
    overconfidentCount,
    underconfidentCount,
    overconfidentConceptIds: [...overconfidentConceptCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([conceptId]) => conceptId),
  };
}