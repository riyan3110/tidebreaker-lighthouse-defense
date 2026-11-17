import { WIDTH, HEIGHT } from './config.js';

export class InputManager {
  constructor(canvas, onAction) {
    this.canvas = canvas;
    this.onAction = onAction;
    this.mouseX = WIDTH * 0.65;
    this.mouseY = HEIGHT * 0.42;
    this.mouseDown = false;
    this.buttons = [];
    this._bound = false;
  }

  setButtons(buttons) {
    this.buttons = buttons;
  }

  _toCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: this.mouseX, y: this.mouseY };
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  _hitButton(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return b;
      }
    }
    return null;
  }

  attach() {
    if (this._bound) return;
    this._bound = true;

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this._toCanvasCoords(e.clientX, e.clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const pos = this._toCanvasCoords(e.clientX, e.clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      const hit = this._hitButton(pos.x, pos.y);
      if (hit) {
        this.onAction(hit.action, hit.payload);
        return;
      }
      this.mouseDown = true;
      this.onAction('pointerDown', pos);
    });

    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });

    window.addEventListener('keydown', (e) => {
      const key = e.key;
      if (key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.onAction('ability', 'pulse');
      } else if (key === '1') {
        this.onAction('ability', 'frost');
      } else if (key === '2') {
        this.onAction('ability', 'lightning');
      } else if (key === '3') {
        this.onAction('ability', 'repair');
      } else if (key === 'p' || key === 'P' || key === 'Escape') {
        this.onAction('pause');
      } else if (key === 'm' || key === 'M') {
        this.onAction('mute');
      } else if (key === 'r' || key === 'R') {
        this.onAction('restartKey');
      } else if (key === 'Enter') {
        this.onAction('confirm');
      }
    });
  }
}
