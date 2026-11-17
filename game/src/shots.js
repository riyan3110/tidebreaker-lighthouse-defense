import { LIGHTHOUSE_X, LIGHTHOUSE_Y } from './config.js';

function steerAutopilot(world, mode) {
  if (world.screen === 'shop') {
    if (mode === 'victory') {
      // Buy upgrades greedily in priority order
      const priority = ['beamPower', 'fireRate', 'pulse', 'maxHp', 'magnet'];
      let bought = true;
      while (bought) {
        bought = false;
        for (const id of priority) {
          if (world.buyUpgrade(id)) bought = true;
        }
      }
    }
    world.nextWave();
    return;
  }

  if (world.screen !== 'playing') return;

  if (mode === 'defeat') {
    world.firing = false;
    return;
  }

  // Competent autopilot for play / victory scenes
  world.firing = true;
  if (world.enemies.length > 0) {
    let nearest = world.enemies[0];
    let bestD = Infinity;
    for (const e of world.enemies) {
      const d = (e.x - LIGHTHOUSE_X) ** 2 + (e.y - LIGHTHOUSE_Y) ** 2;
      if (d < bestD) {
        bestD = d;
        nearest = e;
      }
    }
    world.setAim(nearest.x, nearest.y);

    if (world.hp < world.stats.maxHp * 0.65) {
      world.useAbility('repair');
    }
    if (bestD < 190 * 190) {
      world.useAbility('pulse');
    }
    if (world.enemies.length >= 4) {
      world.useAbility('lightning');
    }
    if (world.enemies.length >= 6 || bestD < 140 * 140) {
      world.useAbility('frost');
    }
  }
}

export function runShotScene(world, renderer, shotName, seed = 1) {
  world.reset(seed);
  const dt = 1 / 60;

  if (shotName === 'start') {
    // Title screen at steady frame
    world.time = 1.5;
    renderer.render(world, false);
    window.__shotReady = true;
    return;
  }

  world.startGame();

  if (shotName === 'play') {
    // Advance to Wave 3 mid-combat with active enemies, shards, and beam firing
    for (let i = 0; i < 60 * 38; i++) {
      steerAutopilot(world, 'victory');
      world.step(dt);
      if (world.waveIndex >= 2 && world.enemies.length >= 5 && i > 60 * 28) {
        break;
      }
    }
    renderer.render(world, false);
    window.__shotReady = true;
    return;
  }

  if (shotName === 'victory') {
    // Play through all 8 waves until victory
    for (let i = 0; i < 60 * 240; i++) {
      steerAutopilot(world, 'victory');
      world.step(dt);
      if (world.screen === 'victory') break;
    }
    renderer.render(world, false);
    window.__shotReady = true;
    return;
  }

  if (shotName === 'defeat') {
    // Idle so gloom wisps overwhelm the lighthouse
    for (let i = 0; i < 60 * 120; i++) {
      steerAutopilot(world, 'defeat');
      world.step(dt);
      if (world.screen === 'defeat') break;
    }
    renderer.render(world, false);
    window.__shotReady = true;
  }
}
