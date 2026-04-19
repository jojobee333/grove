// ── Pomodoro Timer ────────────────────────────────────────────────────────────
// Floating, collapsible Pomodoro widget.
// State is persisted in localStorage so a page refresh restores the last mode.
//
// Modes:   focus (default 25 min) | short (5 min) | long (15 min)
// States:  idle | running | paused | done

const STORAGE_KEY = 'grove_pomodoro';

const PRESETS = {
  focus: { label: 'Focus',      seconds: 25 * 60 },
  short: { label: 'Short break', seconds:  5 * 60 },
  long:  { label: 'Long break',  seconds: 15 * 60 },
};

let _state = loadState();
let _ticker = null;

function defaultState() {
  return {
    mode:      'focus',
    remaining: PRESETS.focus.seconds,
    status:    'idle',   // idle | running | paused | done
    collapsed: false,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    // Never restore a running timer — browser may have been closed mid-session
    if (s.status === 'running') s.status = 'paused';
    return s;
  } catch {
    return defaultState();
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
}

// ── Tick ──────────────────────────────────────────────────────────────────────

function tick() {
  if (_state.status !== 'running') return;
  _state.remaining -= 1;
  if (_state.remaining <= 0) {
    _state.remaining = 0;
    _state.status = 'done';
    clearInterval(_ticker);
    _ticker = null;
    persistState();
    notifyDone();
  } else {
    persistState();
  }
  renderWidget();
}

function notifyDone() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Grove — timer done! 🎉', {
      body: `${PRESETS[_state.mode].label} complete.`,
      silent: false,
    });
  }
  // Audible beep via Web Audio API (no audio file needed)
  try {
    const ctx = new AudioContext();
    [0, 0.15, 0.3].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.25);
    });
  } catch { /* AudioContext not available — fail silently */ }
}

// ── Controls (called from inline onclick) ────────────────────────────────────

export function pomodoroStart() {
  if (_state.status === 'done') pomodoroReset();
  _state.status = 'running';
  persistState();
  if (_ticker) clearInterval(_ticker);
  _ticker = setInterval(tick, 1000);
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  renderWidget();
}

export function pomodoroPause() {
  _state.status = 'paused';
  clearInterval(_ticker);
  _ticker = null;
  persistState();
  renderWidget();
}

export function pomodoroReset() {
  clearInterval(_ticker);
  _ticker = null;
  _state.remaining = PRESETS[_state.mode].seconds;
  _state.status = 'idle';
  persistState();
  renderWidget();
}

export function pomodoroSetMode(mode) {
  if (!PRESETS[mode]) return;
  clearInterval(_ticker);
  _ticker = null;
  _state.mode = mode;
  _state.remaining = PRESETS[mode].seconds;
  _state.status = 'idle';
  persistState();
  renderWidget();
}

export function pomodoroToggleCollapse() {
  _state.collapsed = !_state.collapsed;
  persistState();
  renderWidget();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

function renderWidget() {
  const el = document.getElementById('pomodoro-widget');
  if (!el) return;

  const { mode, remaining, status, collapsed } = _state;
  const total    = PRESETS[mode].seconds;
  const pct      = Math.max(0, Math.min(1, remaining / total));
  const isRunning = status === 'running';
  const isDone    = status === 'done';

  // SVG ring
  const R = 28, C = 32, stroke = 4;
  const circumference = 2 * Math.PI * R;
  const dash = pct * circumference;

  const ringColor = isDone ? 'var(--accent)' : isRunning ? 'var(--accent)' : 'var(--border-strong)';

  const collapseIcon = collapsed ? '▲' : '▼';

  if (collapsed) {
    el.innerHTML = `
      <div class="pomo-collapsed" onclick="pomodoroToggleCollapse()">
        <svg width="22" height="22" viewBox="0 0 64 64" style="display:block">
          <circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
          <circle cx="32" cy="32" r="${R}" fill="none" stroke="${ringColor}" stroke-width="${stroke}"
            stroke-dasharray="${dash} ${circumference}" stroke-dashoffset="${circumference / 4}"
            stroke-linecap="round" transform="rotate(-90 32 32)"/>
        </svg>
        <span class="pomo-collapsed-time">${formatTime(remaining)}</span>
      </div>
    `;
    return;
  }

  const modeBtns = Object.entries(PRESETS).map(([key, p]) => `
    <button class="pomo-mode-btn${mode === key ? ' active' : ''}" onclick="pomodoroSetMode('${key}')">${p.label}</button>
  `).join('');

  const mainBtn = isRunning
    ? `<button class="pomo-ctrl-btn" onclick="pomodoroPause()">Pause</button>`
    : isDone
    ? `<button class="pomo-ctrl-btn pomo-done-btn" onclick="pomodoroReset()">Done ✓</button>`
    : `<button class="pomo-ctrl-btn pomo-start-btn" onclick="pomodoroStart()">${status === 'paused' ? 'Resume' : 'Start'}</button>`;

  el.innerHTML = `
    <div class="pomo-header">
      <span class="pomo-title">Pomodoro</span>
      <div style="display:flex;gap:4px;align-items:center">
        ${isRunning || status === 'paused' ? `<button class="pomo-icon-btn" title="Reset" onclick="pomodoroReset()">↺</button>` : ''}
        <button class="pomo-icon-btn" title="Collapse" onclick="pomodoroToggleCollapse()">${collapseIcon}</button>
      </div>
    </div>
    <div class="pomo-modes">${modeBtns}</div>
    <div class="pomo-ring-wrap">
      <svg width="80" height="80" viewBox="0 0 64 64">
        <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
        <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${ringColor}" stroke-width="${stroke}"
          stroke-dasharray="${dash} ${circumference}" stroke-dashoffset="${circumference / 4}"
          stroke-linecap="round" transform="rotate(-90 ${C} ${C})"
          style="transition:stroke-dasharray 0.9s linear"/>
      </svg>
      <div class="pomo-time${isDone ? ' pomo-time-done' : ''}">${formatTime(remaining)}</div>
    </div>
    ${mainBtn}
  `;
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initPomodoro() {
  renderWidget();
  // Resume ticker if state was running (we downgrade running→paused on load, so this won't auto-start)
}
