export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastZapAt = 0;
  }

  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone(freq, endFreq, duration, type = 'sine', gainVal = 0.12, delay = 0) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playZap() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastZapAt < 0.09) return;
    this.lastZapAt = now;
    this._tone(680, 290, 0.075, 'triangle', 0.07);
  }

  playPickup() {
    this._tone(740, 1180, 0.11, 'sine', 0.09);
  }

  playHit() {
    this._tone(160, 52, 0.18, 'sawtooth', 0.15);
  }

  playFrost() {
    this._tone(980, 320, 0.35, 'sine', 0.14);
    this._tone(1320, 620, 0.3, 'triangle', 0.08, 0.04);
  }

  playLightning() {
    this._tone(1100, 180, 0.22, 'sawtooth', 0.12);
    this._tone(540, 120, 0.25, 'square', 0.07, 0.03);
  }

  playPulse() {
    this._tone(240, 55, 0.28, 'triangle', 0.18);
  }

  playRepair() {
    this._tone(440, 660, 0.14, 'sine', 0.11);
    this._tone(660, 880, 0.16, 'sine', 0.1, 0.08);
  }

  playWaveHorn() {
    this._tone(146, 146, 0.42, 'sawtooth', 0.11);
    this._tone(220, 218, 0.48, 'triangle', 0.1, 0.06);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this._tone(n, n * 1.01, 0.22, 'triangle', 0.13, i * 0.11);
    });
  }

  playDefeat() {
    this._tone(196, 98, 0.5, 'sawtooth', 0.14);
    this._tone(130.8, 65.4, 0.65, 'triangle', 0.15, 0.15);
  }
}
