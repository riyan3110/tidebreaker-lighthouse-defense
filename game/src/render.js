import {
  WIDTH,
  HEIGHT,
  LIGHTHOUSE_X,
  LIGHTHOUSE_Y,
  PALETTE,
  ABILITIES,
  WAVES,
} from './config.js';
import { UPGRADE_CATALOG, getUpgradeCost } from './upgrades.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = Array.from({ length: 72 }, (_, i) => ({
      x: ((i * 197) % WIDTH),
      y: ((i * 113) % 210) + 12,
      r: (i % 3) * 0.6 + 0.8,
      phase: i * 0.7,
    }));
  }

  render(world, muted = false) {
    const ctx = this.ctx;
    const buttons = [];
    ctx.save();

    if (world.shakeTimer > 0) {
      const mag = world.shakeMag * (world.shakeTimer / 0.25);
      const sx = Math.sin(world.time * 65) * mag;
      const sy = Math.cos(world.time * 73) * mag;
      ctx.translate(sx, sy);
    }

    this._drawBackdrop(ctx, world);
    this._drawBeam(ctx, world);
    this._drawLighthouse(ctx, world);
    this._drawShards(ctx, world);
    this._drawBolts(ctx, world);
    this._drawEnemies(ctx, world);
    this._drawEffects(ctx, world);

    if (world.screen === 'playing' || world.screen === 'paused' || world.screen === 'shop') {
      this._drawHud(ctx, world, muted, buttons);
    }

    if (world.screen === 'title') {
      this._drawTitleScreen(ctx, world, buttons);
    } else if (world.screen === 'paused') {
      this._drawPauseOverlay(ctx, buttons);
    } else if (world.screen === 'shop') {
      this._drawShopOverlay(ctx, world, buttons);
    } else if (world.screen === 'victory') {
      this._drawEndOverlay(ctx, world, true, buttons);
    } else if (world.screen === 'defeat') {
      this._drawEndOverlay(ctx, world, false, buttons);
    }

    ctx.restore();
    return buttons;
  }

  _drawBackdrop(ctx, world) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
    skyGrad.addColorStop(0, PALETTE.skyTop);
    skyGrad.addColorStop(0.65, PALETTE.skyMid);
    skyGrad.addColorStop(1, PALETTE.horizon);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WIDTH, 245);

    // Stars
    for (const s of this.stars) {
      const alpha = 0.45 + 0.5 * Math.sin(world.time * 1.8 + s.phase);
      ctx.fillStyle = `rgba(226, 240, 255, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crescent Moon
    ctx.save();
    ctx.fillStyle = '#fef3c7';
    ctx.shadowColor = '#fde68a';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(1070, 82, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.skyMid;
    ctx.beginPath();
    ctx.arc(1080, 76, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sea
    const seaGrad = ctx.createLinearGradient(0, 235, 0, HEIGHT);
    seaGrad.addColorStop(0, '#0c2744');
    seaGrad.addColorStop(0.4, PALETTE.seaDeep);
    seaGrad.addColorStop(1, '#030b14');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 235, WIDTH, HEIGHT - 235);

    // Animated wave lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 8; row++) {
      const baseY = 265 + row * 58;
      ctx.beginPath();
      for (let x = 0; x <= WIDTH; x += 40) {
        const y = baseY + Math.sin(x * 0.015 + world.time * 1.6 + row) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Rocky Island
    ctx.fillStyle = PALETTE.islandDark;
    ctx.beginPath();
    ctx.ellipse(LIGHTHOUSE_X, LIGHTHOUSE_Y + 38, 108, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.islandLight;
    ctx.beginPath();
    ctx.ellipse(LIGHTHOUSE_X, LIGHTHOUSE_Y + 30, 86, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBeam(ctx, world) {
    if (world.screen === 'defeat') return;
    const ox = LIGHTHOUSE_X;
    const oy = LIGHTHOUSE_Y - 58;
    const angle = world.beamAngle;
    const len = 620;
    const spread = world.firing ? 0.17 : 0.12;

    ctx.save();
    const grad = ctx.createRadialGradient(ox, oy, 10, ox, oy, len);
    grad.addColorStop(0, world.firing ? 'rgba(255, 246, 179, 0.44)' : 'rgba(255, 246, 179, 0.22)');
    grad.addColorStop(0.55, world.firing ? 'rgba(56, 189, 248, 0.16)' : 'rgba(56, 189, 248, 0.07)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, len, angle - spread, angle + spread);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawLighthouse(ctx, world) {
    const x = LIGHTHOUSE_X;
    const y = LIGHTHOUSE_Y;

    // Tower base shadow & stone body
    ctx.save();
    ctx.fillStyle = PALETTE.towerStone;
    ctx.beginPath();
    ctx.moveTo(x - 24, y + 26);
    ctx.lineTo(x - 15, y - 48);
    ctx.lineTo(x + 15, y - 48);
    ctx.lineTo(x + 24, y + 26);
    ctx.closePath();
    ctx.fill();

    // Red warning stripes
    ctx.fillStyle = PALETTE.towerStripe;
    ctx.beginPath();
    ctx.moveTo(x - 21, y + 8);
    ctx.lineTo(x - 18, y - 10);
    ctx.lineTo(x + 18, y - 10);
    ctx.lineTo(x + 21, y + 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x - 17, y - 26);
    ctx.lineTo(x - 15.5, y - 40);
    ctx.lineTo(x + 15.5, y - 40);
    ctx.lineTo(x + 17, y - 26);
    ctx.closePath();
    ctx.fill();

    // Gallery deck
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 20, y - 52, 40, 6);

    // Lantern room
    const glowColor = world.screen === 'defeat' ? '#64748b' : PALETTE.lanternGlow;
    ctx.fillStyle = glowColor;
    if (world.screen !== 'defeat') {
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = world.beamFlash > 0 ? 30 : 18;
    }
    ctx.fillRect(x - 11, y - 68, 22, 16);
    ctx.shadowBlur = 0;

    // Roof cap
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 68);
    ctx.lineTo(x, y - 82);
    ctx.lineTo(x + 15, y - 68);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawShards(ctx, world) {
    for (const s of world.shardsOnField) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(world.time * 3 + s.x * 0.05);
      ctx.fillStyle = PALETTE.shard;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * 3.2, Math.sin(a + Math.PI / 4) * 3.2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _drawBolts(ctx, world) {
    for (const b of world.bolts) {
      ctx.save();
      ctx.fillStyle = PALETTE.beamCore;
      ctx.shadowColor = PALETTE.beamOuter;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawEnemies(ctx, world) {
    for (const e of world.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      const fill = e.hitFlash > 0 ? '#ffffff' : e.frozenTimer > 0 ? '#67e8f9' : e.color;
      ctx.fillStyle = fill;
      ctx.shadowColor = e.frozenTimer > 0 ? '#67e8f9' : e.color;
      ctx.shadowBlur = e.type === 'boss' ? 22 : 10;

      if (e.type === 'drifter') {
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.coreColor;
        ctx.beginPath();
        ctx.arc(-4, -2, 3, 0, Math.PI * 2);
        ctx.arc(4, -2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'skimmer') {
        const a = Math.atan2(LIGHTHOUSE_Y - e.y, LIGHTHOUSE_X - e.x);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(e.radius + 5, 0);
        ctx.lineTo(-e.radius, -e.radius * 0.85);
        ctx.lineTo(-e.radius * 0.45, 0);
        ctx.lineTo(-e.radius, e.radius * 0.85);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'brute') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI) / 3;
          const px = Math.cos(ang) * e.radius;
          const py = Math.sin(ang) * e.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fbcfe8';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (e.type === 'boss') {
        // The Drowned King
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const ang = (i * Math.PI) / 5 + world.time * 0.6;
          const r = i % 2 === 0 ? e.radius : e.radius * 0.72;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-11, -5, 5, 0, Math.PI * 2);
        ctx.arc(11, -5, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      // HP bar for damaged non-boss enemies
      if (e.hp < e.maxHp && e.type !== 'boss') {
        const bw = e.radius * 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(-bw / 2, -e.radius - 10, bw, 4);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(-bw / 2, -e.radius - 10, bw * Math.max(0, e.hp / e.maxHp), 4);
      }
      ctx.restore();
    }
  }

  _drawEffects(ctx, world) {
    for (const sw of world.shockwaves) {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.life / 0.35);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const arc of world.lightningArcs) {
      ctx.save();
      ctx.strokeStyle = '#c4b5fd';
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.globalAlpha = Math.max(0, arc.life / 0.28);
      ctx.beginPath();
      ctx.moveTo(arc.x1, arc.y1);
      const mx = (arc.x1 + arc.x2) / 2 + (Math.sin(world.time * 40 + arc.x1) * 18);
      const my = (arc.y1 + arc.y2) / 2 + (Math.cos(world.time * 40 + arc.y1) * 18);
      ctx.lineTo(mx, my);
      ctx.lineTo(arc.x2, arc.y2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of world.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const f of world.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.life * 1.4);
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    if (world.frostOverlay > 0) {
      ctx.fillStyle = `rgba(103, 232, 249, ${(world.frostOverlay * 0.16).toFixed(3)})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    if (world.damageFlash > 0) {
      ctx.fillStyle = `rgba(251, 113, 133, ${(world.damageFlash * 0.26).toFixed(3)})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  _drawHud(ctx, world, muted, buttons) {
    // Top-left status panel
    ctx.save();
    ctx.fillStyle = PALETTE.hudBg;
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 1.5;
    roundRect(ctx, 18, 16, 360, 78, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.textMain;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`LIGHTHOUSE HP: ${Math.ceil(world.hp)} / ${world.stats.maxHp}`, 34, 40);

    // HP bar
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, 34, 49, 326, 14, 6);
    ctx.fill();
    const hpRatio = Math.max(0, Math.min(1, world.hp / world.stats.maxHp));
    ctx.fillStyle = hpRatio > 0.45 ? '#34d399' : hpRatio > 0.2 ? '#fbbf24' : '#fb7185';
    roundRect(ctx, 34, 49, Math.max(8, 326 * hpRatio), 14, 6);
    ctx.fill();

    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`SHARDS: ${world.shards}`, 34, 82);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText(`SCORE: ${world.score}`, 152, 82);
    ctx.fillStyle = world.combo > 1 ? '#f472b6' : PALETTE.textMuted;
    ctx.fillText(`COMBO: x${world.combo.toFixed(1)}`, 276, 82);

    // Top-center wave pill
    const waveDef = WAVES[world.waveIndex];
    ctx.fillStyle = PALETTE.hudBg;
    roundRect(ctx, WIDTH / 2 - 140, 16, 280, 44, 12);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.textMain;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`WAVE ${world.waveIndex + 1} / ${WAVES.length} — ${waveDef.title}`, WIDTH / 2, 44);

    // Boss HP bar if boss active
    const boss = world.enemies.find((e) => e.type === 'boss');
    if (boss) {
      ctx.fillStyle = PALETTE.hudBg;
      roundRect(ctx, WIDTH / 2 - 210, 70, 420, 32, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 121, 249, 0.6)';
      ctx.stroke();
      ctx.fillStyle = '#3b0764';
      roundRect(ctx, WIDTH / 2 - 196, 86, 392, 10, 4);
      ctx.fill();
      ctx.fillStyle = '#d946ef';
      roundRect(ctx, WIDTH / 2 - 196, 86, 392 * Math.max(0, boss.hp / boss.maxHp), 10, 4);
      ctx.fill();
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#f5d0fe';
      ctx.fillText(`THE DROWNED KING (${Math.ceil(boss.hp)} HP)`, WIDTH / 2, 82);
    }

    // Top-right Mute & Pause buttons
    const muteBtn = { x: WIDTH - 198, y: 16, w: 84, h: 36, action: 'mute' };
    const pauseBtn = { x: WIDTH - 102, y: 16, w: 84, h: 36, action: 'pause' };
    buttons.push(muteBtn, pauseBtn);

    for (const [btn, label] of [
      [muteBtn, muted ? 'MUTED (M)' : 'SOUND (M)'],
      [pauseBtn, world.screen === 'paused' ? 'RESUME' : 'PAUSE (P)'],
    ]) {
      ctx.fillStyle = PALETTE.hudBg;
      ctx.strokeStyle = PALETTE.hudBorder;
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.textMain;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(label, btn.x + btn.w / 2, btn.y + 23);
    }

    // Bottom Ability Bar
    const keys = ['frost', 'lightning', 'repair', 'pulse'];
    const cardW = 160;
    const gap = 14;
    const totalW = keys.length * cardW + (keys.length - 1) * gap;
    const startX = (WIDTH - totalW) / 2;
    const barY = HEIGHT - 76;

    keys.forEach((k, idx) => {
      const def = ABILITIES[k];
      const bx = startX + idx * (cardW + gap);
      const cd = world.cooldowns[k];
      const ready = cd <= 0 && (k !== 'repair' || world.shards >= def.cost);
      const btn = { x: bx, y: barY, w: cardW, h: 58, action: 'ability', payload: k };
      buttons.push(btn);

      ctx.fillStyle = ready ? 'rgba(11, 29, 54, 0.92)' : 'rgba(15, 23, 42, 0.72)';
      ctx.strokeStyle = ready ? def.color : 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = ready ? 2 : 1;
      roundRect(ctx, bx, barY, cardW, 58, 10);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = def.color;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(`[${def.key}] ${def.name}`, bx + 12, barY + 23);

      ctx.fillStyle = ready ? '#e2e8f0' : '#94a3b8';
      ctx.font = '12px system-ui, sans-serif';
      const sub = cd > 0 ? `Cooldown ${cd.toFixed(1)}s` : k === 'repair' ? `Cost: ${def.cost} shards` : 'READY';
      ctx.fillText(sub, bx + 12, barY + 43);
    });

    if (world.waveBannerTimer > 0 && world.screen === 'playing') {
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, world.waveBannerTimer);
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`WAVE ${world.waveIndex + 1}: ${waveDef.title.toUpperCase()}`, WIDTH / 2, 168);
    }

    ctx.restore();
  }

  _drawTitleScreen(ctx, world, buttons) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 10, 20, 0.74)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('TIDEBREAKER', WIDTH / 2, 170);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText('LIGHTHOUSE DEFENSE', WIDTH / 2, 208);

    // Info card
    ctx.fillStyle = 'rgba(10, 24, 44, 0.9)';
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 1.5;
    roundRect(ctx, WIDTH / 2 - 340, 246, 680, 236, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Defend the lighthouse against 8 waves of gloom wisps rising from the sea.', WIDTH / 2, 290);
    ctx.fillText('Collect Star Shards, upgrade your beacon between waves, and defeat The Drowned King.', WIDTH / 2, 320);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('CONTROLS', WIDTH / 2, 366);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Mouse Aim + Click/Hold: Fire Solar Beam     |     Space: Pulse Blast (Knockback)', WIDTH / 2, 396);
    ctx.fillText('1: Frost Nova     |     2: Chain Bolt     |     3: Repair (12 Shards)     |     P: Pause     |     M: Mute', WIDTH / 2, 424);
    ctx.fillStyle = '#fde047';
    ctx.fillText(`Best Score: ${world.bestScore}`, WIDTH / 2, 460);

    const startBtn = { x: WIDTH / 2 - 140, y: 522, w: 280, h: 62, action: 'start' };
    buttons.push(startBtn);
    ctx.fillStyle = '#eab308';
    roundRect(ctx, startBtn.x, startBtn.y, startBtn.w, startBtn.h, 14);
    ctx.fill();
    ctx.fillStyle = '#081221';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('START DEFENSE', WIDTH / 2, 561);

    ctx.restore();
  }

  _drawPauseOverlay(ctx, buttons) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 10, 20, 0.72)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('PAUSED', WIDTH / 2, 270);

    const resumeBtn = { x: WIDTH / 2 - 120, y: 320, w: 240, h: 54, action: 'pause' };
    const restartBtn = { x: WIDTH / 2 - 120, y: 392, w: 240, h: 54, action: 'start' };
    buttons.push(resumeBtn, restartBtn);

    ctx.fillStyle = '#38bdf8';
    roundRect(ctx, resumeBtn.x, resumeBtn.y, resumeBtn.w, resumeBtn.h, 12);
    ctx.fill();
    ctx.fillStyle = '#061322';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('RESUME (P)', WIDTH / 2, 354);

    ctx.fillStyle = '#334155';
    roundRect(ctx, restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 12);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('RESTART', WIDTH / 2, 426);
    ctx.restore();
  }

  _drawShopOverlay(ctx, world, buttons) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 10, 20, 0.8)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText(`WAVE ${world.waveIndex + 1} CLEARED — BEACON FORGE`, WIDTH / 2, 130);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText(`Available Star Shards: ${world.shards}`, WIDTH / 2, 166);

    const cardW = 212;
    const cardH = 225;
    const gap = 16;
    const totalW = UPGRADE_CATALOG.length * cardW + (UPGRADE_CATALOG.length - 1) * gap;
    const startX = (WIDTH - totalW) / 2;
    const cardY = 205;

    UPGRADE_CATALOG.forEach((u, idx) => {
      const cx = startX + idx * (cardW + gap);
      const lvl = world.upgradeLevels[u.id] || 0;
      const maxed = lvl >= u.maxLevel;
      const cost = getUpgradeCost(u, lvl);
      const canBuy = !maxed && world.shards >= cost;

      ctx.fillStyle = 'rgba(11, 29, 54, 0.95)';
      ctx.strokeStyle = canBuy ? u.color : 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 2;
      roundRect(ctx, cx, cardY, cardW, cardH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = u.color;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(u.name, cx + cardW / 2, cardY + 38);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(u.desc, cx + cardW / 2, cardY + 72);

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Level ${lvl} / ${u.maxLevel}`, cx + cardW / 2, cardY + 108);

      const buyBtn = { x: cx + 20, y: cardY + 148, w: cardW - 40, h: 48, action: 'buy', payload: u.id };
      buttons.push(buyBtn);
      ctx.fillStyle = maxed ? '#334155' : canBuy ? u.color : '#1e293b';
      roundRect(ctx, buyBtn.x, buyBtn.y, buyBtn.w, buyBtn.h, 10);
      ctx.fill();
      ctx.fillStyle = maxed ? '#94a3b8' : canBuy ? '#061322' : '#64748b';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(maxed ? 'MAXED' : `BUY (${cost})`, cx + cardW / 2, buyBtn.y + 30);
    });

    const nextBtn = { x: WIDTH / 2 - 150, y: 478, w: 300, h: 58, action: 'nextWave' };
    buttons.push(nextBtn);
    ctx.fillStyle = '#eab308';
    roundRect(ctx, nextBtn.x, nextBtn.y, nextBtn.w, nextBtn.h, 12);
    ctx.fill();
    ctx.fillStyle = '#061322';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`START WAVE ${world.waveIndex + 2} (ENTER)`, WIDTH / 2, 514);
    ctx.restore();
  }

  _drawEndOverlay(ctx, world, victory, buttons) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 10, 20, 0.84)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = victory ? '#fde047' : '#fb7185';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText(victory ? 'DAWN BREAKS — VICTORY!' : 'THE LIGHT HAS FALLEN', WIDTH / 2, 195);

    ctx.fillStyle = 'rgba(11, 29, 54, 0.92)';
    ctx.strokeStyle = victory ? '#fde047' : '#fb7185';
    ctx.lineWidth = 2;
    roundRect(ctx, WIDTH / 2 - 240, 240, 480, 210, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`Final Score: ${world.score}`, WIDTH / 2, 295);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`Best Score: ${world.bestScore}`, WIDTH / 2, 336);
    ctx.fillText(`Waves Cleared: ${victory ? WAVES.length : world.waveIndex} / ${WAVES.length}`, WIDTH / 2, 372);
    ctx.fillText(`Gloom Wisps Banished: ${world.kills}`, WIDTH / 2, 408);

    const restartBtn = { x: WIDTH / 2 - 140, y: 492, w: 280, h: 60, action: 'start' };
    buttons.push(restartBtn);
    ctx.fillStyle = victory ? '#eab308' : '#38bdf8';
    roundRect(ctx, restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 14);
    ctx.fill();
    ctx.fillStyle = '#061322';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('PLAY AGAIN (R)', WIDTH / 2, 530);

    ctx.restore();
  }
}
