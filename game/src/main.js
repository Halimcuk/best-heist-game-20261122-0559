// The Midnight Vault — boot and game loop.

import { CANVAS_HEIGHT, CANVAS_WIDTH, STEP } from './config.js';
import { createInput, installInput } from './input.js';
import {
  createAudio,
  playAlarmTick,
  playCaught,
  playGadget,
  playPickup,
  playWin,
} from './audio.js';
import { drawGame } from './render.js';
import { prepareShot } from './shots.js';
import {
  SCREEN_CAUGHT,
  SCREEN_PLAYING,
  SCREEN_TITLE,
  SCREEN_WON,
  createWorld,
  resetWorld,
  stepWorld,
  throwDecoy,
  useEmp,
  useSmoke,
} from './world.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const world = createWorld(20261122);
const input = createInput();
const audio = createAudio();

let lastGems = 0;
let lastDiamond = false;
let lastScreen = world.screen;
let shotFrozen = false;

// Start a fresh heist from the title, win or caught screens.
function startGame() {
  if (
    world.screen === SCREEN_TITLE ||
    world.screen === SCREEN_WON ||
    world.screen === SCREEN_CAUGHT
  ) {
    resetWorld(world);
    lastGems = 0;
    lastDiamond = false;
    lastScreen = world.screen;
    statusEl.textContent = 'Heist started — steal the Sunset Diamond, then reach the EXIT!';
  }
}

installInput(input, canvas, {
  smoke: () => {
    if (useSmoke(world)) playGadget(audio);
  },
  emp: () => {
    if (useEmp(world)) playGadget(audio);
  },
  decoy: () => {
    if (world.screen !== SCREEN_PLAYING) return;
    const tx = world.thief.x + Math.cos(world.thief.angle) * 160;
    const ty = world.thief.y + Math.sin(world.thief.angle) * 160;
    if (throwDecoy(world, { x: tx, y: ty })) playGadget(audio);
  },
  enter: () => startGame(),
  restart: () => {
    if (world.screen !== SCREEN_TITLE) {
      resetWorld(world);
      lastGems = 0;
      lastDiamond = false;
      lastScreen = world.screen;
    }
  },
});

// One animation frame: step the simulation while playing, then draw.
function frame() {
  if (!shotFrozen && world.screen === SCREEN_PLAYING) {
    if (input.click) {
      const target = input.click;
      input.click = null;
      if (throwDecoy(world, target)) playGadget(audio);
    }
    stepWorld(world, input, STEP);
    if (world.gemsTaken > lastGems || (world.diamondTaken && !lastDiamond)) {
      playPickup(audio);
    }
    lastGems = world.gemsTaken;
    lastDiamond = world.diamondTaken;
    playAlarmTick(audio, world);
    if (world.screen !== lastScreen) {
      if (world.screen === SCREEN_CAUGHT) playCaught(audio);
      if (world.screen === SCREEN_WON) playWin(audio);
    }
    lastScreen = world.screen;
  }
  drawGame(ctx, world, world.time);
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  prepareShot(shot, world);
  shotFrozen = true;
  statusEl.textContent = `Screenshot scene: ${shot}`;
} else {
  statusEl.textContent = 'Press Enter to start the heist!';
}

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Test hook: world, input, start and the three gadgets.
window.heist = { world, input, startGame, useSmoke, useEmp, throwDecoy };

requestAnimationFrame(frame);
