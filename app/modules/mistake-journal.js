const DEFAULT_RETRY_DAYS = 2;

function defaultJournal(journal) {
  return { entries: Array.isArray(journal?.entries) ? journal.entries : [] };
}

function addDays(isoDate, days) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function fingerprintFor(entry) {
  return [entry.sourceType ?? 'unknown', entry.sourceId ?? '', entry.itemId ?? ''].join(':');
}

function resolveEntry(entry, resolvedAt) {
  if (entry.status === 'resolved') return entry;
  return {
    ...entry,
    status: 'resolved',
    resolvedAt,
  };
}

export function recordMistake(journal, mistake) {
  const current = defaultJournal(journal);
  const createdAt = mistake.createdAt ?? new Date().toISOString();
  const retryAfterDays = mistake.retryAfterDays ?? DEFAULT_RETRY_DAYS;
  const fingerprint = fingerprintFor(mistake);
  const conceptIds = Array.isArray(mistake.conceptIds) ? [...new Set(mistake.conceptIds)] : [];

  const nextEntry = {
    id: fingerprint,
    fingerprint,
    sourceType: mistake.sourceType ?? 'unknown',
    sourceId: mistake.sourceId ?? '',
    itemId: mistake.itemId ?? mistake.sourceId ?? '',
    moduleId: mistake.moduleId ?? null,
    prompt: mistake.prompt ?? '',
    learnerAnswer: mistake.learnerAnswer ?? '',
    correctAnswer: mistake.correctAnswer ?? '',
    conceptIds,
    createdAt,
    lastSeenAt: createdAt,
    dueAt: mistake.dueAt ?? addDays(createdAt, retryAfterDays),
    attempts: 1,
    status: 'open',
  };

  const existingIndex = current.entries.findIndex(entry => entry.fingerprint === fingerprint && entry.status !== 'resolved');
  if (existingIndex === -1) {
    return { entries: [...current.entries, nextEntry] };
  }

  const existing = current.entries[existingIndex];
  const merged = {
    ...existing,
    ...nextEntry,
    createdAt: existing.createdAt,
    attempts: (existing.attempts ?? 1) + 1,
    conceptIds: [...new Set([...(existing.conceptIds ?? []), ...conceptIds])],
  };

  const entries = [...current.entries];
  entries[existingIndex] = merged;
  return { entries };
}

export function getDueMistakes(journal, now = new Date().toISOString()) {
  const nowTime = new Date(now).getTime();
  return defaultJournal(journal).entries.filter(entry => entry.status !== 'resolved' && new Date(entry.dueAt).getTime() <= nowTime);
}

export function resolveMistake(journal, fingerprint, resolvedAt = new Date().toISOString()) {
  return {
    entries: defaultJournal(journal).entries.map(entry =>
      entry.fingerprint === fingerprint ? resolveEntry(entry, resolvedAt) : entry
    ),
  };
}

export function resolveMistakesForItem(journal, item, resolvedAt = new Date().toISOString()) {
  const fingerprint = fingerprintFor(item);
  return resolveMistake(journal, fingerprint, resolvedAt);
}

export function summarizeMistakeJournal(journal, now = new Date().toISOString()) {
  const entries = defaultJournal(journal).entries.filter(entry => entry.status !== 'resolved');
  const conceptCounts = new Map();

  for (const entry of entries) {
    for (const conceptId of entry.conceptIds ?? []) {
      conceptCounts.set(conceptId, (conceptCounts.get(conceptId) ?? 0) + 1);
    }
  }

  const focusConceptIds = [...conceptCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([conceptId]) => conceptId);

  return {
    openCount: entries.length,
    dueCount: getDueMistakes(journal, now).length,
    focusConceptIds,
  };
}