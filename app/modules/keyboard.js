/**
 * Grove keyboard shortcut logic.
 * Pure function — no DOM access, no globals, no side effects.
 *
 * @typedef {{ view: string, flipped: boolean }} KeyState
 *
 * @param {string}   key   - KeyboardEvent.key value
 * @param {KeyState} state - Current app state relevant to key handling
 * @returns {string|null} Action identifier, or null if the key has no effect
 *
 * Supported actions:
 *   'flip'       — reveal the back of the current flashcard
 *   'rate-hard'  — rate the current card quality=1 (hard)
 *   'rate-okay'  — rate the current card quality=3 (okay)
 *   'rate-easy'  — rate the current card quality=5 (easy)
 */
export function mapKeyToCardAction(key, state) {
  if (state.view !== 'cards') return null;

  if (!state.flipped) {
    if (key === ' ') return 'flip';
    return null;
  }

  // Card is flipped — accept rating keys
  if (key === '1') return 'rate-hard';
  if (key === '2') return 'rate-okay';
  if (key === '3') return 'rate-easy';

  return null;
}
