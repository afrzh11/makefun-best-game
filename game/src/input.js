// Keyboard, mouse and touch input. Held keys give a steering vector; the mouse
// gives an aim point in field coordinates; one-shot presses (start, restart,
// pause, mute) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const FIRE_KEYS = new Set(['Space']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let firing = false;
  let aimX = 640;
  let aimY = 240;
  let pointerSeen = false;

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    }
    if (FIRE_KEYS.has(event.code)) firing = true;
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (FIRE_KEYS.has(event.code)) firing = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    keys.clear();
    firing = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const p = toField(event);
    aimX = p.x;
    aimY = p.y;
    pointerSeen = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toField(event);
    aimX = p.x;
    aimY = p.y;
    pointerSeen = true;
    firing = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    firing = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function has(...codes) {
    return codes.some((c) => keys.has(c));
  }

  return {
    /** Where the player is aiming, in field coordinates. */
    aim() {
      return { x: aimX, y: aimY, seen: pointerSeen };
    },
    /** Is the trigger held (mouse button or Space)? */
    isFiring() {
      return firing;
    },
    /** Steering vector, -1..1 on each axis, normalised. */
    move() {
      let x = (has('ArrowRight', 'KeyD') ? 1 : 0) - (has('ArrowLeft', 'KeyA') ? 1 : 0);
      let y = (has('ArrowDown', 'KeyS') ? 1 : 0) - (has('ArrowUp', 'KeyW') ? 1 : 0);
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
