// ── Grove Notes ────────────────────────────────────────────
// All notes are stored in localStorage under:
//   grove_note_<slug>_<lessonId>   → { text, savedAt }
// The getAllNotes helper returns every note for a given slug so the
// Notes view can display them without iterating the whole lesson list.

const NOTE_INDEX_PREFIX = 'grove_note_index_';

function noteKey(slug, lessonId) {
  return `grove_note_${slug}_${lessonId}`;
}

function indexKey(slug) {
  return NOTE_INDEX_PREFIX + slug;
}

/** @param {string} slug @returns {string[]} */
function getIndex(slug) {
  const raw = localStorage.getItem(indexKey(slug));
  return raw ? JSON.parse(raw) : [];
}

/** @param {string} slug @param {string} lessonId */
function addToIndex(slug, lessonId) {
  const idx = getIndex(slug);
  if (!idx.includes(lessonId)) {
    idx.push(lessonId);
    localStorage.setItem(indexKey(slug), JSON.stringify(idx));
  }
}

/** @param {string} slug @param {string} lessonId */
function removeFromIndex(slug, lessonId) {
  const idx = getIndex(slug).filter(id => id !== lessonId);
  localStorage.setItem(indexKey(slug), JSON.stringify(idx));
}

/**
 * Save (or update) a note for a given lesson.
 * Passing an empty string removes the note entirely.
 * @param {string} slug
 * @param {string} lessonId
 * @param {string} text
 */
export function saveNote(slug, lessonId, text) {
  const key = noteKey(slug, lessonId);
  if (!text.trim()) {
    localStorage.removeItem(key);
    removeFromIndex(slug, lessonId);
    return;
  }
  localStorage.setItem(key, JSON.stringify({ text, savedAt: new Date().toISOString() }));
  addToIndex(slug, lessonId);
}

/**
 * Load a note for a given lesson. Returns empty string if none exists.
 * @param {string} slug
 * @param {string} lessonId
 * @returns {string}
 */
export function loadNote(slug, lessonId) {
  const raw = localStorage.getItem(noteKey(slug, lessonId));
  if (!raw) return '';
  return JSON.parse(raw).text || '';
}

/**
 * Returns all saved notes for a slug, sorted by lesson id.
 * @param {string} slug
 * @returns {{ lessonId: string, text: string, savedAt: string }[]}
 */
export function getAllNotes(slug) {
  return getIndex(slug)
    .map(lessonId => {
      const raw = localStorage.getItem(noteKey(slug, lessonId));
      if (!raw) return null;
      const { text, savedAt } = JSON.parse(raw);
      return { lessonId, text, savedAt };
    })
    .filter(Boolean);
}

/**
 * Returns the count of lessons with at least one note for the given slug.
 * @param {string} slug
 * @returns {number}
 */
export function getNoteCount(slug) {
  return getIndex(slug).length;
}

// ── Export formatters ─────────────────────────────────────────────────────────

/**
 * Build a per-module grouping structure from flat notes + course shape.
 * Preserves course module order. Notes without a matching lesson go to __unknown__.
 * @param {{ modules: Array<{id:string,title:string,lessons?:Array<{id:string,title:string}>}> }} course
 * @param {{ lessonId:string, text:string, savedAt:string }[]} allNotes
 * @returns {{ moduleId:string, moduleTitle:string, notes:Array<{lessonId:string,lessonTitle:string,text:string,savedAt:string}> }[]}
 */
export function groupNotesByModule(course, allNotes) {
  const lessonIndex = {};
  course.modules.forEach(m => {
    (m.lessons || []).forEach(l => { lessonIndex[l.id] = { lesson: l, module: m }; });
  });

  const ordered = {};
  course.modules.forEach(m => { ordered[m.id] = { moduleId: m.id, moduleTitle: m.title, notes: [] }; });

  allNotes.forEach(note => {
    const entry = lessonIndex[note.lessonId];
    const moduleId = entry?.module?.id || '__unknown__';
    if (!ordered[moduleId]) {
      ordered[moduleId] = { moduleId, moduleTitle: entry?.module?.title || 'Unknown module', notes: [] };
    }
    ordered[moduleId].notes.push({
      ...note,
      lessonTitle: entry?.lesson?.title || note.lessonId,
    });
  });

  return Object.values(ordered).filter(g => g.notes.length > 0);
}

/**
 * Render notes as a Markdown string.
 * @param {string} courseTitle
 * @param {string} slug
 * @param {ReturnType<typeof groupNotesByModule>} groups
 * @param {string} [exportDateLabel]  Override the date string (useful in tests)
 * @returns {string}
 */
export function formatNotesAsMarkdown(courseTitle, slug, groups, exportDateLabel) {
  const dateLabel = exportDateLabel ?? new Date().toLocaleDateString();
  const lines = [`# ${courseTitle} \u2014 Notes`, '', `_Exported ${dateLabel}_`, ''];
  groups.forEach(group => {
    lines.push(`## ${group.moduleTitle}`, '');
    group.notes.forEach(n => {
      const date = new Date(n.savedAt).toLocaleDateString();
      lines.push(`### ${n.lessonTitle}`, `_${date}_`, '', n.text, '');
    });
  });
  return lines.join('\n');
}

/**
 * Render notes as a JSON string (pretty-printed).
 * @param {string} slug
 * @param {{ lessonId:string, text:string, savedAt:string }[]} allNotes
 * @param {ReturnType<typeof groupNotesByModule>} groups
 * @param {string} [exportedAt]  Override the ISO timestamp (useful in tests)
 * @returns {string}
 */
export function formatNotesAsJson(slug, allNotes, groups, exportedAt) {
  // Build a flat lessonId → {lessonTitle, moduleId, moduleTitle} lookup from groups
  const meta = {};
  groups.forEach(g => {
    g.notes.forEach(n => { meta[n.lessonId] = { lessonTitle: n.lessonTitle, moduleId: g.moduleId, moduleTitle: g.moduleTitle }; });
  });

  return JSON.stringify({
    course: slug,
    exportedAt: exportedAt ?? new Date().toISOString(),
    notes: allNotes.map(n => ({
      lessonId: n.lessonId,
      lessonTitle: meta[n.lessonId]?.lessonTitle ?? n.lessonId,
      moduleId: meta[n.lessonId]?.moduleId,
      moduleTitle: meta[n.lessonId]?.moduleTitle,
      text: n.text,
      savedAt: n.savedAt,
    })),
  }, null, 2);
}
