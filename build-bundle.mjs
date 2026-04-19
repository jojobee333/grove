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

/*g* Map card type to cognitive level for auto-enrichment. */
function cognitiveLevel(cardType) {
  if (cardType === 'definition' || cardType === 'context') return 'recall';
  if (cardType === 'application' || cardType === 'synthesis') return 'application';
  return 'comprehension'; // claim, distinction, comparison, debate, etc.
}

/** Map card type to default mastery weight for auto-enrichment. */
function defaultWeight(cardType) {
  if (cardType === 'definition' || cardType === 'context') return 0.5;
  if (cardType === 'application' || cardType === 'synthesis') return 1.0;
  return 0.75;
}

/** Map quiz question difficulty field to cognitive level. */
function quizCognitiveLevel(difficulty) {
  const d = (difficulty ?? '').toLowerCase();
  if (d === 'knowledge' || d === 'recall') return 'recall';
  if (d === 'application' || d === 'synthesis' || d === 'evaluation') return 'application';
  return 'comprehension'; // comprehension, analysis, and default
}

/** Map cognitive level to default weight for quiz question mastery scoring. */
function quizWeight(cogLevel) {
  if (cogLevel === 'recall') return 0.5;
  if (cogLevel === 'application') return 1.0;
  return 0.75;
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
const applicationsData = readJSON(join(base, 'applications.json')) ?? { applications: [] };

// ── Adaptive learning artifacts (v3) ─────────────────────────────────────────
const conceptsData  = readJSON(join(base, 'concepts.json'))       ?? { concepts: [] };
const adaptiveRules = readJSON(join(base, 'adaptive-rules.json')) ?? {};
const learningPaths = readJSON(join(base, 'learning-paths.json')) ?? { paths: [] };

if (conceptsData.concepts.length)
  console.log(`  ✓ concepts.json: ${conceptsData.concepts.length} concepts`);
else
  console.warn('  ⚠ concepts.json not found — adaptive concept tracking disabled');

// ── Quizzes ─────────────────────────────────────────────────────────────────
const quizzes    = {};
const modchecks  = {};
const codeChallenges = {};
const assessmentsDir = join(base, 'assessments');
if (existsSync(assessmentsDir)) {
  const files = readdirSync(assessmentsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const data = readJSON(join(assessmentsDir, file));
    if (!data) continue;
    // modcheck-M01.json → modchecks
    const mcMatch = file.match(/modcheck-([A-Z0-9]+)\.json$/i);
    if (mcMatch) { modchecks[mcMatch[1]] = data; continue; }
    // code-challenge-M01.json → codeChallenges
    const ccMatch = file.match(/code-challenge-([A-Z0-9]+)\.json$/i);
    if (ccMatch) { codeChallenges[ccMatch[1]] = data; continue; }
    // quiz-M01.json → quizzes
    const qMatch = file.match(/quiz-([A-Z0-9]+)\.json$/i);
    const moduleId = qMatch?.[1] ?? file.replace('.json', '');
    quizzes[moduleId] = data;
  }
}

// ── Practical applications ─────────────────────────────────────────────────
const practicalApplications = {};
for (const application of applicationsData.applications ?? []) {
  const moduleId = application.module;
  if (!moduleId) continue;
  if (!practicalApplications[moduleId]) {
    const moduleTitle = course.modules.find(module => module.id === moduleId)?.title ?? moduleId;
    practicalApplications[moduleId] = {
      module_id: moduleId,
      title: `Practical applications — ${moduleTitle}`,
      applications: [],
    };
  }
  practicalApplications[moduleId].applications.push(application);
}

// ── v3 Schema validation ─────────────────────────────────────────────────────
{
  const errs = [];
  const allLessonIds = new Set(course.modules.flatMap(m => (m.lessons ?? []).map(l => l.id)));
  const allConceptIds = new Set((conceptsData.concepts ?? []).map(c => c.id));
  const hasConceptGraph = allConceptIds.size > 0;

  for (const m of course.modules) {
    for (const l of m.lessons ?? []) {
      if (!l.id) { errs.push(`lesson missing id in module ${m.id}`); continue; }
      if (l.teaches_concepts !== undefined && !Array.isArray(l.teaches_concepts))
        errs.push(`${l.id}: teaches_concepts must be an array`);
      if (l.review_after_days !== undefined && !Array.isArray(l.review_after_days))
        errs.push(`${l.id}: review_after_days must be an array`);
      for (const prereq of l.prerequisites ?? []) {
        if (!allLessonIds.has(prereq))
          errs.push(`${l.id}: prerequisite "${prereq}" does not exist`);
      }
      if (hasConceptGraph) {
        for (const cid of [...(l.teaches_concepts ?? []), ...(l.reinforces_concepts ?? [])]) {
          if (!allConceptIds.has(cid))
            errs.push(`${l.id}: concept "${cid}" not in concepts.json`);
        }
      }
    }
  }

  for (const card of cards) {
    if (hasConceptGraph) {
      for (const cid of card.concepts ?? []) {
        if (!allConceptIds.has(cid))
          errs.push(`${card.id}: concept "${cid}" not in concepts.json`);
      }
    }
    for (const lid of card.remediation_lesson_ids ?? []) {
      if (!allLessonIds.has(lid))
        errs.push(`${card.id}: remediation_lesson_id "${lid}" does not exist`);
    }
  }

  for (const [key, assessment] of [...Object.entries(quizzes), ...Object.entries(modchecks)]) {
    for (const q of assessment.questions ?? []) {
      if (hasConceptGraph) {
        for (const cid of q.concepts ?? []) {
          if (!allConceptIds.has(cid))
            errs.push(`${key}/${q.id}: concept "${cid}" not in concepts.json`);
        }
      }
      for (const lid of q.remediation_lesson_ids ?? []) {
        if (!allLessonIds.has(lid))
          errs.push(`${key}/${q.id}: remediation_lesson_id "${lid}" does not exist`);
      }
    }
  }

  for (const [key, challengeSet] of Object.entries(codeChallenges)) {
    for (const challenge of challengeSet.challenges ?? []) {
      if (!challenge.id) { errs.push(`${key}: challenge missing id`); continue; }
      if (challenge.language && !['python', 'javascript', 'rust'].includes(challenge.language))
        errs.push(`${key}/${challenge.id}: language must be "python", "javascript", or "rust"`);
      if (!Array.isArray(challenge.test_cases) || challenge.test_cases.length === 0)
        errs.push(`${key}/${challenge.id}: must have at least one test case`);
      for (const tc of challenge.test_cases ?? []) {
        if (!tc.name || !tc.input || !tc.expected_output || !tc.visibility)
          errs.push(`${key}/${challenge.id}: test case missing required fields (name, input, expected_output, visibility)`);
      }
      if (!challenge.starter_code && !challenge.solution_template)
        errs.push(`${key}/${challenge.id}: must have starter_code or solution_template`);
      if (hasConceptGraph) {
        for (const cid of challenge.concepts ?? []) {
          if (!allConceptIds.has(cid))
            errs.push(`${key}/${challenge.id}: concept "${cid}" not in concepts.json`);
        }
      }
      if (challenge.lesson_ref && !allLessonIds.has(challenge.lesson_ref))
        errs.push(`${key}/${challenge.id}: lesson_ref "${challenge.lesson_ref}" does not exist`);
      for (const lid of challenge.remediation_lesson_ids ?? []) {
        if (!allLessonIds.has(lid))
          errs.push(`${key}/${challenge.id}: remediation_lesson_id "${lid}" does not exist`);
      }
    }
  }

  for (const application of applicationsData.applications ?? []) {
    if (!application.id) { errs.push('application missing id'); continue; }
    const moduleExists = course.modules.some(module => module.id === application.module);
    if (!moduleExists)
      errs.push(`${application.id}: module "${application.module}" does not exist`);
    if (application.type && !['project', 'implementation', 'workflow', 'artifact'].includes(application.type))
      errs.push(`${application.id}: type must be one of project, implementation, workflow, artifact`);
    if (application.difficulty !== undefined && (typeof application.difficulty !== 'number' || application.difficulty < 1 || application.difficulty > 5))
      errs.push(`${application.id}: difficulty must be a number between 1 and 5`);
    if (application.estimated_minutes !== undefined && (typeof application.estimated_minutes !== 'number' || application.estimated_minutes < 1))
      errs.push(`${application.id}: estimated_minutes must be a positive number`);
    for (const lid of application.lesson_refs ?? []) {
      if (!allLessonIds.has(lid))
        errs.push(`${application.id}: lesson_ref "${lid}" does not exist`);
    }
    if (hasConceptGraph) {
      for (const cid of application.concepts ?? []) {
        if (!allConceptIds.has(cid))
          errs.push(`${application.id}: concept "${cid}" not in concepts.json`);
      }
    }
  }

  if (errs.length) {
    console.error('\n❌ Curriculum validation failed:');
    for (const e of errs) console.error(`  • ${e}`);
    process.exit(1);
  }
  console.log('  ✓ v3 schema validation passed');
}

// ── Auto-enrich cards with derived v3 fields (if not already explicit) ────────
const lessonConceptMap = {};
for (const m of course.modules) {
  for (const l of m.lessons ?? []) {
    lessonConceptMap[l.id] = l.teaches_concepts ?? [];
  }
}
const enrichedCards = cards.map(card => ({
  ...card,
  concepts:        card.concepts        ?? lessonConceptMap[card.lesson] ?? [],
  cognitive_level: card.cognitive_level ?? cognitiveLevel(card.type),
  weight:          card.weight          ?? defaultWeight(card.type),
  reviewable:      card.reviewable      ?? true,
}));

// ── Auto-enrich quiz questions with derived v3 fields ────────────────────────
function enrichQuestions(questions) {
  return (questions ?? []).map(q => {
    if (!q.lesson_ref) return q; // modcheck short-answers have no lesson_ref: skip
    const cogLevel = quizCognitiveLevel(q.difficulty);
    return {
      ...q,
      concepts:               q.concepts               ?? lessonConceptMap[q.lesson_ref] ?? [],
      cognitive_level:        q.cognitive_level        ?? cogLevel,
      weight:                 q.weight                 ?? quizWeight(cogLevel),
      remediation_lesson_ids: q.remediation_lesson_ids ?? [q.lesson_ref],
    };
  });
}

const enrichedQuizzes = {};
for (const [k, v] of Object.entries(quizzes)) {
  enrichedQuizzes[k] = { ...v, questions: enrichQuestions(v.questions) };
}

// ── Auto-enrich code challenges with derived v3 fields ──────────────────────────
function enrichChallenges(challenges) {
  return (challenges ?? []).map(c => ({
    ...c,
    concepts:               c.concepts               ?? (c.lesson_ref ? lessonConceptMap[c.lesson_ref] : []) ?? [],
    cognitive_level:        c.cognitive_level        ?? 'application',
    weight:                 c.weight                 ?? 1.0,
    pass_criteria:          c.pass_criteria          ?? 0.70,
    remediation_lesson_ids: c.remediation_lesson_ids ?? (c.lesson_ref ? [c.lesson_ref] : []),
  }));
}

const enrichedCodeChallenges = {};
for (const [k, v] of Object.entries(codeChallenges)) {
  enrichedCodeChallenges[k] = { ...v, challenges: enrichChallenges(v.challenges) };
}

function enrichApplications(applications) {
  return (applications ?? []).map(application => ({
    ...application,
    type: application.type ?? 'project',
    difficulty: application.difficulty ?? 3,
    estimated_minutes: application.estimated_minutes ?? 60,
    lesson_refs: application.lesson_refs ?? [],
    concepts: application.concepts ?? [...new Set((application.lesson_refs ?? []).flatMap(lid => lessonConceptMap[lid] ?? []))],
    tools: application.tools ?? [],
    steps: application.steps ?? [],
    success_criteria: application.success_criteria ?? [],
    extension_ideas: application.extension_ideas ?? [],
  }));
}

const enrichedPracticalApplications = {};
for (const [k, v] of Object.entries(practicalApplications)) {
  enrichedPracticalApplications[k] = { ...v, applications: enrichApplications(v.applications) };
}

// ── Build bundle ─────────────────────────────────────────────────────────────
// Enrich course with computed summary fields the app reads at runtime
course.total_lessons = allLessonIds.length;
course.total_estimated_hours = Math.round(
  course.modules.flatMap(m => m.lessons ?? [])
    .reduce((sum, l) => sum + (l.estimated_minutes ?? 0), 0) / 60 * 10
) / 10;

const bundle = {
  version: '3.0',
  slug,
  bundled: new Date().toISOString(),
  course,
  learner: learner ?? {},
  lessons,
  cards: enrichedCards,
  quizzes: enrichedQuizzes,
  modchecks,
  codeChallenges: enrichedCodeChallenges,
  practicalApplications: enrichedPracticalApplications,
  concepts:      conceptsData,
  adaptiveRules,
  learningPaths,
};

const bundlePath = join(base, 'bundle.json');
writeFileSync(bundlePath, JSON.stringify(bundle, null, 2), 'utf8');
console.log(`✓ bundle.json written → curriculum/${slug}/bundle.json`);
console.log(`  Modules:   ${course.modules?.length ?? 0}`);
console.log(`  Lessons:   ${allLessonIds.length} (${Object.values(lessons).filter(Boolean).length} with content)`);
console.log(`  Cards:      ${enrichedCards.length}`);
console.log(`  Quizzes:    ${Object.keys(enrichedQuizzes).length}`);
console.log(`  Mod checks: ${Object.keys(modchecks).length}`);
console.log(`  Code challenges: ${Object.keys(enrichedCodeChallenges).length}`);
console.log(`  Practical application modules: ${Object.keys(enrichedPracticalApplications).length}`);
console.log(`  Concepts:   ${conceptsData.concepts?.length ?? 0}`);
console.log(`  Paths:      ${learningPaths.paths?.length ?? 0}`);

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
  total_cards: enrichedCards.length,
  total_questions: Object.values(enrichedQuizzes).reduce((n, q) => n + (q.questions?.length ?? 0), 0),
  total_practical_applications: Object.values(enrichedPracticalApplications).reduce((n, set) => n + (set.applications?.length ?? 0), 0),
  generated: course.generated ?? new Date().toISOString().slice(0, 10),
  adaptive:       (conceptsData.concepts?.length ?? 0) > 0,
  bundle_version: '3.0',
};

const existingIdx = index.courses.findIndex(c => c.slug === slug);
if (existingIdx >= 0) index.courses[existingIdx] = entry;
else index.courses.push(entry);

writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
console.log(`✓ curriculum/index.json updated`);
