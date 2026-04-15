import { simpleMarkdown }                                       from './modules/markdown.js';
import { sm2Step }                                              from './modules/sm2.js';
import { masteryFromQuiz, masteryFromCard, masteryFromCodeChallenge } from './modules/mastery.js';
import { computeQuizScore }                                     from './modules/quiz.js';
import { isModcheckUnlocked as _isModcheckUnlocked, submitModcheckLogic } from './modules/modcheck.js';
import { moduleProgress as _moduleProgress, isLessonLocked as _isLessonLocked } from './modules/progress-utils.js';
import { computeNextSteps as _computeNextSteps }                from './modules/planner.js';

// ── STATE ──────────────────────────────────────────────────
let course = null;
let cards = null;
let assessments = {};
let progress = {};
let cardSession = { queue: [], current: 0, flipped: false };
let quizState = { answers: {}, submitted: false };
let bundle = null;        // v3 bundle (loaded from bundle.json)
let concepts = { concepts: [] };
let adaptiveRules = {};
let learningPaths = { paths: [] };

function saveProgress() {
  if (!course) return;
  localStorage.setItem('grove_progress_' + course.slug, JSON.stringify(progress));
}

function loadProgress() {
  if (!course) return;
  const saved = localStorage.getItem('grove_progress_' + course.slug);
  progress = saved ? JSON.parse(saved) : { lessons: {}, cards: {}, quizzes: {}, codeChallenges: {}, modchecks: {} };
  if (!progress.lessons)         progress.lessons         = {};
  if (!progress.cards)           progress.cards           = {};
  if (!progress.quizzes)         progress.quizzes         = {};
  if (!progress.codeChallenges)  progress.codeChallenges  = {};
  if (!progress.conceptMastery)  progress.conceptMastery  = {};
  if (!progress.modchecks)       progress.modchecks       = {};
}

// ── FILE LOADING ───────────────────────────────────────────
function loadCourse(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      // Require v3 bundle (has version + course keys)
      if (data.version && data.course) {
        initFromBundle(data);
      } else {
        alert('⚠️ Plain course.json is not supported.\n\nBuild a bundle first:\n  node build-bundle.mjs <slug>\n\nThen load curriculum/<slug>/bundle.json');
        event.target.value = '';
      }
    } catch(err) {
      alert('Could not parse file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function initFromBundle(data) {
  bundle = data;
  course = data.course;
  concepts = data.concepts || { concepts: [] };
  adaptiveRules = data.adaptiveRules || {};
  learningPaths = data.learningPaths || { paths: [] };
  // Pre-populate assessments so no per-module file loading is needed
  Object.assign(assessments, data.quizzes || {});
  loadProgress();
  // Initialize SR on all cards and merge saved state
  cards = (data.cards || []).map(c => {
    const sr = { ease: 2.5, interval: 0, reviews: 0, lapses: 0, next_review: null };
    const saved = progress.cards[c.id];
    if (saved) Object.assign(sr, saved);
    return { ...c, sr };
  });
  buildSidebar();
  showView('plan');
  document.getElementById('course-meta').style.display = 'block';
  document.getElementById('load-prompt').style.display = 'none';
  const bundleBadge = document.getElementById('bundle-badge');
  if (bundleBadge) bundleBadge.style.display = '';
  const nprog = document.getElementById('nav-progress');
  const npath = document.getElementById('nav-paths');
  const ncode = document.getElementById('nav-code');
  if (nprog) nprog.style.display = '';
  if (npath) npath.style.display = '';
  const hasChallenges = Object.values(data.codeChallenges || {}).some(m => m.challenges?.length > 0);
  if (ncode) ncode.style.display = hasChallenges ? '' : 'none';
}

function loadCards(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      cards = data.cards || [];
      // Merge saved SR state (initialize SR if not present in source file)
      cards.forEach(c => {
        if (!c.sr) c.sr = { ease: 2.5, interval: 0, reviews: 0, lapses: 0, next_review: null };
        if (progress.cards[c.id]) Object.assign(c.sr, progress.cards[c.id]);
      });
      showView('cards');
    } catch(err) { alert('Could not parse cards.json'); }
  };
  reader.readAsText(file);
}

function loadQuiz(file, moduleId) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      assessments[moduleId] = JSON.parse(e.target.result);
      showQuiz(moduleId);
    } catch(err) { alert('Could not parse quiz file'); }
  };
  reader.readAsText(file);
}

// ── STATE-AWARE WRAPPERS (thread global state into pure functions) ────────────
function moduleProgress(m)      { return _moduleProgress(m, progress); }
function isLessonLocked(l)      { return _isLessonLocked(l, progress); }
function isModcheckUnlocked(id) { return _isModcheckUnlocked(id, { course, bundle, progress }); }
function computeNextSteps() {
  return _computeNextSteps({ course, bundle, cards, concepts, adaptiveRules, learningPaths, progress });
}

// ── MASTERY TRACKING ───────────────────────────────────────
function updateConceptMasteryFromQuiz(moduleId) {
  if (!bundle) return;
  const quiz = assessments[moduleId];
  if (!quiz) return;
  if (!progress.conceptMastery) progress.conceptMastery = {};
  progress.conceptMastery = masteryFromQuiz(progress.conceptMastery, quiz.questions, quizState.answers);
}

function updateConceptMasteryFromCard(card, quality) {
  if (!bundle) return;
  if (!progress.conceptMastery) progress.conceptMastery = {};
  progress.conceptMastery = masteryFromCard(
    progress.conceptMastery, card.concepts ?? [], quality, card.weight ?? 0.5
  );
}

function updateConceptMasteryFromCodeChallenge(moduleId, challengeId, testsPassed, testsTotal) {
  if (!bundle?.codeChallenges?.[moduleId]) return;
  const challenge = bundle.codeChallenges[moduleId].challenges?.find(c => c.id === challengeId);
  if (!challenge) return;
  if (!progress.conceptMastery) progress.conceptMastery = {};
  progress.conceptMastery = masteryFromCodeChallenge(
    progress.conceptMastery, challenge.concepts ?? [], testsPassed, testsTotal,
    challenge.pass_criteria ?? 0.70, challenge.weight ?? 1.0
  );
}

// ── ADAPTIVE VIEWS (Phase C) ─────────────────────────────
function renderProgress() {
  const main = document.getElementById('main');
  if (!bundle) {
    main.innerHTML = '<div class="card"><p>Load a bundle.json to see your progress.</p></div>';
    return;
  }

  const mastery      = progress.conceptMastery || {};
  const allLessons   = course.modules.flatMap(m => m.lessons || []);
  const doneLessons  = Object.keys(progress.lessons || {});
  const completedSet = new Set(doneLessons);

  const conceptList = (concepts.concepts || []).map(c => ({
    ...c,
    mastery:    mastery[c.id] ?? 0,
    introduced: (c.introduced_in || []).some(lid => completedSet.has(lid))
  }));
  const introduced  = conceptList.filter(c => c.introduced);
  const avgMastery  = introduced.length
    ? Math.round(introduced.reduce((s, c) => s + c.mastery, 0) / introduced.length * 100)
    : 0;
  const strongCount = introduced.filter(c => c.mastery >= 0.7).length;
  const weakCount   = introduced.filter(c => c.mastery  <  0.5).length;

  const moduleSections = (course.modules || []).map(m => {
    const mConcepts = conceptList.filter(c => (c.introduced_in || []).some(lid => m.lessons?.some(l => l.id === lid)));
    if (!mConcepts.length) return '';
    const items = mConcepts.map(c => {
      const pct   = Math.round(c.mastery * 100);
      const color = c.mastery >= 0.7 ? 'var(--accent)' : c.mastery >= 0.5 ? 'var(--warn)' : 'var(--danger)';
      const cls   = c.introduced ? '' : ' locked';
      return `
        <div class="mastery-card${cls}">
          <div style="font-size:13px;font-weight:500">${c.title}</div>
          <div style="font-size:11px;color:var(--muted);margin:2px 0">${pct}% mastery</div>
          <div class="mastery-bar-wrap">
            <div class="mastery-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>
      `;
    }).join('');
    return `<h3 style="margin-top:1.5rem;margin-bottom:0.75rem">${m.title}</h3><div class="mastery-grid">${items}</div>`;
  }).join('');

  main.innerHTML = `
    <h1>My progress</h1>
    <div class="flex gap-8 items-center mb-4" style="flex-wrap:wrap">
      <span class="badge badge-green">${doneLessons.length}/${allLessons.length} lessons</span>
      <span class="badge badge-amber">${avgMastery}% avg mastery</span>
      <span class="badge badge-green">${strongCount} strong concepts</span>
      ${weakCount > 0 ? `<span class="badge badge-red">${weakCount} weak concepts</span>` : ''}
    </div>
    ${moduleSections}
  `;
}

function renderPaths() {
  const main = document.getElementById('main');
  if (!bundle) {
    main.innerHTML = '<div class="card"><p>Load a bundle.json to see learning paths.</p></div>';
    return;
  }
  const paths = learningPaths.paths || [];
  if (!paths.length) {
    main.innerHTML = '<div class="card"><h1>Learning paths</h1><p>No learning paths defined.</p></div>';
    return;
  }
  const selected = progress.selectedPath || null;
  const pathCards = paths.map(p => {
    const active = p.id === selected;
    return `
      <div class="module-card ${active ? 'path-active' : ''}" onclick="selectPath('${active ? '' : p.id}')">
        <div class="module-header">
          <span class="module-title">${p.title}</span>
          ${active ? `<span class="badge badge-green">Active</span>` : ''}
        </div>
        <div class="module-meta">${p.description || ''}</div>
        <div style="margin-top:8px;font-size:12px;color:var(--muted)">${(p.lessons||[]).length} lessons</div>
      </div>
    `;
  }).join('');
  main.innerHTML = `
    <h1>Learning paths</h1>
    <p class="text-muted">Select a path to focus your study. Click the active path to deselect.</p>
    <div class="module-grid" style="margin-top:1.5rem">
      ${pathCards}
    </div>
  `;
}

function selectPath(pathId) {
  progress.selectedPath = pathId || null;
  saveProgress();
  renderPaths();
}

// ── SIDEBAR ────────────────────────────────────────────────
function buildSidebar() {
  const nav = document.getElementById('module-nav');
  nav.innerHTML = '';
  (course.modules || []).forEach(m => {
    const done = moduleProgress(m);
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.id = 'nav-m-' + m.id;
    btn.onclick = () => showModule(m.id);
    btn.innerHTML = `<span class="nav-dot ${done === 100 ? 'done' : done > 0 ? 'current' : ''}"></span>${m.title}`;
    nav.appendChild(btn);
  });
}

function updateOverallProgress() {
  if (!course) return;
  const all = course.modules.flatMap(m => m.lessons || []);
  const done = all.filter(l => progress.lessons[l.id]).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  document.getElementById('pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
}

// ── VIEWS ──────────────────────────────────────────────────
function showView(view) {
  ['plan','cards','code','progress','paths'].forEach(v => {
    const el = document.getElementById('nav-' + v);
    if (el) el.classList.toggle('active', v === view);
  });
  if (view === 'plan')     renderPlan();
  if (view === 'cards')    renderCards();
  if (view === 'code')     renderCodeView();
  if (view === 'progress') renderProgress();
  if (view === 'paths')    renderPaths();
}

function showModule(moduleId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('nav-m-' + moduleId);
  if (el) el.classList.add('active');
  renderModule(moduleId);
}

// ── LEARNING PLAN ──────────────────────────────────────────
function renderPlan() {
  const m = document.getElementById('main');
  const lp = course.learning_plan || {};

  let adaptiveHtml = '';
  let masteryGateHtml = '';
  if (bundle) {
    const { nextLessons, weakConcepts, reviewQueue, blockedByMastery, unlockedModchecks } = computeNextSteps();
    const completedCount = Object.keys(progress.lessons || {}).length;

    // Recommended next — prefer unlocked modchecks over new lessons
    let nextHtml = '';
    if (unlockedModchecks.length > 0) {
      const mc = unlockedModchecks[0];
      nextHtml = `
        <div style="margin-bottom:${reviewQueue.length || weakConcepts.length ? '12px' : '0'}">
          <div class="text-muted" style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Recommended next</div>
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--warn-light);border:1px solid var(--warn);border-radius:var(--radius);cursor:pointer" onclick="showModcheck('${mc.moduleId}')">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--warn);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">✓?</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:500;color:var(--text)">Module Check — ${mc.moduleTitle}</div>
              <div class="text-muted">${mc.modcheck.questions?.length ?? 0} recall questions · self-graded</div>
            </div>
            <span style="color:var(--warn)">&#8594;</span>
          </div>
        </div>`;
    } else if (nextLessons.length > 0) {
      const next = nextLessons[0];
      const mod  = course.modules.find(mod => mod.lessons?.some(l => l.id === next.id));
      nextHtml = `
        <div style="margin-bottom:${reviewQueue.length || weakConcepts.length ? '12px' : '0'}">
          <div class="text-muted" style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Recommended next</div>
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border-radius:var(--radius);cursor:pointer" onclick="showLesson('${next.id}','${mod?.id || ''}')">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">${next.id}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:500;color:var(--text)">${next.title}</div>
              <div class="text-muted">${next.estimated_minutes}m &middot; difficulty ${next.difficulty ?? '&mdash;'}</div>
            </div>
            <span style="color:var(--accent)">&#8594;</span>
          </div>
        </div>`;
    } else if (completedCount === 0) {
      nextHtml = `<div style="margin-bottom:${reviewQueue.length || weakConcepts.length ? '12px' : '0'};padding:10px 12px;background:var(--surface);border-radius:var(--radius);font-size:14px;color:var(--muted)">Complete your first lesson to unlock personalized recommendations.</div>`;
    } else {
      nextHtml = `<div style="padding:10px 12px;background:var(--surface);border-radius:var(--radius);font-size:14px;font-weight:500;color:var(--accent-text)">All available lessons unlocked!</div>`;
    }

    const reviewHtml = reviewQueue.length > 0 ? `
      <div style="margin-bottom:${weakConcepts.length ? '12px' : '0'}">
        <div class="text-muted" style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Cards due for review</div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--surface);border-radius:var(--radius)">
          <span style="font-size:14px;color:var(--text)">${reviewQueue.length} card${reviewQueue.length !== 1 ? 's' : ''} due today</span>
          <button class="btn btn-primary" onclick="showView('cards')" style="padding:6px 12px;font-size:13px">Review</button>
        </div>
      </div>` : '';
    const weakHtml = weakConcepts.length > 0 ? `
      <div>
        <div class="text-muted" style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Weak areas</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${weakConcepts.slice(0, 6).map(c => `<span class="badge badge-amber" title="${Math.round((c.mastery||0)*100)}% mastery">${c.title}</span>`).join('')}</div>
      </div>` : '';
    masteryGateHtml = blockedByMastery.length > 0 ? `
      <div class="card" style="margin-bottom:1.5rem;background:var(--warn-light);border-color:var(--warn)">
        <h2 style="margin-bottom:12px;color:var(--warn)">Milestone gate</h2>
        ${blockedByMastery.map(l => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border-radius:var(--radius);margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--warn);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">&#128274;</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500;color:var(--text)">${l.title}</div>
            <div class="text-muted">Avg mastery ${Math.round(l.avgMastery*100)}% &mdash; need ${Math.round(l.threshold*100)}%</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--warn);margin:4px 0 0">Take the ${l.moduleName} quiz or review flashcards to unlock this milestone.</p>`).join('')}
      </div>` : '';
    adaptiveHtml = `<div class="card" style="margin-bottom:1.5rem;background:var(--accent-light);border-color:var(--accent)">
      <h2 style="margin-bottom:12px;color:var(--accent-text)">What's next?</h2>
      ${nextHtml}${reviewHtml}${weakHtml}
    </div>`;
  }

  const flashcardRow = bundle ? '' : `
    <div class="card" style="margin-top:1rem">
      <div class="flex justify-between items-center">
        <div>
          <h3>Flashcard deck</h3>
          <p style="margin:0">Review all key concepts with spaced repetition</p>
        </div>
        <div>
          <button class="btn" onclick="document.getElementById('cards-input').click()">Load cards.json</button>
          <input type="file" id="cards-input" accept=".json" onchange="loadCards(this.files[0])" style="display:none">
        </div>
      </div>
    </div>`;

  m.innerHTML = `
    <h1>${course.topic}</h1>
    <p style="margin-bottom:1.5rem">${course.summary || ''}</p>
    <div class="flex gap-8 items-center mb-4" style="flex-wrap:wrap">
      <span class="badge badge-green">${course.total_lessons} lessons</span>
      <span class="badge badge-gray">${Math.round((course.total_estimated_hours || 0) * 60)} min total</span>
      <span class="badge badge-amber">${lp.suggested_schedule || ''}</span>
    </div>
    ${adaptiveHtml}${masteryGateHtml}
    <div class="module-grid">
      ${(course.modules || []).map(renderModuleCard).join('')}
    </div>
    ${flashcardRow}
  `;
  updateOverallProgress();
}

function renderModuleCard(m) {
  const pct = moduleProgress(m);
  const lessons = (m.lessons || []).map(l => {
    const locked  = isLessonLocked(l);
    const done    = !!progress.lessons[l.id];
    const handler = locked ? '' : `onclick="showLesson('${l.id}','${m.id}')"`;
    const lockIcon = locked
      ? `<span title="Complete prerequisites first" style="margin-left:auto;font-size:13px;opacity:0.5">🔒</span>`
      : `<span class="text-muted" style="margin-left:auto">${l.estimated_minutes}m</span>`;
    return `
    <li class="lesson-item${locked ? ' locked' : ''}" ${handler} style="${locked ? 'opacity:0.45;cursor:default;' : ''}">
      <div class="lesson-check ${done ? 'done' : ''}">
        ${done ? '✓' : ''}
      </div>
      <span>${l.title}</span>
      ${lockIcon}
    </li>
  `;
  }).join('');

  // Module check row — shown only when all lessons are complete
  const mc = bundle?.modchecks?.[m.id];
  const mcUnlocked = isModcheckUnlocked(m.id);
  const mcDone = !!progress.modchecks?.[m.id]?.done;
  const modcheckRow = mc && mcUnlocked ? `
    <li class="lesson-item modcheck-item" onclick="showModcheck('${m.id}')">
      <div class="lesson-check ${mcDone ? 'done' : ''}" style="border-color:var(--warn);${mcDone ? 'background:var(--accent);border-color:var(--accent)' : ''}">
        ${mcDone ? '✓' : ''}
      </div>
      <span>Module Check</span>
      <span style="margin-left:auto;font-size:12px;color:var(--warn)">${mcDone ? 'Done' : mc.questions?.length + 'Q'}</span>
    </li>` : '';

  return `
    <div class="module-card" onclick="toggleModule('${m.id}')">
      <div class="module-header">
        <span class="module-title">${m.id} · ${m.title}</span>
        <span class="badge ${pct===100?'badge-green':pct>0?'badge-amber':'badge-gray'}">${pct}%</span>
      </div>
      <div class="module-meta">${(m.lessons||[]).length} lessons · ${m.description || ''}</div>
      <ul class="lesson-list open" id="ll-${m.id}">${lessons}${modcheckRow}</ul>
    </div>
  `;
}

function toggleModule(id) {
  const el = document.getElementById('ll-' + id);
  if (el) el.classList.toggle('open');
}

function renderModule(moduleId) {
  const m = course.modules.find(x => x.id === moduleId);
  if (!m) return;
  const main = document.getElementById('main');
  const mc = bundle?.modchecks?.[moduleId];
  const mcUnlocked = isModcheckUnlocked(moduleId);
  const mcDone = !!progress.modchecks?.[moduleId]?.done;

  const modcheckSection = mc ? `
    <div class="card card-sm flex justify-between items-center" style="${mcUnlocked ? 'cursor:pointer;' : 'opacity:0.45;'}" ${mcUnlocked ? `onclick="showModcheck('${moduleId}')"` : ''}>
      <div>
        <div style="font-size:14px;font-weight:500">Module Check ${mcUnlocked ? '' : '🔒'}</div>
        <div class="text-muted">${mcUnlocked
          ? (mcDone ? 'Completed ✓' : mc.questions?.length + ' recall questions · self-graded')
          : 'Complete all lessons to unlock'}</div>
      </div>
      ${mcUnlocked ? `<button class="btn ${mcDone ? '' : 'btn-primary'}" onclick="event.stopPropagation();showModcheck('${moduleId}')">
        ${mcDone ? 'Review' : 'Start'}
      </button>` : ''}
    </div>` : '';

  main.innerHTML = `
    <div class="flex items-center gap-8 mb-4">
      <h1>${m.title}</h1>
      <span class="badge badge-gray">${moduleProgress(m)}%</span>
    </div>
    <p>${m.description}</p>
    <h2 style="margin-top:1.5rem">Learning objectives</h2>
    <ul style="padding-left:1.4rem;margin-bottom:1.5rem">
      ${(m.objectives||[]).map(o => `<li style="font-size:14px;margin-bottom:4px">${o}</li>`).join('')}
    </ul>
    <h2>Lessons</h2>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:1.5rem">
      ${(m.lessons||[]).map(l => {
        const locked = isLessonLocked(l);
        const done   = !!progress.lessons[l.id];
        return `
        <div class="card card-sm flex justify-between items-center" style="${locked ? 'opacity:0.45;cursor:default;' : 'cursor:pointer;'}" ${locked ? '' : `onclick="showLesson('${l.id}','${m.id}')"`}>
          <div class="flex items-center gap-8">
            <div class="lesson-check ${done?'done':''}">${done?'✓':''}</div>
            <div>
              <div style="font-size:14px;font-weight:500">${l.title}</div>
              <div class="text-muted">${l.type} · ${l.estimated_minutes} min${locked ? ' · 🔒 locked' : ''}</div>
            </div>
          </div>
          <span>${locked ? '' : '→'}</span>
        </div>
      `;
      }).join('')}
    </div>
    ${modcheckSection}
    ${m.has_assessment ? `
      <div class="card card-sm flex justify-between items-center" style="margin-top:8px">
        <div>
          <div style="font-size:14px;font-weight:500">Module assessment</div>
          <div class="text-muted">${progress.quizzes[moduleId] ? 'Score: ' + progress.quizzes[moduleId].score + '%' : 'Not yet taken'}</div>
        </div>
        <div>
          <button class="btn btn-primary" onclick="promptQuiz('${moduleId}')">
            ${progress.quizzes[moduleId] ? 'Retake' : 'Take quiz'}
          </button>
        </div>
      </div>
    ` : ''}
  `;
}

// ── LESSON READER ──────────────────────────────────────────
function showLesson(lessonId, moduleId) {
  const m = course.modules.find(x => x.id === moduleId);
  const l = m?.lessons.find(x => x.id === lessonId);
  if (!l) return;
  if (isLessonLocked(l)) {
    const prereqTitles = (l.prerequisites || []).map(pid => {
      for (const mod of course.modules) {
        const found = mod.lessons?.find(x => x.id === pid);
        if (found) return found.title;
      }
      return pid;
    }).join(', ');
    alert(`🔒 This lesson is locked.\n\nComplete first: ${prereqTitles}`);
    return;
  }

  const allLessons = course.modules.flatMap(mod => mod.lessons || []);
  const idx = allLessons.findIndex(x => x.id === lessonId);
  const prev = idx > 0 ? allLessons[idx-1] : null;
  const next = idx < allLessons.length-1 ? allLessons[idx+1] : null;

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="flex items-center gap-8 mb-4" style="flex-wrap:wrap">
      <span class="badge badge-gray">${m.title}</span>
      <span class="badge badge-gray">${l.type}</span>
      <span class="text-muted">${l.estimated_minutes} min</span>
    </div>
    <h1 style="margin-bottom:1rem">${l.title}</h1>

    <div id="lesson-body" class="card lesson-content">
      ${(bundle?.lessons?.[lessonId]) ? simpleMarkdown(bundle.lessons[lessonId]) : `
      <div style="text-align:center;color:var(--muted);padding:2rem">
        <p>Load the lesson file to read it.</p>
        <button class="btn mt-4" onclick="document.getElementById('lesson-file-input').click()">
          Load ${lessonId}.md
        </button>
        <input type="file" id="lesson-file-input" accept=".md" onchange="loadLessonFile(event,'${lessonId}','${moduleId}')" style="display:none">
      </div>`}
    </div>

    <div class="lesson-nav">
      <div>${prev ? `<button class="btn" onclick="showLesson('${prev.id}','${getModuleForLesson(prev.id)}')">← ${prev.title}</button>` : ''}</div>
      <div class="flex gap-8">
        ${!progress.lessons[lessonId] ? `<button class="btn btn-primary" onclick="markDone('${lessonId}','${moduleId}')">Mark complete ✓</button>` : `<span class="badge badge-green">Completed ✓</span>`}
        ${next ? `<button class="btn" onclick="showLesson('${next.id}','${getModuleForLesson(next.id)}')">Next →</button>` : ''}
      </div>
    </div>
  `;
}

function loadLessonFile(event, lessonId, moduleId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const body = document.getElementById('lesson-body');
    if (body) body.innerHTML = simpleMarkdown(e.target.result);
  };
  reader.readAsText(file);
}

function getModuleForLesson(lessonId) {
  const m = course.modules.find(mod => mod.lessons?.some(l => l.id === lessonId));
  return m?.id || '';
}

function markDone(lessonId, moduleId) {
  progress.lessons[lessonId] = { date: new Date().toISOString() };
  saveProgress();
  buildSidebar();
  updateOverallProgress();
  showLesson(lessonId, moduleId);
}

// ── MODULE CHECK ───────────────────────────────────────────
function showModcheck(moduleId) {
  const mc = bundle?.modchecks?.[moduleId];
  if (!mc) return;
  if (!isModcheckUnlocked(moduleId)) {
    alert('Complete all lessons in this module first.');
    return;
  }

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navM = document.getElementById('nav-m-' + moduleId);
  if (navM) navM.classList.add('active');

  const main = document.getElementById('main');
  const done = !!progress.modchecks?.[moduleId]?.done;
  const hasMCQ = mc.questions.some(q => q.type === 'mcq');
  const subtitle = hasMCQ
    ? `${mc.questions.length} questions · Multiple choice auto-scored; short-answer self-scored.`
    : `${mc.questions.length} recall questions · Reveal each answer, then self-score honestly.`;

  const rows = mc.questions.map((q, i) => {
    const qText   = q.question ?? q.q ?? '';
    const qAnswer = q.answer ?? q.a ?? '';

    if (q.type === 'mcq' && q.options) {
      const opts = Object.entries(q.options).map(([k, v]) => `
        <div class="option" id="mcopt-${moduleId}-${q.id}-${k}"
          onclick="selectModcheckOption('${moduleId}','${q.id}','${k}','${q.correct}')">
          <span class="option-key">${k}</span> ${v}
        </div>`).join('');
      return `
    <div class="modcheck-q" id="mcq-${moduleId}-${q.id}">
      <div class="question-text">${i + 1}. ${qText}</div>
      <div class="option-list">${opts}</div>
      <div class="explanation" id="mcexp-${moduleId}-${q.id}">${q.explanation || ''}</div>
    </div>`;
    }

    // Open-ended (self-scored)
    return `
    <div class="modcheck-q" id="mcq-${moduleId}-${q.id}">
      <div class="question-text">${i + 1}. ${qText}</div>
      <div class="modcheck-answer" id="mca-${moduleId}-${q.id}">
        <strong>Answer:</strong> ${qAnswer}
      </div>
      <div class="modcheck-self-score">
        <button class="btn" style="font-size:12px;padding:5px 10px" onclick="toggleModcheckAnswer('${moduleId}','${q.id}')">Reveal answer</button>
        <button class="btn" style="font-size:12px;padding:5px 10px;border-color:var(--accent);color:var(--accent-text)" onclick="scoreModcheckQ('${moduleId}','${q.id}',true)">✓ Got it</button>
        <button class="btn" style="font-size:12px;padding:5px 10px;border-color:var(--danger);color:var(--danger)" onclick="scoreModcheckQ('${moduleId}','${q.id}',false)">✗ Missed</button>
      </div>
    </div>`;
  }).join('');

  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
      <button class="btn" onclick="showModule('${moduleId}')" style="font-size:12px;padding:5px 10px">← Back to module</button>
      ${done ? '<span class="badge badge-green">Previously completed ✓</span>' : ''}
    </div>
    <h1>${mc.title}</h1>
    <p class="text-muted">${subtitle}</p>
    <div style="margin-top:1.5rem">${rows}</div>
    <div class="btn-row">
      <button class="btn btn-primary" id="mc-submit-btn" onclick="submitModcheck('${moduleId}')">Mark complete</button>
    </div>
    <div id="mc-result-${moduleId}" style="margin-top:1rem;display:none"></div>
  `;

  // Restore scores already saved in this session
  const saved = progress.modchecks?.[moduleId]?.scores || {};
  Object.entries(saved).forEach(([qId, correct]) => {
    const q = mc.questions.find(x => x.id === qId);
    if (q?.type === 'mcq') {
      // Re-apply MCQ highlight — we don't know which option was picked, just mark border
      applyModcheckScore(moduleId, qId, correct, false);
    } else {
      applyModcheckScore(moduleId, qId, correct, false);
    }
  });
}

function selectModcheckOption(moduleId, qId, selected, correct) {
  const isCorrect = selected === correct;
  scoreModcheckQ(moduleId, qId, isCorrect);

  // Highlight all options: green for correct, red for wrong selection
  const q = bundle?.modchecks?.[moduleId]?.questions.find(x => x.id === qId);
  Object.keys(q?.options ?? {}).forEach(k => {
    const el = document.getElementById(`mcopt-${moduleId}-${qId}-${k}`);
    if (!el) return;
    el.style.pointerEvents = 'none';
    if (k === correct) {
      el.style.borderColor = 'var(--accent)';
      el.style.background  = 'var(--accent-light, #e8f5e9)';
    } else if (k === selected) {
      el.style.borderColor = 'var(--danger)';
      el.style.background  = 'var(--danger-light, #fdecea)';
    }
  });

  // Show explanation
  const expEl = document.getElementById(`mcexp-${moduleId}-${qId}`);
  if (expEl && q?.explanation) expEl.classList.add('show');
}

function toggleModcheckAnswer(moduleId, qId) {
  const el = document.getElementById(`mca-${moduleId}-${qId}`);
  if (el) el.classList.toggle('show');
}

function scoreModcheckQ(moduleId, qId, correct) {
  if (!progress.modchecks) progress.modchecks = {};
  if (!progress.modchecks[moduleId]) progress.modchecks[moduleId] = { scores: {}, done: false };
  progress.modchecks[moduleId].scores[qId] = correct;
  saveProgress();
  applyModcheckScore(moduleId, qId, correct, true);
}

function applyModcheckScore(moduleId, qId, correct, revealAnswer) {
  const card = document.getElementById(`mcq-${moduleId}-${qId}`);
  if (!card) return;
  card.style.borderColor = correct ? 'var(--accent)' : 'var(--danger)';
  if (revealAnswer) {
    const ans = document.getElementById(`mca-${moduleId}-${qId}`);
    if (ans) ans.classList.add('show');
  }
}

function submitModcheck(moduleId) {
  const mc = bundle?.modchecks?.[moduleId];
  if (!mc) return;
  if (!progress.modchecks) progress.modchecks = {};
  if (!progress.modchecks[moduleId]) progress.modchecks[moduleId] = { scores: {}, done: false };

  const scores = progress.modchecks[moduleId].scores || {};
  const total = mc.questions.length;
  const correct = Object.values(scores).filter(Boolean).length;

  progress.modchecks[moduleId].done = true;
  progress.modchecks[moduleId].date = new Date().toISOString();
  progress.modchecks[moduleId].score = total > 0 ? Math.round((correct / total) * 100) : null;
  saveProgress();
  buildSidebar();

  const result = document.getElementById(`mc-result-${moduleId}`);
  if (result) {
    result.style.display = 'block';
    result.innerHTML = `
      <div class="card" style="text-align:center;padding:1.5rem">
        <div class="quiz-score">${correct}/${total}</div>
        <div class="quiz-score-label">self-assessed correct</div>
        <p style="margin-top:0.75rem">Review any missed questions, then move on to the next module.</p>
        <button class="btn btn-primary" style="margin-top:0.75rem" onclick="renderPlan()">Back to learning plan</button>
      </div>
    `;
  }
  const btn = document.getElementById('mc-submit-btn');
  if (btn) btn.disabled = true;
}

// ── FLASHCARDS (SM-2) ──────────────────────────────────────
function renderCards() {
  const main = document.getElementById('main');
  if (!cards) {
    main.innerHTML = `
      <h1>Flashcards</h1>
      <div class="drop-zone" onclick="document.getElementById('fc-input').click()">
        <p>Load your cards.json file to start reviewing</p>
        <button class="btn mt-4">Load cards.json</button>
        <input type="file" id="fc-input" accept=".json" onchange="loadCards(this.files[0])" style="display:none">
      </div>
    `;
    return;
  }

  const due = cards.filter(c => {
    if (!c.sr) c.sr = { ease: 2.5, interval: 0, reviews: 0, lapses: 0, next_review: null };
    if (!c.sr.next_review) return true;
    return new Date(c.sr.next_review) <= new Date();
  });

  if (!due.length) {
    const next = cards.reduce((a, b) => new Date(a.sr.next_review) < new Date(b.sr.next_review) ? a : b);
    main.innerHTML = `
      <h1>Flashcards</h1>
      <div class="card" style="text-align:center;padding:2.5rem">
        <h2>All caught up!</h2>
        <p>Next card due: ${new Date(next.sr.next_review).toLocaleDateString()}</p>
        <p>${cards.length} cards total · ${cards.filter(c=>c.sr.reviews>0).length} reviewed</p>
      </div>
    `;
    return;
  }

  cardSession = { queue: [...due].sort(() => Math.random()-0.5), current: 0, flipped: false };
  renderCard();
}

function renderCard() {
  const main = document.getElementById('main');
  const { queue, current } = cardSession;
  if (current >= queue.length) {
    main.innerHTML = `
      <h1>Session complete</h1>
      <div class="card" style="text-align:center;padding:2.5rem">
        <h2>Well done!</h2>
        <p>Reviewed ${queue.length} cards.</p>
        <button class="btn btn-primary mt-4" onclick="renderCards()">Review again</button>
      </div>
    `;
    return;
  }

  const card = queue[current];
  main.innerHTML = `
    <h1>Flashcards</h1>
    <div class="fc-progress">${current + 1} of ${queue.length} due today</div>
    <div class="flashcard-wrap">
      <div class="flashcard" id="fc" onclick="flipCard()">
        <div class="fc-face">
          <div class="fc-label">Question · click to reveal</div>
          <div class="fc-text">${card.front}</div>
          <div class="fc-source">${card.module} · ${card.type}</div>
        </div>
        <div class="fc-face fc-back">
          <div class="fc-label">Answer</div>
          <div class="fc-text">${card.back}</div>
          <div class="fc-source">${card.source_ref}</div>
        </div>
      </div>
    </div>
    <div id="rating-row" style="display:none" class="rating-row">
      <button class="rating-btn hard" onclick="rateCard(1)">Hard</button>
      <button class="rating-btn okay" onclick="rateCard(3)">Okay</button>
      <button class="rating-btn easy" onclick="rateCard(5)">Easy</button>
    </div>
  `;
}

function flipCard() {
  const fc = document.getElementById('fc');
  const rr = document.getElementById('rating-row');
  if (fc) fc.classList.toggle('flipped');
  if (rr) rr.style.display = 'flex';
  cardSession.flipped = true;
}

function rateCard(quality) {
  const card   = cardSession.queue[cardSession.current];
  const newSr  = sm2Step(card.sr, quality);
  card.sr      = newSr;

  updateConceptMasteryFromCard(card, quality);
  progress.cards[card.id] = { ...newSr };
  saveProgress();

  cardSession.current++;
  renderCard();
}

// ── CODE CHALLENGES VIEW ───────────────────────────────────
function renderCodeView() {
  const main = document.getElementById('main');
  if (!bundle) {
    main.innerHTML = '<div class="card"><p>Load a bundle.json to see code challenges.</p></div>';
    return;
  }

  const allChallenges = [];
  for (const mod of course.modules || []) {
    const set = bundle.codeChallenges?.[mod.id];
    if (!set?.challenges?.length) continue;
    for (const c of set.challenges) {
      const saved = progress.codeChallenges?.[mod.id]?.[c.id];
      allChallenges.push({ moduleId: mod.id, moduleTitle: mod.title, challenge: c, done: saved?.passed ?? false, testsPassed: saved?.testsPassed, testsTotal: saved?.testsTotal });
    }
  }

  if (!allChallenges.length) {
    main.innerHTML = '<div class="card"><h1>Code Challenges</h1><p class="text-muted">No code challenges found in this bundle.</p></div>';
    return;
  }

  const totalDone = allChallenges.filter(x => x.done).length;
  const langBadge = lang => `<span class="badge ${lang === 'python' ? 'badge-green' : 'badge-amber'}">${lang}</span>`;

  const challengeCards = allChallenges.map(({ moduleId, moduleTitle, challenge, done, testsPassed, testsTotal }) => {
    const statusIcon = done ? '✓' : '○';
    const statusStyle = done ? 'color:var(--accent);font-weight:600' : 'color:var(--muted)';
    const sub = (testsPassed !== undefined)
      ? `<span class="text-muted" style="font-size:12px">${testsPassed}/${testsTotal} tests passed</span>`
      : `<span class="text-muted" style="font-size:12px">${challenge.test_cases?.length ?? 0} test cases</span>`;
    return `
      <div class="module-card" onclick="showChallenge('${moduleId}','${challenge.id}')" style="cursor:pointer">
        <div class="module-header">
          <span class="module-title" style="font-size:14px">${challenge.id} — ${challenge.prompt.slice(0, 60)}${challenge.prompt.length > 60 ? '…' : ''}</span>
          <span style="${statusStyle}">${statusIcon}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
          ${langBadge(challenge.language)}
          <span class="text-muted" style="font-size:12px">${moduleTitle}</span>
          ${sub}
        </div>
      </div>
    `;
  }).join('');

  main.innerHTML = `
    <h1>Code Challenges</h1>
    <p class="text-muted">${totalDone} of ${allChallenges.length} completed</p>
    <div class="progress-wrap" style="margin:1rem 0">
      <div class="progress-bar"><div class="progress-fill" style="width:${allChallenges.length ? Math.round(totalDone/allChallenges.length*100) : 0}%"></div></div>
    </div>
    <div class="module-grid" style="margin-top:1.5rem">${challengeCards}</div>
  `;
}

function showChallenge(moduleId, challengeId) {
  const main = document.getElementById('main');
  const set = bundle?.codeChallenges?.[moduleId];
  const challenge = set?.challenges?.find(c => c.id === challengeId);
  if (!challenge) return;

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const ncode = document.getElementById('nav-code');
  if (ncode) ncode.classList.add('active');

  const saved = progress.codeChallenges?.[moduleId]?.[challengeId];
  const savedCode = quizState.answers?.[challengeId]?.code || challenge.starter_code || '';
  const visibleTests = challenge.test_cases.filter(t => t.visibility === 'visible');
  const hiddenCount  = challenge.test_cases.filter(t => t.visibility === 'hidden').length;

  const testsList = visibleTests.map(t => `
    <div class="test-case">
      <div class="test-case-name">📋 ${t.name}</div>
      <div class="test-case-info"><strong>Expected:</strong> ${t.expected_output}</div>
    </div>
  `).join('');

  const statusBanner = saved?.passed
    ? `<div style="padding:10px 14px;background:var(--accent-light);border:1px solid var(--accent);border-radius:var(--radius);font-size:13px;color:var(--accent-text);margin-bottom:1rem">✓ Completed — ${saved.testsPassed}/${saved.testsTotal} tests passed</div>`
    : '';

  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
      <button class="btn" onclick="renderCodeView()" style="font-size:12px;padding:5px 10px">← All challenges</button>
      <span class="badge badge-${challenge.language === 'python' ? 'green' : 'amber'}">${challenge.language}</span>
    </div>
    <h1 style="font-size:20px;margin-bottom:0.5rem">${challengeId}</h1>
    ${statusBanner}
    <div class="card card-sm" style="margin-bottom:1rem">
      <div class="question-text" style="font-size:15px">${simpleMarkdown(challenge.prompt)}</div>
      <p class="text-muted" style="margin-top:8px;margin-bottom:0">Pass threshold: ${Math.round((challenge.pass_criteria ?? 0.70) * 100)}% · ${challenge.test_cases.length} tests (${hiddenCount} hidden)</p>
    </div>
    <div class="code-editor">
      <textarea id="code-${challengeId}" placeholder="Write your solution…" data-challenge="${challengeId}">${savedCode}</textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
      <button class="run-tests-btn" onclick="runChallengeTests('${moduleId}','${challengeId}')">Run visible tests</button>
      <button class="run-tests-btn" style="background:var(--text)" onclick="submitChallenge('${moduleId}','${challengeId}')">Submit all tests</button>
    </div>
    <div class="test-cases-visible" style="margin-top:1rem">
      <strong style="display:block;margin-bottom:8px">Visible test cases:</strong>
      ${testsList || '<em>No visible test cases</em>'}
    </div>
    <div class="test-results" id="tests-${challengeId}" style="display:none"></div>
  `;
  initCodeEditor(challengeId, challenge.language, savedCode);
}

async function initCodeEditor(challengeId, language, code) {
  if (window._cmEditors[challengeId]) {
    window._cmEditors[challengeId].toTextArea();
    delete window._cmEditors[challengeId];
  }
  try {
    const CM = await loadCodeMirror();
    const el = document.getElementById(`code-${challengeId}`);
    if (!el) return;
    el.style.display = '';
    const cm = CM.fromTextArea(el, {
      mode: language === 'python' ? 'python' : 'javascript',
      lineNumbers: true,
      indentUnit: language === 'python' ? 4 : 2,
      tabSize:    language === 'python' ? 4 : 2,
      indentWithTabs: false,
      lineWrapping: false,
      autofocus: true,
      extraKeys: {
        Tab:          cm => cm.execCommand('indentMore'),
        'Shift-Tab':  cm => cm.execCommand('indentLess'),
      }
    });
    cm.setValue(code);
    window._cmEditors[challengeId] = cm;
  } catch (err) {
    console.warn('CodeMirror unavailable, using plain textarea:', err);
    const el = document.getElementById(`code-${challengeId}`);
    if (el) el.style.display = '';
  }
}

function getEditorCode(challengeId) {
  const cm = window._cmEditors?.[challengeId];
  if (cm) return cm.getValue();
  const el = document.getElementById(`code-${challengeId}`);
  return el ? el.value : '';
}

async function runChallengeTests(moduleId, challengeId) {
  const challenge = bundle?.codeChallenges?.[moduleId]?.challenges?.find(c => c.id === challengeId);
  const resultsEl = document.getElementById(`tests-${challengeId}`);
  const btn       = document.querySelector(`button[onclick="runChallengeTests('${moduleId}','${challengeId}')"]`);
  if (!challenge || !resultsEl) return;

  const code = getEditorCode(challengeId).trim();
  if (!code) { alert('Please enter some code first.'); return; }

  const fnName = detectFunctionName(code, challenge.language);
  if (!fnName) {
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `<div class="test-result failed">✗ Could not detect a function. Define one like: <code>def solution(...):</code></div>`;
    return;
  }

  resultsEl.style.display = 'block';
  resultsEl.innerHTML = `<div style="color:var(--muted);font-size:13px">⏳ Running ${challenge.language === 'python' ? 'Python (loading WASM…)' : 'JavaScript'} tests…</div>`;
  if (btn) btn.disabled = true;

  try {
    const visibleTests = challenge.test_cases.filter(t => t.visibility === 'visible');
    const results = challenge.language === 'python'
      ? await evalPython(code, visibleTests, fnName)
      : await evalJavaScript(code, visibleTests, fnName);
    resultsEl.innerHTML = renderTestResults(results, challengeId);
    quizState.answers[challengeId] = { code, language: challenge.language, fnName };
  } catch (err) {
    resultsEl.innerHTML = `<div class="test-result failed">✗ ${err.message}</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function submitChallenge(moduleId, challengeId) {
  const challenge = bundle?.codeChallenges?.[moduleId]?.challenges?.find(c => c.id === challengeId);
  const resultsEl = document.getElementById(`tests-${challengeId}`);
  const btn       = document.querySelector(`button[onclick="submitChallenge('${moduleId}','${challengeId}')"]`);
  if (!challenge) return;

  const code = getEditorCode(challengeId).trim();
  if (!code) { alert('Please enter some code first.'); return; }

  const fnName = detectFunctionName(code, challenge.language);
  if (!fnName) {
    if (resultsEl) { resultsEl.style.display = 'block'; resultsEl.innerHTML = `<div class="test-result failed">✗ Could not detect a function.</div>`; }
    return;
  }

  if (resultsEl) { resultsEl.style.display = 'block'; resultsEl.innerHTML = `<div style="color:var(--muted);font-size:13px">⏳ Running all tests…</div>`; }
  if (btn) btn.disabled = true;

  try {
    const results = challenge.language === 'python'
      ? await evalPython(code, challenge.test_cases, fnName)
      : await evalJavaScript(code, challenge.test_cases, fnName);

    if (resultsEl) resultsEl.innerHTML = renderTestResults(results, challengeId);

    const testsPassed = results.filter(r => r.passed).length;
    const passed = testsPassed >= challenge.test_cases.length * (challenge.pass_criteria ?? 0.70);
    updateConceptMasteryFromCodeChallenge(moduleId, challengeId, testsPassed, challenge.test_cases.length);

    if (!progress.codeChallenges)              progress.codeChallenges = {};
    if (!progress.codeChallenges[moduleId])    progress.codeChallenges[moduleId] = {};
    progress.codeChallenges[moduleId][challengeId] = { passed, testsPassed, testsTotal: challenge.test_cases.length, date: new Date().toISOString() };
    saveProgress();

    const dotCode = document.getElementById('dot-code');
    if (dotCode) {
      const allDone = Object.values(bundle.codeChallenges || {})
        .flatMap(m => m.challenges || [])
        .every(c => progress.codeChallenges?.[moduleId]?.[c.id]?.passed);
      dotCode.className = 'nav-dot' + (allDone ? ' done' : ' current');
    }
  } catch (err) {
    if (resultsEl) resultsEl.innerHTML = `<div class="test-result failed">✗ ${err.message}</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── ASSESSMENT ─────────────────────────────────────────────
function promptQuiz(moduleId) {
  if (assessments[moduleId]) { showQuiz(moduleId); return; }
  const main = document.getElementById('main');
  const m = course.modules.find(x => x.id === moduleId);
  main.innerHTML += `
    <div class="card mt-4">
      <h3>Load quiz file</h3>
      <p>Load the quiz JSON file for this module.</p>
      <button class="btn" onclick="document.getElementById('quiz-input-${moduleId}').click()">
        Load quiz-${moduleId}.json
      </button>
      <input type="file" id="quiz-input-${moduleId}" accept=".json"
        onchange="loadQuiz(this.files[0],'${moduleId}')" style="display:none">
    </div>
  `;
}

function showQuiz(moduleId) {
  const quiz = assessments[moduleId];
  if (!quiz) return;
  quizState = { answers: {}, submitted: false };

  const main = document.getElementById('main');
  const questions = (quiz.questions || []).map((q, i) => renderQuestion(q, i + 1)).join('');
  const hasChallenges = (bundle?.codeChallenges?.[moduleId]?.challenges?.length ?? 0) > 0;
  const challengesHint = hasChallenges
    ? `<div style="margin-top:1rem;padding:10px 14px;background:var(--accent-light);border-radius:var(--radius);font-size:13px">
         💻 This module has <strong>code challenges</strong> — find them under <strong>Code challenges</strong> in the sidebar.
       </div>`
    : '';

  main.innerHTML = `
    <h1>${quiz.title}</h1>
    <p class="text-muted">${quiz.questions?.length} questions · Passing: ${quiz.passing_score}%</p>
    ${challengesHint}
    <div style="margin-top:1.5rem">${questions}</div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="submitQuiz('${moduleId}')">Submit</button>
    </div>
    <div id="quiz-result" style="margin-top:1rem;display:none"></div>
  `;
}

function renderQuestion(q, i) {
  if (q.type === 'mcq') {
    const opts = Object.entries(q.options || {}).map(([k,v]) => `
      <div class="option" id="opt-${q.id}-${k}" onclick="selectOption('${q.id}','${k}')">
        <span class="option-key">${k}</span> ${v}
      </div>
    `).join('');
    return `
      <div class="question-card">
        <div class="question-text">${i}. ${q.question}</div>
        <div class="option-list">${opts}</div>
        <div class="explanation" id="exp-${q.id}">${q.explanation || ''}</div>
      </div>
    `;
  }
  if (q.type === 'short_answer') {
    return `
      <div class="question-card">
        <div class="question-text">${i}. ${q.question}</div>
        <div class="short-answer">
          <textarea id="sa-${q.id}" placeholder="Your answer..."></textarea>
        </div>
        <div class="answer-key" id="ak-${q.id}">
          <strong>Answer key:</strong><br>
          ${(q.answer_key?.required_points || []).map(p => '• ' + p).join('<br>')}
          ${q.answer_key?.full_credit ? '<br><br><strong>Full credit:</strong> ' + q.answer_key.full_credit : ''}
        </div>
      </div>
    `;
  }
  if (q.type === 'essay') {
    return `
      <div class="question-card">
        <div class="question-text">${i}. ${q.prompt}</div>
        <div class="short-answer">
          <textarea id="sa-${q.id}" placeholder="Your essay response..." style="min-height:120px"></textarea>
        </div>
        <div class="answer-key" id="ak-${q.id}">
          <strong>Guidance:</strong> ${q.guidance || ''}<br><br>
          <strong>Rubric:</strong><br>
          ${Object.entries(q.rubric || {}).map(([g,d]) => `<strong>${g}:</strong> ${d}`).join('<br>')}
        </div>
      </div>
    `;
  }
  return '';
}

function selectOption(qId, key) {
  quizState.answers[qId] = key;
  document.querySelectorAll(`[id^="opt-${qId}-"]`).forEach(el => el.classList.remove('selected'));
  const sel = document.getElementById(`opt-${qId}-${key}`);
  if (sel) sel.classList.add('selected');
}

function submitQuiz(moduleId) {
  const quiz = assessments[moduleId];
  const mcqs = (quiz.questions || []).filter(q => q.type === 'mcq');
  let correct = 0;

  mcqs.forEach(q => {
    const chosen = quizState.answers[q.id];
    const optEls = document.querySelectorAll(`[id^="opt-${q.id}-"]`);
    optEls.forEach(el => {
      const key = el.id.split('-').pop();
      el.classList.remove('selected');
      if (key === q.correct) el.classList.add('correct');
      else if (key === chosen && chosen !== q.correct) el.classList.add('wrong');
    });
    const exp = document.getElementById('exp-' + q.id);
    if (exp) exp.classList.add('show');
    if (chosen === q.correct) correct++;
  });

  quiz.questions.filter(q => q.type !== 'mcq').forEach(q => {
    const ak = document.getElementById('ak-' + q.id);
    if (ak) ak.classList.add('show');
  });

  const score = mcqs.length ? Math.round((correct / mcqs.length) * 100) : null;
  const passed = score === null || score >= quiz.passing_score;

  progress.quizzes[moduleId] = { score, date: new Date().toISOString(), passed };
  updateConceptMasteryFromQuiz(moduleId);

  saveProgress();
  const result = document.getElementById('quiz-result');
  if (result) {
    result.style.display = 'block';
    result.innerHTML = `
      <div class="card" style="text-align:center;padding:1.5rem">
        ${score !== null ? `<div class="quiz-score">${score}%</div>
        <div class="quiz-score-label">${correct}/${mcqs.length} correct · ${passed ? 'Passed ✓' : 'Not yet — review and retry'}</div>` : ''}
        <p style="margin-top:0.75rem">Short answer questions revealed above — review and self-assess.</p>
      </div>
    `;
  }
}

// ── CODE EXECUTION ENGINE ──────────────────────────────────
function detectFunctionName(code, language) {
  const pattern = language === 'python'
    ? /^def\s+([a-zA-Z_]\w*)\s*\(/m
    : /^(?:function\s+([a-zA-Z_]\w*)|(?:const|let|var)\s+([a-zA-Z_]\w*)\s*=\s*(?:function|\())/m;
  const m = code.match(pattern);
  return m ? (m[1] || m[2]) : null;
}

async function evalJavaScript(code, testCases, fnName) {
  const results = [];
  for (const tc of testCases) {
    try {
      const runner = new Function(`${code}\nreturn String(${fnName}(${tc.input}));`);
      const actual = runner();
      const passed = actual.trim() === String(tc.expected_output).trim();
      results.push({ name: tc.name, passed, actual, expected: tc.expected_output, visibility: tc.visibility });
    } catch (err) {
      results.push({ name: tc.name, passed: false, actual: `Error: ${err.message}`, expected: tc.expected_output, visibility: tc.visibility });
    }
  }
  return results;
}

async function evalPython(code, testCases, fnName) {
  const results = [];
  let pyodide;
  try {
    pyodide = await loadPyodide();
  } catch (e) {
    return testCases.map(tc => ({ name: tc.name, passed: false, actual: 'Pyodide failed to load (check internet for first-time setup)', expected: tc.expected_output, visibility: tc.visibility }));
  }
  for (const tc of testCases) {
    try {
      const script = `${code}\nstr(${fnName}(${tc.input}))`;
      const actual = pyodide.runPython(script);
      const passed = String(actual).trim() === String(tc.expected_output).trim();
      results.push({ name: tc.name, passed, actual: String(actual), expected: tc.expected_output, visibility: tc.visibility });
    } catch (err) {
      const msg = err.message?.split('\n').pop() || err.message;
      results.push({ name: tc.name, passed: false, actual: `Error: ${msg}`, expected: tc.expected_output, visibility: tc.visibility });
    }
  }
  return results;
}

function renderTestResults(results, challengeId) {
  const passed = results.filter(r => r.passed).length;
  const total  = results.length;
  const allPassed = passed === total;
  const summaryClass = allPassed ? 'all-passed' : 'some-failed';
  const summaryIcon  = allPassed ? '✓' : '✗';

  const rows = results.map(r => {
    const icon = r.passed ? '✓' : '✗';
    const cls  = r.passed ? 'passed' : 'failed';
    const hidden = r.visibility === 'hidden' ? ' <span style="font-size:11px;opacity:0.6">(hidden)</span>' : '';
    const detail = r.passed ? '' : `<div style="font-size:11px;margin-top:2px;color:var(--muted)">Got: <code>${r.actual}</code> · Expected: <code>${r.expected}</code></div>`;
    return `<div class="test-result ${cls}">${icon} ${r.name}${hidden}${detail}</div>`;
  }).join('');

  return `
    <div class="test-result-summary ${summaryClass}">${summaryIcon} ${passed}/${total} tests passed</div>
    ${rows}
  `;
}

// ── GLOBAL BINDINGS (expose functions used in inline HTML onclick attributes) ──
Object.assign(window, {
  loadCourse, showView, showModule, toggleModule,
  showLesson, markDone, showModcheck, toggleModcheckAnswer,
  scoreModcheckQ, selectModcheckOption, submitModcheck, renderPlan, promptQuiz,
  submitQuiz, selectOption, renderCodeView, showChallenge,
  runChallengeTests, submitChallenge, renderCards, flipCard,
  rateCard, selectPath, loadCards, loadQuiz, loadLessonFile,
});

// ── STARTUP: auto-load from home page ─────────────────────
(function autoLoad() {
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('course');
  if (!slug) return;

  const pendingKey  = 'grove_pending_bundle_' + slug;
  const pendingJson = sessionStorage.getItem(pendingKey);
  if (pendingJson) {
    sessionStorage.removeItem(pendingKey);
    try {
      initFromBundle(JSON.parse(pendingJson));
    } catch (e) {
      alert('Could not load bundle: ' + e.message);
    }
    return;
  }

  fetch('/curriculum/' + slug + '/bundle.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => initFromBundle(data))
    .catch(() => {
      // Bundle not available — silently stay on load screen
    });
})();
