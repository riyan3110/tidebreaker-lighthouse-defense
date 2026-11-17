import { SoundEngine } from './audio.js';
import { InputManager } from './input.js';
import { GameRenderer } from './render.js';
import { runShotScene } from './shots.js';
import { GameWorld } from './world.js';

const canvas = document.getElementById('game');
const audio = new SoundEngine();
const world = new GameWorld(1, audio);
const renderer = new GameRenderer(canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') || '1') || 1;

if (shotName) {
  runShotScene(world, renderer, shotName, shotSeed);
} else {
  const input = new InputManager(canvas, (action, payload) => {
    audio.unlock();
    if (action === 'pointerDown') {
      world.setAim(payload.x, payload.y);
      if (world.screen === 'playing') world.firing = true;
    } else if (action === 'start') {
      world.startGame();
    } else if (action === 'pause') {
      world.togglePause();
    } else if (action === 'mute') {
      audio.toggleMute();
    } else if (action === 'ability') {
      world.useAbility(payload);
    } else if (action === 'buy') {
      world.buyUpgrade(payload);
    } else if (action === 'nextWave') {
      world.nextWave();
    } else if (action === 'restartKey') {
      if (world.screen === 'victory' || world.screen === 'defeat') {
        world.startGame();
      }
    } else if (action === 'confirm') {
      if (world.screen === 'title') world.startGame();
      else if (world.screen === 'shop') world.nextWave();
    }
  });

  input.attach();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (world.screen === 'playing') {
      world.setAim(input.mouseX, input.mouseY);
      world.firing = input.mouseDown;
    } else {
      world.firing = false;
    }

    world.step(dt);
    const buttons = renderer.render(world, audio.muted);
    input.setButtons(buttons);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
