// The Midnight Vault — boot and game loop. Serves the title screen, runs
// the heist at a fixed 60 Hz step, and stages a screenshot scene when the
// page opens with ?shot=cover|route|caught|getaway.
import { CANVAS_HEIGHT, CANVAS_WIDTH, STEP } from './config.js';
import { attachInput, createInput } from './input.js';
import { createAudio, playAlarmTick, playCaught, playPickup, playTool, playWin } from './audio.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';
import {
  SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON, createWorld, resetWorld,
  stepWorld, throwDecoy, useEmp, useSmoke,
} from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const world = createWorld(20261122);
const input = createInput();
const audio = createAudio();
let lastGems = 0;
let lastDiamond = false;
let lastScreen = world.screen;
let frozenShot = false;

function announce(text) {
  if (status) status.textContent = text;
}

function startGame() {
  if (world.screen === SCREEN_TITLE || world.screen === SCREEN_WON || world.screen === SCREEN_CAUGHT) {
    resetWorld(world);
    lastGems = 0;
    lastDiamond = false;
    announce('The heist begins. Steal the Sunset Diamond, then reach the EXIT.');
  }
}

attachInput(input, canvas, {
  onSmoke: () => { if (useSmoke(world)) playTool(audio); },
  onEmp: () => { if (useEmp(world)) playTool(audio); },
  onDecoyKey: () => {
    if (world.screen === SCREEN_PLAY) throwDecoy(world, { x: world.thief.x + Math.cos(world.thief.angle) * 160, y: world.thief.y + Math.sin(world.thief.angle) * 160 });
  },
  onEnter: startGame,
  onRestart: () => {
    if (world.screen !== SCREEN_TITLE) {
      resetWorld(world);
      lastGems = 0;
      lastDiamond = false;
    }
  },
});

function frame(time) {
  if (!frozenShot) {
    if (world.screen === SCREEN_PLAY) {
      if (input.click) {
        if (throwDecoy(world, input.click)) playTool(audio);
        input.click = null;
      }
      stepWorld(world, input, STEP);
      if (world.gemsTaken > lastGems || (world.diamondTaken && !lastDiamond)) {
        playPickup(audio);
        lastGems = world.gemsTaken;
        lastDiamond = world.diamondTaken;
      }
      playAlarmTick(audio, world);
      if (world.screen === SCREEN_CAUGHT && lastScreen !== SCREEN_CAUGHT) playCaught(audio);
      if (world.screen === SCREEN_WON && lastScreen !== SCREEN_WON) playWin(audio);
    }
    lastScreen = world.screen;
  }
  drawGame(ctx, world, world.time);
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // A staged scene for screenshots: the real game, frozen on one frame.
  stageShot(shot, world);
  frozenShot = true;
  announce(`Screenshot scene: ${shot}.`);
} else {
  announce('The Midnight Vault. Press Enter to start the heist.');
}

// Exposed for play-testing only: the live world, so an automated check can
// read the alarm, the loot and the screen without touching the game.
window.__heist = { world, input, startGame, useSmoke, useEmp, throwDecoy };

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
requestAnimationFrame(frame);
