const KEY_BINDINGS = Object.freeze({
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'drift',
  KeyE: 'useItem',
  ShiftLeft: 'useItem',
  ShiftRight: 'useItem',
  Enter: 'useItem',
  KeyR: 'reset',
});

const ONE_SHOT_ACTIONS = new Set(['useItem', 'reset']);

export class InputManager {
  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      drift: false,
      reset: false,
      useItem: false,
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  isTypingInForm(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  handleKeyDown(e) {
    if (e.repeat || this.isTypingInForm(e.target)) return;

    const action = KEY_BINDINGS[e.code];
    if (!action) return;

    if (e.code === 'Space') {
      e.preventDefault();
    }
    this.keys[action] = true;
  }

  handleKeyUp(e) {
    const action = KEY_BINDINGS[e.code];
    if (!action || ONE_SHOT_ACTIONS.has(action)) return;
    this.keys[action] = false;
  }

  // Réinitialise toutes les touches si l'onglet perd le focus
  handleBlur() {
    Object.keys(this.keys).forEach((k) => {
      this.keys[k] = false;
    });
  }

  consumeReset() {
    if (!this.keys.reset) return false;
    this.keys.reset = false;
    return true;
  }

  consumeUseItem() {
    if (!this.keys.useItem) return false;
    this.keys.useItem = false;
    return true;
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}