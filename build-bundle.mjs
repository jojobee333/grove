#!/usr/bin/env node
/**
 * Grove Bundle Builder
 * Reads a curriculum folder and produces a single bundle.json containing
 * the course map, all lesson markdown, flashcards, and quizzes.
 *
 * Usage (run from the grove/ directory):
 *   node build-bundle.mjs <slug>
 *   node build-bundle.mjs python-scripting-best-practices
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node build-bundle.mjs <course-slug>');
  process.exit(1);
}

const base = resolve(`curriculum/${slug}`);
if (!existsSync(base)) {
  console.error(`Course not found: curriculum/${slug}`);
  process.exit(1);
}

function readJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; }
}

function readText(path) {
  try { return readFileSync(path, 'utf8'); }
  catch { return null; }
}

/**
 * Parse the Strata source index table into a map of { SID -> { title, url } }.
 * Walks up from the grove curriculum folder to find the vault research folder.
 *
 * Tries these locations in order:
 *   <grove-root>/../../vault/research/<slug>/01-sources/index.md
 *   <grove-root>/../vault/research/<slug>/01-sources/index.md
 *   <grove-root>/../../../vault/research/<slug>/01-sources/index.md
 */
function loadSourceIndex(slug) {
  // ── Step 1: resolve vault root ────────────────────────────────────────────
  const vaultRootCandidates = [
    resolve('../../vault/research', slug),
    resolve('../vault/research', slug),
    resolve('../../../vault/research', slug),
  ];
  let researchDir = null;
  for (const c of vaultRootCandidates) {
    if (existsSync(c)) { researchDir = c; break; }
  }
  if (!researchDir) {
    console.warn('  ⚠ Vault research folder not found — research links will be stripped');
    return {};
  }

  const map = {};

  // ── Step 2: try index.md table (URL column) ───────────────────────────────
  const indexPath = join(researchDir, '01-sources/index.md');
  if (existsSync(indexPath)) {
    const lines = readFileSync(indexPath, 'utf8').split('\n');
    for (const line of lines) {
      // Match table rows: | S017 | slug | Title … | https://… | …
      const m = line.match(/^\|\s*(S\d{3,4})\s*\|[^|]*\|[^|]*\|\s*(https?:\/\/\S+?)\s*\|/);
      if (m) map[m[1]] = m[2];
    }
  }

  // ── Step 3: fallback — scan individual source .md files for **URL**: ──────
  // Used when index.md has no URL column (e.g. Meridian research format)
  if (!Object.keys(map).length) {
    const srcDirs = ['01-sources/web', '01-sources/papers', '01-sources'];
    for (const sub of srcDirs) {
      const dir = join(researchDir, sub);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.md')) continue;
        const sidMatch = file.match(/^(S\d{3,4})/);
        if (!sidMatch) continue;
        const sid = sidMatch[1];
        if (map[sid]) continue; // already found
        const content = readText(join(dir, file));
        if (!content) continue;
        const urlMatch = content.match(/\*{1,2}URL\*{1,2}\s*:\s*(https?:\/\/\S+)/);
        if (urlMatch) map[sid] = urlMatch[1];
      }
    }
  }

  if (Object.keys(map).length) {
    console.log(`  ✓ Loaded ${Object.keys(map).length} source URLs for ${slug}`);
  } else {
    console.warn('  ⚠ No source URLs found — research links will be stripped');
  }
  return map;
}

/**
 * Rewrite relative research links in markdown.
 *   [S017 — Ruff docs](../../research/.../S017-ruff.md)
 *   → [S017 — Ruff docs](https://docs.astral.sh/ruff/)
 * If no URL is known, converts to plain text to avoid 404s.
 */
function rewriteSourceLinks(md, sourceMap) {
  // Match any markdown link whose href points into a research source file
  // Handles both ../../research/... and ../../vault/research/... path forms
  return md.replace(
    /\[([^\]]+)\]\((?:\.\.[\/\\])+(?:vault[\/\\])?research[^)]+\/(S\d{3,4})[^)]*\.md\)/g,
    (_, label, sid) => {
      const url = sourceMap[sid];
      return url ? `[${label}](${url})` : label;
    }
  );
}

// ── Course map ───────────────────────────────────────────────────────────────
const course = readJSON(join(base, 'course.json'));
if (!course) {
  console.error(`Missing: curriculum/${slug}/course.json`);
  process.exit(1);
}

// ── Learner profile ─────────────────────────────────────────────────────────
const learner = readJSON(join(base, 'learner.json'));

// ── Source URL map ───────────────────────────────────────────────────────────
const sourceMap = loadSourceIndex(slug);

// ── Lessons content ─────────────────────────────────────────────────────────
const lessonsDir = join(base, 'lessons');
const lessons = {};

const allLessonIds = course.modules.flatMap(m => (m.lessons || []).map(l => l.id));
for (const id of allLessonIds) {
  // Try common naming patterns: L01.md, L01-title.md, etc.
  let content = null;
  if (existsSync(lessonsDir)) {
    const files = readdirSync(lessonsDir);
    const match = files.find(f => f.startsWith(id));
    if (match) content = readText(join(lessonsDir, match));
  }
  if (content) content = rewriteSourceLinks(content, sourceMap);
  lessons[id] = content ?? '';
  if (!content) console.warn(`  ⚠ No content found for lesson ${id}`);
}

// ── Flashcards ──────────────────────────────────────────────────────────────
const cardsData = readJSON(join(base, 'cards.json'));
const cards = cardsData?.cards ?? [];

// ── Quizzes ─────────────────────────────────────────────────────────────────
const quizzes    = {};
const modchecks  = {};
const assessmentsDir = join(base, 'assessments');
if (existsSync(assessmentsDir)) {
  const files = readdirSync(assessmentsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const data = readJSON(join(assessmentsDir, file));
    if (!data) continue;
    // modcheck-M01.json → modchecks
    const mcMatch = file.match(/modcheck-([A-Z0-9]+)\.json$/i);
    if (mcMatch) { modchecks[mcMatch[1]] = data; continue; }
    // quiz-M01.json → quizzes
    const qMatch = file.match(/quiz-([A-Z0-9]+)\.json$/i);
    const moduleId = qMatch?.[1] ?? file.replace('.json', '');
    quizzes[moduleId] = data;
  }
}

// ── Build bundle ─────────────────────────────────────────────────────────────
const bundle = {
  version: '2.0',
  slug,
  bundled: new Date().toISOString(),
  course,
  learner: learner ?? {},
  lessons,
  cards,
  quizzes,
  modchecks,
};

const bundlePath = join(base, 'bundle.json');
writeFileSync(bundlePath, JSON.stringify(bundle, null, 2), 'utf8');
console.log(`✓ bundle.json written → curriculum/${slug}/bundle.json`);
console.log(`  Modules:   ${course.modules?.length ?? 0}`);
console.log(`  Lessons:   ${allLessonIds.length} (${Object.values(lessons).filter(Boolean).length} with content)`);
console.log(`  Cards:     ${cards.length}`);
console.log(`  Quizzes:   ${Object.keys(quizzes).length}`);
console.log(`  Mod checks: ${Object.keys(modchecks).length}`);

// ── Update curriculum/index.json ─────────────────────────────────────────────
const indexPath = resolve('curriculum/index.json');
let index = existsSync(indexPath) ? readJSON(indexPath) : null;
if (!index || !index.courses) index = { courses: [] };

const entry = {
  slug,
  title: course.topic,
  description: (course.summary ?? '').slice(0, 160),
  total_modules: course.modules?.length ?? 0,
  total_lessons: allLessonIds.length,
  total_cards: cards.length,
  generated: course.generated ?? new Date().toISOString().slice(0, 10),
};

const existingIdx = index.courses.findIndex(c => c.slug === slug);
if (existingIdx >= 0) index.courses[existingIdx] = entry;
else index.courses.push(entry);

writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
console.log(`✓ curriculum/index.json updated`);
