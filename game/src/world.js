import {
  WIDTH,
  HEIGHT,
  LIGHTHOUSE_X,
  LIGHTHOUSE_Y,
  LIGHTHOUSE_RADIUS,
  ABILITIES,
  ENEMY_TYPES,
  WAVES,
} from './config.js';
import { UPGRADE_CATALOG, getUpgradeCost, computePlayerStats } from './upgrades.js';

export function createRng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GameWorld {
  constructor(seed = 1, audio = null, persistScores = true) {
    this.persistScores = persistScores;
    this.seed = seed;
    this.audio = audio;
    this.reset(seed);
  }

  reset(seed = this.seed) {
    this.seed = seed;
    this.rng = createRng(seed);
    this.screen = 'title'; // 'title' | 'playing' | 'paused' | 'shop' | 'victory' | 'defeat'
    this.time = 0;
    this.waveIndex = 0;
    this.score = 0;
    this.bestScore = this._loadBest();
    this.shards = 18;
    this.combo = 1;
    this.comboTimer = 0;
    this.kills = 0;

    this.upgradeLevels = {
      beamPower: 0,
      fireRate: 0,
      maxHp: 0,
      magnet: 0,
      pulse: 0,
    };
    this.stats = computePlayerStats(this.upgradeLevels);
    this.hp = this.stats.maxHp;

    this.aimX = WIDTH * 0.72;
    this.aimY = HEIGHT * 0.44;
    this.beamAngle = -0.2;
    this.firing = false;
    this.fireTimer = 0;
    this.beamFlash = 0;

    this.cooldowns = {
      frost: 0,
      lightning: 0,
      repair: 0,
      pulse: 0,
    };

    this.enemies = [];
    this.bolts = [];
    this.shardsOnField = [];
    this.particles = [];
    this.floatingTexts = [];
    this.lightningArcs = [];
    this.shockwaves = [];

    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveBannerTimer = 0;
    this.shakeTimer = 0;
    this.shakeMag = 0;
    this.damageFlash = 0;
    this.frostOverlay = 0;
    this.bossSpawned = false;
  }

  _loadBest() {
    if (!this.persistScores) return 0;
    try {
      const v = Number(localStorage.getItem('tidebreaker_best') || '0');
      return Number.isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  }

  _saveBest() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      if (!this.persistScores) return;
      try {
        localStorage.setItem('tidebreaker_best', String(this.bestScore));
      } catch {
        // ignore storage errors
      }
    }
  }

  startGame() {
    const muted = this.audio ? this.audio.muted : false;
    this.reset(this.seed);
    if (this.audio) {
      this.audio.muted = muted;
      this.audio.unlock();
    }
    this.screen = 'playing';
    this._startWave(0);
  }

  _startWave(idx) {
    this.waveIndex = idx;
    const waveDef = WAVES[idx];
    const queue = [];
    for (let i = 0; i < (waveDef.drifter || 0); i++) queue.push('drifter');
    for (let i = 0; i < (waveDef.skimmer || 0); i++) queue.push('skimmer');
    for (let i = 0; i < (waveDef.brute || 0); i++) queue.push('brute');
    // Deterministic shuffle
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = queue[i];
      queue[i] = queue[j];
      queue[j] = tmp;
    }
    if (waveDef.boss) {
      queue.splice(Math.min(4, queue.length), 0, 'boss');
    }
    this.spawnQueue = queue;
    this.spawnTimer = 0.4;
    this.waveBannerTimer = 2.4;
    this.bossSpawned = false;
    if (this.audio) this.audio.playWaveHorn();
  }

  nextWave() {
    if (this.screen !== 'shop') return;
    if (this.waveIndex + 1 >= WAVES.length) {
      this.screen = 'victory';
      this._saveBest();
      if (this.audio) this.audio.playVictory();
      return;
    }
    this.screen = 'playing';
    this._startWave(this.waveIndex + 1);
  }

  buyUpgrade(id) {
    if (this.screen !== 'shop') return false;
    const def = UPGRADE_CATALOG.find((u) => u.id === id);
    if (!def) return false;
    const lvl = this.upgradeLevels[id] || 0;
    if (lvl >= def.maxLevel) return false;
    const cost = getUpgradeCost(def, lvl);
    if (this.shards < cost) return false;

    this.shards -= cost;
    this.upgradeLevels[id] = lvl + 1;
    const prevMax = this.stats.maxHp;
    this.stats = computePlayerStats(this.upgradeLevels);
    if (id === 'maxHp') {
      this.hp = Math.min(this.stats.maxHp, this.hp + (this.stats.maxHp - prevMax));
    }
    if (this.audio) this.audio.playRepair();
    return true;
  }

  togglePause() {
    if (this.screen === 'playing') {
      this.screen = 'paused';
    } else if (this.screen === 'paused') {
      this.screen = 'playing';
    }
  }

  setAim(x, y) {
    this.aimX = x;
    this.aimY = y;
    this.beamAngle = Math.atan2(y - (LIGHTHOUSE_Y - 58), x - LIGHTHOUSE_X);
  }

  useAbility(kind) {
    if (this.screen !== 'playing') return false;
    const cd = this.cooldowns[kind];
    if (cd > 0) return false;
    const def = ABILITIES[kind];
    if (!def) return false;

    if (kind === 'frost') {
      this.cooldowns.frost = def.cooldown;
      this.frostOverlay = 0.85;
      const dur = def.duration * this.stats.abilityScale;
      for (const e of this.enemies) {
        e.frozenTimer = Math.max(e.frozenTimer, dur);
        this._spawnParticles(e.x, e.y, '#67e8f9', 6, 95);
      }
      this._addFloatingText(LIGHTHOUSE_X, LIGHTHOUSE_Y - 95, 'FROST NOVA!', '#67e8f9');
      if (this.audio) this.audio.playFrost();
      return true;
    }

    if (kind === 'lightning') {
      if (this.enemies.length === 0) return false;
      this.cooldowns.lightning = def.cooldown;
      const sorted = [...this.enemies].sort((a, b) => {
        const da = (a.x - LIGHTHOUSE_X) ** 2 + (a.y - LIGHTHOUSE_Y) ** 2;
        const db = (b.x - LIGHTHOUSE_X) ** 2 + (b.y - LIGHTHOUSE_Y) ** 2;
        return da - db;
      });
      const targets = sorted.slice(0, def.chains);
      let prevX = LIGHTHOUSE_X;
      let prevY = LIGHTHOUSE_Y - 58;
      const dmg = def.damage * this.stats.abilityScale;
      for (const e of targets) {
        this.lightningArcs.push({
          x1: prevX,
          y1: prevY,
          x2: e.x,
          y2: e.y,
          life: 0.28,
        });
        this._damageEnemy(e, dmg, '#a78bfa');
        prevX = e.x;
        prevY = e.y;
      }
      this.shakeTimer = 0.18;
      this.shakeMag = 6;
      if (this.audio) this.audio.playLightning();
      return true;
    }

    if (kind === 'repair') {
      if (this.shards < def.cost || this.hp >= this.stats.maxHp) return false;
      this.shards -= def.cost;
      this.cooldowns.repair = def.cooldown;
      const heal = Math.round(def.heal * this.stats.abilityScale);
      this.hp = Math.min(this.stats.maxHp, this.hp + heal);
      this._spawnParticles(LIGHTHOUSE_X, LIGHTHOUSE_Y - 20, '#4ade80', 14, 120);
      this._addFloatingText(LIGHTHOUSE_X, LIGHTHOUSE_Y - 88, `+${heal} HP`, '#4ade80');
      if (this.audio) this.audio.playRepair();
      return true;
    }

    if (kind === 'pulse') {
      this.cooldowns.pulse = def.cooldown;
      const radius = def.radius * (0.9 + this.stats.abilityScale * 0.1);
      const dmg = def.damage * this.stats.abilityScale;
      this.shockwaves.push({
        x: LIGHTHOUSE_X,
        y: LIGHTHOUSE_Y,
        radius: 25,
        maxRadius: radius,
        life: 0.35,
        color: '#34d399',
      });
      for (const e of this.enemies) {
        const dx = e.x - LIGHTHOUSE_X;
        const dy = e.y - LIGHTHOUSE_Y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist <= radius) {
          const push = (e.type === 'boss' ? 0.3 : 1) * def.push * this.stats.abilityScale;
          e.x += (dx / dist) * push;
          e.y += (dy / dist) * push;
          this._damageEnemy(e, dmg, '#34d399');
        }
      }
      this.shakeTimer = 0.22;
      this.shakeMag = 7;
      if (this.audio) this.audio.playPulse();
      return true;
    }

    return false;
  }

  _spawnEnemy(type) {
    const def = ENEMY_TYPES[type];
    const side = this.rng();
    let x;
    let y;
    if (side < 0.38) {
      x = -30;
      y = 220 + this.rng() * (HEIGHT - 260);
    } else if (side < 0.76) {
      x = WIDTH + 30;
      y = 220 + this.rng() * (HEIGHT - 260);
    } else {
      x = 80 + this.rng() * (WIDTH - 160);
      y = HEIGHT + 30;
    }
    const waveScale = 1 + this.waveIndex * 0.11;
    const hp = Math.round(def.hp * (type === 'boss' ? 1 : waveScale));
    this.enemies.push({
      id: `${type}-${Math.floor(this.rng() * 1e9)}`,
      type,
      name: def.name,
      x,
      y,
      radius: def.radius,
      hp,
      maxHp: hp,
      speed: def.speed * (type === 'boss' ? 1 : 1 + this.waveIndex * 0.025),
      damage: def.damage,
      shards: def.shards,
      score: def.score,
      color: def.color,
      coreColor: def.coreColor,
      frozenTimer: 0,
      hitFlash: 0,
      wobblePhase: this.rng() * Math.PI * 2,
      summonTimer: type === 'boss' ? 4.2 : 0,
    });
    if (type === 'boss') {
      this.bossSpawned = true;
      this._addFloatingText(WIDTH / 2, 135, 'THE DROWNED KING RISES!', '#e879f9');
    }
  }

  _fireBeamBolt() {
    const originX = LIGHTHOUSE_X;
    const originY = LIGHTHOUSE_Y - 58;
    const angle = Math.atan2(this.aimY - originY, this.aimX - originX);
    this.beamAngle = angle;
    const speed = 780;
    this.bolts.push({
      x: originX + Math.cos(angle) * 24,
      y: originY + Math.sin(angle) * 24,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: this.stats.beamWidth,
      damage: this.stats.beamDamage,
      life: 1.35,
    });
    this.beamFlash = 0.08;
    if (this.audio) this.audio.playZap();
  }

  _damageEnemy(enemy, dmg, color = '#fde047') {
    enemy.hp -= dmg;
    enemy.hitFlash = 0.11;
    this._spawnParticles(enemy.x, enemy.y, color, 4, 80);
    if (enemy.hp <= 0 && !enemy.dead) {
      enemy.dead = true;
      this.kills += 1;
      this.combo = Math.min(8, this.combo + 0.25);
      this.comboTimer = 3.2;
      const gained = Math.round(enemy.score * this.combo);
      this.score += gained;
      this._addFloatingText(enemy.x, enemy.y - 12, `+${gained}`, '#fde047');
      this._spawnParticles(enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 32 : 12, 150);

      const dropCount = enemy.type === 'boss' ? 12 : Math.max(1, Math.ceil(enemy.shards / 2));
      const shardVal = Math.max(1, Math.round(enemy.shards / dropCount));
      for (let i = 0; i < dropCount; i++) {
        const a = this.rng() * Math.PI * 2;
        const spd = 45 + this.rng() * 85;
        this.shardsOnField.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          value: shardVal,
          life: 14,
        });
      }
    }
  }

  _spawnParticles(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = (0.3 + this.rng() * 0.7) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        size: 2 + this.rng() * 3.5,
        color,
        life: 0.28 + this.rng() * 0.35,
        maxLife: 0.63,
      });
    }
  }

  _addFloatingText(x, y, text, color) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 1.0,
    });
  }

  step(dt) {
    this.time += dt;
    if (this.screen !== 'playing') return;

    // Cooldowns & timers
    for (const k of Object.keys(this.cooldowns)) {
      if (this.cooldowns[k] > 0) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    }
    if (this.waveBannerTimer > 0) this.waveBannerTimer = Math.max(0, this.waveBannerTimer - dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);
    if (this.frostOverlay > 0) this.frostOverlay = Math.max(0, this.frostOverlay - dt * 1.3);
    if (this.beamFlash > 0) this.beamFlash = Math.max(0, this.beamFlash - dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    // Firing
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    if (this.firing && this.fireTimer <= 0) {
      this._fireBeamBolt();
      this.fireTimer = this.stats.fireInterval;
    }

    // Spawning
    const waveDef = WAVES[this.waveIndex];
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const nextType = this.spawnQueue.shift();
        this._spawnEnemy(nextType);
        this.spawnTimer = waveDef.interval;
      }
    }

    // Update bolts
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let hit = false;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d <= e.radius + b.radius) {
          this._damageEnemy(e, b.damage, '#fff6b3');
          hit = true;
          break;
        }
      }
      if (hit || b.life <= 0 || b.x < -60 || b.x > WIDTH + 60 || b.y < -60 || b.y > HEIGHT + 60) {
        this.bolts.splice(i, 1);
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead) {
        this.enemies.splice(i, 1);
        continue;
      }
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.frozenTimer > 0) {
        e.frozenTimer = Math.max(0, e.frozenTimer - dt);
        continue;
      }

      if (e.type === 'boss') {
        e.summonTimer -= dt;
        if (e.summonTimer <= 0) {
          e.summonTimer = 5.0;
          this.spawnQueue.push('skimmer', 'drifter');
        }
      }

      const dx = LIGHTHOUSE_X - e.x;
      const dy = LIGHTHOUSE_Y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const wobble = e.type === 'skimmer' ? Math.sin(this.time * 6 + e.wobblePhase) * 28 : 0;
      const nx = dx / dist;
      const ny = dy / dist;
      e.x += (nx * e.speed - ny * wobble) * dt;
      e.y += (ny * e.speed + nx * wobble) * dt;

      if (dist <= LIGHTHOUSE_RADIUS + e.radius) {
        this.hp = Math.max(0, this.hp - e.damage);
        this.damageFlash = 1;
        this.shakeTimer = 0.25;
        this.shakeMag = 9;
        this.combo = 1;
        this._spawnParticles(e.x, e.y, '#fb7185', 14, 130);
        if (this.audio) this.audio.playHit();
        if (e.type === 'boss') {
          // Boss bounces back instead of vanishing
          e.x -= nx * 130;
          e.y -= ny * 130;
        } else {
          this.enemies.splice(i, 1);
        }
        if (this.hp <= 0) {
          this.screen = 'defeat';
          this._saveBest();
          if (this.audio) this.audio.playDefeat();
          return;
        }
      }
    }

    // Update shards
    for (let i = this.shardsOnField.length - 1; i >= 0; i--) {
      const s = this.shardsOnField[i];
      s.life -= dt;
      s.vx *= 0.94;
      s.vy *= 0.94;
      const dx = LIGHTHOUSE_X - s.x;
      const dy = LIGHTHOUSE_Y - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist <= this.stats.magnetRadius) {
        const pull = 340 * (1 - dist / (this.stats.magnetRadius * 1.15));
        s.vx += (dx / dist) * pull * dt * 8;
        s.vy += (dy / dist) * pull * dt * 8;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (dist <= LIGHTHOUSE_RADIUS + 18) {
        this.shards += s.value;
        this.score += s.value * 5;
        if (this.audio) this.audio.playPickup();
        this.shardsOnField.splice(i, 1);
      } else if (s.life <= 0) {
        this.shardsOnField.splice(i, 1);
      }
    }

    // Update FX
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      f.y -= 32 * dt;
      f.life -= dt;
      if (f.life <= 0) this.floatingTexts.splice(i, 1);
    }
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      this.lightningArcs[i].life -= dt;
      if (this.lightningArcs[i].life <= 0) this.lightningArcs.splice(i, 1);
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      sw.radius += (sw.maxRadius - 25) * (dt / 0.35);
      if (sw.life <= 0) this.shockwaves.splice(i, 1);
    }

    // Wave completion check
    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      // Collect remaining shards automatically on wave clear
      for (const s of this.shardsOnField) {
        this.shards += s.value;
      }
      this.shardsOnField = [];
      this.score += (this.waveIndex + 1) * 150;
      if (this.waveIndex + 1 >= WAVES.length) {
        this.screen = 'victory';
        this._saveBest();
        if (this.audio) this.audio.playVictory();
      } else {
        this.screen = 'shop';
      }
    }
  }
}
