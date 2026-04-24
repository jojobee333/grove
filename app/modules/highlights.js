// ── Grove Highlights ───────────────────────────────────────
// Stores in-lesson text highlights in localStorage under progress.highlightStore.
// Store shape:
//   { [slug]: { [lessonId]: [{ id, quote, color, savedAt }] } }
//
// Rules:
//   - All functions are pure and immutable (return new store objects)
//   - id is a string like "hl-<timestamp>-<random>" — unique per call
//   - color is "yellow" | "green" | "pink"
//   - DOM application is handled by app.js — this module is DOM-free

/**
 * Save a new highlight entry.
 * @param {object} store - Current highlight store
 * @param {{ slug: string, lessonId: string, quote: string, color: string }} entry
 * @returns {object} New store with the highlight appended
 */
export function saveHighlight(store, { slug, lessonId, quote, color }) {
  const id = `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const existing = store[slug]?.[lessonId] ?? [];
  return {
    ...store,
    [slug]: {
      ...(store[slug] ?? {}),
      [lessonId]: [...existing, { id, quote, color, savedAt: new Date().toISOString() }]
    }
  };
}

/**
 * Remove a highlight entry by id.
 * @param {object} store - Current highlight store
 * @param {{ slug: string, lessonId: string, id: string }} ref
 * @returns {object} New store with the highlight removed
 */
export function removeHighlight(store, { slug, lessonId, id }) {
  const existing = store[slug]?.[lessonId] ?? [];
  const updated = existing.filter(h => h.id !== id);
  return {
    ...store,
    [slug]: {
      ...(store[slug] ?? {}),
      [lessonId]: updated
    }
  };
}

/**
 * Get all highlights for a lesson. Returns [] if none exist.
 * @param {object} store - Current highlight store
 * @param {{ slug: string, lessonId: string }} ref
 * @returns {Array<{ id: string, quote: string, color: string, savedAt: string }>}
 */
export function getHighlights(store, { slug, lessonId }) {
  return store[slug]?.[lessonId] ?? [];
}
