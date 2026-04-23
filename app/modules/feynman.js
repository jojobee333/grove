/**
 * Feynman Mode — store and retrieve learner self-explanations per lesson.
 *
 * Store shape: { [slug]: { [lessonId]: FeynmanEntry } }
 *
 * @typedef {{ lessonId: string, slug: string, text: string, savedAt: string }} FeynmanEntry
 */

function defaultStore(store) {
  return store && typeof store === 'object' && !Array.isArray(store) ? store : {};
}

/**
 * Save (or overwrite) a Feynman explanation for a lesson.
 *
 * @param {object} store - Current Feynman store
 * @param {{ slug: string, lessonId: string, text: string }} params
 * @returns {object} New store (original not mutated)
 */
export function saveFeynmanEntry(store, { slug, lessonId, text }) {
  const current = defaultStore(store);
  const entry = {
    lessonId,
    slug,
    text: text ?? '',
    savedAt: new Date().toISOString(),
  };
  return {
    ...current,
    [slug]: {
      ...(current[slug] ?? {}),
      [lessonId]: entry,
    },
  };
}

/**
 * Retrieve the Feynman entry for a specific lesson, or null if none exists.
 *
 * @param {object} store
 * @param {{ slug: string, lessonId: string }} params
 * @returns {FeynmanEntry|null}
 */
export function getFeynmanEntry(store, { slug, lessonId }) {
  return defaultStore(store)[slug]?.[lessonId] ?? null;
}

/**
 * Returns true if the learner has written a non-empty explanation for this lesson.
 *
 * @param {object} store
 * @param {{ slug: string, lessonId: string }} params
 * @returns {boolean}
 */
export function hasFeynmanEntry(store, { slug, lessonId }) {
  const entry = getFeynmanEntry(store, { slug, lessonId });
  return entry !== null && entry.text.trim().length > 0;
}

/**
 * Return all Feynman entries for a course slug.
 *
 * @param {object} store
 * @param {string} slug
 * @returns {FeynmanEntry[]}
 */
export function getFeynmanEntries(store, slug) {
  const bySlug = defaultStore(store)[slug] ?? {};
  return Object.values(bySlug);
}
